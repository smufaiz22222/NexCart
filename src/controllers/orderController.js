import { prisma } from '../config/db.js';
import { createPurchaseInteractions } from '../services/interactionService.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { formatShippingAddress } from '../utils/addressUtils.js';
import {
  cancelOrderItemForCustomer,
  PAYMENT_CAPTURE_STATUSES,
  retryOrderItemRefundForCustomer,
} from '../services/orderCancellationService.js';
import {
  approveOrderItemReturn,
  getReturnWindowDateForDelivery,
  receiveOrderItemReturn,
  rejectOrderItemReturn,
  requestOrderItemReturn,
  retryOrderItemReturnRefund,
} from '../services/orderReturnService.js';
import {
  addDisputeInternalNote,
  createDispute,
  decorateOrderWithDisputes,
  moveDisputeToReview,
  ORDER_DISPUTE_INCLUDE,
  resolveDispute,
} from '../services/disputeService.js';

const PAYMENT_METHODS = {
  COD: 'COD',
  PREPAID: 'PREPAID',
  LEDGER_CREDIT: 'LEDGER_CREDIT',
};

const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
};

const LEDGER_ENTRY_SOURCES = {
  ORDER_CHARGE: 'ORDER_CHARGE',
  ORDER_AUTO_PAYMENT: 'ORDER_AUTO_PAYMENT',
  ORDER_PREPAID_PAYMENT: 'ORDER_PREPAID_PAYMENT',
};

const ORDER_ISSUE_TYPES = {
  RETURN: 'RETURN',
  REFUND: 'REFUND',
  DISPUTE: 'DISPUTE',
};

const ORDER_ISSUE_STATUSES = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
};

const ORDER_ISSUE_RESOLUTIONS = {
  NONE: 'NONE',
  REFUND: 'REFUND',
  REPLACEMENT: 'REPLACEMENT',
  STORE_CREDIT: 'STORE_CREDIT',
  RETURNLESS_REFUND: 'RETURNLESS_REFUND',
};

const ORDER_INCLUDE_FOR_RESPONSE = ORDER_DISPUTE_INCLUDE;

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error('Razorpay is not configured on the server');
    error.statusCode = 500;
    throw error;
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const buildCheckoutError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toNumber = (value) => Number(Number(value || 0).toFixed(2));

const validateCheckoutInput = ({ addressId, paymentMethod }) => {
  if (!addressId?.trim()) {
    throw buildCheckoutError('A saved shipping address is required');
  }
  if (!paymentMethod || !Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
    throw buildCheckoutError('A valid payment method is required');
  }
};

export const validateSelectedSize = (product, selectedSize) => {
  const normalizedSelectedSize = selectedSize?.trim() || null;
  if (!product.sizes?.length) {
    return null;
  }
  if (!normalizedSelectedSize || !product.sizes.includes(normalizedSelectedSize)) {
    throw buildCheckoutError(`Selected size is no longer available for ${product.name}`);
  }
  return normalizedSelectedSize;
};

const getCheckoutPaymentReference = (session) =>
  session.paymentReference ? `${session.razorpayOrderId}:${session.paymentReference}` : null;

const loadCheckoutAddress = async (db, buyerId, addressId) => {
  const address = await db.shippingAddress.findUnique({
    where: { id: addressId },
  });

  if (!address || address.userId !== buyerId) {
    throw buildCheckoutError('Selected shipping address was not found', 404);
  }

  return address;
};

const loadCheckoutCart = async (db, buyerId) => {
  const cart = await db.cart.findUnique({
    where: { userId: buyerId },
    include: {
      items: {
        include: {
          product: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!cart?.items?.length) {
    throw buildCheckoutError('Cart is empty');
  }

  return cart;
};

export const buildOrdersBySeller = async (tx, cartItems, buyerId) => {
  const ordersBySeller = {};

  const businessProfile = buyerId
    ? await tx.businessProfile.findUnique({ where: { userId: buyerId } })
    : null;
  const isApprovedB2B = businessProfile && businessProfile.verification === 'APPROVED';

  for (const item of cartItems) {
    const product = item.product;
    if (!product) throw buildCheckoutError(`Product ${item.productId} not found`, 404);
    const selectedSize = validateSelectedSize(product, item.selectedSize);
    if (product.currentStock < item.quantity) {
      throw buildCheckoutError(`Not enough stock for ${product.name}`);
    }

    const sellerId = product.wholesalerId;
    if (!ordersBySeller[sellerId]) {
      ordersBySeller[sellerId] = { totalAmount: 0, orderItems: [], inventoryLogs: [] };
    }

    let unitPriceAtPurchase = Number(product.price);

    if (isApprovedB2B) {
      // 1. Check for active accepted RFQ first
      const activeRfq = await tx.rfq.findFirst({
        where: {
          buyerId,
          productId: product.id,
          status: 'ACCEPTED',
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (activeRfq && item.quantity >= activeRfq.quantity) {
        unitPriceAtPurchase = activeRfq.counterPrice || activeRfq.targetPrice;
      } else {
        // Enforce MOQ check
        if (item.quantity < product.minOrderQty) {
          throw buildCheckoutError(`Quantity for ${product.name} must meet the product MOQ of ${product.minOrderQty} units.`);
        }

        // 2. Check for matching quantity tiers
        const tiers = await tx.productPriceTier.findMany({
          where: { productId: product.id },
          orderBy: { minQuantity: 'asc' },
        });

        let applicableTier = null;
        for (const tier of tiers) {
          if (item.quantity >= tier.minQuantity) {
            applicableTier = tier;
          }
        }
        if (applicableTier) {
          unitPriceAtPurchase = applicableTier.unitPrice;
        }
      }
    }

    const subtotalAtPurchase = unitPriceAtPurchase * item.quantity;

    ordersBySeller[sellerId].orderItems.push({
      cartItemId: item.id,
      productId: product.id,
      quantity: item.quantity,
      price: unitPriceAtPurchase,
      unitPriceAtPurchase,
      subtotalAtPurchase,
      selectedSize,
      recommendationId: item.recommendationId || null,
      recommendationSource: item.recommendationSource || null,
    });

    ordersBySeller[sellerId].inventoryLogs.push({
      productId: product.id,
      quantity: item.quantity,
    });

    ordersBySeller[sellerId].totalAmount += subtotalAtPurchase;
  }

  return ordersBySeller;
};

const decrementProductStockAtomic = async (tx, { sellerId, productId, quantity }) => {
  const stockUpdate = await tx.product.updateMany({
    where: {
      id: productId,
      wholesalerId: sellerId,
      currentStock: { gte: quantity },
    },
    data: { currentStock: { decrement: quantity } },
  });

  if (stockUpdate.count === 0) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    throw buildCheckoutError(
      `${product?.name || 'A product'} went out of stock during checkout`,
      409
    );
  }
};

const canOpenIssueForOrder = (orderStatus, type) => {
  if (type === ORDER_ISSUE_TYPES.DISPUTE) {
    return ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(orderStatus);
  }

  return ['SHIPPED', 'DELIVERED'].includes(orderStatus);
};

const normalizeIssueResolution = (value) => {
  if (!value) return ORDER_ISSUE_RESOLUTIONS.NONE;
  return Object.values(ORDER_ISSUE_RESOLUTIONS).includes(value)
    ? value
    : ORDER_ISSUE_RESOLUTIONS.NONE;
};

const applyIssueResolutionSideEffects = async ({
  tx,
  issue,
  order,
  nextStatus,
  nextResolution,
}) => {
  const updates = {};

  const shouldRestock =
    issue.type === ORDER_ISSUE_TYPES.RETURN &&
    nextStatus === ORDER_ISSUE_STATUSES.RESOLVED &&
    !issue.inventoryAdjusted &&
    issue.orderItem &&
    [
      ORDER_ISSUE_RESOLUTIONS.REFUND,
      ORDER_ISSUE_RESOLUTIONS.REPLACEMENT,
      ORDER_ISSUE_RESOLUTIONS.STORE_CREDIT,
    ].includes(nextResolution);

  if (shouldRestock) {
    await tx.inventoryLog.create({
      data: {
        wholesalerId: order.sellerId,
        productId: issue.orderItem.productId,
        changeAmount: issue.requestedQuantity,
        reason: 'REFUND',
      },
    });

    await tx.product.update({
      where: { id: issue.orderItem.productId },
      data: { currentStock: { increment: issue.requestedQuantity } },
    });

    updates.inventoryAdjusted = true;
  }

  const isRefundResolution = [
    ORDER_ISSUE_RESOLUTIONS.REFUND,
    ORDER_ISSUE_RESOLUTIONS.RETURNLESS_REFUND,
  ].includes(nextResolution);
  const orderWasPaid = [PAYMENT_STATUSES.PAID, PAYMENT_STATUSES.REFUND_PENDING].includes(
    order.paymentStatus
  );

  if (isRefundResolution && orderWasPaid && nextStatus === ORDER_ISSUE_STATUSES.APPROVED) {
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: PAYMENT_STATUSES.REFUND_PENDING },
    });
  }

  if (isRefundResolution && orderWasPaid && nextStatus === ORDER_ISSUE_STATUSES.RESOLVED) {
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: PAYMENT_STATUSES.REFUNDED },
    });
  }

  if (nextStatus === ORDER_ISSUE_STATUSES.RESOLVED) {
    updates.resolvedAt = new Date();
  }

  return updates;
};

const createOrdersFromGroupedData = async ({
  tx,
  buyerId,
  ordersBySeller,
  shippingAddressSnapshot,
  paymentMethod,
  paymentStatus,
  paymentCaptureStatus = PAYMENT_CAPTURE_STATUSES.NOT_APPLICABLE,
  paymentProvider = null,
  paymentReference = null,
  razorpayOrderId = null,
  razorpayPaymentId = null,
  cartId,
}) => {
  const createdOrders = [];

  for (const [sellerId, data] of Object.entries(ordersBySeller)) {
    const order = await tx.order.create({
      data: {
        buyerId,
        sellerId,
        totalAmount: data.totalAmount,
        status: 'PENDING',
        paymentMethod,
        paymentStatus,
        paymentCaptureStatus,
        paymentProvider,
        paymentReference,
        razorpayOrderId,
        razorpayPaymentId,
        shippingAddress: shippingAddressSnapshot,
        items: {
          create: data.orderItems.map(
            ({ recommendationSource: _, cartItemId: __, ...orderItem }) => ({
              ...orderItem,
              price: orderItem.unitPriceAtPurchase,
            })
          ),
        },
      },
      include: {
        items: { include: { product: true } },
        invoice: true,
      },
    });

    await createPurchaseInteractions({
      tx,
      buyerId,
      orderItems: data.orderItems,
      source: 'checkout',
    });

    const invoice = await tx.invoice.create({
      data: {
        wholesalerId: sellerId,
        orderId: order.id,
        amount: data.totalAmount,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        wholesalerId: sellerId,
        userId: buyerId,
        orderId: order.id,
        amount: -data.totalAmount,
        description: `Marketplace Order ${order.id}`,
        referenceId: invoice.id,
        source: LEDGER_ENTRY_SOURCES.ORDER_CHARGE,
      },
    });

    if (paymentMethod === PAYMENT_METHODS.PREPAID && paymentStatus === PAYMENT_STATUSES.PAID) {
      await tx.ledgerEntry.create({
        data: {
          wholesalerId: sellerId,
          userId: buyerId,
          orderId: order.id,
          amount: data.totalAmount,
          description: `Marketplace Prepaid Payment ${order.id}`,
          referenceId: invoice.id,
          source: LEDGER_ENTRY_SOURCES.ORDER_PREPAID_PAYMENT,
        },
      });
    }

    for (const log of data.inventoryLogs) {
      await decrementProductStockAtomic(tx, {
        sellerId,
        productId: log.productId,
        quantity: log.quantity,
      });

      await tx.inventoryLog.create({
        data: {
          wholesalerId: sellerId,
          productId: log.productId,
          changeAmount: -log.quantity,
          reason: 'SALE',
        },
      });
    }

    createdOrders.push(order);
  }

  if (cartId) {
    await tx.cartItem.deleteMany({
      where: { cartId },
    });
  }

  return createdOrders;
};

export const checkout = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can place marketplace orders' });
    }

    const { addressId, paymentMethod } = req.body;
    const buyerId = req.user.userId;
    validateCheckoutInput({ addressId, paymentMethod });

    if (paymentMethod !== PAYMENT_METHODS.COD && paymentMethod !== PAYMENT_METHODS.LEDGER_CREDIT) {
      return res.status(400).json({ error: 'Invalid payment method for this checkout endpoint' });
    }

    const createdOrders = await prisma.$transaction(async (tx) => {
      const [address, cart] = await Promise.all([
        loadCheckoutAddress(tx, buyerId, addressId),
        loadCheckoutCart(tx, buyerId),
      ]);
      const shippingAddressSnapshot = formatShippingAddress(address);
      const ordersBySeller = await buildOrdersBySeller(tx, cart.items, buyerId);
      const totalAmount = Object.values(ordersBySeller).reduce(
        (sum, sellerOrder) => sum + sellerOrder.totalAmount,
        0
      );

      if (paymentMethod === PAYMENT_METHODS.LEDGER_CREDIT) {
        const businessProfile = await tx.businessProfile.findUnique({
          where: { userId: buyerId },
        });

        if (!businessProfile || businessProfile.verification !== 'APPROVED' || businessProfile.status !== 'ACTIVE') {
          throw buildCheckoutError('Only active approved B2B wholesale accounts can checkout using trade credit ledger.', 403);
        }

        const wholesalerIds = Object.keys(ordersBySeller);

        const [creditLimits, ledgerEntries, wholesalers] = await Promise.all([
          tx.wholesalerCreditLimit.findMany({
            where: {
              buyerId,
              wholesalerId: { in: wholesalerIds },
            },
          }),
          tx.ledgerEntry.findMany({
            where: {
              userId: buyerId,
              wholesalerId: { in: wholesalerIds },
            },
          }),
          tx.wholesaler.findMany({
            where: {
              id: { in: wholesalerIds },
            },
            select: {
              id: true,
              businessName: true,
            },
          }),
        ]);

        const limitMap = {};
        for (const cl of creditLimits) {
          limitMap[cl.wholesalerId] = Number(cl.creditLimit);
        }

        const balanceMap = {};
        for (const entry of ledgerEntries) {
          const wId = entry.wholesalerId;
          if (!balanceMap[wId]) balanceMap[wId] = 0;
          balanceMap[wId] += Number(entry.amount);
        }

        const nameMap = {};
        for (const w of wholesalers) {
          nameMap[w.id] = w.businessName;
        }

        for (const sellerId of wholesalerIds) {
          const sellerOrder = ordersBySeller[sellerId];
          const sellerOrderTotal = sellerOrder.totalAmount;

          const balance = balanceMap[sellerId] || 0;
          const currentOutstanding = balance < 0 ? -balance : 0;
          const creditLimit = limitMap[sellerId] !== undefined ? limitMap[sellerId] : 50000.00;

          const newOutstanding = currentOutstanding + sellerOrderTotal;

          if (newOutstanding > creditLimit) {
            const sellerName = nameMap[sellerId] || 'the wholesaler';
            const available = Math.max(0, creditLimit - currentOutstanding);

            const errorObj = {
              sellerId,
              sellerName,
              creditLimit,
              outstanding: currentOutstanding,
              available,
              attemptedPurchase: sellerOrderTotal,
              message: `Trade credit limit exceeded with seller "${sellerName}".`,
            };

            const err = buildCheckoutError(errorObj.message, 400);
            err.details = errorObj;
            throw err;
          }
        }
      }

      return createOrdersFromGroupedData({
        tx,
        buyerId,
        ordersBySeller,
        shippingAddressSnapshot,
        paymentMethod,
        paymentStatus: PAYMENT_STATUSES.PENDING,
        cartId: cart.id,
      });
    });

    res.status(201).json({ message: 'Checkout successful!', orders: createdOrders });
  } catch (error) {
    console.error('Checkout Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ 
        error: error.message || 'Failed to process checkout',
        details: error.details || null
      });
  }
};

export const createPrepaidOrder = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can place marketplace orders' });
    }

    const { addressId, paymentMethod } = req.body;
    const buyerId = req.user.userId;
    validateCheckoutInput({ addressId, paymentMethod });

    if (paymentMethod !== PAYMENT_METHODS.PREPAID) {
      return res.status(400).json({ error: 'Payment method must be PREPAID' });
    }

    const checkoutDetails = await prisma.$transaction(async (tx) => {
      const [address, cart] = await Promise.all([
        loadCheckoutAddress(tx, buyerId, addressId),
        loadCheckoutCart(tx, buyerId),
      ]);
      const shippingAddressSnapshot = formatShippingAddress(address);
      const ordersBySeller = await buildOrdersBySeller(tx, cart.items, buyerId);
      const totalAmount = Object.values(ordersBySeller).reduce(
        (sum, sellerOrder) => sum + sellerOrder.totalAmount,
        0
      );

      return {
        cartId: cart.id,
        shippingAddressSnapshot,
        ordersBySeller,
        totalAmount,
      };
    });

    const razorpay = getRazorpayClient();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(checkoutDetails.totalAmount * 100),
      currency: 'INR',
      receipt: `nexcart_${buyerId.slice(0, 8)}_${Date.now()}`,
    });

    await prisma.$transaction(async (tx) => {
      await tx.prepaidCheckoutSession.create({
        data: {
          buyerId,
          razorpayOrderId: razorpayOrder.id,
          amount: checkoutDetails.totalAmount,
          currency: 'INR',
          createdOrderIds: [],
          payload: {
            addressId,
            shippingAddressSnapshot: checkoutDetails.shippingAddressSnapshot,
            ordersBySeller: checkoutDetails.ordersBySeller,
            paymentMethod,
            cartId: checkoutDetails.cartId,
          },
          paymentStatus: PAYMENT_STATUSES.PENDING,
        },
      });
    });

    res.status(201).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      buyerId,
      shippingAddress: checkoutDetails.shippingAddressSnapshot,
    });
  } catch (error) {
    console.error('Create Prepaid Order Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to initialize prepaid checkout' });
  }
};

export const verifyPrepaidOrder = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can verify marketplace orders' });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const buyerId = req.user.userId;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing Razorpay verification fields' });
    }

    const session = await prisma.prepaidCheckoutSession.findUnique({
      where: { razorpayOrderId },
    });

    if (!session || session.buyerId !== buyerId) {
      return res.status(404).json({ error: 'Prepaid checkout session not found' });
    }

    if (session.paymentStatus === PAYMENT_STATUSES.PAID || session.processedAt) {
      const paymentReference = getCheckoutPaymentReference(session);
      const existingOrders = session.createdOrderIds?.length
        ? await prisma.order.findMany({
            where: { id: { in: session.createdOrderIds } },
            include: ORDER_INCLUDE_FOR_RESPONSE,
            orderBy: { createdAt: 'desc' },
          })
        : paymentReference
          ? await prisma.order.findMany({
              where: {
                buyerId,
                paymentReference,
                paymentMethod: PAYMENT_METHODS.PREPAID,
              },
              include: ORDER_INCLUDE_FOR_RESPONSE,
              orderBy: { createdAt: 'desc' },
            })
          : [];

      return res.status(200).json({
        message: 'Payment already verified',
        orders: existingOrders,
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await prisma.prepaidCheckoutSession.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PAYMENT_STATUSES.FAILED,
          paymentReference: razorpayPaymentId,
        },
      });
      return res.status(400).json({ error: 'Invalid Razorpay payment signature' });
    }

    const payload = session.payload;
    if (!payload?.ordersBySeller || !payload?.shippingAddressSnapshot || !payload?.cartId) {
      throw buildCheckoutError('Prepaid checkout session is incomplete', 400);
    }

    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = await createOrdersFromGroupedData({
        tx,
        buyerId,
        ordersBySeller: payload.ordersBySeller,
        shippingAddressSnapshot: payload.shippingAddressSnapshot,
        paymentMethod: PAYMENT_METHODS.PREPAID,
        paymentStatus: PAYMENT_STATUSES.PAID,
        paymentCaptureStatus: PAYMENT_CAPTURE_STATUSES.CAPTURED,
        paymentProvider: 'razorpay',
        paymentReference: `${razorpayOrderId}:${razorpayPaymentId}`,
        razorpayOrderId,
        razorpayPaymentId,
        cartId: payload.cartId,
      });

      await tx.prepaidCheckoutSession.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PAYMENT_STATUSES.PAID,
          paymentReference: razorpayPaymentId,
          processedAt: new Date(),
          createdOrderIds: orders.map((order) => order.id),
        },
      });

      return orders;
    });

    res.status(201).json({
      message: 'Prepaid checkout successful!',
      orders: createdOrders,
    });
  } catch (error) {
    console.error('Verify Prepaid Order Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to verify prepaid checkout' });
  }
};
export const getOrders = async (req, res) => {
  try {
    let orders = [];

    if (req.user.role === 'WHOLESALER' && req.user.wholesalerId) {
      orders = await prisma.order.findMany({
        where: { sellerId: req.user.wholesalerId },
        include: ORDER_INCLUDE_FOR_RESPONSE,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      orders = await prisma.order.findMany({
        where: { buyerId: req.user.userId },
        include: ORDER_INCLUDE_FOR_RESPONSE,
        orderBy: { createdAt: 'desc' },
      });
    }

    const viewerRole = req.user.role === 'WHOLESALER' ? 'WHOLESALER' : 'CUSTOMER';
    res.status(200).json({
      orders: orders.map((order) => decorateOrderWithDisputes(order, viewerRole)),
    });
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const sellerId = req.user.wholesalerId;
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: ORDER_INCLUDE_FOR_RESPONSE,
      });

      if (!order || order.sellerId !== sellerId) {
        throw buildCheckoutError('Not authorized to update this order', 403);
      }

      const nextData = { status };
      if (status === 'DELIVERED' && order.status !== 'DELIVERED') {
        await tx.orderItem.updateMany({
          where: {
            orderId: id,
            status: 'ACTIVE',
          },
          data: {
            returnEligibleUntil: getReturnWindowDateForDelivery(new Date()),
          },
        });

        const hasActiveItems = order.items.some((item) => item.status !== 'CANCELLED');
        const shouldAutoSettle =
          hasActiveItems &&
          order.paymentMethod === PAYMENT_METHODS.COD &&
          order.paymentStatus !== PAYMENT_STATUSES.PAID &&
          order.status !== 'CANCELLED';

        if (shouldAutoSettle) {
          const settlementAmount = toNumber(order.invoice?.amount ?? order.totalAmount);

          if (settlementAmount > 0) {
            try {
              await tx.ledgerEntry.create({
                data: {
                  wholesalerId: order.sellerId,
                  userId: order.buyerId,
                  orderId: order.id,
                  amount: settlementAmount,
                  description: `Marketplace COD Payment ${order.id}`,
                  referenceId: order.invoice?.id || order.id,
                  source: LEDGER_ENTRY_SOURCES.ORDER_AUTO_PAYMENT,
                  idempotencyKey: `order-auto-payment:${order.id}`,
                },
              });
            } catch (error) {
              if (error?.code !== 'P2002') {
                throw error;
              }
            }
          }

          nextData.paymentStatus = PAYMENT_STATUSES.PAID;
        }
      }

      const nextOrder = await tx.order.update({
        where: { id },
        data: nextData,
        include: ORDER_INCLUDE_FOR_RESPONSE,
      });

      return decorateOrderWithDisputes(nextOrder, 'WHOLESALER');
    });

    res.status(200).json({ message: 'Order status updated successfully', order: updatedOrder });
  } catch (error) {
    console.error('Update Order Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update order status' });
  }
};

export const createOrderIssue = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res
        .status(403)
        .json({ error: 'Only customers can create refund requests from this endpoint' });
    }

    const { id: orderId } = req.params;
    const {
      orderItemId = null,
      type,
      preferredResolution,
      reason,
      description,
      requestedQuantity = 1,
    } = req.body;

    if (!Object.values(ORDER_ISSUE_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid issue type' });
    }

    if (type === ORDER_ISSUE_TYPES.RETURN) {
      return res.status(400).json({
        error:
          'Use the dedicated return flow for delivered items instead of the generic issue form',
      });
    }

    if (type === ORDER_ISSUE_TYPES.DISPUTE) {
      return res.status(400).json({
        error: 'Use the dedicated dispute endpoints instead of the generic issue form',
      });
    }

    if (!reason?.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });

    if (!order || order.buyerId !== req.user.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!canOpenIssueForOrder(order.status, type)) {
      return res
        .status(400)
        .json({ error: 'This order is not eligible for that request type yet' });
    }

    let item = null;
    if (orderItemId) {
      item = order.items.find((entry) => entry.id === orderItemId);
      if (!item) {
        return res.status(400).json({ error: 'Selected order item does not belong to this order' });
      }
    }

    const parsedQuantity = Math.max(1, Number.parseInt(requestedQuantity, 10) || 1);
    if (item && parsedQuantity > item.quantity) {
      return res.status(400).json({ error: 'Requested quantity exceeds the ordered quantity' });
    }

    const issue = await prisma.orderIssue.create({
      data: {
        orderId,
        orderItemId,
        requesterId: req.user.userId,
        type,
        preferredResolution: normalizeIssueResolution(preferredResolution),
        reason: reason.trim(),
        description: description?.trim() || null,
        requestedQuantity: parsedQuantity,
      },
      include: {
        requester: { select: { id: true, name: true, role: true } },
        orderItem: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });

    res.status(201).json({ message: 'Order issue created successfully', issue });
  } catch (error) {
    console.error('Create Order Issue Error:', error);
    res.status(500).json({ error: 'Failed to create order issue' });
  }
};

export const updateOrderIssue = async (req, res) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerId) {
      return res.status(403).json({ error: 'Only wholesalers can review order issues' });
    }

    const { issueId } = req.params;
    const { status, finalResolution, sellerResponse, refundAmount } = req.body;

    if (!Object.values(ORDER_ISSUE_STATUSES).includes(status)) {
      return res.status(400).json({ error: 'Invalid issue status' });
    }

    const issue = await prisma.orderIssue.findUnique({
      where: { id: issueId },
      include: {
        order: true,
        orderItem: true,
      },
    });

    if (!issue || issue.order.sellerId !== req.user.wholesalerId) {
      return res.status(404).json({ error: 'Order issue not found' });
    }

    if (issue.type === ORDER_ISSUE_TYPES.DISPUTE) {
      return res.status(400).json({
        error: 'Legacy dispute issues are no longer editable through the generic issue workflow',
      });
    }

    const nextResolution = normalizeIssueResolution(finalResolution || issue.finalResolution);
    const parsedRefundAmount =
      refundAmount === null || refundAmount === undefined || refundAmount === ''
        ? null
        : Number(refundAmount);

    const updatedIssue = await prisma.$transaction(async (tx) => {
      const sideEffectUpdates = await applyIssueResolutionSideEffects({
        tx,
        issue,
        order: issue.order,
        nextStatus: status,
        nextResolution,
      });

      return tx.orderIssue.update({
        where: { id: issueId },
        data: {
          status,
          finalResolution: nextResolution,
          sellerResponse: sellerResponse?.trim() || null,
          refundAmount: Number.isFinite(parsedRefundAmount) ? parsedRefundAmount : null,
          ...sideEffectUpdates,
        },
        include: {
          requester: { select: { id: true, name: true, role: true } },
          orderItem: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true } },
            },
          },
        },
      });
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id: issue.orderId },
      include: ORDER_INCLUDE_FOR_RESPONSE,
    });

    res.status(200).json({
      message: 'Order issue updated successfully',
      issue: updatedIssue,
      order: decorateOrderWithDisputes(updatedOrder, 'WHOLESALER'),
    });
  } catch (error) {
    console.error('Update Order Issue Error:', error);
    res.status(500).json({ error: 'Failed to update order issue' });
  }
};

export const createItemDispute = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can open disputes.' });
    }

    const { orderId, itemId } = req.params;
    const { reason, description, evidenceUrls } = req.body || {};

    const result = await createDispute({
      buyerId: req.user.userId,
      orderId,
      itemId,
      reason,
      description,
      evidenceUrls,
      createdByIp: req.ip || null,
      createdByUserAgent: req.get('user-agent') || null,
      client: prisma,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create Dispute Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to create dispute' });
  }
};

export const updateDisputeStatus = async (req, res) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerId) {
      return res.status(403).json({ error: 'Only wholesalers can review disputes.' });
    }

    const { orderId, itemId, disputeId } = req.params;
    const { status, updatedAt } = req.body || {};

    if (status !== 'UNDER_REVIEW') {
      return res.status(422).json({ error: 'Only UNDER_REVIEW is supported on this endpoint.' });
    }

    const result = await moveDisputeToReview({
      wholesalerId: req.user.wholesalerId,
      sellerUserId: req.user.userId,
      orderId,
      itemId,
      disputeId,
      updatedAt,
      client: prisma,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Update Dispute Status Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update dispute status' });
  }
};

export const resolveOrderItemDispute = async (req, res) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerId) {
      return res.status(403).json({ error: 'Only wholesalers can resolve disputes.' });
    }

    const { orderId, itemId, disputeId } = req.params;
    const { resolutionType, resolutionNotes, resolutionAmount, allowDirectResolution, updatedAt } =
      req.body || {};

    const result = await resolveDispute({
      wholesalerId: req.user.wholesalerId,
      sellerUserId: req.user.userId,
      orderId,
      itemId,
      disputeId,
      updatedAt,
      resolutionType,
      resolutionNotes,
      resolutionAmount,
      allowDirectResolution,
      client: prisma,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Resolve Dispute Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to resolve dispute' });
  }
};

export const createDisputeSellerNote = async (req, res) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerId) {
      return res.status(403).json({ error: 'Only wholesalers can add dispute notes.' });
    }

    const { orderId, itemId, disputeId } = req.params;
    const { note, updatedAt } = req.body || {};

    const result = await addDisputeInternalNote({
      wholesalerId: req.user.wholesalerId,
      sellerUserId: req.user.userId,
      orderId,
      itemId,
      disputeId,
      updatedAt,
      note,
      client: prisma,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create Dispute Internal Note Error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to create dispute internal note' });
  }
};

export const cancelOrderItem = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can cancel order items' });
    }

    const { id: orderId, itemId } = req.params;
    const { reason } = req.body || {};

    const result = await cancelOrderItemForCustomer({
      buyerId: req.user.userId,
      orderId,
      itemId,
      reason,
      client: prisma,
    });

    res.status(200).json({
      message: result.message,
      order: decorateOrderWithDisputes(result.order, 'CUSTOMER'),
      item: result.item,
      refundStatus: result.item?.refundStatus || null,
      refundedAmount: result.item?.refundedAmount || null,
      refundReference: result.item?.refundReference || null,
    });
  } catch (error) {
    console.error('Cancel Order Item Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to cancel order item' });
  }
};

export const retryOrderItemRefund = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can retry refunds' });
    }

    const { id: orderId, itemId } = req.params;
    const result = await retryOrderItemRefundForCustomer({
      buyerId: req.user.userId,
      orderId,
      itemId,
      client: prisma,
    });

    res.status(200).json({
      message: result.message,
      order: decorateOrderWithDisputes(result.order, 'CUSTOMER'),
      item: result.item,
      refundStatus: result.item?.refundStatus || null,
      refundedAmount: result.item?.refundedAmount || null,
      refundReference: result.item?.refundReference || null,
    });
  } catch (error) {
    console.error('Retry Order Item Refund Error:', error);
    res.status(error.statusCode || 400).json({ error: error.message || 'Failed to retry refund' });
  }
};

export const requestReturn = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can request returns' });
    }

    const { id: orderId, itemId } = req.params;
    const { reason, notes, quantity } = req.body || {};
    const result = await requestOrderItemReturn({
      buyerId: req.user.userId,
      orderId,
      itemId,
      reason,
      notes,
      quantity,
      client: prisma,
    });

    res.status(200).json({
      ...result,
      order: decorateOrderWithDisputes(result.order, 'CUSTOMER'),
    });
  } catch (error) {
    console.error('Request Return Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to request return' });
  }
};

export const approveReturn = async (req, res) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerId) {
      return res.status(403).json({ error: 'Only wholesalers can approve returns' });
    }

    const { id: orderId, itemId } = req.params;
    const result = await approveOrderItemReturn({
      wholesalerId: req.user.wholesalerId,
      decisionBy: req.user.userId,
      orderId,
      itemId,
      client: prisma,
    });

    res.status(200).json({
      ...result,
      order: decorateOrderWithDisputes(result.order, 'WHOLESALER'),
    });
  } catch (error) {
    console.error('Approve Return Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to approve return' });
  }
};

export const rejectReturn = async (req, res) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerId) {
      return res.status(403).json({ error: 'Only wholesalers can reject returns' });
    }

    const { id: orderId, itemId } = req.params;
    const { rejectionReason } = req.body || {};
    const result = await rejectOrderItemReturn({
      wholesalerId: req.user.wholesalerId,
      decisionBy: req.user.userId,
      orderId,
      itemId,
      rejectionReason,
      client: prisma,
    });

    res.status(200).json({
      ...result,
      order: decorateOrderWithDisputes(result.order, 'WHOLESALER'),
    });
  } catch (error) {
    console.error('Reject Return Error:', error);
    res.status(error.statusCode || 400).json({ error: error.message || 'Failed to reject return' });
  }
};

export const receiveReturn = async (req, res) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerId) {
      return res.status(403).json({ error: 'Only wholesalers can receive returns' });
    }

    const { id: orderId, itemId } = req.params;
    const result = await receiveOrderItemReturn({
      wholesalerId: req.user.wholesalerId,
      orderId,
      itemId,
      client: prisma,
    });

    res.status(200).json({
      ...result,
      order: decorateOrderWithDisputes(result.order, 'WHOLESALER'),
    });
  } catch (error) {
    console.error('Receive Return Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to receive return' });
  }
};

export const retryReturnRefund = async (req, res) => {
  try {
    if (req.user.role !== 'WHOLESALER' || !req.user.wholesalerId) {
      return res.status(403).json({ error: 'Only wholesalers can retry return refunds' });
    }

    const { id: orderId, itemId } = req.params;
    const result = await retryOrderItemReturnRefund({
      wholesalerId: req.user.wholesalerId,
      orderId,
      itemId,
      client: prisma,
    });

    res.status(200).json({
      ...result,
      order: decorateOrderWithDisputes(result.order, 'WHOLESALER'),
    });
  } catch (error) {
    console.error('Retry Return Refund Error:', error);
    res
      .status(error.statusCode || 400)
      .json({ error: error.message || 'Failed to retry return refund' });
  }
};
