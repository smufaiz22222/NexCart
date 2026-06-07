import { prisma } from '../config/db.js';
import { createPurchaseInteractions } from '../services/interactionService.js';

export const checkout = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;
    const buyerId = req.user.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    const productIds = items.map(item => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    const ordersBySeller = {};
    
    for (const item of items) {
      const product = dbProducts.find(p => p.id === item.productId);
      
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.currentStock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);

      const sellerId = product.wholesalerId;
      if (!ordersBySeller[sellerId]) {
        ordersBySeller[sellerId] = { totalAmount: 0, orderItems: [], inventoryLogs: [] };
      }

      ordersBySeller[sellerId].orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
        recommendationId: item.recommendationId || null
      });
      
      ordersBySeller[sellerId].inventoryLogs.push({
        productId: product.id,
        quantity: item.quantity
      });

      ordersBySeller[sellerId].totalAmount += (product.price * item.quantity);
    }

    await prisma.$transaction(async (tx) => {
      for (const [sellerId, data] of Object.entries(ordersBySeller)) {
        
        const order = await tx.order.create({
          data: {
            buyerId,
            sellerId,
            totalAmount: data.totalAmount,
            status: 'PENDING',
            shippingAddress,
            items: {
              create: data.orderItems.map(({ recommendationId, ...orderItem }) => orderItem)
            }
          }
        });

        await createPurchaseInteractions({
          tx,
          buyerId,
          orderItems: data.orderItems,
          source: 'checkout'
        });

        const invoice = await tx.invoice.create({
          data: {
            wholesalerId: sellerId,
            orderId: order.id,
            amount: data.totalAmount
          }
        });

        await tx.ledgerEntry.create({
          data: {
            wholesalerId: sellerId,
            userId: buyerId,
            amount: -data.totalAmount,
            description: `Marketplace Order ${order.id}`,
            referenceId: invoice.id
          }
        });

        for (const log of data.inventoryLogs) {
          await tx.inventoryLog.create({
            data: {
              wholesalerId: sellerId,
              productId: log.productId,
              changeAmount: -log.quantity,
              reason: 'SALE'
            }
          });

          await tx.product.update({
            where: { id: log.productId },
            data: { currentStock: { decrement: log.quantity } }
          });
        }
      }
    });

    res.status(201).json({ message: 'Checkout successful!' });
  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(400).json({ error: error.message || 'Failed to process checkout' });
  }
};
export const getOrders = async (req, res) => {
  try {
    let orders = [];

    if (req.user.role === 'WHOLESALER' && req.user.wholesalerId) {
      orders = await prisma.order.findMany({
        where: { sellerId: req.user.wholesalerId },
        include: {
          buyer: { select: { name: true, email: true } },
          invoice: true,
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      orders = await prisma.order.findMany({
        where: { buyerId: req.user.userId },
        include: {
          seller: { select: { businessName: true } },
          invoice: true,
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.status(200).json({ orders });
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

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.sellerId !== sellerId) {
      return res.status(403).json({ error: 'Not authorized to update this order' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({ message: 'Order status updated successfully', order: updatedOrder });
  } catch (error) {
    console.error('Update Order Error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
