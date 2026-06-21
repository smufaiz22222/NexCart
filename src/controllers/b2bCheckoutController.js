import { prisma } from '../config/db.js';
import { createPurchaseInteractions } from '../services/interactionService.js';
import { formatShippingAddress } from '../utils/addressUtils.js';
import { recordMarketplaceOrderCharge } from '../services/accountingService.js';

const PAYMENT_METHODS = {
  BANK_TRANSFER: 'BANK_TRANSFER',
};

const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
};

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const requireApprovedB2B = async (userId) => {
  const businessProfile = await prisma.businessProfile.findUnique({
    where: { userId },
  });

  if (
    !businessProfile ||
    businessProfile.verification !== 'APPROVED' ||
    businessProfile.status !== 'ACTIVE'
  ) {
    throw buildError('An active approved B2B business profile is required', 403);
  }

  return businessProfile;
};

export const b2bCheckout = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can place B2B orders' });
    }

    const { addressId, paymentReferenceNo, paymentReceiptUrl } = req.body;
    const buyerId = req.user.userId;

    if (!addressId?.trim()) {
      throw buildError('A saved shipping address is required');
    }
    if (!paymentReferenceNo?.trim()) {
      throw buildError('Transaction reference ID is required for bank transfer payments');
    }
    if (!paymentReceiptUrl?.trim()) {
      throw buildError('Payment receipt screenshot is required for bank transfer payments');
    }

    await requireApprovedB2B(buyerId);

    const createdOrders = await prisma.$transaction(async (tx) => {
      const [address, b2bCart] = await Promise.all([
        tx.shippingAddress.findUnique({ where: { id: addressId } }),
        tx.b2BCart.findUnique({
          where: { userId: buyerId },
          include: {
            items: {
              include: {
                product: true,
                rfq: true,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
      ]);

      if (!address || address.userId !== buyerId) {
        throw buildError('Selected shipping address was not found', 404);
      }
      if (!b2bCart?.items?.length) {
        throw buildError('B2B cart is empty');
      }

      const shippingAddressSnapshot = formatShippingAddress(address);

      // Collect all RFQ IDs associated with cart items
      const rfqIds = [...new Set(b2bCart.items.map((item) => item.rfqId).filter(Boolean))];
      const formattedPaymentReferenceNo =
        rfqIds.length > 0
          ? `${paymentReferenceNo.trim()}|RFQ:${rfqIds.join(',')}`
          : paymentReferenceNo.trim();

      // Group cart items by seller
      const ordersBySeller = {};
      for (const item of b2bCart.items) {
        const product = item.product;
        if (product.currentStock < item.quantity) {
          throw buildError(
            `${product.name} has insufficient stock (available: ${product.currentStock})`,
            409
          );
        }

        const sellerId = product.wholesalerId;
        if (!ordersBySeller[sellerId]) {
          ordersBySeller[sellerId] = { totalAmount: 0, orderItems: [], inventoryLogs: [] };
        }

        const unitPrice = Number(item.unitPrice);
        const subtotal = unitPrice * item.quantity;

        ordersBySeller[sellerId].orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: unitPrice,
          unitPriceAtPurchase: unitPrice,
          subtotalAtPurchase: subtotal,
          selectedSize: null,
          isRfqApplied: !!item.rfqId,
        });

        ordersBySeller[sellerId].inventoryLogs.push({
          productId: product.id,
          quantity: item.quantity,
        });

        ordersBySeller[sellerId].totalAmount += subtotal;
      }

      if (Object.keys(ordersBySeller).length > 1) {
        throw buildError('All items in the cart must belong to the same seller to checkout', 400);
      }

      // Create orders per seller
      const orders = [];
      for (const [sellerId, data] of Object.entries(ordersBySeller)) {
        // Decrement stock
        for (const log of data.inventoryLogs) {
          const stockUpdate = await tx.product.updateMany({
            where: {
              id: log.productId,
              wholesalerId: sellerId,
              currentStock: { gte: log.quantity },
            },
            data: { currentStock: { decrement: log.quantity } },
          });

          if (stockUpdate.count === 0) {
            const prod = await tx.product.findUnique({
              where: { id: log.productId },
              select: { name: true },
            });
            throw buildError(`${prod?.name || 'A product'} went out of stock during checkout`, 409);
          }
        }

        // Create inventory logs
        for (const log of data.inventoryLogs) {
          await tx.inventoryLog.create({
            data: {
              wholesalerId: sellerId,
              productId: log.productId,
              changeAmount: -log.quantity,
              reason: 'SALE',
            },
          });
        }

        const order = await tx.order.create({
          data: {
            buyerId,
            sellerId,
            totalAmount: data.totalAmount,
            status: 'PENDING',
            paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
            paymentStatus: PAYMENT_STATUSES.PENDING,
            shippingAddress: shippingAddressSnapshot,
            shippingStreet:
              address.addressLine1 + (address.addressLine2 ? `, ${address.addressLine2}` : ''),
            shippingCity: address.city,
            shippingState: address.state,
            shippingPostalCode: address.postalCode,
            paymentReceiptUrl: paymentReceiptUrl.trim(),
            paymentReferenceNo: formattedPaymentReferenceNo,
            items: {
              create: data.orderItems.map(({ isRfqApplied: _, ...orderItem }) => ({
                ...orderItem,
                price: orderItem.unitPriceAtPurchase,
              })),
            },
          },
          include: {
            items: { include: { product: true } },
          },
        });

        // Record e-commerce B2B order charge to the accounting system
        await recordMarketplaceOrderCharge(tx, {
          orderId: order.id,
          sellerId,
          buyerId,
          totalAmount: data.totalAmount,
          paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
          paymentStatus: PAYMENT_STATUSES.PENDING,
        });

        // Create purchase interactions
        await createPurchaseInteractions({
          tx,
          buyerId,
          orderItems: data.orderItems,
          source: 'b2b_checkout',
        });

        // Create invoice
        await tx.invoice.create({
          data: {
            wholesalerId: sellerId,
            orderId: order.id,
            amount: data.totalAmount,
          },
        });

        orders.push(order);
      }

      // Update matching RFQs to ORDER_PLACED status
      if (rfqIds.length > 0) {
        await tx.rfq.updateMany({
          where: { id: { in: rfqIds } },
          data: { status: 'ORDER_PLACED' },
        });
      }

      // Clear the B2B cart
      await tx.b2BCartItem.deleteMany({ where: { cartId: b2bCart.id } });

      return orders;
    });

    res.status(201).json({ message: 'B2B checkout successful!', orders: createdOrders });
  } catch (error) {
    console.error('B2B Checkout Error:', error);
    res.status(error.statusCode || 400).json({
      error: error.message || 'Failed to process B2B checkout',
    });
  }
};
