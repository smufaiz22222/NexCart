import { Loader2 } from 'lucide-react';
import { ModalShell } from './LayoutComponents';
import { cn } from '../../utils/cn';

export default function AccountReportModal({ onClose, accountDetail, isLoading, formatCurrency }) {
  return (
    <ModalShell
      title={
        isLoading ? 'Loading Account...' : `Account Report: ${accountDetail?.account?.name || ''}`
      }
      subtitle={
        !isLoading && accountDetail?.account
          ? `Code: ${accountDetail.account.code} | Category: ${accountDetail.account.category}`
          : ''
      }
      onClose={onClose}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm font-bold uppercase tracking-wider">
            Loading detailed transaction history...
          </p>
        </div>
      ) : accountDetail?.entries ? (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Current Balance</p>
              <p className="mt-1 text-2xl font-black text-white">
                {formatCurrency(
                  Number(accountDetail.account.openingBalance || 0) +
                    accountDetail.entries.reduce((sum, entry) => sum + Number(entry.amount), 0)
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Opening Balance</p>
              <p className="mt-1 text-sm font-bold text-zinc-300">
                {formatCurrency(accountDetail.account.openingBalance)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Transaction Ledger History
            </h4>
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Linked Party</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {accountDetail.entries.map((entry) => (
                    <tr key={entry.id} className="bg-[#121212] hover:bg-zinc-900/10 transition">
                      <td className="px-4 py-3 text-zinc-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-white font-semibold text-left font-bold">
                        {entry.description}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-left">
                        {entry.party?.name || 'N/A'}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-black',
                          Number(entry.amount) >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        )}
                      >
                        {Number(entry.amount) >= 0 ? '+' : ''}
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  ))}
                  {accountDetail.entries.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-zinc-500 bg-[#121212]">
                        No transactions found for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-400">Failed to load account report details.</div>
      )}
    </ModalShell>
  );
}
