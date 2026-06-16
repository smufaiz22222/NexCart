import { useEffect, useMemo, useState } from 'react';
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
  Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';
import useAuthStore from '../store/authStore';

const CUSTOMER_ISSUE_TEMPLATE = {
  type: 'RETURN',
  orderItemId: '',
  preferredResolution: 'REFUND',
  requestedQuantity: 1,
  reason: '',
  description: ''
};

const WHOLESALER_REVIEW_TEMPLATE = {
  status: 'IN_REVIEW',
  finalResolution: 'REFUND',
  sellerResponse: '',
  refundAmount: ''
};

const issueTypeLabel = {
  RETURN: 'Return',
  REFUND: 'Refund',
  DISPUTE: 'Dispute'
};

const issueStatusClass = {
  OPEN: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  IN_REVIEW: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-300 border-red-500/20',
  RESOLVED: 'bg-purple-500/10 text-purple-300 border-purple-500/20'
};

const resolutionLabel = {
  NONE: 'Pending resolution',
  REFUND: 'Refund',
  REPLACEMENT: 'Replacement',
  STORE_CREDIT: 'Store credit',
  RETURNLESS_REFUND: 'Returnless refund'
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'PENDING':
      return <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><Clock className="w-3 h-3 mr-1.5" /> Pending</span>;
    case 'PROCESSING':
      return <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><Package className="w-3 h-3 mr-1.5" /> Processing</span>;
    case 'SHIPPED':
      return <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><Truck className="w-3 h-3 mr-1.5" /> Shipped</span>;
    case 'DELIVERED':
      return <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1.5" /> Delivered</span>;
    case 'CANCELLED':
      return <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center"><AlertCircle className="w-3 h-3 mr-1.5" /> Cancelled</span>;
    default:
      return <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold">{status}</span>;
  }
};

const getPaymentBadge = (method, status) => {
  const paletteByStatus = {
    PAID: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    REFUNDED: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
    REFUND_PENDING: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    FAILED: 'bg-red-500/10 border-red-500/20 text-red-300',
    PENDING: 'bg-zinc-800 border-zinc-700 text-zinc-300'
  };

  return (
    <span className={`px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold border ${paletteByStatus[status] || paletteByStatus.PENDING}`}>
      {method} · {status.replace('_', ' ')}
    </span>
  );
};

const getIssueStatusBadge = (status) => (
  <span className={`px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold border ${issueStatusClass[status] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
    {status.replace('_', ' ')}
  </span>
);

const canCustomerOpenIssue = (orderStatus) => ['SHIPPED', 'DELIVERED', 'PROCESSING'].includes(orderStatus);

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingOrderId, setSubmittingOrderId] = useState(null);
  const [reviewingIssueId, setReviewingIssueId] = useState(null);
  const [activeIssueFormOrderId, setActiveIssueFormOrderId] = useState(null);
  const [issueDrafts, setIssueDrafts] = useState({});
  const [issueReviews, setIssueReviews] = useState({});
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const backPath = user?.role === 'WHOLESALER' ? '/wholesaler' : '/store';

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await apiClient.get('/orders');
        setOrders(response.data.orders || []);
      } catch (error) {
        console.error('Failed to load orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    [orders]
  );

  const setIssueDraftField = (orderId, field, value) => {
    setIssueDrafts((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || CUSTOMER_ISSUE_TEMPLATE),
        [field]: value
      }
    }));
  };

  const setIssueReviewField = (issueId, field, value) => {
    setIssueReviews((prev) => ({
      ...prev,
      [issueId]: {
        ...(prev[issueId] || WHOLESALER_REVIEW_TEMPLATE),
        [field]: value
      }
    }));
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)));
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update order status');
    }
  };

  const handleSubmitIssue = async (order) => {
    const draft = issueDrafts[order.id] || CUSTOMER_ISSUE_TEMPLATE;
    setSubmittingOrderId(order.id);

    try {
      const response = await apiClient.post(`/orders/${order.id}/issues`, {
        ...draft,
        orderItemId: draft.orderItemId || null
      });

      setOrders((prev) =>
        prev.map((entry) =>
          entry.id === order.id
            ? { ...entry, issues: [response.data.issue, ...(entry.issues || [])] }
            : entry
        )
      );
      setIssueDrafts((prev) => ({ ...prev, [order.id]: CUSTOMER_ISSUE_TEMPLATE }));
      setActiveIssueFormOrderId(null);
    } catch (error) {
      console.error('Failed to create order issue:', error);
      alert(error.response?.data?.error || 'Failed to create the request');
    } finally {
      setSubmittingOrderId(null);
    }
  };

  const handleReviewIssue = async (orderId, issueId) => {
    const review = issueReviews[issueId] || WHOLESALER_REVIEW_TEMPLATE;
    setReviewingIssueId(issueId);

    try {
      const response = await apiClient.put(`/orders/issues/${issueId}`, review);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? (response.data.order || order)
            : order
        )
      );
    } catch (error) {
      console.error('Failed to update order issue:', error);
      alert(error.response?.data?.error || 'Failed to update the request');
    } finally {
      setReviewingIssueId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-amber-500 space-y-4">
        <FileText className="h-8 w-8 animate-pulse" />
        <p className="font-medium tracking-widest uppercase text-sm">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <button
        onClick={() => navigate(backPath)}
        className="flex items-center text-zinc-400 hover:text-amber-400 font-bold text-sm tracking-wide transition-colors group mb-8"
      >
        <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wide">
            {user?.role === 'WHOLESALER' ? (
              <span className="text-white">Incoming Shop Orders</span>
            ) : (
              <span className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">My Purchase History</span>
            )}
          </h1>
          <p className="text-sm text-zinc-500 mt-2">
            {user?.role === 'WHOLESALER'
              ? 'Manage orders and review return, refund, and dispute requests.'
              : 'Track orders and raise return, refund, or dispute requests from one place.'}
          </p>
        </div>
      </div>

      {sortedOrders.length === 0 ? (
        <div className="bg-[#1c1c1c] rounded-xl shadow-xl border border-dashed border-zinc-700 p-16 text-center flex flex-col items-center">
          <div className="bg-[#0a0a0a] p-5 rounded-full mb-5 border border-zinc-800">
            <Package className="h-10 w-10 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-white tracking-wide">No orders yet</h3>
          <p className="text-zinc-500 mt-2 max-w-sm">When a transaction is made, the order details and invoice will appear here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedOrders.map((order) => {
            const issueDraft = issueDrafts[order.id] || CUSTOMER_ISSUE_TEMPLATE;

            return (
              <div key={order.id} className="bg-[#1c1c1c] rounded-lg shadow-2xl border border-zinc-800 overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="bg-[#0a0a0a] px-6 py-4 border-b border-zinc-800 flex flex-wrap justify-between items-center gap-6">
                  <div className="flex flex-wrap gap-8">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Order Placed</p>
                      <p className="text-sm font-semibold text-zinc-200">{new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Total</p>
                      <p className="text-sm font-bold text-amber-500">₹{Number(order.totalAmount).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center mb-1">
                        {user?.role === 'WHOLESALER' ? <><User className="w-3 h-3 mr-1.5" /> Buyer</> : <><Store className="w-3 h-3 mr-1.5" /> Sold By</>}
                      </p>
                      <p className="text-sm font-semibold text-zinc-200">
                        {user?.role === 'WHOLESALER' ? order.buyer?.name : order.seller?.businessName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Payment</p>
                      {getPaymentBadge(order.paymentMethod, order.paymentStatus)}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <span className="text-[11px] font-mono text-zinc-600 bg-zinc-900 px-2.5 py-1 rounded">ID: {order.id.slice(0, 8).toUpperCase()}</span>
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="p-6">
                  <ul className="divide-y divide-zinc-800/50">
                    {order.items.map((item) => (
                      <li key={item.id} className="py-4 flex items-center first:pt-0 last:pb-0">
                        <div className="h-16 w-16 bg-[#F5F5F0] rounded-md shrink-0 flex items-center justify-center overflow-hidden border border-zinc-700">
                          {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-contain mix-blend-multiply p-1" />
                          ) : (
                            <Package className="h-6 w-6 text-zinc-400" />
                          )}
                        </div>
                        <div className="ml-5 flex-1">
                          <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">{item.product.name}</h4>
                          <p className="text-xs text-zinc-400 mt-1">Qty: <span className="text-zinc-200">{item.quantity}</span> × ₹{Number(item.price).toFixed(2)}</p>
                        </div>
                        <div className="text-right pl-4">
                          <p className="text-sm font-extrabold text-white">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-6 pb-6">
                  <div className="rounded-lg border border-zinc-800 bg-[#111111] p-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-200 flex items-center gap-2">
                          <MessageSquareWarning className="h-4 w-4 text-amber-400" />
                          Returns, Refunds, and Disputes
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          {user?.role === 'WHOLESALER'
                            ? 'Review buyer requests and record the final resolution.'
                            : 'Raise a request for an item or the whole order when something goes wrong.'}
                        </p>
                      </div>

                      {user?.role === 'CUSTOMER' && canCustomerOpenIssue(order.status) && (
                        <button
                          onClick={() => setActiveIssueFormOrderId((prev) => (prev === order.id ? null : order.id))}
                          className="text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 px-4 py-2.5 rounded-md hover:bg-amber-500 hover:text-[#0a0a0a] transition-all"
                        >
                          {activeIssueFormOrderId === order.id ? 'Hide Request Form' : 'Open Request'}
                        </button>
                      )}
                    </div>

                    {user?.role === 'CUSTOMER' && activeIssueFormOrderId === order.id && (
                      <div className="mb-5 rounded-md border border-zinc-800 bg-[#0d0d0d] p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="text-sm text-zinc-300">
                            <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Request Type</span>
                            <select
                              value={issueDraft.type}
                              onChange={(event) => setIssueDraftField(order.id, 'type', event.target.value)}
                              className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="RETURN">Return</option>
                              <option value="REFUND">Refund</option>
                              <option value="DISPUTE">Dispute</option>
                            </select>
                          </label>

                          <label className="text-sm text-zinc-300">
                            <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Item</span>
                            <select
                              value={issueDraft.orderItemId}
                              onChange={(event) => setIssueDraftField(order.id, 'orderItemId', event.target.value)}
                              className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">Entire order / not specific</option>
                              {order.items.map((item) => (
                                <option key={item.id} value={item.id}>{item.product.name}</option>
                              ))}
                            </select>
                          </label>

                          <label className="text-sm text-zinc-300">
                            <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Preferred Resolution</span>
                            <select
                              value={issueDraft.preferredResolution}
                              onChange={(event) => setIssueDraftField(order.id, 'preferredResolution', event.target.value)}
                              className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="REFUND">Refund</option>
                              <option value="REPLACEMENT">Replacement</option>
                              <option value="STORE_CREDIT">Store credit</option>
                              <option value="RETURNLESS_REFUND">Returnless refund</option>
                            </select>
                          </label>

                          <label className="text-sm text-zinc-300">
                            <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Quantity</span>
                            <input
                              type="number"
                              min="1"
                              value={issueDraft.requestedQuantity}
                              onChange={(event) => setIssueDraftField(order.id, 'requestedQuantity', event.target.value)}
                              className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </label>
                        </div>

                        <label className="block text-sm text-zinc-300 mt-4">
                          <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Reason</span>
                          <input
                            type="text"
                            value={issueDraft.reason}
                            onChange={(event) => setIssueDraftField(order.id, 'reason', event.target.value)}
                            placeholder="Wrong item, damaged package, missing parts, billing issue..."
                            className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </label>

                        <label className="block text-sm text-zinc-300 mt-4">
                          <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Details</span>
                          <textarea
                            rows="4"
                            value={issueDraft.description}
                            onChange={(event) => setIssueDraftField(order.id, 'description', event.target.value)}
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
                            finalResolution: issue.finalResolution === 'NONE' ? issue.preferredResolution : issue.finalResolution,
                            sellerResponse: issue.sellerResponse || '',
                            refundAmount: issue.refundAmount || ''
                          };

                          return (
                            <div key={issue.id} className="rounded-md border border-zinc-800 bg-[#0c0c0c] p-4">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold text-white">{issueTypeLabel[issue.type] || issue.type}</span>
                                    {getIssueStatusBadge(issue.status)}
                                    <span className="text-[11px] font-mono text-zinc-600 bg-zinc-900 px-2 py-1 rounded">
                                      #{issue.id.slice(0, 8).toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-zinc-300 mt-3">{issue.reason}</p>
                                  {issue.description && <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{issue.description}</p>}
                                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                                    <span>Opened by {issue.requester?.name || 'Customer'}</span>
                                    <span>Requested {resolutionLabel[issue.preferredResolution] || issue.preferredResolution}</span>
                                    <span>Qty {issue.requestedQuantity}</span>
                                    {issue.orderItem?.product?.name && <span>Item {issue.orderItem.product.name}</span>}
                                    {issue.finalResolution !== 'NONE' && <span>Final {resolutionLabel[issue.finalResolution]}</span>}
                                    {issue.refundAmount && <span>Refund ₹{Number(issue.refundAmount).toFixed(2)}</span>}
                                  </div>
                                  {issue.sellerResponse && (
                                    <div className="mt-3 rounded-md border border-zinc-800 bg-[#141414] px-3 py-2 text-sm text-zinc-300">
                                      <span className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Seller Response</span>
                                      {issue.sellerResponse}
                                    </div>
                                  )}
                                </div>

                                {user?.role === 'WHOLESALER' && (
                                  <div className="w-full lg:w-[320px] rounded-md border border-zinc-800 bg-[#111111] p-3">
                                    <div className="grid grid-cols-1 gap-3">
                                      <label className="text-sm text-zinc-300">
                                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Status</span>
                                        <select
                                          value={reviewDraft.status}
                                          onChange={(event) => setIssueReviewField(issue.id, 'status', event.target.value)}
                                          className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                          <option value="IN_REVIEW">In review</option>
                                          <option value="APPROVED">Approved</option>
                                          <option value="REJECTED">Rejected</option>
                                          <option value="RESOLVED">Resolved</option>
                                        </select>
                                      </label>

                                      <label className="text-sm text-zinc-300">
                                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Final Resolution</span>
                                        <select
                                          value={reviewDraft.finalResolution}
                                          onChange={(event) => setIssueReviewField(issue.id, 'finalResolution', event.target.value)}
                                          className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                          <option value="REFUND">Refund</option>
                                          <option value="REPLACEMENT">Replacement</option>
                                          <option value="STORE_CREDIT">Store credit</option>
                                          <option value="RETURNLESS_REFUND">Returnless refund</option>
                                          <option value="NONE">No decision yet</option>
                                        </select>
                                      </label>

                                      <label className="text-sm text-zinc-300">
                                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Refund Amount</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={reviewDraft.refundAmount}
                                          onChange={(event) => setIssueReviewField(issue.id, 'refundAmount', event.target.value)}
                                          className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                      </label>

                                      <label className="text-sm text-zinc-300">
                                        <span className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Response</span>
                                        <textarea
                                          rows="3"
                                          value={reviewDraft.sellerResponse}
                                          onChange={(event) => setIssueReviewField(issue.id, 'sellerResponse', event.target.value)}
                                          className="w-full rounded-md border border-zinc-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                      </label>

                                      <button
                                        onClick={() => handleReviewIssue(order.id, issue.id)}
                                        disabled={reviewingIssueId === issue.id}
                                        className="text-xs font-bold uppercase tracking-wider bg-amber-500 text-[#0a0a0a] px-4 py-2.5 rounded-md hover:bg-amber-400 transition-all disabled:opacity-50"
                                      >
                                        {reviewingIssueId === issue.id ? 'Saving...' : 'Save Review'}
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
                    <span className="leading-relaxed">{order.shippingAddress || 'No address provided for this order.'}</span>
                  </div>

                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {user?.role === 'WHOLESALER' && order.status === 'PENDING' && (
                      <button onClick={() => handleUpdateStatus(order.id, 'PROCESSING')} className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-600/50 px-5 py-2.5 rounded-md hover:bg-blue-600 hover:text-white transition-all">
                        Mark as Processing
                      </button>
                    )}
                    {user?.role === 'WHOLESALER' && order.status === 'PROCESSING' && (
                      <button onClick={() => handleUpdateStatus(order.id, 'SHIPPED')} className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-purple-600/20 text-purple-400 border border-purple-600/50 px-5 py-2.5 rounded-md hover:bg-purple-600 hover:text-white transition-all">
                        Mark as Shipped
                      </button>
                    )}
                    {user?.role === 'WHOLESALER' && order.status === 'SHIPPED' && (
                      <button onClick={() => handleUpdateStatus(order.id, 'DELIVERED')} className="w-full md:w-auto text-xs font-bold uppercase tracking-wider bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 px-5 py-2.5 rounded-md hover:bg-emerald-600 hover:text-white transition-all">
                        Mark as Delivered
                      </button>
                    )}

                    {user?.role === 'CUSTOMER' && !canCustomerOpenIssue(order.status) && (
                      <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-4 py-2.5 text-xs text-zinc-500">
                        <Undo2 className="h-3.5 w-3.5" />
                        After-sales requests unlock after processing/shipping.
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
