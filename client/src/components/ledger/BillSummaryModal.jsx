import { ModalShell } from './LayoutComponents';

export default function BillSummaryModal({ onClose, selectedBill, formatCurrency }) {
  if (!selectedBill) return null;

  return (
    <ModalShell
      title={`Bill Summary: ${selectedBill.invoiceNumber}`}
      subtitle={`Type: ${selectedBill.type} | Date: ${new Date(selectedBill.date).toLocaleString()}`}
      onClose={onClose}
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Bill Details */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Total Amount</p>
            <p className="mt-1 text-xl font-black text-white">
              {formatCurrency(selectedBill.totalAmount)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Paid/Received</p>
            <p className="mt-1 text-xl font-black text-emerald-300">
              {formatCurrency(selectedBill.amountPaidReceived)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Balance Due</p>
            <p className="mt-1 text-xl font-black text-rose-300">
              {formatCurrency(selectedBill.balanceDue)}
            </p>
          </div>
        </div>

        {/* Additional info */}
        <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4 space-y-2">
          <p className="text-xs text-zinc-400">
            <strong className="text-zinc-300">Payment Method:</strong> {selectedBill.paymentMethod}
          </p>
          {selectedBill.notes && (
            <p className="text-xs text-zinc-400">
              <strong className="text-zinc-300">Notes:</strong> {selectedBill.notes}
            </p>
          )}
        </div>

        {/* Line Items Table */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
            Item Summary
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product Name</th>
                  <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                  <th className="px-4 py-3 text-right font-semibold">Unit Price</th>
                  <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {selectedBill.items?.map((item) => (
                  <tr key={item.id} className="bg-[#121212]">
                    <td className="px-4 py-3 text-white font-semibold text-left font-bold">
                      {item.productName}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-bold">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
