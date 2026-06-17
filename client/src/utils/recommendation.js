/**
 * Shared utility to track a recommendation click and navigate to the product details page
 * with recommendation attribution context.
 */
export const trackRecommendationClick = ({
  apiClient,
  navigate,
  product,
  recommendationId,
  source = 'unknown',
  isAuthenticated = false,
}) => {
  let recommendationContext = null;

  if (recommendationId) {
    recommendationContext = {
      recommendationId,
      productId: product.id,
      source,
    };

    if (isAuthenticated) {
      apiClient
        .post('/interactions/recommendation-event', {
          recommendationId,
          productId: product.id,
          eventType: 'click',
        })
        .catch((error) => console.error('Failed to log recommendation click:', error));
    }
  }

  navigate(
    `/store/product/${product.id}`,
    recommendationContext ? { state: { recommendationContext } } : undefined
  );
};
