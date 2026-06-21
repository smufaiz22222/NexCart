import { prisma } from '../config/db.js';

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const requireApprovedB2B = async (req) => {
  if (req.user.role !== 'CUSTOMER') {
    throw buildError('Only customers can access B2B cart operations', 403);
  }

  const businessProfile = await prisma.businessProfile.findUnique({
    where: { userId: req.user.userId },
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

const getOrCreateB2BCart = async (userId) =>
  prisma.b2BCart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

const getHydratedB2BCart = async (userId) => {
  const cart = await prisma.b2BCart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              wholesaler: {
                select: {
                  id: true,
                  businessName: true,
                  bankName: true,
                  bankAccountNo: true,
                  bankIfsc: true,
                  upiId: true,
                  qrCodeUrl: true,
                },
              },
            },
          },
          rfq: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const items = (cart?.items || []).map((item) => ({
    id: item.id,
    productId: item.productId,
    rfqId: item.rfqId,
    name: item.product.name,
    imageUrl: item.product.imageUrl,
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    currentStock: item.product.currentStock,
    lineTotal: Number(item.unitPrice) * item.quantity,
    wholesaler: item.product.wholesaler,
    wholesalerName: item.product.wholesaler?.businessName || 'Unknown',
    rfq: item.rfq
      ? {
          id: item.rfq.id,
          status: item.rfq.status,
          targetPrice: item.rfq.targetPrice,
          counterPrice: item.rfq.counterPrice,
          quantity: item.rfq.counterQuantity || item.rfq.quantity,
        }
      : null,
  }));

  return {
    id: cart?.id || null,
    items,
    totals: {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    },
  };
};

export const getB2BCart = async (req, res) => {
  try {
    await requireApprovedB2B(req);
    const data = await getHydratedB2BCart(req.user.userId);
    res.status(200).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load B2B cart' });
  }
};

export const addB2BCartItem = async (req, res) => {
  try {
    await requireApprovedB2B(req);
    const { productId, rfqId, quantity = 1, unitPrice } = req.body;
    const userId = req.user.userId;

    if (!productId) throw buildError('productId is required');
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      throw buildError('Quantity must be a positive integer');
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw buildError('Product not found', 404);
    if (product.currentStock < parsedQuantity) {
      throw buildError(`Only ${product.currentStock} units available for ${product.name}`);
    }

    let resolvedUnitPrice = unitPrice ? Number(unitPrice) : Number(product.price);

    // If rfqId is provided, validate and use RFQ price
    if (rfqId) {
      const rfq = await prisma.rfq.findFirst({
        where: { id: rfqId, buyerId: userId, status: 'ACCEPTED' },
      });
      if (!rfq) throw buildError('No active accepted RFQ found for this item', 404);
      resolvedUnitPrice = rfq.counterPrice || rfq.targetPrice;
    }

    const cart = await getOrCreateB2BCart(userId);

    // Check if there are existing items in the cart belonging to a different seller
    const otherSellerItem = await prisma.b2BCartItem.findFirst({
      where: {
        cartId: cart.id,
        product: {
          wholesalerId: { not: product.wholesalerId },
        },
      },
    });

    if (otherSellerItem) {
      // Clear the cart if it contains items from a different seller
      await prisma.b2BCartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    const existingItem = await prisma.b2BCartItem.findFirst({
      where: { cartId: cart.id, productId, rfqId: rfqId || null },
    });

    if (existingItem) {
      const nextQuantity = existingItem.quantity + parsedQuantity;
      if (nextQuantity > product.currentStock) {
        throw buildError(`Only ${product.currentStock} units available for ${product.name}`);
      }
      await prisma.b2BCartItem.update({
        where: { id: existingItem.id },
        data: { quantity: nextQuantity, unitPrice: resolvedUnitPrice },
      });
    } else {
      await prisma.b2BCartItem.create({
        data: {
          cartId: cart.id,
          productId,
          rfqId: rfqId || null,
          quantity: parsedQuantity,
          unitPrice: resolvedUnitPrice,
        },
      });
    }

    res.status(200).json(await getHydratedB2BCart(userId));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to add item' });
  }
};

export const updateB2BCartItem = async (req, res) => {
  try {
    await requireApprovedB2B(req);
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      throw buildError('Quantity must be a positive integer');
    }

    const cartItem = await prisma.b2BCartItem.findUnique({
      where: { id },
      include: { cart: true, product: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw buildError('Cart item not found', 404);
    }

    if (cartItem.rfqId) {
      throw buildError('Quantity of negotiated RFQ items cannot be modified', 400);
    }

    if (parsedQuantity > cartItem.product.currentStock) {
      throw buildError(
        `Only ${cartItem.product.currentStock} units available for ${cartItem.product.name}`
      );
    }

    await prisma.b2BCartItem.update({
      where: { id },
      data: { quantity: parsedQuantity },
    });

    res.status(200).json(await getHydratedB2BCart(userId));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update item' });
  }
};

export const removeB2BCartItem = async (req, res) => {
  try {
    await requireApprovedB2B(req);
    const { id } = req.params;
    const userId = req.user.userId;

    const cartItem = await prisma.b2BCartItem.findUnique({
      where: { id },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw buildError('Cart item not found', 404);
    }

    await prisma.b2BCartItem.delete({ where: { id } });
    res.status(200).json(await getHydratedB2BCart(userId));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to remove item' });
  }
};

export const clearB2BCart = async (req, res) => {
  try {
    await requireApprovedB2B(req);
    const userId = req.user.userId;

    const cart = await prisma.b2BCart.findUnique({ where: { userId } });
    if (cart) {
      await prisma.b2BCartItem.deleteMany({ where: { cartId: cart.id } });
    }

    res.status(200).json(await getHydratedB2BCart(userId));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to clear cart' });
  }
};
