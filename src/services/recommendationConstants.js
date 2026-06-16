export const INTERACTION_WEIGHTS = {
  view: 1,
  wishlist: 3,
  cart: 4,
  purchase: 7,
  review: 5,
};

export const HYBRID_WEIGHTS = {
  content: 0.45,
  collaborative: 0.3,
  popularity: 0.2,
  review: 0.05,
};

export const VALID_INTERACTION_ACTIONS = Object.keys(INTERACTION_WEIGHTS);
export const VALID_RECOMMENDATION_EVENTS = ['impression', 'click', 'cart', 'purchase'];
