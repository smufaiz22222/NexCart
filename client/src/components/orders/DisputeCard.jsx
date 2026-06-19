import { toast } from 'sonner';
import { cn } from '../../utils/cn';
import {
  useMoveDisputeToReview,
  useResolveDispute,
  useCreateDisputeInternalNote,
} from '../../api/queries';

const DISPUTE_RESOLUTION_LABELS = {
  APPROVE: 'Approve',
  REJECT: 'Reject',
  PARTIAL_REFUND: 'Partial Refund',
};

const formatDisputeReason = (reason) =>
  String(reason || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function DisputeCard({ dispute, user, isWholesalerPath }) {
  const moveDisputeToReviewMutation = useMoveDisputeToReview();
  const resolveDisputeMutation = useResolveDispute();
  const createDisputeInternalNoteMutation = useCreateDisputeInternalNote();

  const handleMoveDisputeToReview = () => {
    moveDisputeToReviewMutation.mutate(
      {
        orderId: dispute.orderId,
        itemId: dispute.orderItemId,
        disputeId: dispute.id,
        updatedAt: dispute.updatedAt,
      },
      {
        onSuccess: () => {
          toast.success('Dispute moved to review');
        },
        onError: (err) => {
          console.error('Failed to move dispute to review:', err);
          toast.error(err.response?.data?.error || 'Failed to update dispute');
        },
      }
    );
  };

  const handleResolveDispute = () => {
    const resolutionTypeInput =
      window.prompt('Resolution type (APPROVE, REJECT, PARTIAL_REFUND)', 'REJECT') || '';
    const resolutionType = resolutionTypeInput.trim().toUpperCase().replaceAll(' ', '_');
    if (!Object.keys(DISPUTE_RESOLUTION_LABELS).includes(resolutionType)) {
      toast.warning('Please enter a valid resolution type.');
      return;
    }

    let resolutionAmount = '';
    if (resolutionType === 'PARTIAL_REFUND') {
      resolutionAmount = window.prompt('Partial refund amount', '') || '';
      if (!resolutionAmount.trim()) {
        toast.warning('A partial refund amount is required.');
        return;
      }
    }

    const resolutionNotes = window.prompt('Resolution notes', '') || '';

    resolveDisputeMutation.mutate(
      {
        orderId: dispute.orderId,
        itemId: dispute.orderItemId,
        disputeId: dispute.id,
        updatedAt: dispute.updatedAt,
        resolutionType,
        resolutionNotes,
        resolutionAmount,
        allowDirectResolution: dispute.status === 'OPEN',
      },
      {
        onSuccess: () => {
          toast.success('Dispute resolved successfully');
        },
        onError: (err) => {
          console.error('Failed to resolve dispute:', err);
          toast.error(err.response?.data?.error || 'Failed to resolve dispute');
        },
      }
    );
  };

  const handleAddDisputeNote = () => {
    const note = window.prompt('Seller-only investigation note', '') || '';
    if (!note.trim()) {
      return;
    }

    createDisputeInternalNoteMutation.mutate(
      {
        orderId: dispute.orderId,
        itemId: dispute.orderItemId,
        disputeId: dispute.id,
        updatedAt: dispute.updatedAt,
        note,
      },
      {
        onSuccess: () => {
          toast.success('Internal note added');
        },
        onError: (err) => {
          console.error('Failed to add internal note:', err);
          toast.error(err.response?.data?.error || 'Failed to add note');
        },
      }
    );
  };

  return (
    <div
      className={cn(
        'rounded-md border p-4',
        isWholesalerPath ? 'border-zinc-800 bg-zinc-900' : 'border-[#C0C0C0] bg-white'
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'text-sm font-bold',
                isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
              )}
            >
              Dispute
            </span>
            <span
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-semibold border',
                isWholesalerPath
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-[#EFEFEF] text-[#0047AB] border-[#C0C0C0]'
              )}
            >
              {dispute.status.replaceAll('_', ' ')}
            </span>
            <span
              className={cn(
                'text-[11px] font-mono px-2 py-1 rounded-md border',
                isWholesalerPath
                  ? 'text-zinc-400 bg-zinc-800 border-zinc-700'
                  : 'text-[#6C757D] bg-[#EFEFEF] border-[#C0C0C0]'
              )}
            >
              #{dispute.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div
            className={cn(
              'text-sm font-bold',
              isWholesalerPath ? 'text-zinc-300' : 'text-[#16171a]'
            )}
          >
            {formatDisputeReason(dispute.reason)}
          </div>
          <p
            className={cn(
              'text-sm leading-relaxed',
              isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
            )}
          >
            {dispute.description}
          </p>
          <div
            className={cn(
              'flex flex-wrap gap-4 text-xs font-mono',
              isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
            )}
          >
            <span>Item {dispute.item?.product?.name || dispute.orderItemId}</span>
            {dispute.latestResolution && (
              <span>
                Resolution{' '}
                {DISPUTE_RESOLUTION_LABELS[dispute.latestResolution.resolutionType] ||
                  dispute.latestResolution.resolutionType}
              </span>
            )}
            {dispute.latestResolution?.resolutionAmount && (
              <span>Amount: ₹{Number(dispute.latestResolution.resolutionAmount).toFixed(2)}</span>
            )}
            {dispute.latestResolution?.refundId && (
              <span>Refund Ref: {dispute.latestResolution.refundId}</span>
            )}
          </div>
          {!!dispute.evidence?.length && (
            <div
              className={cn(
                'text-xs font-mono',
                isWholesalerPath ? 'text-zinc-500' : 'text-[#6C757D]'
              )}
            >
              Evidence: {dispute.evidence.map((entry) => entry.url).join(', ')}
            </div>
          )}
          {!!dispute.timeline?.length && (
            <div
              className={cn(
                'rounded-md border p-3',
                isWholesalerPath
                  ? 'border-zinc-800 bg-zinc-950'
                  : 'border-[#C0C0C0] bg-[#EFEFEF]/50'
              )}
            >
              <div
                className={cn(
                  'text-[10px] uppercase tracking-wider font-bold mb-2',
                  isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]'
                )}
              >
                Timeline
              </div>
              <div className="space-y-2 font-mono">
                {dispute.timeline.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn('text-xs', isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]')}
                  >
                    <span
                      className={cn(
                        'font-semibold',
                        isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
                      )}
                    >
                      {entry.type.replaceAll('_', ' ')}
                    </span>{' '}
                    on{' '}
                    {new Date(entry.occurredAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {entry.notes ? ` - ${entry.notes}` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
          {user?.role === 'WHOLESALER' && !!dispute.internalNotes?.length && (
            <div
              className={cn(
                'rounded-md border p-3',
                isWholesalerPath
                  ? 'border-zinc-800 bg-zinc-950/40'
                  : 'border-[#C0C0C0] bg-[#EFEFEF]/30'
              )}
            >
              <div
                className={cn(
                  'text-[10px] uppercase tracking-wider font-bold mb-2',
                  isWholesalerPath ? 'text-amber-400/80' : 'text-[#6C757D]'
                )}
              >
                Internal Notes
              </div>
              <div className="space-y-2">
                {dispute.internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className={cn('text-xs', isWholesalerPath ? 'text-zinc-400' : 'text-[#6C757D]')}
                  >
                    <span
                      className={cn(
                        'font-semibold',
                        isWholesalerPath ? 'text-zinc-200' : 'text-[#16171a]'
                      )}
                    >
                      {note.author?.name || 'Seller'}
                    </span>{' '}
                    - {note.note}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {user?.role === 'WHOLESALER' && (
          <div
            className={cn(
              'w-full lg:w-[260px] rounded-md border p-3',
              isWholesalerPath ? 'border-zinc-800 bg-zinc-950' : 'border-[#C0C0C0] bg-[#EFEFEF]/30'
            )}
          >
            <div className="grid grid-cols-1 gap-3">
              {dispute.status === 'OPEN' && (
                <button
                  onClick={handleMoveDisputeToReview}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider px-4 py-2.5 rounded-md transition-colors',
                    isWholesalerPath
                      ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold'
                      : 'bg-[#0047AB] hover:bg-[#003B91] text-white'
                  )}
                >
                  Move to Review
                </button>
              )}
              {dispute.status !== 'RESOLVED' && (
                <button
                  onClick={handleResolveDispute}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider border px-4 py-2.5 rounded-md transition-colors',
                    isWholesalerPath
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                      : 'bg-white text-[#16171a] hover:bg-[#EFEFEF] border-[#C0C0C0]'
                  )}
                >
                  Resolve Dispute
                </button>
              )}
              {dispute.status !== 'RESOLVED' && (
                <button
                  onClick={handleAddDisputeNote}
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wider border px-4 py-2.5 rounded-md transition-colors',
                    isWholesalerPath
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                      : 'bg-white text-[#16171a] border-[#C0C0C0]'
                  )}
                >
                  Add Internal Note
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
