import { useState } from 'react';
import { useRecordPartyTransaction } from '../../api/queries';
import { toast } from 'sonner';
import { ModalShell, Field } from './LayoutComponents';

const inputClassName = () =>
  'w-full rounded-2xl border border-zinc-700 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500';

const PAYMENT_METHODS = ['CASH', 'CREDIT', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'];

export default function SettlementModal({ onClose, selectedParty, initialDirection }) {
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    direction: initialDirection,
    paymentMethod: 'CASH',
    description:
      initialDirection === 'IN' ? 'Payment received from party' : 'Payment made to party',
    referenceId: '',
    instrumentNumber: '',
    bankName: '',
    drawerName: '',
    dueDate: '',
    awaitingClearance: false,
  });

  const recordPartyTransactionMutation = useRecordPartyTransaction();

  const handleSettlementSubmit = (event) => {
    event.preventDefault();
    if (!selectedParty?.id) return;

    recordPartyTransactionMutation.mutate(
      {
        partyId: selectedParty.id,
        ...settlementForm,
      },
      {
        onSuccess: () => {
          toast.success('Party transaction recorded.');
          onClose();
        },
        onError: (mutationError) => {
          toast.error(mutationError.response?.data?.error || 'Failed to record party transaction.');
        },
      }
    );
  };

  return (
    <ModalShell
      title={settlementForm.direction === 'IN' ? 'Receive Payment' : 'Pay Party'}
      subtitle={`Record a manual settlement for ${selectedParty?.name}.`}
      onClose={onClose}
    >
      <form onSubmit={handleSettlementSubmit} className="grid gap-4 md:grid-cols-2">
        <Field label="Amount">
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            aria-label="Amount"
            value={settlementForm.amount}
            onChange={(event) =>
              setSettlementForm((current) => ({ ...current, amount: event.target.value }))
            }
            className={inputClassName()}
          />
        </Field>
        <Field label="Payment method">
          <select
            value={settlementForm.paymentMethod}
            onChange={(event) =>
              setSettlementForm((current) => ({
                ...current,
                paymentMethod: event.target.value,
              }))
            }
            className={inputClassName()}
          >
            {PAYMENT_METHODS.flatMap((method) =>
              method !== 'CREDIT'
                ? [
                    <option key={method} value={method}>
                      {method}
                    </option>,
                  ]
                : []
            )}
          </select>
        </Field>
        {['CHEQUE', 'UPI', 'BANK_TRANSFER', 'CARD'].includes(settlementForm.paymentMethod) && (
          <div className="md:col-span-2 grid gap-4 md:grid-cols-2 rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4">
            <div className="md:col-span-2 flex items-center justify-between">
              <h5 className="text-sm font-bold text-amber-400">Payment Instrument Details</h5>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="Awaiting Bank Clearance"
                  checked={settlementForm.awaitingClearance}
                  onChange={(event) =>
                    setSettlementForm((current) => ({
                      ...current,
                      awaitingClearance: event.target.checked,
                    }))
                  }
                  className="rounded border-zinc-700 bg-[#0b0b0b] text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Awaiting Bank Clearance?
                </span>
              </label>
            </div>
            <Field label="Reference / Instrument Number">
              <input
                placeholder="Cheque # / UTR / Transaction ID"
                aria-label="Reference / Instrument Number"
                value={settlementForm.instrumentNumber}
                onChange={(event) =>
                  setSettlementForm((current) => ({
                    ...current,
                    instrumentNumber: event.target.value,
                  }))
                }
                className={inputClassName()}
              />
            </Field>
            <Field label="Bank Name">
              <input
                placeholder="e.g. HDFC Bank"
                aria-label="Bank Name"
                value={settlementForm.bankName}
                onChange={(event) =>
                  setSettlementForm((current) => ({ ...current, bankName: event.target.value }))
                }
                className={inputClassName()}
              />
            </Field>
            <Field label="Instrument Date">
              <input
                type="date"
                aria-label="Instrument Date"
                value={settlementForm.dueDate}
                onChange={(event) =>
                  setSettlementForm((current) => ({ ...current, dueDate: event.target.value }))
                }
                className={inputClassName()}
              />
            </Field>
            {settlementForm.paymentMethod === 'CHEQUE' && settlementForm.direction === 'OUT' && (
              <div className="md:col-span-2">
                <Field label="Whose cheque is this? (Drawer Name)">
                  <input
                    placeholder="e.g. Self, or Customer/Party Name (if forwarding)"
                    aria-label="Drawer Name"
                    value={settlementForm.drawerName || ''}
                    onChange={(event) =>
                      setSettlementForm((current) => ({
                        ...current,
                        drawerName: event.target.value,
                      }))
                    }
                    className={inputClassName()}
                  />
                </Field>
              </div>
            )}
          </div>
        )}
        <div className="md:col-span-2">
          <Field label="Description">
            <input
              aria-label="Description"
              value={settlementForm.description}
              onChange={(event) =>
                setSettlementForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={inputClassName()}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Reference ID">
            <input
              aria-label="Reference ID"
              value={settlementForm.referenceId}
              onChange={(event) =>
                setSettlementForm((current) => ({
                  ...current,
                  referenceId: event.target.value,
                }))
              }
              className={inputClassName()}
            />
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={recordPartyTransactionMutation.isPending}
            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-black disabled:opacity-60"
          >
            {recordPartyTransactionMutation.isPending ? 'Saving...' : 'Record Transaction'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
