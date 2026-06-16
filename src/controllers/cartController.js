import { prisma } from '../config/db.js';
import { validateRecommendationAttribution } from '../services/interactionService.js';

const buildCartError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const requireCustomer = (req) => {
  if (req.user.role !== 'CUSTOMER') {
    throw buildCartError('Only customers can access cart operations', 403);
  }
};

export const validateQuantity = (quantity) => {
  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    throw buildCartError('Quantity must be a positive integer');
  }
  return parsedQuantity;
};

export const validateSelectedSize = (product, selectedSize) => {
  const normalizedSelectedSize = selectedSize?.trim() || null;

  if (!product.sizes?.length) {
    return null;
  }

  if (!normalizedSelectedSize) {
    throw buildCartError('Please select a valid size for this product');
  }

  if (!product.sizes.includes(normalizedSelectedSize)) {
    throw buildCartError(`Selected size "${normalizedSelectedSize}" is not available`);
  }

  return normalizedSelectedSize;
};

const getOrCreateCart = async (userId) =>
  prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

const getHydratedCart = async (userId) => {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              wholesaler: {
                select: { businessName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const items = (cart?.items || []).map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    imageUrl: item.product.imageUrl,
    price: Number(item.product.price),
    wholesaler: item.product.wholesaler,
    selectedSize: item.selectedSize || null,
    quantity: item.quantity,
    currentStock: item.product.currentStock,
    product: item.product,
    lineTotal: Number(item.product.price) * item.quantity,
    productSnapshot: {
      id: item.product.id,
      imageUrl: item.product.imageUrl,
      name: item.product.name,
      seller: item.product.wholesaler?.businessName || 'Unknown shop',
      category: item.product.category,
      price: Number(item.product.price),
    },
  }));

  return {
    id: cart?.id || null,
    cart: items,
    items,
    totals: {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    },
  };
};

const getProductForCart = async (productId) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw buildCartError('Product not found', 404);
  }

  if (product.currentStock <= 0) {
    throw buildCartError(`${product.name} is out of stock`);
  }

  return product;
};

const resolveRecommendationFields = async ({
  recommendationId,
  recommendationSource,
  productId,
  userId,
}) => {
  const normalizedRecommendationId = recommendationId?.trim() || null;
  const normalizedRecommendationSource = recommendationSource?.trim() || null;

  if (!normalizedRecommendationId) {
    return {
      recommendationId: null,
      recommendationSource: null,
    };
  }

  await validateRecommendationAttribution({
    recommendationId: normalizedRecommendationId,
    productId,
    userId,
  });

  return {
    recommendationId: normalizedRecommendationId,
    recommendationSource: normalizedRecommendationSource,
  };
};

export const getCart = async (req, res) => {
  try {
    requireCustomer(req);
    const cart = await getHydratedCart(req.user.userId);
    res.status(200).json(cart);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load cart' });
  }
};

export const addCartItem = async (req, res) => {
  try {
    requireCustomer(req);
    const {
      productId,
      quantity = 1,
      selectedSize = null,
      recommendationId = null,
      recommendationSource = null,
    } = req.body;
    const userId = req.user.userId;
    const requestedQuantity = validateQuantity(quantity);
    const product = await getProductForCart(productId);
    const normalizedSelectedSize = validateSelectedSize(product, selectedSize);
    const attribution = await resolveRecommendationFields({
      recommendationId,
      recommendationSource,
      productId,
      userId,
    });
    const cart = await getOrCreateCart(userId);

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        selectedSize: normalizedSelectedSize,
      },
    });

    const nextQuantity = (existingItem?.quantity || 0) + requestedQuantity;
    if (nextQuantity > product.currentStock) {
      throw buildCartError(`Only ${product.currentStock} units available for ${product.name}`);
    }

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: nextQuantity,
          recommendationId: existingItem.recommendationId || attribution.recommendationId,
          recommendationSource:
            existingItem.recommendationSource || attribution.recommendationSource,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          selectedSize: normalizedSelectedSize,
          quantity: requestedQuantity,
          recommendationId: attribution.recommendationId,
          recommendationSource: attribution.recommendationSource,
        },
      });
    }

    res.status(200).json(await getHydratedCart(userId));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to add item' });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    requireCustomer(req);
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;
    const nextQuantity = validateQuantity(quantity);

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw buildCartError('Cart item not found', 404);
    }

    validateSelectedSize(cartItem.product, cartItem.selectedSize);
    if (nextQuantity > cartItem.product.currentStock) {
      throw buildCartError(
        `Only ${cartItem.product.currentStock} units available for ${cartItem.product.name}`
      );
    }

    await prisma.cartItem.update({
      where: { id },
      data: { quantity: nextQuantity },
    });

    res.status(200).json(await getHydratedCart(userId));
  } catch (error) {
    res
      .status(error.statusCode || 500)
      .json({ error: error.message || 'Failed to update cart item' });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    requireCustomer(req);
    const { id } = req.params;
    const userId = req.user.userId;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      throw buildCartError('Cart item not found', 404);
    }

    await prisma.cartItem.delete({ where: { id } });
    res.status(200).json(await getHydratedCart(userId));
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to remove item' });
  }
};

export const clearCart = async (req, res) => {
  try {
    requireCustomer(req);
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.userId } });

    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    res
      .status(200)
      .json({ id: cart?.id || null, cart: [], items: [], totals: { itemCount: 0, subtotal: 0 } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to clear cart' });
  }
};
