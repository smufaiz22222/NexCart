import { useEffect, useRef, startTransition } from 'react';
import apiClient from '../../api/axios';

export function getAttributionStorageKey(productId) {
  return `nexcart:recommendationAttribution:${productId}`;
}

export function isValidAttributionContext(context, productId) {
  return context?.recommendationId && context?.productId === productId;
}

export function useProductAttribution(id, isAuthenticated, locationState) {
  const attributionRecommendationContextRef = useRef(null);
  const loggedImpressionRecommendationIds = useRef(new Set());

  const updateAttributionContext = (context) => {
    attributionRecommendationContextRef.current = context;
  };

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    apiClient
      .post('/interactions', {
        productId: id,
        action: 'view',
        source: 'product_detail',
      })
      .catch((error) => console.error('Failed to log product view:', error));
  }, [id, isAuthenticated]);

  useEffect(() => {
    const incomingContext = locationState?.recommendationContext;

    if (isValidAttributionContext(incomingContext, id)) {
      sessionStorage.setItem(getAttributionStorageKey(id), JSON.stringify(incomingContext));
      startTransition(() => {
        updateAttributionContext(incomingContext);
      });
      return;
    }

    const storedContext = sessionStorage.getItem(getAttributionStorageKey(id));
    if (!storedContext) {
      startTransition(() => {
        updateAttributionContext(null);
      });
      return;
    }

    try {
      const parsedContext = JSON.parse(storedContext);
      startTransition(() => {
        updateAttributionContext(
          isValidAttributionContext(parsedContext, id) ? parsedContext : null
        );
      });
    } catch (error) {
      console.error('Failed to read attribution context:', error);
      sessionStorage.removeItem(getAttributionStorageKey(id));
      startTransition(() => {
        updateAttributionContext(null);
      });
    }
  }, [id, locationState]);

  const logSimilarImpressions = (similarRecommendationId, similarProducts) => {
    if (!isAuthenticated) return;
    if (!similarRecommendationId || similarProducts.length === 0) return;
    if (loggedImpressionRecommendationIds.current.has(similarRecommendationId)) return;

    loggedImpressionRecommendationIds.current.add(similarRecommendationId);
    apiClient
      .post('/interactions/recommendation-events', {
        recommendationId: similarRecommendationId,
        events: similarProducts.map((item) => ({
          productId: item.product.id,
          eventType: 'impression',
        })),
      })
      .catch((error) => console.error('Failed to log similar impressions:', error));
  };

  return {
    attributionRecommendationContextRef,
    logSimilarImpressions,
  };
}
