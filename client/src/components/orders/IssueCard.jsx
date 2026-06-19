import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import { IssueStatusBadge } from './OrderBadges';
import { useReviewOrderIssue } from '../../api/queries';

const issueTypeLabel = {
  RETURN: 'Return',
  REFUND: 'Refund',
  DISPUTE: 'Dispute',
};

const resolutionLabel = {
  NONE: 'Pending resolution',
  REFUND: 'Refund',
  REPLACEMENT: 'Replacement',
  STORE_CREDIT: 'Store credit',
  RETURNLESS_REFUND: 'Returnless refund',
};

export default function IssueCard({ issue, user, isWholesalerPath }) {
  const [reviewDraft, setReviewDraft] = useState({
    status: issue.status === 'OPEN' ? 'IN_REVIEW' : issue.status,
    finalResolution:
      issue.finalResolution === 'NONE' ? issue.preferredResolution : issue.finalResolution,
    sellerResponse: issue.sellerResponse || '',
    refundAmount: issue.refundAmount || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const reviewIssueMutation = useReviewOrderIssue();

  const setField = (field, value) => {
    setReviewDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleReviewIssue = (event) => {
    event.preventDefault();
    setIsSaving(true);

    reviewIssueMutation.mutate(
      {
        issueId: issue.id,
        ...reviewDraft,
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
          setIsSaving(false);
        },
      }
    );
  };

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        isWholesalerPath ? 'border-zinc-800 bg-[#151515]' : 'border-[#C0C0C0] bg-white'
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'text-sm font-bold',
                isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
              )}
            >
              {issueTypeLabel[issue.type] || issue.type}
            </span>
            <IssueStatusBadge status={issue.status} isWholesalerPath={isWholesalerPath} />
            <span
              className={cn(
                'text-[11px] font-mono px-2 py-1 rounded-md border',
                isWholesalerPath
                  ? 'text-zinc-400 bg-zinc-850 border-zinc-700'
                  : 'text-[#6C757D] bg-[#EFEFEF] border-[#C0C0C0]'
              )}
            >
              #{issue.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p
            className={cn(
              'text-sm font-semibold mt-3',
              isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]'
            )}
          >
            {issue.reason}
          </p>
          {issue.description && (
            <p
              className={cn(
                'text-sm mt-2 leading-relaxed',
                isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
              )}
            >
              {issue.description}
            </p>
          )}
          <div
            className={cn(
              'mt-3 flex flex-wrap gap-4 text-xs font-mono',
              isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
            )}
          >
            <span>Opened by {issue.requester?.name || 'Customer'}</span>
            <span>
              Requested: {resolutionLabel[issue.preferredResolution] || issue.preferredResolution}
            </span>
            <span>Qty: {issue.requestedQuantity}</span>
            {issue.orderItem?.product?.name && <span>Item: {issue.orderItem.product.name}</span>}
            {issue.finalResolution !== 'NONE' && (
              <span>Final: {resolutionLabel[issue.finalResolution]}</span>
            )}
            {issue.refundAmount && <span>Refund: ₹{Number(issue.refundAmount).toFixed(2)}</span>}
          </div>
          {issue.sellerResponse && (
            <div
              className={cn(
                'mt-3 rounded-md border px-3 py-2 text-sm',
                isWholesalerPath
                  ? 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
                  : 'border-[#C0C0C0] bg-[#EFEFEF]/30 text-[#16171a]'
              )}
            >
              <span
                className={cn(
                  'block text-[10px] uppercase tracking-wider mb-1 font-semibold',
                  isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                )}
              >
                Seller Response
              </span>
              {issue.sellerResponse}
            </div>
          )}
        </div>

        {user?.role === 'WHOLESALER' && (
          <form
            onSubmit={handleReviewIssue}
            className={cn(
              'w-full lg:w-[320px] rounded-md border p-3',
              isWholesalerPath ? 'border-zinc-800 bg-zinc-950' : 'border-[#C0C0C0] bg-[#EFEFEF]/30'
            )}
          >
            <div className="grid grid-cols-1 gap-3">
              <label
                className={cn('text-sm', isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]')}
              >
                <span
                  className={cn(
                    'block text-xs uppercase tracking-wider mb-2 font-semibold',
                    isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                  )}
                >
                  Status
                </span>
                <select
                  value={reviewDraft.status}
                  onChange={(event) => setField('status', event.target.value)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1',
                    isWholesalerPath
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-100 focus:ring-amber-500'
                      : 'border-[#C0C0C0] bg-white text-[#16171a] focus:ring-[#0047AB]'
                  )}
                >
                  <option value="IN_REVIEW">In review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </label>

              <label
                className={cn('text-sm', isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]')}
              >
                <span
                  className={cn(
                    'block text-xs uppercase tracking-wider mb-2 font-semibold',
                    isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                  )}
                >
                  Final Resolution
                </span>
                <select
                  value={reviewDraft.finalResolution}
                  onChange={(event) => setField('finalResolution', event.target.value)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1',
                    isWholesalerPath
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-100 focus:ring-amber-500'
                      : 'border-[#C0C0C0] bg-white text-[#16171a] focus:ring-[#0047AB]'
                  )}
                >
                  <option value="REFUND">Refund</option>
                  <option value="REPLACEMENT">Replacement</option>
                  <option value="STORE_CREDIT">Store credit</option>
                  <option value="RETURNLESS_REFUND">Returnless refund</option>
                  <option value="NONE">No decision yet</option>
                </select>
              </label>

              <label
                className={cn('text-sm', isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]')}
              >
                <span
                  className={cn(
                    'block text-xs uppercase tracking-wider mb-2 font-semibold',
                    isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                  )}
                >
                  Refund Amount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reviewDraft.refundAmount}
                  onChange={(event) => setField('refundAmount', event.target.value)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 font-mono',
                    isWholesalerPath
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-100 focus:ring-amber-500'
                      : 'border-[#C0C0C0] bg-white text-[#16171a] focus:ring-[#0047AB]'
                  )}
                />
              </label>

              <label
                className={cn('text-sm', isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]')}
              >
                <span
                  className={cn(
                    'block text-xs uppercase tracking-wider mb-2 font-semibold',
                    isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
                  )}
                >
                  Response
                </span>
                <textarea
                  rows="3"
                  value={reviewDraft.sellerResponse}
                  onChange={(event) => setField('sellerResponse', event.target.value)}
                  className={cn(
                    'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1',
                    isWholesalerPath
                      ? 'border-zinc-700 bg-zinc-900 text-zinc-100 focus:ring-amber-500'
                      : 'border-[#C0C0C0] bg-white text-[#16171a] focus:ring-[#0047AB]'
                  )}
                />
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors disabled:opacity-50',
                  isWholesalerPath
                    ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
                    : 'bg-[#0047AB] hover:bg-[#003B91] text-white'
                )}
              >
                {isSaving ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
