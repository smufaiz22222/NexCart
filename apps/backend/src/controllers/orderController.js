import { prisma } from '../config/db.js';

// --- SMART CHECKOUT (MARKETPLACE CART) ---
export const checkout = async (req, res) => {
  try {
    const { items } = req.body;
    const buyerId = req.user.userId; // The Global User ID from JWT

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // 1. Fetch real products from DB to verify stock and prevent price hacking
    const productIds = items.map(item => item.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    // 2. Group cart items by Wholesaler (Seller)
    const ordersBySeller = {};
    
    for (const item of items) {
      const product = dbProducts.find(p => p.id === item.productId);
      
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.currentStock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);

      const sellerId = product.wholesalerId;
      if (!ordersBySeller[sellerId]) {
        ordersBySeller[sellerId] = { totalAmount: 0, orderItems: [], inventoryLogs: [] };
      }

      // Track items and prices
      ordersBySeller[sellerId].orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      });
      
      // Track stock changes
      ordersBySeller[sellerId].inventoryLogs.push({
        productId: product.id,
        quantity: item.quantity
      });

      ordersBySeller[sellerId].totalAmount += (product.price * item.quantity);
    }

    // 3. Execute Massive Database Transaction for ALL sellers at once
    await prisma.$transaction(async (tx) => {
      for (const [sellerId, data] of Object.entries(ordersBySeller)) {
        
        // A. Create Order
        const order = await tx.order.create({
          data: {
            buyerId,
            sellerId,
            totalAmount: data.totalAmount,
            status: 'PENDING',
            items: { create: data.orderItems }
          }
        });

        // B. Create Invoice
        const invoice = await tx.invoice.create({
          data: {
            wholesalerId: sellerId,
            orderId: order.id,
            amount: data.totalAmount
          }
        });

        // C. Create Ledger Entry (Records that the Buyer owes the Seller money)
        await tx.ledgerEntry.create({
          data: {
            wholesalerId: sellerId,
            userId: buyerId, // Global User
            amount: -data.totalAmount, // Negative = Debt for buyer / Sale for seller
            description: `Marketplace Order ${order.id}`,
            referenceId: invoice.id
          }
        });

        // D. Update Inventory & Create Logs
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

// --- GET ORDERS (Handles both Buyer and Seller views) ---
export const getOrders = async (req, res) => {
  try {
    let orders = [];

    // SELLER VIEW: Wholesaler checking their incoming orders
    if (req.user.role === 'WHOLESALER' && req.user.wholesalerId) {
      orders = await prisma.order.findMany({
        where: { sellerId: req.user.wholesalerId },
        include: {
          buyer: { select: { name: true, email: true } }, // Show who bought it
          invoice: true,
          items: { include: { product: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } 
    // BUYER VIEW: Customer checking what they bought
    else {
      orders = await prisma.order.findMany({
        where: { buyerId: req.user.userId },
        include: {
          seller: { select: { businessName: true } }, // Show the shop name
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
// --- UPDATE ORDER STATUS (SELLER ACTION) ---
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params; // The Order ID
    const { status } = req.body; // The new status (e.g., 'SHIPPED')
    const sellerId = req.user.wholesalerId;

    // 1. Verify the order actually belongs to this wholesaler
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.sellerId !== sellerId) {
      return res.status(403).json({ error: 'Not authorized to update this order' });
    }

    // 2. Update it
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