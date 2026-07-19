import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCreateOfflineSale } from '../../api/queries';
import { toast } from 'sonner';
import { ModalShell, Field } from './LayoutComponents';

const inputClassName = () =>
  'w-full rounded-2xl border border-zinc-700 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500';

const PAYMENT_METHODS = ['CASH', 'CREDIT', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'];

const emptySaleItem = {
  productId: '',
  quantity: '1',
  unitPrice: '',
};

const emptySaleForm = {
  invoiceNumber: '',
  partyId: '',
  paymentMethod: 'CASH',
  amountReceived: '',
  notes: '',
  items: [{ ...emptySaleItem }],
  instrumentNumber: '',
  bankName: '',
  dueDate: '',
  awaitingClearance: false,
};

const EMPTY_PARTIES = [];
const EMPTY_PRODUCTS = [];

export default function SaleModal({ onClose, parties = EMPTY_PARTIES, products = EMPTY_PRODUCTS }) {
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const createOfflineSaleMutation = useCreateOfflineSale();

  const handleSaleSubmit = (event) => {
    event.preventDefault();
    createOfflineSaleMutation.mutate(
      {
        ...saleForm,
        amountReceived: saleForm.amountReceived || '0',
        partyId: saleForm.partyId || null,
        items: saleForm.items,
      },
      {
        onSuccess: () => {
          toast.success('Offline sale saved and inventory updated.');
          onClose();
        },
        onError: (mutationError) => {
          toast.error(mutationError.response?.data?.error || 'Failed to create offline sale.');
        },
      }
    );
  };

  const updateSaleItem = (index, field, value) => {
    setSaleForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addSaleItem = () => {
    setSaleForm((current) => ({
      ...current,
      items: [...current.items, { ...emptySaleItem }],
    }));
  };

  const removeSaleItem = (index) => {
    setSaleForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  return (
    <ModalShell
      title="New Offline Sale"
      subtitle="Create a manual invoice, choose how much was received now, and the system will reduce inventory and update receivables."
      onClose={onClose}
    >
      <form onSubmit={handleSaleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Invoice number">
            <input
              placeholder="Auto-generated if left blank"
              aria-label="Invoice number"
              value={saleForm.invoiceNumber}
              onChange={(event) =>
                setSaleForm((current) => ({ ...current, invoiceNumber: event.target.value }))
              }
              className={inputClassName()}
            />
          </Field>
          <Field label="Party / Customer">
            <select
              value={saleForm.partyId}
              onChange={(event) =>
                setSaleForm((current) => ({
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
                  {party.name}
                </option>
              ))}
            </select>
          </Field>
          {!saleForm.partyId && (
            <Field label="Payment method">
              <select
                value={saleForm.paymentMethod}
                onChange={(event) =>
                  setSaleForm((current) => ({ ...current, paymentMethod: event.target.value }))
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
              <h4 className="text-base font-bold text-white">Sale Items</h4>
              <p className="text-sm text-zinc-400">Each line reduces product stock.</p>
            </div>
            <button
              type="button"
              onClick={addSaleItem}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-bold text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </span>
            </button>
          </div>

          <div className="space-y-4">
            {saleForm.items.map((item, index) => (
              <div
                key={`${index}-${item.productId}`}
                className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#111111] p-4 md:grid-cols-[1.4fr_0.6fr_0.8fr_auto]"
              >
                <Field label={`Product ${index + 1}`}>
                  <select
                    required
                    value={item.productId}
                    onChange={(event) => updateSaleItem(index, 'productId', event.target.value)}
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
                    onChange={(event) => updateSaleItem(index, 'quantity', event.target.value)}
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
                    onChange={(event) => updateSaleItem(index, 'unitPrice', event.target.value)}
                    className={inputClassName()}
                  />
                </Field>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeSaleItem(index)}
                    disabled={saleForm.items.length === 1}
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
            value={saleForm.notes}
            onChange={(event) =>
              setSaleForm((current) => ({ ...current, notes: event.target.value }))
            }
            className={inputClassName()}
          />
        </Field>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createOfflineSaleMutation.isPending}
            className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-black disabled:opacity-60"
          >
            {createOfflineSaleMutation.isPending ? 'Saving...' : 'Save Offline Sale'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
