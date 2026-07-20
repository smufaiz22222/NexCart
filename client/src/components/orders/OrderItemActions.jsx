import { cn } from '../../utils/cn';

const CUSTOMER_CANCELLABLE_STATUSES = new Set(['PENDING', 'PROCESSING']);

export function OrderItemCustomerActions({
  item,
  orderStatus,
  isPendingAction,
  handleCancelItem,
  handleRetryRefund,
  handleRequestReturn,
  handleCreateDispute,
}) {
  return (
    <div className="mt-3 flex flex-col gap-2 items-end">
      <button
        type="button"
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
      {item.status === 'CANCELLED' && item.refundStatus === 'FAILED' && (
        <button
          type="button"
          onClick={handleRetryRefund}
          disabled={isPendingAction}
          className="text-[11px] font-semibold uppercase tracking-wider bg-white text-[#16171a] hover:bg-[#EFEFEF] border border-[#C0C0C0] px-3 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {isPendingAction ? 'Retrying...' : 'Retry Refund'}
        </button>
      )}
      {item.isReturnEligible && (
        <button
          type="button"
          onClick={handleRequestReturn}
          disabled={isPendingAction}
          className="text-[11px] font-semibold uppercase tracking-wider bg-white text-[#16171a] hover:bg-[#EFEFEF] border border-[#C0C0C0] px-3 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {isPendingAction ? 'Submitting...' : 'Request Return'}
        </button>
      )}
      {item.disputeEligibility?.canOpen && (
        <button
          type="button"
          onClick={handleCreateDispute}
          disabled={isPendingAction}
          className="text-[11px] font-semibold uppercase tracking-wider bg-white text-[#16171a] hover:bg-[#EFEFEF] border border-[#C0C0C0] px-3 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {isPendingAction ? 'Submitting...' : 'Open Dispute'}
        </button>
      )}
    </div>
  );
}

export function OrderItemWholesalerActions({
  item,
  paymentMethod,
  isWholesalerPath,
  isPendingAction,
  handleApproveReturn,
  handleRejectReturn,
  handleReceiveReturn,
  handleSettleReturnRefund,
  handleRetryReturnRefund,
}) {
  if (item.returnStatus === 'REQUESTED') {
    return (
      <div className="mt-3 flex flex-col gap-2 items-end">
        <button
          type="button"
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
          type="button"
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
    );
  }

  if (item.returnStatus === 'APPROVED') {
    return (
      <div className="mt-3 flex flex-col gap-2 items-end">
        <button
          type="button"
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
    );
  }

  if (item.returnStatus === 'RECEIVED' && item.returnRefundStatus === 'PENDING') {
    return (
      <div className="mt-3 flex flex-col gap-2 items-end">
        {paymentMethod === 'COD' ? (
          <button
            type="button"
            onClick={handleSettleReturnRefund}
            disabled={isPendingAction}
            className={cn(
              'text-[11px] font-semibold uppercase tracking-wider px-3 py-2 rounded-md transition-colors disabled:opacity-50',
              isWholesalerPath
                ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
                : 'bg-[#0047AB] hover:bg-[#003B91] text-white border border-[#0047AB]'
            )}
          >
            {isPendingAction ? 'Saving...' : 'Settle Refund'}
          </button>
        ) : (
          <button
            type="button"
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
        )}
      </div>
    );
  }

  return null;
}
