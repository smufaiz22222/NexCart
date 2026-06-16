import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  MessageSquareWarning,
  Package,
  Store,
  Truck,
  Undo2,
  User,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';
import {
  useOrders,
  useUpdateOrderStatus,
  useCancelOrderItem,
  useRetryRefund,
  useRequestReturn,
  useApproveReturn,
  useRejectReturn,
  useReceiveReturn,
  useRetryReturnRefund,
  useSubmitOrderIssue,
  useReviewOrderIssue,
} from '../api/queries';

const CUSTOMER_ISSUE_TEMPLATE = {
  type: 'REFUND',
  orderItemId: '',
  preferredResolution: 'REFUND',
  requestedQuantity: 1,
  reason: '',
  description: '',
};

const WHOLESALER_REVIEW_TEMPLATE = {
  status: 'IN_REVIEW',
  finalResolution: 'REFUND',
  sellerResponse: '',
  refundAmount: '',
};

const issueTypeLabel = {
  RETURN: 'Return',
  REFUND: 'Refund',
  DISPUTE: 'Dispute',
};

const issueStatusClass = {
  OPEN: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  IN_REVIEW: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-300 border-red-500/20',
  RESOLVED: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
};

const resolutionLabel = {
  NONE: 'Pending resolution',
  REFUND: 'Refund',
  REPLACEMENT: 'Replacement',
  STORE_CREDIT: 'Store credit',
  RETURNLESS_REFUND: 'Returnless refund',
};

const CUSTOMER_CANCELLABLE_STATUSES = new Set(['PENDING', 'PROCESSING']);
const RETURN_REASON_OPTIONS = [
  'WRONG_ITEM',
  'DAMAGED',
  'DEFECTIVE',
  'CHANGED_MIND',
  'MISSING_PARTS',
  'OTHER',
];

const formatReturnReason = (reason) =>
  String(reason || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getReturnBadge = (item) => {
  if (!item.returnStatus || item.returnStatus === 'NONE') return null;

  const labelMap = {
    REQUESTED: 'Return Requested',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    RECEIVED:
      item.returnRefundStatus === 'PROCESSING'
        ? 'Refund Processing'
        : item.returnRefundStatus === 'FAILED'
          ? 'Refund Failed'
          : 'Awaiting Refund',
    RETURN_COMPLETED: 'Return Completed',
  };

  const className =
    item.returnStatus === 'RETURN_COMPLETED'
      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
      : item.returnStatus === 'REJECTED' || item.returnRefundStatus === 'FAILED'
        ? 'bg-red-500/10 text-red-300 border-red-500/20'
        : 'bg-amber-500/10 text-amber-300 border-amber-500/20';

  return (
    <span
      className={`px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold border ${className}`}
    >
      {labelMap[item.returnStatus] || item.returnStatus.replaceAll('_', ' ')}
    </span>
  );
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'PENDING':
      return (
        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center">
          <Clock className="w-3 h-3 mr-1.5" /> Pending
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center">
          <Package className="w-3 h-3 mr-1.5" /> Processing
        </span>
      );
    case 'SHIPPED':
      return (
        <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center">
          <Truck className="w-3 h-3 mr-1.5" /> Shipped
        </span>
      );
    case 'DELIVERED':
      return (
        <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center">
          <CheckCircle className="w-3 h-3 mr-1.5" /> Delivered
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center">
          <AlertCircle className="w-3 h-3 mr-1.5" /> Cancelled
        </span>
      );
    default:
      return (
        <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold">
          {status}
        </span>
      );
  }
};

const getPaymentBadge = (method, status) => {
  const paletteByStatus = {
    PAID: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    REFUNDED: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    REFUND_PENDING: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    FAILED: 'bg-red-500/10 border-red-500/20 text-red-300',
    PENDING: 'bg-zinc-800 border-zinc-700 text-zinc-300',
  };

  return (
    <span
      className={`px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold border ${paletteByStatus[status] || paletteByStatus.PENDING}`}
    >
      {method} · {status.replace('_', ' ')}
    </span>
  );
};

const getIssueStatusBadge = (status) => (
  <span
    className={`px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold border ${issueStatusClass[status] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}
  >
    {status.replace('_', ' ')}
  </span>
);

const canCustomerOpenIssue = (orderStatus) =>
  ['SHIPPED', 'DELIVERED', 'PROCESSING'].includes(orderStatus);

export default function Orders() {
  const [submittingOrderId, setSubmittingOrderId] = useState(null);
  const [reviewingIssueId, setReviewingIssueId] = useState(null);
  const [activeIssueFormOrderId, setActiveIssueFormOrderId] = useState(null);
  const [activeItemActionId, setActiveItemActionId] = useState(null);
  const [issueDrafts, setIssueDrafts] = useState({});
  const [issueReviews, setIssueReviews] = useState({});
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const backPath = user?.role === 'WHOLESALER' ? '/wholesaler' : '/store';

  const { data: orders = [], isLoading, isError, error, isFetching, refetch } = useOrders();

  const updateOrderStatusMutation = useUpdateOrderStatus();
  const cancelOrderItemMutation = useCancelOrderItem();
  const retryRefundMutation = useRetryRefund();
  const requestReturnMutation = useRequestReturn();
  const approveReturnMutation = useApproveReturn();
  const rejectReturnMutation = useRejectReturn();
  const receiveReturnMutation = useReceiveReturn();
  const retryReturnRefundMutation = useRetryReturnRefund();
  const submitIssueMutation = useSubmitOrderIssue();
  const reviewIssueMutation = useReviewOrderIssue();

  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    [orders]
  );

  const setIssueDraftField = (orderId, field, value) => {
    setIssueDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || CUSTOMER_ISSUE_TEMPLATE),
        [field]: value,
      },
    }));
  };

  const setIssueReviewField = (issueId, field, value) => {
    setIssueReviews((prev) => ({
      ...prev,
      [issueId]: {
        ...(prev[issueId] || WHOLESALER_REVIEW_TEMPLATE),
        [field]: value,
      },
    }));
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    updateOrderStatusMutation.mutate(
      { orderId, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Order status updated to ${newStatus}`);
        },
        onError: (err) => {
          console.error('Failed to update status:', err);
          toast.error(err.response?.data?.error || 'Failed to update order status');
        },
      }
    );
  };

  const handleSubmitIssue = async (order) => {
    const draft = issueDrafts[order.id] || CUSTOMER_ISSUE_TEMPLATE;
    setSubmittingOrderId(order.id);

    submitIssueMutation.mutate(
      {
        orderId: order.id,
        ...draft,
      },
      {
        onSuccess: () => {
          setIssueDrafts((prev) => ({ ...prev, [order.id]: CUSTOMER_ISSUE_TEMPLATE }));
          setActiveIssueFormOrderId(null);
          toast.success('Request submitted successfully');
        },
        onError: (err) => {
          console.error('Failed to create order issue:', err);
          toast.error(err.response?.data?.error || 'Failed to create the request');
        },
        onSettled: () => {
          setSubmittingOrderId(null);
        },
      }
    );
  };

  const handleReviewIssue = async (orderId, issueId) => {
    const review = issueReviews[issueId] || WHOLESALER_REVIEW_TEMPLATE;
    setReviewingIssueId(issueId);

    reviewIssueMutation.mutate(
      {
        issueId,
        ...review,
      },
      {
        onSuccess: () => {
          toast.success('Review saved successfully');
        },
        onError: (err) => {
          console.error('Failed to update order issue:', err);
          toast.error(err.response?.data?.error || 'Failed to update the request');
        },
        onSettled: () => {
          setReviewingIssueId(null);
        },
      }
    );
  };

  const handleCancelItem = async (orderId, itemId) => {
    setActiveItemActionId(itemId);
    cancelOrderItemMutation.mutate(
      { orderId, itemId },
      {
        onSuccess: () => {
          toast.success('Item cancelled successfully');
        },
        onError: (err) => {
          console.error('Failed to cancel order item:', err);
          toast.error(err.response?.data?.error || 'Failed to cancel the item');
        },
        onSettled: () => {
          setActiveItemActionId(null);
        },
      }
    );
  };

  const handleRetryRefund = async (orderId, itemId) => {
    setActiveItemActionId(itemId);
    retryRefundMutation.mutate(
      { orderId, itemId },
      {
        onSuccess: () => {
          toast.success('Refund retry initiated');
        },
        onError: (err) => {
          console.error('Failed to retry refund:', err);
          toast.error(err.response?.data?.error || 'Failed to retry refund');
        },
        onSettled: () => {
          setActiveItemActionId(null);
        },
      }
    );
  };

  const handleRequestReturn = async (orderId, item) => {
    const reasonInput =
      window.prompt(`Return reason (${RETURN_REASON_OPTIONS.join(', ')})`, 'DAMAGED') || '';
    const normalizedReason = reasonInput.trim().toUpperCase().replaceAll(' ', '_');
    if (!RETURN_REASON_OPTIONS.includes(normalizedReason)) {
      toast.warning('Please enter a valid return reason.');
      return;
    }

    const quantityInput =
      window.prompt('Return quantity', String(item.quantity)) || String(item.quantity);
    const parsedQuantity = Number.parseInt(quantityInput, 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > item.quantity) {
      toast.warning('Please enter a valid return quantity.');
      return;
    }

    const notes = window.prompt('Optional note for the seller', '') || '';

    setActiveItemActionId(item.id);
    requestReturnMutation.mutate(
      {
        orderId,
        itemId: item.id,
        reason: normalizedReason,
        notes,
        quantity: parsedQuantity,
      },
      {
        onSuccess: () => {
          toast.success('Return requested successfully');
        },
        onError: (err) => {
          console.error('Failed to request return:', err);
          toast.error(err.response?.data?.error || 'Failed to request the return');
        },
        onSettled: () => {
          setActiveItemActionId(null);
        },
      }
    );
  };

  const handleApproveReturn = async (orderId, itemId) => {
    setActiveItemActionId(itemId);
    approveReturnMutation.mutate(
      { orderId, itemId },
      {
        onSuccess: () => {
          toast.success('Return approved');
        },
        onError: (err) => {
          console.error('Failed to approve return:', err);
          toast.error(err.response?.data?.error || 'Failed to approve the return');
        },
        onSettled: () => {
          setActiveItemActionId(null);
        },
      }
    );
  };

  const handleRejectReturn = async (orderId, itemId) => {
    const rejectionReason = window.prompt('Reason for rejecting this return', '') || '';
    if (!rejectionReason.trim()) {
      toast.warning('Rejection reason is required.');
      return;
    }

    setActiveItemActionId(itemId);
    rejectReturnMutation.mutate(
      { orderId, itemId, rejectionReason },
      {
        onSuccess: () => {
          toast.success('Return rejected');
        },
        onError: (err) => {
          console.error('Failed to reject return:', err);
          toast.error(err.response?.data?.error || 'Failed to reject the return');
        },
        onSettled: () => {
          setActiveItemActionId(null);
        },
      }
    );
  };

  const handleReceiveReturn = async (orderId, itemId) => {
    setActiveItemActionId(itemId);
    receiveReturnMutation.mutate(
      { orderId, itemId },
      {
        onSuccess: () => {
          toast.success('Return received');
        },
        onError: (err) => {
          console.error('Failed to receive return:', err);
          toast.error(err.response?.data?.error || 'Failed to confirm return receipt');
        },
        onSettled: () => {
          setActiveItemActionId(null);
        },
      }
    );
  };

  const handleRetryReturnRefund = async (orderId, itemId) => {
    setActiveItemActionId(itemId);
    retryReturnRefundMutation.mutate(
      { orderId, itemId },
      {
        onSuccess: () => {
          toast.success('Return refund retried');
        },
        onError: (err) => {
          console.error('Failed to retry return refund:', err);
          toast.error(err.response?.data?.error || 'Failed to retry return refund');
        },
        onSettled: () => {
          setActiveItemActionId(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-[#161412] space-y-4">
        <FileText className="h-8 w-8 animate-pulse" />
        <p className="font-medium tracking-widest uppercase text-sm">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans text-[#161412] selection:bg-[#161412] selection:text-[#f2f0ea]">
      <button
        onClick={() => navigate(backPath)}
        className="flex items-center text-[#6b665f] hover:text-[#161412] font-bold text-sm tracking-wide transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div className="flex justify-between items-center mb-8 border-b border-[#ddd7cc] pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wide flex items-center gap-2">
            {user?.role === 'WHOLESALER' ? (
              <span className="text-[#161412]">Incoming Shop Orders</span>
            ) : (
              <span className="text-[#161412]">My Purchase History</span>
            )}
            {isFetching && !isLoading && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                Syncing...
              </span>
            )}
          </h1>
          <p className="text-sm text-[#6b665f] mt-2">
            {user?.role === 'WHOLESALER'
              ? 'Manage orders and review return, refund, and dispute requests.'
              : 'Track orders and raise return, refund, or dispute requests from one place.'}
          </p>
        </div>
      </div>

      {isError ? (
        <div className="bg-white rounded-[30px] border border-red-500/20 p-12 flex flex-col items-center justify-center text-center">
          <p className="text-red-500 text-sm font-semibold mb-4">
            Failed to load orders:{' '}
            {error?.response?.data?.error || error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md transition-all active:scale-[0.98]"
          >
            Retry Loading
          </button>
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="bg-white rounded-[30px] shadow-[0_18px_45px_rgba(22,20,18,0.05)] border border-dashed border-[#ddd7cc] p-16 text-center flex flex-col items-center">
          <div className="bg-[#f8f6f1] p-5 rounded-full mb-5 border border-[#ddd7cc]">
            <Package className="h-10 w-10 text-[#8b857c]" />
          </div>
          <h3 className="text-lg font-semibold text-[#161412] tracking-wide">No orders yet</h3>
          <p className="text-[#6b665f] mt-2 max-w-sm">
            When a transaction is made, the order details and invoice will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedOrders.map((order) => {
            const issueDraft = issueDrafts[order.id] || CUSTOMER_ISSUE_TEMPLATE;

            return (
              <div
                key={order.id}
                className="bg-white rounded-[28px] shadow-[0_18px_45px_rgba(22,20,18,0.05)] border border-[#e7e1d7] overflow-hidden group hover:border-[#c9baa5] transition-colors"
              >
                <div className="bg-[#f8f6f1] px-6 py-4 border-b border-[#e7e1d7] flex flex-wrap justify-between items-center gap-6">
                  <div className="flex flex-wrap gap-8">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                        Order Placed
                      </p>
                      <p className="text-sm font-semibold text-[#161412]">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8b857c] uppercase tracking-widest font-bold mb-1">
                        Total
                      </p>
                      <p className="text-sm font-bold text-amber-500">
                        ₹{Number(order.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center mb-1">
                        {user?.role === 'WHOLESALER' ? (
                          <>
                            <User className="w-3 h-3 mr-1.5" /> Buyer
                          </>
                        ) : (
                          <>
                            <Store className="w-3 h-3 mr-1.5" /> Sold By
                          </>
                        )}
                      </p>
                      <p className="text-sm font-semibold text-zinc-200">
                        {user?.role === 'WHOLESALER'
                          ? order.buyer?.name
                          : order.seller?.businessName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
                        Payment
                      </p>
                      {getPaymentBadge(order.paymentMethod, order.paymentStatus)}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <span className="text-[11px] font-mono text-[#6b665f] bg-[#f3efe8] px-2.5 py-1 rounded-full">
                      ID: {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="p-6">
                  <ul className="divide-y divide-[#ece7de]">
                    {order.items.map((item) => {
                      const unitPrice = Number(item.unitPriceAtPurchase ?? item.price);
                      const subtotal = Number(item.subtotalAtPurchase ?? unitPrice * item.quantity);

                      return (
                        <li key={item.id} className="py-4 flex items-center first:pt-0 last:pb-0">
                          <div className="h-16 w-16 bg-[#F5F5F0] rounded-[18px] shrink-0 flex items-center justify-center overflow-hidden border border-[#ddd7cc]">
                            {item.product.imageUrl ? (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                className="h-full w-full object-contain mix-blend-multiply p-1"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-[#8b857c]" />
                            )}
                          </div>
                          <div className="ml-5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-[#161412] transition-colors">
                                {item.product.name}
                              </h4>
                              {getReturnBadge(item)}
                              {item.status === 'CANCELLED' && (
                                <span
                                  className={`px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold border ${
                                    item.refundStatus === 'REFUNDED'
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                      : item.refundStatus === 'FAILED'
                                        ? 'bg-red-500/10 text-red-300 border-red-500/20'
                                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                  }`}
                                >
                                  {item.refundStatus === 'REFUNDED'
                                    ? 'Refunded'
                                    : item.refundStatus === 'FAILED'
                                      ? 'Refund Failed'
                                      : item.refundStatus === 'PROCESSING' ||
                                          item.refundStatus === 'PENDING'
                                        ? 'Refund Pending'
                                        : 'Cancelled'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6b665f] mt-1">
                              Qty: <span className="text-[#161412]">{item.quantity}</span> × ₹
                              {unitPrice.toFixed(2)}
                            </p>
                            {item.returnReason && (
                              <p className="text-xs text-[#6b665f] mt-2">
                                Return reason: {formatReturnReason(item.returnReason)}
                              </p>
                            )}
                            {item.customerReturnNotes && (
                              <p className="text-xs text-[#6b665f] mt-1">
                                {item.customerReturnNotes}
                              </p>
                            )}
                            {item.rejectionReason && (
                              <p className="text-xs text-red-500 mt-1">
                                Rejected: {item.rejectionReason}
                              </p>
                            )}
                            {item.gatewayRefundId && (
                              <p className="text-xs text-[#6b665f] mt-1">
                                Gateway Refund: {item.gatewayRefundId}
                              </p>
                            )}
                            {item.status === 'CANCELLED' && item.refundFailureReason && (
                              <p className="text-xs text-red-500 mt-2">
                                {item.refundFailureReason}
                              </p>
                            )}
                            {item.status === 'CANCELLED' && item.refundReference && (
                              <p className="text-xs text-[#6b665f] mt-1">
                                Refund Ref: {item.refundReference}
                              </p>
                            )}
                          </div>
                          <div className="text-right pl-4">
                            <p className="text-sm font-extrabold text-[#161412]">
                              ₹{subtotal.toFixed(2)}
                            </p>
                            {user?.role === 'CUSTOMER' && (
                              <div className="mt-3 flex flex-col gap-2 items-end">
                                <button
                                  onClick={() => handleCancelItem(order.id, item.id)}
                                  disabled={
                                    activeItemActionId === item.id ||
                                    item.status === 'CANCELLED' ||
                                    !CUSTOMER_CANCELLABLE_STATUSES.has(order.status)
                                  }
                                  className="text-[11px] font-bold uppercase tracking-wider bg-[#161412] text-white border border-[#161412] px-3 py-2 rounded-full transition-all disabled:opacity-50"
                                >
                                  {activeItemActionId === item.id && item.status !== 'CANCELLED'
                                    ? 'Cancelling...'
                                    : item.status === 'CANCELLED'
                                      ? 'Cancelled'
                                      : 'Cancel Item'}
                                </button>
                                {item.status === 'CANCELLED' &&
                                  ['FAILED', 'PENDING'].includes(item.refundStatus) && (
                                    <button
                                      onClick={() => handleRetryRefund(order.id, item.id)}
                                      disabled={activeItemActionId === item.id}
                                      className="text-[11px] font-bold uppercase tracking-wider bg-white text-[#161412] border border-[#ddd7cc] px-3 py-2 rounded-full transition-all disabled:opacity-50"
                                    >
                                      {activeItemActionId === item.id
                                        ? 'Retrying...'
                                        : 'Retry Refund'}
                                    </button>
                                  )}
                                {item.isReturnEligible && (
                                  <button
                                    onClick={() => handleRequestReturn(order.id, item)}
                                    disabled={activeItemActionId === item.id}
                                    className="text-[11px] font-bold uppercase tracking-wider bg-white text-[#161412] border border-[#ddd7cc] px-3 py-2 rounded-full transition-all disabled:opacity-50"
                                  >
                                    {activeItemActionId === item.id
                                      ? 'Submitting...'
                                      : 'Request Return'}
                                  </button>
                                )}
                              </div>
                            )}
                            {user?.role === 'WHOLESALER' && item.returnStatus === 'REQUESTED' && (
                              <div className="mt-3 flex flex-col gap-2 items-end">
                                <button
                                  onClick={() => handleApproveReturn(order.id, item.id)}
                                  disabled={activeItemActionId === item.id}
                                  className="text-[11px] font-bold uppercase tracking-wider bg-[#161412] text-white border border-[#161412] px-3 py-2 rounded-full transition-all disabled:opacity-50"
                                >
                                  {activeItemActionId === item.id ? 'Saving...' : 'Approve Return'}
                                </button>
                                <button
                                  onClick={() => handleRejectReturn(order.id, item.id)}
                                  disabled={activeItemActionId === item.id}
                                  className="text-[11px] font-bold uppercase tracking-wider bg-white text-[#161412] border border-[#ddd7cc] px-3 py-2 rounded-full transition-all disabled:opacity-50"
                                >
                                  {activeItemActionId === item.id ? 'Saving...' : 'Reject Return'}
                                </button>
                              </div>
                            )}
                            {user?.role === 'WHOLESALER' && item.returnStatus === 'APPROVED' && (
                              <div className="mt-3 flex flex-col gap-2 items-end">
                                <button
                                  onClick={() => handleReceiveReturn(order.id, item.id)}
                                  disabled={activeItemActionId === item.id}
                                  className="text-[11px] font-bold uppercase tracking-wider bg-[#161412] text-white border border-[#161412] px-3 py-2 rounded-full transition-all disabled:opacity-50"
                                >
                                  {activeItemActionId === item.id
                                    ? 'Saving...'
                                    : 'Mark Return Received'}
                                </button>
                              </div>
                            )}
                            {user?.role === 'WHOLESALER' &&
                              item.returnStatus === 'RECEIVED' &&
                              item.returnRefundStatus === 'FAILED' && (
                                <div className="mt-3 flex flex-col gap-2 items-end">
                                  <button
                                    onClick={() => handleRetryReturnRefund(order.id, item.id)}
                                    disabled={activeItemActionId === item.id}
                                    className="text-[11px] font-bold uppercase tracking-wider bg-white text-[#161412] border border-[#ddd7cc] px-3 py-2 rounded-full transition-all disabled:opacity-50"
                                  >
                                    {activeItemActionId === item.id
                                      ? 'Retrying...'
                                      : 'Retry Return Refund'}
                                  </button>
                                </div>
                              )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="px-6 pb-6">
                  <div className="rounded-[24px] border border-[#e7e1d7] bg-[#fbfaf7] p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#161412] flex items-center gap-2">
                          <MessageSquareWarning className="h-4 w-4 text-[#8f5d31]" />
                          Refunds and Disputes
                        </h3>
                        <p className="text-xs text-[#6b665f] mt-1">
                          {user?.role === 'WHOLESALER'
                            ? 'Review buyer requests and record the final resolution.'
                            : 'Use the dedicated return buttons above for returns, or raise a refund/dispute request here.'}
                        </p>
                      </div>

                      {user?.role === 'CUSTOMER' && canCustomerOpenIssue(order.status) && (
                        <button
                          onClick={() =>
                            setActiveIssueFormOrderId((prev) =>
                              prev === order.id ? null : order.id
                            )
                          }
                          className="text-xs font-bold uppercase tracking-wider bg-[#161412] text-white border border-[#161412] px-4 py-2.5 rounded-full transition-all"
                        >
                          {activeIssueFormOrderId === order.id
                            ? 'Hide Request Form'
                            : 'Open Request'}
                        </button>
                      )}
                    </div>

                    {user?.role === 'CUSTOMER' && activeIssueFormOrderId === order.id && (
                      <div className="mb-5 rounded-[22px] border border-[#e7e1d7] bg-white p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="text-sm text-zinc-300">
                            <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                              Request Type
                            </span>
                            <select
                              value={issueDraft.type}
                              onChange={(event) =>
                                setIssueDraftField(order.id, 'type', event.target.value)
                              }
                              className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="REFUND">Refund</option>
                              <option value="DISPUTE">Dispute</option>
                            </select>
                          </label>

                          <label className="text-sm text-zinc-300">
                            <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                              Item
                            </span>
                            <select
                              value={issueDraft.orderItemId}
                              onChange={(event) =>
                                setIssueDraftField(order.id, 'orderItemId', event.target.value)
                              }
                              className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">Entire order / not specific</option>
                              {order.items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.product.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm text-zinc-300">
                            <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                              Preferred Resolution
                            </span>
                            <select
                              value={issueDraft.preferredResolution}
                              onChange={(event) =>
                                setIssueDraftField(
                                  order.id,
                                  'preferredResolution',
                                  event.target.value
                                )
                              }
                              className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="REFUND">Refund</option>
                              <option value="REPLACEMENT">Replacement</option>
                              <option value="STORE_CREDIT">Store credit</option>
                              <option value="RETURNLESS_REFUND">Returnless refund</option>
                            </select>
                          </label>

                          <label className="text-sm text-zinc-300">
                            <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                              Quantity
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={issueDraft.requestedQuantity}
                              onChange={(event) =>
                                setIssueDraftField(
                                  order.id,
                                  'requestedQuantity',
                                  event.target.value
                                )
                              }
                              className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </label>
                        </div>

                        <label className="block text-sm text-zinc-300 mt-4">
                          <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                            Reason
                          </span>
                          <input
                            type="text"
                            value={issueDraft.reason}
                            onChange={(event) =>
                              setIssueDraftField(order.id, 'reason', event.target.value)
                            }
                            placeholder="Wrong item, damaged package, missing parts, billing issue..."
                            className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </label>

                        <label className="block text-sm text-zinc-300 mt-4">
                          <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                            Details
                          </span>
                          <textarea
                            rows="4"
                            value={issueDraft.description}
                            onChange={(event) =>
                              setIssueDraftField(order.id, 'description', event.target.value)
                            }
                            placeholder="Add enough context for the seller to act on this without chasing you for basics."
                            className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </label>

                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => handleSubmitIssue(order)}
                            disabled={submittingOrderId === order.id}
                            className="text-xs font-bold uppercase tracking-wider bg-amber-500 text-[#0a0a0a] px-5 py-2.5 rounded-md hover:bg-amber-400 transition-all disabled:opacity-50"
                          >
                            {submittingOrderId === order.id ? 'Submitting...' : 'Submit Request'}
                          </button>
                        </div>
                      </div>
                    )}

                    {!order.issues?.length ? (
                      <div className="rounded-md border border-dashed border-zinc-800 px-4 py-6 text-sm text-zinc-500">
                        No return, refund, or dispute requests for this order yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {order.issues.map((issue) => {
                          const reviewDraft = issueReviews[issue.id] || {
                            ...WHOLESALER_REVIEW_TEMPLATE,
                            status: issue.status === 'OPEN' ? 'IN_REVIEW' : issue.status,
                            finalResolution:
                              issue.finalResolution === 'NONE'
                                ? issue.preferredResolution
                                : issue.finalResolution,
                            sellerResponse: issue.sellerResponse || '',
                            refundAmount: issue.refundAmount || '',
                          };

                          return (
                            <div
                              key={issue.id}
                              className="rounded-md border border-zinc-800 bg-[#0c0c0c] p-4"
                            >
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-white">
                                      {issueTypeLabel[issue.type] || issue.type}
                                    </span>
                                    {getIssueStatusBadge(issue.status)}
                                    <span className="text-[11px] font-mono text-zinc-600 bg-zinc-900 px-2 py-1 rounded">
                                      #{issue.id.slice(0, 8).toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-zinc-300 mt-3">{issue.reason}</p>
                                  {issue.description && (
                                    <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                                      {issue.description}
                                    </p>
                                  )}
                                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                                    <span>Opened by {issue.requester?.name || 'Customer'}</span>
                                    <span>
                                      Requested{' '}
                                      {resolutionLabel[issue.preferredResolution] ||
                                        issue.preferredResolution}
                                    </span>
                                    <span>Qty {issue.requestedQuantity}</span>
                                    {issue.orderItem?.product?.name && (
                                      <span>Item {issue.orderItem.product.name}</span>
                                    )}
                                    {issue.finalResolution !== 'NONE' && (
                                      <span>Final {resolutionLabel[issue.finalResolution]}</span>
                                    )}
                                    {issue.refundAmount && (
                                      <span>Refund ₹{Number(issue.refundAmount).toFixed(2)}</span>
                                    )}
                                  </div>
                                  {issue.sellerResponse && (
                                    <div className="mt-3 rounded-md border border-zinc-800 bg-[#141414] px-3 py-2 text-sm text-zinc-300">
                                      <span className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                                        Seller Response
                                      </span>
                                      {issue.sellerResponse}
                                    </div>
                                  )}
                                </div>

                                {user?.role === 'WHOLESALER' && (
                                  <div className="w-full lg:w-[320px] rounded-md border border-zinc-800 bg-[#111111] p-3">
                                    <div className="grid grid-cols-1 gap-3">
                                      <label className="text-sm text-zinc-300">
                                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                                          Status
                                        </span>
                                        <select
                                          value={reviewDraft.status}
                                          onChange={(event) =>
                                            setIssueReviewField(
                                              issue.id,
                                              'status',
                                              event.target.value
                                            )
                                          }
                                          className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                          <option value="IN_REVIEW">In review</option>
                                          <option value="APPROVED">Approved</option>
                                          <option value="REJECTED">Rejected</option>
                                          <option value="RESOLVED">Resolved</option>
                                        </select>
                                      </label>

                                      <label className="text-sm text-zinc-300">
                                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                                          Final Resolution
                                        </span>
                                        <select
                                          value={reviewDraft.finalResolution}
                                          onChange={(event) =>
                                            setIssueReviewField(
                                              issue.id,
                                              'finalResolution',
                                              event.target.value
                                            )
                                          }
                                          className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                          <option value="REFUND">Refund</option>
                                          <option value="REPLACEMENT">Replacement</option>
                                          <option value="STORE_CREDIT">Store credit</option>
                                          <option value="RETURNLESS_REFUND">
                                            Returnless refund
                                          </option>
                                          <option value="NONE">No decision yet</option>
                                        </select>
                                      </label>

                                      <label className="text-sm text-zinc-300">
                                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                                          Refund Amount
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={reviewDraft.refundAmount}
                                          onChange={(event) =>
                                            setIssueReviewField(
                                              issue.id,
                                              'refundAmount',
                                              event.target.value
                                            )
                                          }
                                          className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                      </label>

                                      <label className="text-sm text-zinc-300">
                                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                                          Response
                                        </span>
                                        <textarea
                                          rows="3"
                                          value={reviewDraft.sellerResponse}
                                          onChange={(event) =>
                                            setIssueReviewField(
                                              issue.id,
                                              'sellerResponse',
                                              event.target.value
                                            )
                                          }
                                          className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                      </label>

                                      <button
                                        onClick={() => handleReviewIssue(order.id, issue.id)}
                                        disabled={reviewingIssueId === issue.id}
                                        className="text-xs font-bold uppercase tracking-wider bg-amber-500 text-[#0a0a0a] px-4 py-2.5 rounded-md hover:bg-amber-400 transition-all disabled:opacity-50"
                                      >
                                        {reviewingIssueId === issue.id
                                          ? 'Saving...'
                                          : 'Save Review'}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#0a0a0a] px-6 py-4 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="text-sm text-zinc-400 flex items-start max-w-sm">
                    <MapPin className="h-4 w-4 mr-2.5 mt-0.5 flex-shrink-0 text-amber-500" />
                    <span className="leading-relaxed">
                      {order.shippingAddress || 'No address provided for this order.'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {user?.role === 'WHOLESALER' && order.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                        className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-600/50 px-5 py-2.5 rounded-md hover:bg-blue-600 hover:text-white transition-all"
                      >
                        Mark as Processing
                      </button>
                    )}
                    {user?.role === 'WHOLESALER' && order.status === 'PROCESSING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                        className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-purple-600/20 text-purple-400 border border-purple-600/50 px-5 py-2.5 rounded-md hover:bg-purple-600 hover:text-white transition-all"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {user?.role === 'WHOLESALER' && order.status === 'SHIPPED' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                        className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 px-5 py-2.5 rounded-md hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        Mark as Delivered
                      </button>
                    )}

                    {user?.role === 'CUSTOMER' && !canCustomerOpenIssue(order.status) && (
                      <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-4 py-2.5 text-xs text-zinc-500">
                        <Undo2 className="h-3.5 w-3.5" />
                        After-sales requests unlock after processing/shipping.
                      </div>
                    )}

                    {user?.role === 'CUSTOMER' &&
                      order.items.some(
                        (item) =>
                          item.status === 'CANCELLED' &&
                          ['FAILED', 'PENDING', 'PROCESSING'].includes(item.refundStatus)
                      ) && (
                        <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
                          <Wallet className="h-3.5 w-3.5" />A cancelled prepaid item still needs
                          refund resolution.
                        </div>
                      )}

                    {order.paymentStatus === 'REFUND_PENDING' && (
                      <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
                        <Wallet className="h-3.5 w-3.5" />
                        Refund is pending review or settlement.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
