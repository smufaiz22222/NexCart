import { AlertCircle, CheckCircle, Clock, Package, Truck } from 'lucide-react';
import { cn } from '../../utils/cn';

export function ReturnBadge({ item, isWholesalerPath = false }) {
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

  const className = isWholesalerPath
    ? item.returnStatus === 'RETURN_COMPLETED'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : item.returnStatus === 'REJECTED' || item.returnRefundStatus === 'FAILED'
        ? 'bg-red-500/10 text-red-400 border-red-500/20'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : item.returnStatus === 'RETURN_COMPLETED'
      ? 'bg-[#EFEFEF] text-emerald-800 border-[#C0C0C0]'
      : item.returnStatus === 'REJECTED' || item.returnRefundStatus === 'FAILED'
        ? 'bg-[#EFEFEF] text-[#8B0000] border-[#C0C0C0]'
        : 'bg-[#EFEFEF] text-amber-800 border-[#C0C0C0]';

  return (
    <span
      className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold border ${className}`}
    >
      {labelMap[item.returnStatus] || item.returnStatus.replaceAll('_', ' ')}
    </span>
  );
}

export function StatusBadge({ status, isWholesalerPath = false }) {
  if (isWholesalerPath) {
    switch (status) {
      case 'PENDING':
        return (
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
            <Clock className="w-3 h-3 mr-1.5" /> Pending
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
            <Package className="w-3 h-3 mr-1.5" /> Processing
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
            <Truck className="w-3 h-3 mr-1.5" /> Shipped
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
            <CheckCircle className="w-3 h-3 mr-1.5" /> Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
            <AlertCircle className="w-3 h-3 mr-1.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold">
            {status}
          </span>
        );
    }
  }

  switch (status) {
    case 'PENDING':
      return (
        <span className="bg-[#EFEFEF] border border-[#C0C0C0] text-amber-800 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
          <Clock className="w-3 h-3 mr-1.5" /> Pending
        </span>
      );
    case 'PROCESSING':
      return (
        <span className="bg-[#EFEFEF] border border-[#C0C0C0] text-[#0047AB] px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
          <Package className="w-3 h-3 mr-1.5" /> Processing
        </span>
      );
    case 'SHIPPED':
      return (
        <span className="bg-[#EFEFEF] border border-[#C0C0C0] text-[#0047AB] px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
          <Truck className="w-3 h-3 mr-1.5" /> Shipped
        </span>
      );
    case 'DELIVERED':
      return (
        <span className="bg-[#EFEFEF] border border-[#C0C0C0] text-emerald-800 px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
          <CheckCircle className="w-3 h-3 mr-1.5" /> Delivered
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="bg-[#EFEFEF] border border-[#C0C0C0] text-[#8B0000] px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold flex items-center">
          <AlertCircle className="w-3 h-3 mr-1.5" /> Cancelled
        </span>
      );
    default:
      return (
        <span className="bg-[#EFEFEF] border border-[#C0C0C0] text-[#6C757D] px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold">
          {status}
        </span>
      );
  }
}

export function PaymentBadge({ method, status, isWholesalerPath = false }) {
  const paletteByStatus = isWholesalerPath
    ? {
        PAID: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        REFUNDED: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        REFUND_PENDING: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        FAILED: 'bg-red-500/10 border-red-500/20 text-red-400',
        PENDING: 'bg-zinc-800 border-zinc-700 text-zinc-400',
      }
    : {
        PAID: 'bg-[#EFEFEF] border-[#C0C0C0] text-emerald-800',
        REFUNDED: 'bg-[#EFEFEF] border-[#C0C0C0] text-[#0047AB]',
        REFUND_PENDING: 'bg-[#EFEFEF] border-[#C0C0C0] text-amber-800',
        FAILED: 'bg-[#EFEFEF] border-[#C0C0C0] text-[#8B0000]',
        PENDING: 'bg-[#EFEFEF] border-[#C0C0C0] text-[#6C757D]',
      };

  return (
    <span
      className={cn(
        'px-3 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold border',
        paletteByStatus[status] || paletteByStatus.PENDING
      )}
    >
      {method} · {status.replace('_', ' ')}
    </span>
  );
}

export function IssueStatusBadge({ status, isWholesalerPath = false }) {
  const badgeClass = isWholesalerPath
    ? {
        OPEN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        IN_REVIEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
        RESOLVED: 'bg-zinc-850 text-zinc-400 border-zinc-700',
      }
    : {
        OPEN: 'bg-[#EFEFEF] text-amber-800 border-[#C0C0C0]',
        IN_REVIEW: 'bg-[#EFEFEF] text-[#0047AB] border-[#C0C0C0]',
        APPROVED: 'bg-[#EFEFEF] text-emerald-800 border-[#C0C0C0]',
        REJECTED: 'bg-[#EFEFEF] text-[#8B0000] border-[#C0C0C0]',
        RESOLVED: 'bg-[#EFEFEF] text-[#6C757D] border-[#C0C0C0]',
      };
  return (
    <span
      className={cn(
        'px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold border',
        badgeClass[status] ||
          (isWholesalerPath
            ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
            : 'bg-[#EFEFEF] text-[#6C757D] border-[#C0C0C0]')
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
