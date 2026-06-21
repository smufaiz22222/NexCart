import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ShoppingBag,
  HelpCircle,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { useLedgerHub } from '../api/queries';
import { cn } from '../utils/cn';

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ECOMMERCE_SOURCES = [
  'ORDER_CHARGE',
  'ORDER_AUTO_PAYMENT',
  'ORDER_PREPAID_PAYMENT',
  'ORDER_CANCELLATION',
  'CUSTOMER_RETURN',
  'RETURN_REFUND',
  'RETURN_ADJUSTMENT',
];

export default function EcommerceAccounting() {
  const { data, isLoading, isError, error, refetch, isFetching } = useLedgerHub();
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const hub = data || { ledgerEntries: [] };

  // Filter entries to only show e-commerce sources and apply search/filter criteria
  const ecommerceEntries = useMemo(() => {
    const baseEntries = hub.ledgerEntries || [];
    return baseEntries.filter((entry) => {
      // 1. Must be e-commerce source
      if (!ECOMMERCE_SOURCES.includes(entry.source)) {
        return false;
      }

      // 2. Filter by source filter
      if (sourceFilter !== 'all' && entry.source !== sourceFilter) {
        return false;
      }

      // 3. Search term (Order ID, Buyer name, email, description)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesOrder = entry.orderId?.toLowerCase().includes(query) || false;
        const matchesUser =
          entry.user?.name?.toLowerCase().includes(query) ||
          entry.user?.email?.toLowerCase().includes(query) ||
          false;
        const matchesDesc = entry.description?.toLowerCase().includes(query) || false;
        return matchesOrder || matchesUser || matchesDesc;
      }

      return true;
    });
  }, [hub.ledgerEntries, sourceFilter, searchTerm]);

  if (isError) {
    return (
      <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100 font-sans">
        <p className="text-lg font-bold">Failed to load e-commerce accounting data.</p>
        <p className="mt-2 text-sm text-rose-200/90">
          {error?.response?.data?.error || error?.message || 'Unknown error'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-white">
      {/* Header Banner */}
      <div className="rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.12),_transparent_34%),linear-gradient(180deg,#151515_0%,#0d0d0d_100%)] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-400">
              Online Marketplace Accounting
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              Ecommerce Transaction Ledger
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Audit automated marketplace charges, COD delivery settlements, prepaid payment
              collections, and refund reversal entries under the platform rules.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-2xl border border-zinc-700 bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:border-zinc-500 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            {isFetching ? 'Syncing...' : 'Sync History'}
          </button>
        </div>
      </div>

      {/* Main Grid: Entries on Left, Rules on Right */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Left Column: Transaction Log */}
        <section className="rounded-[24px] border border-zinc-800 bg-[#121212] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] flex flex-col space-y-4">
          <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-400" />
                Audit Logs
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Displaying {ecommerceEntries.length} e-commerce entries
              </p>
            </div>

            {/* Syncing indicator */}
            {isFetching && !isLoading && (
              <span className="inline-flex items-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                Syncing
              </span>
            )}
          </div>

          {/* Search and Filters */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search Buyer, Order ID, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-[#0b0b0b] pl-10 pr-4 py-3 text-sm text-white outline-none transition focus:border-amber-500 placeholder:text-zinc-600"
              />
            </div>

            {/* Source Filter Select */}
            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500 appearance-none"
              >
                <option value="all">All E-commerce Sources</option>
                <option value="ORDER_CHARGE">ORDER_CHARGE (Order Placed)</option>
                <option value="ORDER_AUTO_PAYMENT">ORDER_AUTO_PAYMENT (COD Delivered)</option>
                <option value="ORDER_PREPAID_PAYMENT">ORDER_PREPAID_PAYMENT (Prepaid Paid)</option>
                <option value="ORDER_CANCELLATION">ORDER_CANCELLATION (Cancelled)</option>
                <option value="CUSTOMER_RETURN">CUSTOMER_RETURN (Returned Charge Reversal)</option>
                <option value="RETURN_REFUND">RETURN_REFUND (Prepaid Return Refund)</option>
                <option value="RETURN_ADJUSTMENT">RETURN_ADJUSTMENT (COD Return Offset)</option>
              </select>
              <Filter className="absolute right-4 top-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Buyer / Order ID</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-zinc-500 animate-pulse">
                      Loading transaction history...
                    </td>
                  </tr>
                ) : (
                  ecommerceEntries.map((entry) => {
                    const isPositive = Number(entry.amount) >= 0;
                    return (
                      <tr
                        key={entry.id}
                        className="bg-[#121212] hover:bg-zinc-900/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-zinc-400">
                          <div className="font-medium">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {new Date(entry.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white truncate max-w-[150px]">
                            {entry.user?.name || 'System'}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono select-all">
                            {entry.orderId ? `Order: ${entry.orderId.slice(0, 8)}...` : 'N/A'}
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-zinc-300 max-w-[200px] truncate"
                          title={entry.description}
                        >
                          {entry.description}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider',
                              entry.source.startsWith('ORDER_')
                                ? 'bg-amber-500/10 text-amber-300'
                                : 'bg-sky-500/10 text-sky-300'
                            )}
                          >
                            {entry.source.replace('ORDER_', '')}
                          </span>
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 text-right font-bold text-base flex items-center justify-end gap-1.5',
                            isPositive ? 'text-emerald-300' : 'text-amber-200'
                          )}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
                {!isLoading && ecommerceEntries.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-zinc-500">
                      No e-commerce ledger entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Column: Rules Reference Panel */}
        <div className="space-y-6">
          {/* Rules Card */}
          <section className="rounded-[28px] border border-zinc-800 bg-[#121212] p-6 shadow-2xl relative overflow-hidden">
            {/* Graphic touch */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-10" />

            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-amber-400" />
              Automated Accounting Rules
            </h2>
            <p className="text-xs text-zinc-400 mb-6 leading-5">
              To prevent double-billing and maintain consistency, NexCart automates ledger entries
              based on e-commerce transaction status updates.
            </p>

            <div className="space-y-5 text-sm">
              <RuleItem
                title="1. Order Charge Creation"
                desc="Whenever an online order is successfully placed (COD or Prepaid), the system automatically posts a negative LedgerEntry (ORDER_CHARGE) corresponding to the order total."
              />
              <RuleItem
                title="2. Prepaid Settlement"
                desc="For prepaid credit-card or wallet orders, verification immediately issues a positive LedgerEntry (ORDER_PREPAID_PAYMENT) once Razorpay signals a captured payment."
              />
              <RuleItem
                title="3. COD Auto-Settlement on Delivery"
                desc="When you mark a COD order as DELIVERED, the backend atomically transitions payment status to PAID and adds a positive LedgerEntry (ORDER_AUTO_PAYMENT). Wholesalers do not manually record payments."
              />
              <RuleItem
                title="4. Post-Delivery Returns"
                desc="When returned products are physically received, the system reverses the original transaction total once by creating a customer return charge reversal entry (CUSTOMER_RETURN), and offsets settled collections."
              />
              <RuleItem
                title="5. Order Cancellations"
                desc="If an order is cancelled prior to shipment, inventory is restored and a positive entry reverses the initial order charge automatically (ORDER_CANCELLATION)."
              />
            </div>
          </section>

          {/* Quick Stats Panel */}
          <section className="rounded-[24px] border border-zinc-800 bg-[#121212] p-5 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-zinc-500 mb-4">
              Transaction Summary (Retail & B2B)
            </h3>
            <div className="space-y-3">
              <SummaryRow
                label="Prepaid Sales"
                value={ecommerceEntries.filter((e) => e.source === 'ORDER_PREPAID_PAYMENT').length}
              />
              <SummaryRow
                label="COD Deliveries"
                value={ecommerceEntries.filter((e) => e.source === 'ORDER_AUTO_PAYMENT').length}
              />
              <SummaryRow
                label="Returned Items"
                value={ecommerceEntries.filter((e) => e.source === 'CUSTOMER_RETURN').length}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RuleItem({ title, desc }) {
  return (
    <div className="border-l-2 border-amber-500/40 pl-4 space-y-1">
      <h4 className="font-bold text-white text-xs uppercase tracking-wide">{title}</h4>
      <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono font-bold text-white">{value}</span>
    </div>
  );
}
