import { useState } from 'react';
import { useCreateBusinessParty } from '../../api/queries';
import { toast } from 'sonner';
import { ModalShell, Field } from './LayoutComponents';

const inputClassName =
  'w-full rounded-2xl border border-zinc-700 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500';

const PARTY_TYPES = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
const OPENING_BALANCE_KINDS = ['RECEIVABLE', 'PAYABLE'];

const emptyPartyForm = {
  linkedUserId: '',
  name: '',
  phone: '',
  email: '',
  taxId: '',
  address: '',
  type: 'CUSTOMER',
  openingBalance: '',
  openingBalanceKind: 'RECEIVABLE',
  notes: '',
};

export default function PartyModal({ onClose, buyers = [] }) {
  const [partyForm, setPartyForm] = useState(emptyPartyForm);
  const createPartyMutation = useCreateBusinessParty();

  const handlePartySubmit = (event) => {
    event.preventDefault();
    createPartyMutation.mutate(partyForm, {
      onSuccess: () => {
        toast.success('Party created successfully.');
        onClose();
      },
      onError: (mutationError) => {
        toast.error(mutationError.response?.data?.error || 'Failed to create party.');
      },
    });
  };

  return (
    <ModalShell
      title="Create Party"
      subtitle="Add a customer, supplier, or both. You can also start them with an opening receivable or payable balance."
      onClose={onClose}
    >
      <form onSubmit={handlePartySubmit} className="grid gap-4 md:grid-cols-2">
        <Field label="Link marketplace buyer">
          <select
            value={partyForm.linkedUserId}
            onChange={(event) =>
              setPartyForm((current) => ({ ...current, linkedUserId: event.target.value }))
            }
            className={inputClassName()}
          >
            <option value="">No link</option>
            {buyers.map((buyer) => (
              <option key={buyer.buyerId} value={buyer.buyerId}>
                {buyer.companyName} - {buyer.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Party type">
          <select
            value={partyForm.type}
            onChange={(event) =>
              setPartyForm((current) => ({ ...current, type: event.target.value }))
            }
            className={inputClassName()}
          >
            {PARTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <input
            required
            value={partyForm.name}
            onChange={(event) =>
              setPartyForm((current) => ({ ...current, name: event.target.value }))
            }
            className={inputClassName()}
          />
        </Field>
        <Field label="Phone">
          <input
            value={partyForm.phone}
            onChange={(event) =>
              setPartyForm((current) => ({ ...current, phone: event.target.value }))
            }
            className={inputClassName()}
          />
        </Field>
        <Field label="Email">
          <input
            value={partyForm.email}
            onChange={(event) =>
              setPartyForm((current) => ({ ...current, email: event.target.value }))
            }
            className={inputClassName()}
          />
        </Field>
        <Field label="Tax ID / GSTIN">
          <input
            value={partyForm.taxId}
            onChange={(event) =>
              setPartyForm((current) => ({ ...current, taxId: event.target.value }))
            }
            className={inputClassName()}
          />
        </Field>
        <Field label="Opening balance">
          <input
            type="number"
            step="0.01"
            value={partyForm.openingBalance}
            onChange={(event) =>
              setPartyForm((current) => ({ ...current, openingBalance: event.target.value }))
            }
            className={inputClassName()}
          />
        </Field>
        <Field label="Opening balance kind">
          <select
            value={partyForm.openingBalanceKind}
            onChange={(event) =>
              setPartyForm((current) => ({
                ...current,
                openingBalanceKind: event.target.value,
              }))
            }
            className={inputClassName()}
          >
            {OPENING_BALANCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Address">
            <textarea
              rows="3"
              value={partyForm.address}
              onChange={(event) =>
                setPartyForm((current) => ({ ...current, address: event.target.value }))
              }
              className={inputClassName()}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Notes">
            <textarea
              rows="3"
              value={partyForm.notes}
              onChange={(event) =>
                setPartyForm((current) => ({ ...current, notes: event.target.value }))
              }
              className={inputClassName()}
            />
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={createPartyMutation.isPending}
            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-black disabled:opacity-60"
          >
            {createPartyMutation.isPending ? 'Saving...' : 'Create Party'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
