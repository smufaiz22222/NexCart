import apiClient from './axios';

export const fetchB2BCart = () => apiClient.get('/b2b-cart');

export const addB2BCartItem = ({ productId, rfqId, quantity, unitPrice }) =>
  apiClient.post('/b2b-cart/items', { productId, rfqId, quantity, unitPrice });

export const updateB2BCartItem = (itemId, quantity) =>
  apiClient.patch(`/b2b-cart/items/${itemId}`, { quantity });

export const removeB2BCartItem = (itemId) => apiClient.delete(`/b2b-cart/items/${itemId}`);

export const clearB2BCart = () => apiClient.delete('/b2b-cart');

export const b2bCheckout = ({ addressId, paymentReferenceNo, paymentReceiptUrl }) =>
  apiClient.post('/b2b-cart/checkout', { addressId, paymentReferenceNo, paymentReceiptUrl });
