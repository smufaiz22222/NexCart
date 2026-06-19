import { useState } from 'react';
import { toast } from 'sonner';
import { useSubmitOrderIssue } from '../../api/queries';

const CUSTOMER_ISSUE_TEMPLATE = {
  type: 'REFUND',
  orderItemId: '',
  preferredResolution: 'REFUND',
  requestedQuantity: 1,
  reason: '',
  description: '',
};

export default function IssueSubmitForm({ order, onSuccess }) {
  const [issueDraft, setIssueDraft] = useState(CUSTOMER_ISSUE_TEMPLATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitIssueMutation = useSubmitOrderIssue();

  const setField = (field, value) => {
    setIssueDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    submitIssueMutation.mutate(
      {
        orderId: order.id,
        ...issueDraft,
        type: 'REFUND',
      },
      {
        onSuccess: () => {
          setIssueDraft(CUSTOMER_ISSUE_TEMPLATE);
          toast.success('Request submitted successfully');
          if (onSuccess) onSuccess();
        },
        onError: (err) => {
          console.error('Failed to create order issue:', err);
          toast.error(err.response?.data?.error || 'Failed to create the request');
        },
        onSettled: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mb-5 rounded-md border border-[#C0C0C0] bg-white p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm text-[#16171a]">
          <span className="block text-xs uppercase tracking-wider text-[#6C757D] mb-2 font-semibold">
            Request Type
          </span>
          <select
            value={issueDraft.type}
            onChange={(event) => setField('type', event.target.value)}
            className="w-full rounded-md border border-[#C0C0C0] bg-white px-3 py-2 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB]"
          >
            <option value="REFUND">Refund</option>
          </select>
        </label>

        <label className="text-sm text-[#16171a]">
          <span className="block text-xs uppercase tracking-wider text-[#6C757D] mb-2 font-semibold">
            Item
          </span>
          <select
            value={issueDraft.orderItemId}
            onChange={(event) => setField('orderItemId', event.target.value)}
            className="w-full rounded-md border border-[#C0C0C0] bg-white px-3 py-2 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB]"
          >
            <option value="">Entire order / not specific</option>
            {order.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-[#16171a]">
          <span className="block text-xs uppercase tracking-wider text-[#6C757D] mb-2 font-semibold">
            Preferred Resolution
          </span>
          <select
            value={issueDraft.preferredResolution}
            onChange={(event) => setField('preferredResolution', event.target.value)}
            className="w-full rounded-md border border-[#C0C0C0] bg-white px-3 py-2 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB]"
          >
            <option value="REFUND">Refund</option>
            <option value="REPLACEMENT">Replacement</option>
            <option value="STORE_CREDIT">Store credit</option>
            <option value="RETURNLESS_REFUND">Returnless refund</option>
          </select>
        </label>

        <label className="text-sm text-[#16171a]">
          <span className="block text-xs uppercase tracking-wider text-[#6C757D] mb-2 font-semibold">
            Quantity
          </span>
          <input
            type="number"
            min="1"
            value={issueDraft.requestedQuantity}
            onChange={(event) => setField('requestedQuantity', event.target.value)}
            className="w-full rounded-md border border-[#C0C0C0] bg-white px-3 py-2 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB] font-mono"
          />
        </label>
      </div>

      <label className="block text-sm text-[#16171a] mt-4">
        <span className="block text-xs uppercase tracking-wider text-[#6C757D] mb-2 font-semibold">
          Reason
        </span>
        <input
          type="text"
          value={issueDraft.reason}
          onChange={(event) => setField('reason', event.target.value)}
          placeholder="Wrong item, damaged package, missing parts, billing issue..."
          className="w-full rounded-md border border-[#C0C0C0] bg-white px-3 py-2 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB]"
        />
      </label>

      <label className="block text-sm text-[#16171a] mt-4">
        <span className="block text-xs uppercase tracking-wider text-[#6C757D] mb-2 font-semibold">
          Details
        </span>
        <textarea
          rows="4"
          value={issueDraft.description}
          onChange={(event) => setField('description', event.target.value)}
          placeholder="Add enough context for the seller to act on this without chasing you for basics."
          className="w-full rounded-md border border-[#C0C0C0] bg-white px-3 py-2 text-sm text-[#16171a] focus:outline-none focus:ring-1 focus:ring-[#0047AB]"
        />
      </label>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="text-xs font-semibold uppercase tracking-wider bg-[#0047AB] hover:bg-[#003B91] text-white px-5 py-2.5 rounded-md transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </form>
  );
}
