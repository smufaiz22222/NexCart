import { prisma } from '../config/db.js';
import { createPurchaseInteractions } from '../services/interactionService.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const PAYMENT_METHODS = {
  COD: 'COD',
  PREPAID: 'PREPAID'
};

const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED'
};

const ORDER_ISSUE_TYPES = {
  RETURN: 'RETURN',
  REFUND: 'REFUND',
  DISPUTE: 'DISPUTE'
};

const ORDER_ISSUE_STATUSES = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED'
};

const ORDER_ISSUE_RESOLUTIONS = {
  NONE: 'NONE',
  REFUND: 'REFUND',
  REPLACEMENT: 'REPLACEMENT',
  STORE_CREDIT: 'STORE_CREDIT',
  RETURNLESS_REFUND: 'RETURNLESS_REFUND'
};

const ORDER_INCLUDE_FOR_RESPONSE = {
  buyer: { select: { id: true, name: true, email: true } },
  seller: { select: { id: true, businessName: true } },
  invoice: true,
  items: { include: { product: true } },
  issues: {
    include: {
      requester: { select: { id: true, name: true, role: true } },
      orderItem: {
        include: {
          product: { select: { id: true, name: true, imageUrl: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }
};

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

const validateCheckoutInput = ({ items, shippingAddress, paymentMethod }) => {
  if (!items || items.length === 0) {
    const error = new Error('Cart is empty');
    error.statusCode = 400;
    throw error;
  }
  if (!shippingAddress?.trim()) {
    const error = new Error('Shipping address is required');
    error.statusCode = 400;
    throw error;
  }
  if (!paymentMethod || !Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
    const error = new Error('A valid payment method is required');
    error.statusCode = 400;
    throw error;
  }
};

const buildOrdersBySeller = async (items) => {
  const productIds = items.map((item) => item.productId);
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds } }
  });

  const ordersBySeller = {};

  for (const item of items) {
    const product = dbProducts.find((entry) => entry.id === item.productId);

    if (!product) {
      const error = new Error(`Product ${item.productId} not found`);
      error.statusCode = 400;
      throw error;
    }

    if (product.currentStock < item.quantity) {
      const error = new Error(`Not enough stock for ${product.name}`);
      error.statusCode = 400;
      throw error;
    }

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

    ordersBySeller[sellerId].totalAmount += product.price * item.quantity;
  }

  return ordersBySeller;
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

const applyIssueResolutionSideEffects = async ({ tx, issue, order, nextStatus, nextResolution }) => {
  const updates = {};

  const shouldRestock =
    issue.type === ORDER_ISSUE_TYPES.RETURN &&
    nextStatus === ORDER_ISSUE_STATUSES.RESOLVED &&
    !issue.inventoryAdjusted &&
    issue.orderItem &&
    [ORDER_ISSUE_RESOLUTIONS.REFUND, ORDER_ISSUE_RESOLUTIONS.REPLACEMENT, ORDER_ISSUE_RESOLUTIONS.STORE_CREDIT].includes(nextResolution);

  if (shouldRestock) {
    await tx.inventoryLog.create({
      data: {
        wholesalerId: order.sellerId,
        productId: issue.orderItem.productId,
        changeAmount: issue.requestedQuantity,
        reason: 'REFUND'
      }
    });

    await tx.product.update({
      where: { id: issue.orderItem.productId },
      data: { currentStock: { increment: issue.requestedQuantity } }
    });

    updates.inventoryAdjusted = true;
  }

  const isRefundResolution = [ORDER_ISSUE_RESOLUTIONS.REFUND, ORDER_ISSUE_RESOLUTIONS.RETURNLESS_REFUND].includes(nextResolution);
  const orderWasPaid = [PAYMENT_STATUSES.PAID, PAYMENT_STATUSES.REFUND_PENDING].includes(order.paymentStatus);

  if (isRefundResolution && orderWasPaid && nextStatus === ORDER_ISSUE_STATUSES.APPROVED) {
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: PAYMENT_STATUSES.REFUND_PENDING }
    });
  }

  if (isRefundResolution && orderWasPaid && nextStatus === ORDER_ISSUE_STATUSES.RESOLVED) {
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: PAYMENT_STATUSES.REFUNDED }
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
  shippingAddress,
  paymentMethod,
  paymentStatus,
  paymentProvider = null,
  paymentReference = null
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
        paymentProvider,
        paymentReference,
        shippingAddress,
        items: {
          create: data.orderItems.map(({ recommendationId, ...orderItem }) => orderItem)
        }
      },
      include: {
        items: { include: { product: true } },
        invoice: true
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

    createdOrders.push(order);
  }

  return createdOrders;
};

export const checkout = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const buyerId = req.user.userId;
    validateCheckoutInput({ items, shippingAddress, paymentMethod });

    if (paymentMethod !== PAYMENT_METHODS.COD) {
      return res.status(400).json({ error: 'Use prepaid checkout endpoints for prepaid orders' });
    }

    const ordersBySeller = await buildOrdersBySeller(items);

    const createdOrders = await prisma.$transaction(async (tx) => {
      return createOrdersFromGroupedData({
        tx,
        buyerId,
        ordersBySeller,
        shippingAddress,
        paymentMethod: PAYMENT_METHODS.COD,
        paymentStatus: PAYMENT_STATUSES.PENDING
      });
    });

    res.status(201).json({ message: 'Checkout successful!', orders: createdOrders });
  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(error.statusCode || 400).json({ error: error.message || 'Failed to process checkout' });
  }
};

export const createPrepaidOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const buyerId = req.user.userId;
    validateCheckoutInput({ items, shippingAddress, paymentMethod });

    if (paymentMethod !== PAYMENT_METHODS.PREPAID) {
      return res.status(400).json({ error: 'Payment method must be PREPAID' });
    }

    const ordersBySeller = await buildOrdersBySeller(items);
    const totalAmount = Object.values(ordersBySeller).reduce((sum, sellerOrder) => sum + sellerOrder.totalAmount, 0);

    const razorpay = getRazorpayClient();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: `nexcart_${buyerId.slice(0, 8)}_${Date.now()}`
    });

    await prisma.prepaidCheckoutSession.create({
      data: {
        buyerId,
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        payload: {
          items,
          shippingAddress,
          paymentMethod
        },
        paymentStatus: PAYMENT_STATUSES.PENDING
      }
    });

    res.status(201).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      buyerId,
      shippingAddress
    });
  } catch (error) {
    console.error('Create Prepaid Order Error:', error);
    res.status(error.statusCode || 400).json({ error: error.message || 'Failed to initialize prepaid checkout' });
  }
};

export const verifyPrepaidOrder = async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body;
    const buyerId = req.user.userId;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing Razorpay verification fields' });
    }

    const session = await prisma.prepaidCheckoutSession.findUnique({
      where: { razorpayOrderId }
    });

    if (!session || session.buyerId !== buyerId) {
      return res.status(404).json({ error: 'Prepaid checkout session not found' });
    }

    if (session.paymentStatus === PAYMENT_STATUSES.PAID) {
      return res.status(200).json({ message: 'Payment already verified' });
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
          paymentReference: razorpayPaymentId
        }
      });
      return res.status(400).json({ error: 'Invalid Razorpay payment signature' });
    }

    const payload = session.payload;
    const ordersBySeller = await buildOrdersBySeller(payload.items || []);
    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = await createOrdersFromGroupedData({
        tx,
        buyerId,
        ordersBySeller,
        shippingAddress: payload.shippingAddress,
        paymentMethod: PAYMENT_METHODS.PREPAID,
        paymentStatus: PAYMENT_STATUSES.PAID,
        paymentProvider: 'razorpay',
        paymentReference: `${razorpayOrderId}:${razorpayPaymentId}`
      });

      await tx.prepaidCheckoutSession.update({
        where: { razorpayOrderId },
        data: {
          paymentStatus: PAYMENT_STATUSES.PAID,
          paymentReference: razorpayPaymentId
        }
      });

      return orders;
    });

    res.status(201).json({
      message: 'Prepaid checkout successful!',
      orders: createdOrders
    });
  } catch (error) {
    console.error('Verify Prepaid Order Error:', error);
    res.status(error.statusCode || 400).json({ error: error.message || 'Failed to verify prepaid checkout' });
  }
};
export const getOrders = async (req, res) => {
  try {
    let orders = [];

    if (req.user.role === 'WHOLESALER' && req.user.wholesalerId) {
      orders = await prisma.order.findMany({
        where: { sellerId: req.user.wholesalerId },
        include: ORDER_INCLUDE_FOR_RESPONSE,
        orderBy: { createdAt: 'desc' }
      });
    } else {
      orders = await prisma.order.findMany({
        where: { buyerId: req.user.userId },
        include: ORDER_INCLUDE_FOR_RESPONSE,
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

export const createOrderIssue = async (req, res) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can create return, refund, or dispute requests' });
    }

    const { id: orderId } = req.params;
    const {
      orderItemId = null,
      type,
      preferredResolution,
      reason,
      description,
      requestedQuantity = 1
    } = req.body;

    if (!Object.values(ORDER_ISSUE_TYPES).includes(type)) {
      return res.status(400).json({ error: 'Invalid issue type' });
    }

    if (!reason?.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    if (!order || order.buyerId !== req.user.userId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!canOpenIssueForOrder(order.status, type)) {
      return res.status(400).json({ error: 'This order is not eligible for that request type yet' });
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
        requestedQuantity: parsedQuantity
      },
      include: {
        requester: { select: { id: true, name: true, role: true } },
        orderItem: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } }
          }
        }
      }
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
        orderItem: true
      }
    });

    if (!issue || issue.order.sellerId !== req.user.wholesalerId) {
      return res.status(404).json({ error: 'Order issue not found' });
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
        nextResolution
      });

      return tx.orderIssue.update({
        where: { id: issueId },
        data: {
          status,
          finalResolution: nextResolution,
          sellerResponse: sellerResponse?.trim() || null,
          refundAmount: Number.isFinite(parsedRefundAmount) ? parsedRefundAmount : null,
          ...sideEffectUpdates
        },
        include: {
          requester: { select: { id: true, name: true, role: true } },
          orderItem: {
            include: {
              product: { select: { id: true, name: true, imageUrl: true } }
            }
          }
        }
      });
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id: issue.orderId },
      include: ORDER_INCLUDE_FOR_RESPONSE
    });

    res.status(200).json({ message: 'Order issue updated successfully', issue: updatedIssue, order: updatedOrder });
  } catch (error) {
    console.error('Update Order Issue Error:', error);
    res.status(500).json({ error: 'Failed to update order issue' });
  }
};
