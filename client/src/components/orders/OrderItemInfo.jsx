import { cn } from '../../utils/cn';
import { ReturnBadge } from './OrderBadges';

const formatReturnReason = (reason) =>
  String(reason || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function OrderItemInfo({ item, isWholesalerPath, unitPrice }) {
  return (
    <div className="ml-5 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h4
          className={cn('text-sm font-bold', isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]')}
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
      {item.bankAccountNumber && (
        <div
          className={cn(
            'mt-2 p-2.5 rounded-lg border text-[11px] space-y-0.5 max-w-sm font-sans',
            isWholesalerPath
              ? 'bg-zinc-900/40 border-zinc-800 text-zinc-300'
              : 'bg-[#fbfaf7] border-[#ddd7cc] text-zinc-700'
          )}
        >
          <p
            className={cn(
              'font-bold uppercase tracking-wider text-[9px] mb-1',
              isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'
            )}
          >
            Refund Destination Bank Account:
          </p>
          <p>
            <span className="text-zinc-500 font-medium">A/C Number:</span>{' '}
            <strong className={isWholesalerPath ? 'text-zinc-200' : 'text-zinc-800'}>
              {item.bankAccountNumber}
            </strong>
          </p>
          <p>
            <span className="text-zinc-500 font-medium">IFSC Code:</span>{' '}
            <strong className={isWholesalerPath ? 'text-zinc-200' : 'text-zinc-800'}>
              {item.bankIfsc}
            </strong>
          </p>
          <p>
            <span className="text-zinc-500 font-medium">Holder Name:</span>{' '}
            <strong className={isWholesalerPath ? 'text-zinc-200' : 'text-zinc-800'}>
              {item.bankAccountName || 'N/A'}
            </strong>
          </p>
        </div>
      )}
      {item.refundPaymentMethod && (
        <p
          className={cn(
            'text-xs mt-1 font-semibold',
            isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
          )}
        >
          Refund Method:{' '}
          <span className={isWholesalerPath ? 'text-amber-400' : 'text-[#0047AB]'}>
            {item.refundPaymentMethod === 'BANK_TRANSFER'
              ? 'Bank Transfer'
              : item.refundPaymentMethod === 'UPI'
                ? 'UPI'
                : 'Cash'}
          </span>
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
  );
}
