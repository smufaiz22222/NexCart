import { Loader2 } from 'lucide-react';
import { ModalShell } from './LayoutComponents';
import { cn } from '../../utils/cn';

export default function PartyDetailsModal({
  onClose,
  partyDetails,
  isLoading,
  formatCurrency,
  onSelectBill,
}) {
  return (
    <ModalShell
      title={isLoading ? 'Loading Party Details...' : `Party Ledger: ${partyDetails?.party?.name}`}
      subtitle={
        partyDetails?.party?.type
          ? `Type: ${partyDetails.party.type} | Phone: ${partyDetails.party.phone || '-'} | Email: ${partyDetails.party.email || '-'}`
          : ''
      }
      onClose={onClose}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : partyDetails ? (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Profile Card & Balances */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                They Owe You (Receivable)
              </p>
              <p className="mt-2 text-2xl font-black text-amber-200">
                {formatCurrency(partyDetails.party?.receivable)}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                You Owe Them (Payable)
              </p>
              <p className="mt-2 text-2xl font-black text-rose-200">
                {formatCurrency(partyDetails.party?.payable)}
              </p>
            </div>
          </div>

          {/* Bills Section */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Bills & Invoices
            </h4>
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Invoice Number</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-right font-semibold">Paid/Recv</th>
                    <th className="px-4 py-3 text-right font-semibold">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {partyDetails.bills?.map((bill) => (
                    <tr key={bill.id} className="bg-[#121212] hover:bg-zinc-900/30 transition">
                      <td className="px-4 py-3 text-zinc-400">
                        {new Date(bill.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onSelectBill(bill)}
                          className="font-semibold text-amber-400 hover:underline text-left font-bold"
                        >
                          {bill.invoiceNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-semibold uppercase',
                            bill.type === 'SALE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          )}
                        >
                          {bill.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {formatCurrency(bill.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                        {formatCurrency(bill.amountPaidReceived)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-200">
                        {formatCurrency(bill.balanceDue)}
                      </td>
                    </tr>
                  ))}
                  {partyDetails.bills?.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-6 text-center text-zinc-500 bg-[#121212]">
                        No bills found for this party.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments Section */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Payments & Manual Settlements
            </h4>
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Account / Mode</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {partyDetails.payments?.map((pmt) => (
                    <tr key={pmt.id} className="bg-[#121212]">
                      <td className="px-4 py-3 text-zinc-400">
                        {new Date(pmt.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-white font-semibold text-left font-bold">
                        {pmt.description}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-left">
                        {pmt.accountName} ({pmt.accountCode})
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-bold',
                          pmt.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        )}
                      >
                        {pmt.amount >= 0 ? '+' : ''}
                        {formatCurrency(pmt.amount)}
                      </td>
                    </tr>
                  ))}
                  {partyDetails.payments?.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-zinc-500 bg-[#121212]">
                        No manual settlements found for this party.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instruments/Cheques Section */}
          {partyDetails.paymentInstruments?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
                Cheques & Instruments
              </h4>
              <div className="overflow-hidden rounded-2xl border border-zinc-800">
                <table className="min-w-full divide-y divide-zinc-800 text-sm">
                  <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Instrument Number</th>
                      <th className="px-4 py-3 font-semibold">Bank Name</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {partyDetails.paymentInstruments?.map((inst) => (
                      <tr key={inst.id} className="bg-[#121212]">
                        <td className="px-4 py-3 text-zinc-400">
                          {new Date(inst.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-white font-mono">
                          {inst.instrumentNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{inst.bankName || '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-white">
                          {formatCurrency(inst.amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-bold uppercase',
                              inst.status === 'CLEARED'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            )}
                          >
                            {inst.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-400">Failed to load party details.</div>
      )}
    </ModalShell>
  );
}
