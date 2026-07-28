import { useMemo } from 'react';

export function useDeliveryDetails(cart) {
  return useMemo(() => {
    if (!cart || cart.length === 0) return { breakdown: [], totalDeliveryFee: 0 };

    const groups = {};
    for (const item of cart) {
      const sellerId = item.product?.wholesalerId || 'unknown';
      if (!groups[sellerId]) {
        groups[sellerId] = {
          sellerName:
            item.wholesaler?.businessName || item.product?.wholesaler?.businessName || 'Seller',
          subtotal: 0,
          rawDeliveryFeeTotal: 0,
          freeDeliveryThreshold: null,
        };
      }
      const price = Number(item.price || 0);
      groups[sellerId].subtotal += price * item.quantity;

      const itemWholesaler = item.product?.wholesaler;
      if (itemWholesaler) {
        groups[sellerId].freeDeliveryThreshold =
          itemWholesaler.freeDeliveryThreshold !== undefined &&
          itemWholesaler.freeDeliveryThreshold !== null
            ? Number(itemWholesaler.freeDeliveryThreshold)
            : null;
      }

      const prodDeliveryFee = item.product?.deliveryFee;
      const baseFee =
        prodDeliveryFee !== null && prodDeliveryFee !== undefined
          ? Number(prodDeliveryFee)
          : Number(itemWholesaler?.deliveryFee || 0);

      groups[sellerId].rawDeliveryFeeTotal += baseFee * item.quantity;
    }

    const breakdown = Object.keys(groups).map((sellerId) => {
      const g = groups[sellerId];
      let appliedFee = g.rawDeliveryFeeTotal;
      if (g.freeDeliveryThreshold !== null && g.subtotal >= g.freeDeliveryThreshold) {
        appliedFee = 0;
      }
      return {
        sellerId,
        sellerName: g.sellerName,
        subtotal: g.subtotal,
        deliveryFee: appliedFee,
        freeDeliveryThreshold: g.freeDeliveryThreshold,
      };
    });

    const totalDeliveryFee = breakdown.reduce((sum, g) => sum + g.deliveryFee, 0);

    return { breakdown, totalDeliveryFee };
  }, [cart]);
}
