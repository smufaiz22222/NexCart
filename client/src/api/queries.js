import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './axios';

// ==========================================
// 1. PRODUCT DOMAIN QUERIES & MUTATIONS
// ==========================================

export const productKeys = {
  all: ['products'],
  lists: () => [...productKeys.all, 'list'],
  marketplace: () => [...productKeys.all, 'marketplace'],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
  similars: () => [...productKeys.all, 'similar'],
  similar: (id) => [...productKeys.similars(), id],
  trending: () => [...productKeys.all, 'trending'],
  recommendations: () => [...productKeys.all, 'recommendations'],
};

// Fetchers
export const fetchProducts = async () => {
  const response = await apiClient.get('/products');
  return response.data.products || [];
};

export const fetchMarketplaceProducts = async () => {
  const response = await apiClient.get('/products/marketplace');
  return response.data.products || [];
};

export const fetchProductDetail = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const fetchSimilarProducts = async (id) => {
  const response = await apiClient.get(`/recommendations/products/${id}/similar?limit=8`);
  return response.data;
};

export const fetchTrendingProducts = async () => {
  const response = await apiClient.get('/recommendations/popular?scope=trending&limit=100');
  return response.data;
};

// Hooks
export const useProducts = () => {
  return useQuery({
    queryKey: productKeys.lists(),
    queryFn: fetchProducts,
  });
};

export const useMarketplaceProducts = () => {
  return useQuery({
    queryKey: productKeys.marketplace(),
    queryFn: fetchMarketplaceProducts,
  });
};

export const useProductDetail = (id) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => fetchProductDetail(id),
    enabled: !!id,
  });
};

export const useSimilarProducts = (id) => {
  return useQuery({
    queryKey: productKeys.similar(id),
    queryFn: () => fetchSimilarProducts(id),
    enabled: !!id,
  });
};

export const useTrendingProducts = () => {
  return useQuery({
    queryKey: productKeys.trending(),
    queryFn: fetchTrendingProducts,
  });
};

export const fetchUserRecommendations = async () => {
  const response = await apiClient.get('/recommendations/user?limit=8');
  return response.data;
};

export const useUserRecommendations = () => {
  return useQuery({
    queryKey: productKeys.recommendations(),
    queryFn: fetchUserRecommendations,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const response = await apiClient.post('/products', formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

export const useSubmitReview = (productId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rating, comment }) => {
      const response = await apiClient.post(`/products/${productId}/reviews`, { rating, comment });
      return response.data;
    },
    // Optimistic Update
    onMutate: async (newReview) => {
      // Cancel refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: productKeys.detail(productId) });

      // Snapshot the previous product details
      const previousProduct = queryClient.getQueryData(productKeys.detail(productId));

      // Optimistically update the cache
      if (previousProduct) {
        queryClient.setQueryData(productKeys.detail(productId), {
          ...previousProduct,
          reviews: [
            {
              id: 'optimistic_' + Date.now(),
              rating: newReview.rating,
              comment: newReview.comment,
              createdAt: new Date().toISOString(),
              user: { name: 'You (submitting...)' },
            },
            ...(previousProduct.reviews || []),
          ],
          reviewCount: Number(previousProduct.reviewCount || 0) + 1,
        });
      }

      // Return context with previous details so we can roll back on error
      return { previousProduct };
    },
    onError: (err, newReview, context) => {
      if (context?.previousProduct) {
        queryClient.setQueryData(productKeys.detail(productId), context.previousProduct);
      }
    },
    onSettled: () => {
      // Invalidate to fetch fresh, authoritative data from backend
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};

// ==========================================
// 2. INVENTORY DOMAIN QUERIES & MUTATIONS
// ==========================================

export const inventoryKeys = {
  all: ['inventory'],
  logs: () => [...inventoryKeys.all, 'logs'],
};

export const fetchInventoryLogs = async () => {
  const response = await apiClient.get('/inventory');
  return response.data.logs || [];
};

export const useInventoryLogs = () => {
  return useQuery({
    queryKey: inventoryKeys.logs(),
    queryFn: fetchInventoryLogs,
  });
};

export const useAdjustStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, changeAmount, reason }) => {
      const response = await apiClient.post('/inventory', { productId, changeAmount, reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.logs() });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

// ==========================================
// 3. LEDGER DOMAIN QUERIES & MUTATIONS
// ==========================================

export const ledgerKeys = {
  all: ['ledger'],
  entries: () => [...ledgerKeys.all, 'entries'],
  myLedger: () => [...ledgerKeys.all, 'myLedger'],
};

export const fetchLedgerEntries = async () => {
  const response = await apiClient.get('/ledger');
  return response.data.entries || [];
};

export const useLedgerEntries = () => {
  return useQuery({
    queryKey: ledgerKeys.entries(),
    queryFn: fetchLedgerEntries,
  });
};

export const fetchMyLedger = async () => {
  const response = await apiClient.get('/ledger/my-ledger');
  return response.data || { balance: '0.00', entriesCount: 0, entries: [] };
};

export const useMyLedger = () => {
  return useQuery({
    queryKey: ledgerKeys.myLedger(),
    queryFn: fetchMyLedger,
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const response = await apiClient.post('/ledger/payment', formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.entries() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.myLedger() });
      queryClient.invalidateQueries({ queryKey: b2bKeys.buyerCreditStatus() });
    },
  });
};

// ==========================================
// 4. ORDERS DOMAIN QUERIES & MUTATIONS
// ==========================================

export const orderKeys = {
  all: ['orders'],
  lists: () => [...orderKeys.all, 'list'],
};

export const fetchOrders = async () => {
  const response = await apiClient.get('/orders');
  return response.data.orders || [];
};

export const useOrders = () => {
  return useQuery({
    queryKey: orderKeys.lists(),
    queryFn: fetchOrders,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }) => {
      const response = await apiClient.put(`/orders/${orderId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useCancelOrderItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId }) => {
      const response = await apiClient.post(`/orders/${orderId}/items/${itemId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useRetryRefund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId }) => {
      const response = await apiClient.post(`/orders/${orderId}/items/${itemId}/retry-refund`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useRequestReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId, reason, notes, quantity }) => {
      const response = await apiClient.post(`/orders/${orderId}/items/${itemId}/request-return`, {
        reason,
        notes,
        quantity,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useApproveReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId }) => {
      const response = await apiClient.post(`/orders/${orderId}/items/${itemId}/approve-return`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useRejectReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId, rejectionReason }) => {
      const response = await apiClient.post(`/orders/${orderId}/items/${itemId}/reject-return`, {
        rejectionReason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useReceiveReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId }) => {
      const response = await apiClient.post(`/orders/${orderId}/items/${itemId}/receive-return`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useRetryReturnRefund = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId }) => {
      const response = await apiClient.post(
        `/orders/${orderId}/items/${itemId}/retry-return-refund`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useSubmitOrderIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      type,
      orderItemId,
      preferredResolution,
      requestedQuantity,
      reason,
      description,
    }) => {
      const response = await apiClient.post(`/orders/${orderId}/issues`, {
        type,
        orderItemId: orderItemId || null,
        preferredResolution,
        requestedQuantity: parseInt(requestedQuantity, 10),
        reason,
        description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useReviewOrderIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ issueId, status, finalResolution, sellerResponse, refundAmount }) => {
      const response = await apiClient.put(`/orders/issues/${issueId}`, {
        status,
        finalResolution,
        sellerResponse,
        refundAmount: refundAmount ? parseFloat(refundAmount) : null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useCreateDispute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId, reason, description, evidenceUrls = [] }) => {
      const response = await apiClient.post(`/orders/${orderId}/items/${itemId}/disputes`, {
        reason,
        description,
        evidenceUrls,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useMoveDisputeToReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId, disputeId, updatedAt }) => {
      const response = await apiClient.patch(
        `/orders/${orderId}/items/${itemId}/disputes/${disputeId}/status`,
        {
          status: 'UNDER_REVIEW',
          updatedAt,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useResolveDispute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      disputeId,
      updatedAt,
      resolutionType,
      resolutionNotes,
      resolutionAmount,
      allowDirectResolution,
    }) => {
      const response = await apiClient.patch(
        `/orders/${orderId}/items/${itemId}/disputes/${disputeId}/resolve`,
        {
          updatedAt,
          resolutionType,
          resolutionNotes,
          resolutionAmount: resolutionAmount ? parseFloat(resolutionAmount) : null,
          allowDirectResolution,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

export const useCreateDisputeInternalNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, itemId, disputeId, updatedAt, note }) => {
      const response = await apiClient.post(
        `/orders/${orderId}/items/${itemId}/disputes/${disputeId}/internal-notes`,
        {
          updatedAt,
          note,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

// ==========================================
// 5. B2B & B2C HYBRID PLATFORM HOOKS
// ==========================================

export const b2bKeys = {
  all: ['b2b'],
  applications: () => [...b2bKeys.all, 'applications'],
  rfqs: () => [...b2bKeys.all, 'rfqs'],
  wholesalerBuyers: () => [...b2bKeys.all, 'wholesalerBuyers'],
  buyerCreditStatus: () => [...b2bKeys.all, 'buyerCreditStatus'],
};

export const useB2BRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData) => {
      const response = await apiClient.post('/b2b/register', formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.all });
    },
  });
};

export const useB2BApplications = () => {
  return useQuery({
    queryKey: b2bKeys.applications(),
    queryFn: async () => {
      const response = await apiClient.get('/b2b/applications');
      return response.data.applications || [];
    },
  });
};

export const useB2BApprove = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, verification, rejectionReason, creditLimit }) => {
      const response = await apiClient.post(`/b2b/admin/approve/${id}`, {
        verification,
        rejectionReason,
        creditLimit,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.applications() });
    },
  });
};

export const useCreateRfq = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, quantity, targetPrice, notes }) => {
      const response = await apiClient.post('/b2b/rfq', {
        productId,
        quantity,
        targetPrice,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.rfqs() });
    },
  });
};

export const useRfqs = () => {
  return useQuery({
    queryKey: b2bKeys.rfqs(),
    queryFn: async () => {
      const response = await apiClient.get('/b2b/rfq');
      return response.data.rfqs || [];
    },
  });
};

export const useRespondRfq = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, counterPrice, sellerNotes }) => {
      const response = await apiClient.patch(`/b2b/rfq/${id}`, {
        status,
        counterPrice,
        sellerNotes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.rfqs() });
    },
  });
};

export const useAcceptQuote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const response = await apiClient.post(`/b2b/rfq/${id}/accept`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.rfqs() });
    },
  });
};

export const useBuyerRespondRfq = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, targetPrice, notes }) => {
      const response = await apiClient.post(`/b2b/rfq/${id}/buyer-respond`, {
        status,
        targetPrice,
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.rfqs() });
    },
  });
};

export const useUpdateProductTiers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, tiers }) => {
      const response = await apiClient.post(`/b2b/products/${productId}/tiers`, { tiers });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useWholesalerBuyers = () => {
  return useQuery({
    queryKey: b2bKeys.wholesalerBuyers(),
    queryFn: async () => {
      const response = await apiClient.get('/b2b/wholesaler/buyers');
      return response.data.buyers || [];
    },
  });
};

export const useUpdateCreditLimit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ buyerId, creditLimit }) => {
      const response = await apiClient.post(`/b2b/wholesaler/buyers/${buyerId}/credit-limit`, { creditLimit });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.wholesalerBuyers() });
      queryClient.invalidateQueries({ queryKey: b2bKeys.buyerCreditStatus() });
    },
  });
};

export const useBuyerCreditStatus = () => {
  return useQuery({
    queryKey: b2bKeys.buyerCreditStatus(),
    queryFn: async () => {
      const response = await apiClient.get('/b2b/buyer/credit-limits');
      return response.data;
    },
  });
};


