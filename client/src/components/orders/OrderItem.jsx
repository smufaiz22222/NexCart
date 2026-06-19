import { useState } from 'react';
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { ReturnBadge } from './OrderBadges';
import {
  useCancelOrderItem,
  useRetryRefund,
  useRequestReturn,
  useApproveReturn,
  useRejectReturn,
  useReceiveReturn,
  useRetryReturnRefund,
  useCreateDispute,
} from '../../api/queries';

const CUSTOMER_CANCELLABLE_STATUSES = new Set(['PENDING', 'PROCESSING']);
const RETURN_REASON_OPTIONS = [
  'WRONG_ITEM',
  'DAMAGED',
  'DEFECTIVE',
  'CHANGED_MIND',
  'MISSING_PARTS',
  'OTHER',
];

const DISPUTE_REASON_OPTIONS = [
  'DAMAGED_ITEM',
  'WRONG_ITEM',
  'MISSING_PARTS',
  'DEFECTIVE_PRODUCT',
  'QUALITY_ISSUE',
  'NOT_AS_DESCRIBED',
  'OTHER',
];

const formatReturnReason = (reason) =>
  String(reason || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function OrderItem({ item, orderId, orderStatus, user, isWholesalerPath }) {
  const [isPendingAction, setIsPendingAction] = useState(false);

  const cancelOrderItemMutation = useCancelOrderItem();
  const retryRefundMutation = useRetryRefund();
  const requestReturnMutation = useRequestReturn();
  const approveReturnMutation = useApproveReturn();
  const rejectReturnMutation = useRejectReturn();
  const receiveReturnMutation = useReceiveReturn();
  const retryReturnRefundMutation = useRetryReturnRefund();
  const createDisputeMutation = useCreateDispute();

  const handleCancelItem = () => {
    setIsPendingAction(true);
    cancelOrderItemMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Item cancelled successfully');
        },
        onError: (err) => {
          console.error('Failed to cancel order item:', err);
          toast.error(err.response?.data?.error || 'Failed to cancel the item');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleRetryRefund = () => {
    setIsPendingAction(true);
    retryRefundMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Refund retry initiated');
        },
        onError: (err) => {
          console.error('Failed to retry refund:', err);
          toast.error(err.response?.data?.error || 'Failed to retry refund');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleRequestReturn = () => {
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

    setIsPendingAction(true);
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
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleCreateDispute = () => {
    const reasonInput =
      window.prompt(`Dispute reason (${DISPUTE_REASON_OPTIONS.join(', ')})`, 'DAMAGED_ITEM') || '';
    const normalizedReason = reasonInput.trim().toUpperCase().replaceAll(' ', '_');
    if (!DISPUTE_REASON_OPTIONS.includes(normalizedReason)) {
      toast.warning('Please enter a valid dispute reason.');
      return;
    }

    const description =
      window.prompt(
        'Describe the issue in detail',
        'Explain what went wrong, what you expected, and why you need seller review.'
      ) || '';
    if (!description.trim()) {
      toast.warning('A dispute description is required.');
      return;
    }

    const evidenceInput = window.prompt('Optional evidence URLs, separated by commas', '') || '';
    const evidenceUrls = evidenceInput
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    setIsPendingAction(true);
    createDisputeMutation.mutate(
      {
        orderId,
        itemId: item.id,
        reason: normalizedReason,
        description,
        evidenceUrls,
      },
      {
        onSuccess: () => {
          toast.success('Dispute opened successfully');
        },
        onError: (err) => {
          console.error('Failed to create dispute:', err);
          toast.error(err.response?.data?.error || 'Failed to create dispute');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleApproveReturn = () => {
    setIsPendingAction(true);
    approveReturnMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Return approved');
        },
        onError: (err) => {
          console.error('Failed to approve return:', err);
          toast.error(err.response?.data?.error || 'Failed to approve the return');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleRejectReturn = () => {
    const rejectionReason = window.prompt('Reason for rejecting this return', '') || '';
    if (!rejectionReason.trim()) {
      toast.warning('Rejection reason is required.');
      return;
    }

    setIsPendingAction(true);
    rejectReturnMutation.mutate(
      { orderId, itemId: item.id, rejectionReason },
      {
        onSuccess: () => {
          toast.success('Return rejected');
        },
        onError: (err) => {
          console.error('Failed to reject return:', err);
          toast.error(err.response?.data?.error || 'Failed to reject the return');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleReceiveReturn = () => {
    setIsPendingAction(true);
    receiveReturnMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Return received');
        },
        onError: (err) => {
          console.error('Failed to receive return:', err);
          toast.error(err.response?.data?.error || 'Failed to confirm return receipt');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const handleRetryReturnRefund = () => {
    setIsPendingAction(true);
    retryReturnRefundMutation.mutate(
      { orderId, itemId: item.id },
      {
        onSuccess: () => {
          toast.success('Return refund retried');
        },
        onError: (err) => {
          console.error('Failed to retry return refund:', err);
          toast.error(err.response?.data?.error || 'Failed to retry return refund');
        },
        onSettled: () => {
          setIsPendingAction(false);
        },
      }
    );
  };

  const unitPrice = Number(item.unitPriceAtPurchase ?? item.price);
  const subtotal = Number(item.subtotalAtPurchase ?? unitPrice * item.quantity);

  return (
    <li className="py-4 flex items-center first:pt-0 last:pb-0">
      <div
        className={cn(
          'h-16 w-16 rounded-md shrink-0 flex items-center justify-center overflow-hidden border',
          isWholesalerPath ? 'bg-zinc-800 border-zinc-700' : 'bg-[#EFEFEF] border-[#C0C0C0]'
        )}
      >
        {item.product.imageUrl ? (
          <img
            src={item.product.imageUrl}
            alt={item.product.name}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <Package
            className={cn('h-6 w-6', isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]')}
          />
        )}
      </div>
      <div className="ml-5 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4
            className={cn(
              'text-sm font-bold',
              isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
            )}
          >
            {item.product.name}
          </h4>
          <ReturnBadge item={item} isWholesalerPath={isWholesalerPath} />
          {item.status === 'CANCELLED' && (
            <span
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold border',
                isWholesalerPath
                  ? item.refundStatus === 'REFUNDED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : item.refundStatus === 'FAILED'
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : item.refundStatus === 'REFUNDED'
                    ? 'bg-[#EFEFEF] text-emerald-800 border-[#C0C0C0]'
                    : item.refundStatus === 'FAILED'
                      ? 'bg-[#EFEFEF] text-[#8B0000] border-[#C0C0C0]'
                      : 'bg-[#EFEFEF] text-amber-800 border-[#C0C0C0]'
              )}
            >
              {item.refundStatus === 'REFUNDED'
                ? 'Refunded'
                : item.refundStatus === 'FAILED'
                  ? 'Refund Failed'
                  : item.refundStatus === 'PROCESSING' || item.refundStatus === 'PENDING'
                    ? 'Refund Pending'
                    : 'Cancelled'}
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-xs mt-1 font-mono',
            isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
          )}
        >
          Qty:{' '}
          <span className={cn('font-bold', isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]')}>
            {item.quantity}
          </span>{' '}
          × ₹{unitPrice.toFixed(2)}
        </p>
        {item.returnReason && (
          <p className={cn('text-xs mt-2', isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]')}>
            Return reason: {formatReturnReason(item.returnReason)}
          </p>
        )}
        {item.customerReturnNotes && (
          <p className={cn('text-xs mt-1', isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]')}>
            {item.customerReturnNotes}
          </p>
        )}
        {item.rejectionReason && (
          <p
            className={cn(
              'text-xs mt-1',
              isWholesalerPath ? 'text-red-400 font-semibold' : 'text-[#8B0000]'
            )}
          >
            Rejected: {item.rejectionReason}
          </p>
        )}
        {item.gatewayRefundId && (
          <p
            className={cn(
              'text-xs mt-1 font-mono',
              isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
            )}
          >
            Gateway Refund: {item.gatewayRefundId}
          </p>
        )}
        {item.status === 'CANCELLED' && item.refundFailureReason && (
          <p
            className={cn(
              'text-xs mt-2',
              isWholesalerPath ? 'text-red-400 font-semibold' : 'text-[#8B0000]'
            )}
          >
            {item.refundFailureReason}
          </p>
        )}
        {item.status === 'CANCELLED' && item.refundReference && (
          <p
            className={cn(
              'text-xs mt-1 font-mono',
              isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
            )}
          >
            Refund Ref: {item.refundReference}
          </p>
        )}
      </div>
      <div className="text-right pl-4">
        <p
          className={cn(
            'text-sm font-bold font-mono',
            isWholesalerPath ? 'text-amber-400' : 'text-[#16171a]'
          )}
        >
          ₹{subtotal.toFixed(2)}
        </p>
        {user?.role === 'CUSTOMER' && (
          <div className="mt-3 flex flex-col gap-2 items-end">
            <button
              onClick={handleCancelItem}
              disabled={
                isPendingAction ||
                item.status === 'CANCELLED' ||
                !CUSTOMER_CANCELLABLE_STATUSES.has(orderStatus)
              }
              className="text-[11px] font-semibold uppercase tracking-wider bg-[#0047AB] hover:bg-[#003B91] text-white border border-[#0047AB] px-3 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {isPendingAction && item.status !== 'CANCELLED'
                ? 'Cancelling...'
                : item.status === 'CANCELLED'
                  ? 'Cancelled'
                  : 'Cancel Item'}
            </button>
            {item.status === 'CANCELLED' && ['FAILED', 'PENDING'].includes(item.refundStatus) && (
              <button
                onClick={handleRetryRefund}
                disabled={isPendingAction}
                className="text-[11px] font-semibold uppercase tracking-wider bg-white text-[#16171a] hover:bg-[#EFEFEF] border border-[#C0C0C0] px-3 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isPendingAction ? 'Retrying...' : 'Retry Refund'}
              </button>
            )}
            {item.isReturnEligible && (
              <button
                onClick={handleRequestReturn}
                disabled={isPendingAction}
                className="text-[11px] font-semibold uppercase tracking-wider bg-white text-[#16171a] hover:bg-[#EFEFEF] border border-[#C0C0C0] px-3 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isPendingAction ? 'Submitting...' : 'Request Return'}
              </button>
            )}
            {item.disputeEligibility?.canOpen && (
              <button
                onClick={handleCreateDispute}
                disabled={isPendingAction}
                className="text-[11px] font-semibold uppercase tracking-wider bg-white text-[#16171a] hover:bg-[#EFEFEF] border border-[#C0C0C0] px-3 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isPendingAction ? 'Submitting...' : 'Open Dispute'}
              </button>
            )}
          </div>
        )}
        {user?.role === 'WHOLESALER' && item.returnStatus === 'REQUESTED' && (
          <div className="mt-3 flex flex-col gap-2 items-end">
            <button
              onClick={handleApproveReturn}
              disabled={isPendingAction}
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition-colors disabled:opacity-50',
                isWholesalerPath
                  ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
                  : 'bg-[#0047AB] hover:bg-[#003B91] text-white border border-[#0047AB]'
              )}
            >
              {isPendingAction ? 'Saving...' : 'Approve Return'}
            </button>
            <button
              onClick={handleRejectReturn}
              disabled={isPendingAction}
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition-colors disabled:opacity-50 border',
                isWholesalerPath
                  ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border-zinc-700'
                  : 'bg-white text-[#16171a] hover:bg-[#EFEFEF] border-[#C0C0C0]'
              )}
            >
              {isPendingAction ? 'Saving...' : 'Reject Return'}
            </button>
          </div>
        )}
        {user?.role === 'WHOLESALER' && item.returnStatus === 'APPROVED' && (
          <div className="mt-3 flex flex-col gap-2 items-end">
            <button
              onClick={handleReceiveReturn}
              disabled={isPendingAction}
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition-colors disabled:opacity-50',
                isWholesalerPath
                  ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
                  : 'bg-[#0047AB] hover:bg-[#003B91] text-white border border-[#0047AB]'
              )}
            >
              {isPendingAction ? 'Saving...' : 'Mark Return Received'}
            </button>
          </div>
        )}
        {user?.role === 'WHOLESALER' &&
          item.returnStatus === 'RECEIVED' &&
          item.returnRefundStatus === 'FAILED' && (
            <div className="mt-3 flex flex-col gap-2 items-end">
              <button
                onClick={handleRetryReturnRefund}
                disabled={isPendingAction}
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition-colors disabled:opacity-50 border',
                  isWholesalerPath
                    ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border-zinc-700'
                    : 'bg-white text-[#16171a] hover:bg-[#EFEFEF] border-[#C0C0C0]'
                )}
              >
                {isPendingAction ? 'Retrying...' : 'Retry Return Refund'}
              </button>
            </div>
          )}
      </div>
    </li>
  );
}
