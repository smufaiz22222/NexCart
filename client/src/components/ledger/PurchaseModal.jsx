import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCreateOfflinePurchase } from '../../api/queries';
import { toast } from 'sonner';
import { ModalShell, Field } from './LayoutComponents';

const inputClassName = () =>
  'w-full rounded-2xl border border-zinc-700 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500';

const PAYMENT_METHODS = ['CASH', 'CREDIT', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'];

const EMPTY_PURCHASE_FORM = {
  invoiceNumber: '',
  partyId: '',
  paymentMethod: 'CASH',
  amountPaid: '',
  notes: '',
  items: [{ productId: '', quantity: '1', unitPrice: '' }],
  instrumentNumber: '',
  bankName: '',
  dueDate: '',
  awaitingClearance: false,
};

const EMPTY_PARTIES = [];
const EMPTY_PRODUCTS = [];

export default function PurchaseModal({
  onClose,
  parties = EMPTY_PARTIES,
  products = EMPTY_PRODUCTS,
  initialFormValues = null,
}) {
  const [purchaseForm, setPurchaseForm] = useState(initialFormValues || EMPTY_PURCHASE_FORM);
  const createOfflinePurchaseMutation = useCreateOfflinePurchase();

  const handlePurchaseSubmit = (event) => {
    event.preventDefault();
    createOfflinePurchaseMutation.mutate(
      {
        ...purchaseForm,
        amountPaid: purchaseForm.amountPaid || '0',
        partyId: purchaseForm.partyId || null,
        items: purchaseForm.items,
      },
      {
        onSuccess: () => {
          toast.success('Offline purchase recorded successfully!');
          onClose();
        },
        onError: (mutationError) => {
          toast.error(mutationError.response?.data?.error || 'Failed to create offline purchase.');
        },
      }
    );
  };

  const updatePurchaseItem = (index, field, value) => {
    setPurchaseForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addPurchaseItem = () => {
    setPurchaseForm((current) => ({
      ...current,
      items: [...current.items, { productId: '', quantity: '1', unitPrice: '' }],
    }));
  };

  const removePurchaseItem = (index) => {
    setPurchaseForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  return (
    <ModalShell
      title="New Offline Purchase"
      subtitle="Record inventory purchases from suppliers. This will automatically increase product stock."
      onClose={onClose}
    >
      <form onSubmit={handlePurchaseSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Invoice number">
            <input
              placeholder="Auto-generated if left blank"
              aria-label="Invoice number"
              value={purchaseForm.invoiceNumber}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  invoiceNumber: event.target.value,
                }))
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Supplier / Party">
            <select
              value={purchaseForm.partyId}
              onChange={(event) =>
                setPurchaseForm((current) => ({
                  ...current,
                  partyId: event.target.value,
                  paymentMethod: event.target.value ? 'CREDIT' : 'CASH',
                }))
              }
              className={inputClassName()}
            >
              <option value="">Walk-in / no party</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name} ({party.type})
                </option>
              ))}
            </select>
          </Field>
          {!purchaseForm.partyId && (
            <Field label="Payment method">
              <select
                value={purchaseForm.paymentMethod}
                onChange={(event) =>
                  setPurchaseForm((current) => ({
                    ...current,
                    paymentMethod: event.target.value,
                  }))
                }
                className={inputClassName()}
              >
                {PAYMENT_METHODS.flatMap((method) =>
                  method !== 'CREDIT' && method !== 'CHEQUE'
                    ? [
                        <option key={method} value={method}>
                          {method}
                        </option>,
                      ]
                    : []
                )}
              </select>
            </Field>
          )}
        </div>

        <div className="rounded-[24px] border border-zinc-800 bg-[#0b0b0b] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-white">Purchase Items</h4>
              <p className="text-sm text-zinc-400">Each line increases product stock.</p>
            </div>
            <button
              type="button"
              onClick={addPurchaseItem}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-bold text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </span>
            </button>
          </div>

          <div className="space-y-4">
            {purchaseForm.items.map((item, itemIndex) => (
              <div
                key={
                  item.id ||
                  (item.productId
                    ? `purchase-${item.productId}`
                    : `purchase-item-${item.quantity}-${item.unitPrice}`)
                }
                className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#111111] p-4 md:grid-cols-[1.4fr_0.6fr_0.8fr_auto]"
              >
                <Field label={`Product ${itemIndex + 1}`}>
                  <select
                    required
                    value={item.productId}
                    onChange={(event) =>
                      updatePurchaseItem(itemIndex, 'productId', event.target.value)
                    }
                    className={inputClassName()}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (stock {product.currentStock})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Qty">
                  <input
                    required
                    type="number"
                    min="1"
                    aria-label="Quantity"
                    value={item.quantity}
                    onChange={(event) =>
                      updatePurchaseItem(itemIndex, 'quantity', event.target.value)
                    }
                    className={inputClassName()}
                  />
                </Field>
                <Field label="Unit price">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    aria-label="Unit price"
                    value={item.unitPrice}
                    onChange={(event) =>
                      updatePurchaseItem(itemIndex, 'unitPrice', event.target.value)
                    }
                    className={inputClassName()}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removePurchaseItem(itemIndex)}
                    disabled={purchaseForm.items.length === 1}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-3 text-xs font-bold text-rose-300 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Field label="Notes">
          <textarea
            rows="3"
            aria-label="Notes"
            value={purchaseForm.notes}
            onChange={(event) =>
              setPurchaseForm((current) => ({ ...current, notes: event.target.value }))
            }
            className={inputClassName()}
          />
        </Field>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createOfflinePurchaseMutation.isPending}
            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-black disabled:opacity-60"
          >
            {createOfflinePurchaseMutation.isPending ? 'Saving...' : 'Save Offline Purchase'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
