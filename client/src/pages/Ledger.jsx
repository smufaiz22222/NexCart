import { useState, useRef } from 'react';
import {
  BookOpen,
  Building2,
  CreditCard,
  HandCoins,
  Landmark,
  Plus,
  ReceiptIndianRupee,
  ShoppingCart,
  Wallet,
  Camera,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import apiClient from '../api/axios';
import {
  useLedgerHub,
  useProducts,
  useWholesalerBuyers,
  useReconcileInstrument,
  useVerifyBankPayment,
  usePartyDetails,
  useAccountEntries,
} from '../api/queries';

import { MetricCard, SectionCard } from '../components/ledger/LayoutComponents';
import PartyModal from '../components/ledger/PartyModal';
import SaleModal from '../components/ledger/SaleModal';
import PurchaseModal from '../components/ledger/PurchaseModal';
import SettlementModal from '../components/ledger/SettlementModal';
import PartyDetailsModal from '../components/ledger/PartyDetailsModal';
import BillSummaryModal from '../components/ledger/BillSummaryModal';
import AccountReportModal from '../components/ledger/AccountReportModal';

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Ledger() {
  const [activeTab, setActiveTab] = useState('overview');
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [ocrPurchaseValues, setOcrPurchaseValues] = useState(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const ocrInputRef = useRef(null);

  const [settlementContext, setSettlementContext] = useState(null);
  const [partyCategory, setPartyCategory] = useState('all'); // 'all', 'customers', 'suppliers'
  const [selectedPartyId, setSelectedPartyId] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useLedgerHub();
  const { data: partyDetails, isLoading: isPartyDetailsLoading } = usePartyDetails(selectedPartyId);
  const { data: accountDetail, isLoading: isAccountDetailLoading } =
    useAccountEntries(selectedAccountId);
  const { data: products = [] } = useProducts();
  const { data: buyers = [] } = useWholesalerBuyers();
  const reconcileInstrumentMutation = useReconcileInstrument();
  const verifyBankPaymentMutation = useVerifyBankPayment();

  const hub = data || {
    overview: {},
    parties: [],
    accounts: [],
    sales: [],
    ledgerEntries: [],
    offlinePurchases: [],
    paymentInstruments: [],
  };
  const selectedParty = settlementContext
    ? hub.parties.find((party) => party.id === settlementContext.partyId)
    : null;

  const handleOcrFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsOcrLoading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const response = await apiClient.post('/khatta/process-purchase', { image: reader.result });
        const data = response.data;

        // Match items to existing products by name
        const mappedItems = (data.items || []).map((item) => {
          const matchedProduct = products.find(
            (p) =>
              p.name.toLowerCase().includes(item.name.toLowerCase()) ||
              item.name.toLowerCase().includes(p.name.toLowerCase())
          );
          return {
            productId: matchedProduct ? matchedProduct.id : '',
            quantity: String(item.quantity || 1),
            unitPrice: String(item.unitPrice || 0),
          };
        });

        // Match supplier party by name or email
        const matchedParty = (hub.parties || []).find(
          (p) =>
            (data.supplierName && p.name.toLowerCase().includes(data.supplierName.toLowerCase())) ||
            (data.supplierEmail &&
              p.email &&
              p.email.toLowerCase() === data.supplierEmail.toLowerCase())
        );

        setOcrPurchaseValues({
          invoiceNumber: data.invoiceNumber || '',
          partyId: matchedParty ? matchedParty.id : '',
          paymentMethod: 'CASH',
          amountPaid: String(data.totalAmount || 0),
          notes: `Parsed via Gemini OCR. Supplier: ${data.supplierName || ''}`,
          items:
            mappedItems.length > 0
              ? mappedItems
              : [{ productId: '', quantity: '1', unitPrice: '' }],
          instrumentNumber: '',
          bankName: '',
          dueDate: '',
          awaitingClearance: false,
        });

        setShowPurchaseModal(true);
        toast.success('Invoice successfully parsed with Gemini AI!');
      } catch (err) {
        console.error(err);
        toast.error('AI Invoice parsing failed. Ensure Gemini API key is valid.');
      } finally {
        setIsOcrLoading(false);
      }
    };
  };

  if (isError) {
    return (
      <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
        <p className="text-lg font-bold">Failed to load accounting workspace.</p>
        <p className="mt-2 text-sm text-rose-200/90">
          {error?.response?.data?.error || error?.message || 'Unknown error'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.12),_transparent_34%),linear-gradient(180deg,#151515_0%,#0d0d0d_100%)] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-amber-400">
              Payment & Billing Workspace
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              Offline Bookkeeping & Ledger
            </h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Create offline invoices, reduce stock automatically, collect cash or credit, and track
              which parties owe you or which suppliers you owe, all from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              type="file"
              ref={ocrInputRef}
              onChange={handleOcrFileChange}
              aria-label="Upload OCR image"
              className="hidden"
              accept="image/*"
            />
            <button
              type="button"
              onClick={() => ocrInputRef.current?.click()}
              disabled={isOcrLoading}
              className="rounded-2xl border border-zinc-700 bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:border-zinc-500 flex items-center gap-2"
            >
              {isOcrLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 text-amber-500" />
                  New Purchase (OCR)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setOcrPurchaseValues(null);
                setShowPurchaseModal(true);
              }}
              className="rounded-2xl border border-zinc-700 bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:border-zinc-500 flex items-center gap-2"
            >
              <Plus className="h-4 w-4 text-amber-500" />
              New Purchase
            </button>
            <button
              type="button"
              onClick={() => setShowSaleModal(true)}
              className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-400 flex items-center gap-2"
            >
              <ReceiptIndianRupee className="h-4 w-4" />
              New Offline Sale
            </button>
            <button
              type="button"
              onClick={() => setShowPartyModal(true)}
              className="rounded-2xl border border-zinc-700 bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:border-zinc-500 flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              Add Party
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Wallet}
          label="Assets"
          value={isLoading ? 'Loading...' : formatCurrency(hub.overview.ASSET)}
        />
        <MetricCard
          icon={Landmark}
          label="Liabilities"
          value={isLoading ? 'Loading...' : formatCurrency(hub.overview.LIABILITY)}
          tone="rose"
        />
        <MetricCard
          icon={CreditCard}
          label="Receivables"
          value={isLoading ? 'Loading...' : formatCurrency(hub.overview.partiesReceivable)}
        />
        <MetricCard
          icon={HandCoins}
          label="Payables"
          value={isLoading ? 'Loading...' : formatCurrency(hub.overview.partiesPayable)}
          tone="rose"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ReceiptIndianRupee}
          label="Offline Sales"
          value={isLoading ? 'Loading...' : formatCurrency(hub.overview.offline?.totalSales ?? 0)}
          subtitle={
            isLoading
              ? ''
              : `Collected: ${formatCurrency(hub.overview.offline?.totalReceived ?? 0)}`
          }
          tone="emerald"
        />
        <MetricCard
          icon={ShoppingCart}
          label="E-commerce Sales"
          value={isLoading ? 'Loading...' : formatCurrency(hub.overview.ecommerce?.totalSales ?? 0)}
          subtitle={isLoading ? '' : `${hub.overview.ecommerce?.count ?? 0} orders`}
          tone="amber"
        />
        <MetricCard
          icon={BookOpen}
          label="Ecom Collected"
          value={
            isLoading ? 'Loading...' : formatCurrency(hub.overview.ecommerce?.totalReceived ?? 0)
          }
          subtitle={
            isLoading
              ? ''
              : `Outstanding: ${formatCurrency(hub.overview.ecommerce?.totalOutstanding ?? 0)}`
          }
          tone="emerald"
        />
        <MetricCard
          icon={AlertCircle}
          label="Ecom Pending"
          value={isLoading ? 'Loading...' : `${hub.overview.ecommerce?.pendingCount ?? 0} orders`}
          subtitle={isLoading ? '' : formatCurrency(hub.overview.ecommerce?.totalOutstanding ?? 0)}
          tone="rose"
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-[#111111] p-2">
        {[
          ['overview', 'Books Overview'],
          ['sales', 'Sales Register'],
          ['purchases', 'Purchases Register'],
          ['parties', 'Party Balances'],
          ['reconciliation', 'Bank Reconciliation'],
          ['ledger', 'Ledger History'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-bold transition',
              activeTab === key
                ? 'bg-amber-500 text-black'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            )}
          >
            {label}
          </button>
        ))}
        {isFetching && !isLoading ? (
          <span className="ml-auto inline-flex items-center rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            Syncing
          </span>
        ) : null}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Accounts"
            description="System books summarise your cash, bank, UPI, receivables, payables, and sales balances."
          >
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Account</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {hub.accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="bg-[#121212] hover:bg-zinc-800/30 cursor-pointer transition-colors group"
                      onClick={() => setSelectedAccountId(account.id)}
                    >
                      <td className="px-4 py-3 text-white">
                        <div className="font-semibold group-hover:text-amber-400 transition-colors">
                          {account.name}
                        </div>
                        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          {account.code}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{account.category}</td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        {formatCurrency(account.balance)}
                      </td>
                    </tr>
                  ))}
                  {hub.accounts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-4 py-6 text-center text-zinc-500">
                        No accounts yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Party Snapshot"
            description="See who owes you and which suppliers or parties still need to be paid."
          >
            <div className="space-y-3">
              {hub.parties.slice(0, 8).map((party) => (
                <div key={party.id} className="rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-white">{party.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {party.type}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-bold',
                        party.relationship === 'THEY_OWE_YOU'
                          ? 'bg-amber-500/10 text-amber-300'
                          : party.relationship === 'YOU_OWE_THEM'
                            ? 'bg-rose-500/10 text-rose-300'
                            : 'bg-emerald-500/10 text-emerald-300'
                      )}
                    >
                      {party.relationship === 'THEY_OWE_YOU'
                        ? 'They owe you'
                        : party.relationship === 'YOU_OWE_THEM'
                          ? 'You owe them'
                          : 'Settled'}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800 bg-[#131313] p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Receivable
                      </p>
                      <p className="mt-2 text-lg font-black text-amber-200">
                        {formatCurrency(party.receivable)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-[#131313] p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Payable</p>
                      <p className="mt-2 text-lg font-black text-rose-200">
                        {formatCurrency(party.payable)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {hub.parties.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-6 text-center text-zinc-500">
                  No parties created yet.
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'overview'
        ? (() => {
            const pendingEcomOrders = (hub.sales || []).filter(
              (s) => s.type === 'ECOMMERCE' && s.balanceDue > 0
            );
            if (pendingEcomOrders.length === 0) return null;
            return (
              <SectionCard
                title="Pending E-commerce Payments"
                description={`${pendingEcomOrders.length} marketplace order(s) with outstanding payment.`}
              >
                <div className="overflow-hidden rounded-2xl border border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-800 text-sm">
                    <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Order</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Method</th>
                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                        <th className="px-4 py-3 text-right font-semibold">Due</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {pendingEcomOrders.map((order) => (
                        <tr key={order.id} className="bg-[#121212] hover:bg-zinc-900/30 transition">
                          <td className="px-4 py-3 font-semibold text-white">
                            {order.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">{order.partyName}</td>
                          <td className="px-4 py-3 text-zinc-400">{order.paymentMethod}</td>
                          <td className="px-4 py-3 text-right font-semibold text-white">
                            {formatCurrency(order.totalAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-rose-300">
                            {formatCurrency(order.balanceDue)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {order.isPendingBankTransfer ? (
                              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300">
                                Awaiting Verification
                              </span>
                            ) : (
                              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-300">
                                Unpaid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            );
          })()
        : null}

      {activeTab === 'sales' ? (
        <SectionCard
          title="Sales Register (Unified)"
          description="Every offline sale and marketplace order details are combined here. Verify pending bank payments directly."
          action={
            <button
              type="button"
              onClick={() => setShowSaleModal(true)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-black"
            >
              New Sale
            </button>
          }
        >
          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Invoice/Order</th>
                  <th className="px-4 py-3 font-semibold">Party</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Received</th>
                  <th className="px-4 py-3 text-right font-semibold">Due</th>
                  <th className="px-4 py-3 text-center font-semibold">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {hub.sales.map((sale) => (
                  <tr key={sale.id} className="bg-[#121212] hover:bg-zinc-900/30 transition">
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(sale.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                          sale.type === 'OFFLINE'
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-amber-500/10 text-amber-400'
                        )}
                      >
                        {sale.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">{sale.invoiceNumber}</td>
                    <td className="px-4 py-3 text-zinc-300">{sale.partyName}</td>
                    <td className="px-4 py-3 text-zinc-400">{sale.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                      {formatCurrency(sale.amountReceived)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-200">
                      {formatCurrency(sale.balanceDue)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sale.isPendingBankTransfer ? (
                        <button
                          type="button"
                          onClick={() => {
                            verifyBankPaymentMutation.mutate(
                              { orderId: sale.id },
                              {
                                onSuccess: () => {
                                  toast.success('Bank transfer verified successfully!');
                                  refetch();
                                },
                                onError: (err) => {
                                  toast.error(err.response?.data?.error || 'Verification failed');
                                },
                              }
                            );
                          }}
                          disabled={verifyBankPaymentMutation.isPending}
                          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-black text-black transition"
                        >
                          {verifyBankPaymentMutation.isPending
                            ? 'Verifying...'
                            : 'Verify Bank Payment'}
                        </button>
                      ) : (
                        <span className="text-zinc-500 text-xs font-semibold uppercase">
                          {sale.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {hub.sales.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-6 text-center text-zinc-500">
                      No sales records yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'purchases' ? (
        <SectionCard
          title="Purchases Register"
          description="Track raw materials and product inventory purchases made from suppliers."
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOcrPurchaseValues(null);
                  setShowPurchaseModal(true);
                }}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-black"
              >
                New Purchase (Manual)
              </button>
            </div>
          }
        >
          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Invoice Number</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount Paid</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(hub.offlinePurchases || []).map((purchase) => (
                  <tr key={purchase.id} className="bg-[#121212]">
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(purchase.purchasedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">{purchase.invoiceNumber}</td>
                    <td className="px-4 py-3 text-zinc-300">
                      {purchase.party?.name || 'Local Supplier'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{purchase.paymentMethod}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {formatCurrency(purchase.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                      {formatCurrency(purchase.amountPaid)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-200">
                      {formatCurrency(purchase.balanceDue)}
                    </td>
                  </tr>
                ))}
                {(hub.offlinePurchases || []).length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-zinc-500">
                      No purchase records yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'reconciliation' ? (
        <div className="space-y-6">
          <SectionCard
            title="Received Instruments (Inward Cheques & Deposits)"
            description="Clear cheques, reconcile UPI transfers, card settlements, or bank transfers received from buyers."
          >
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Recorded Date</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Instrument/Ref No.</th>
                    <th className="px-4 py-3 font-semibold">Bank Name</th>
                    <th className="px-4 py-3 font-semibold">From Party</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Due Date</th>
                    <th className="px-4 py-3 text-center font-semibold">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {(hub.paymentInstruments || []).flatMap((inst) =>
                    inst.type === 'RECEIVABLE'
                      ? [
                          <tr key={inst.id} className="bg-[#121212]">
                            <td className="px-4 py-3 text-zinc-400">
                              {new Date(inst.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-zinc-300">{inst.paymentMethod}</td>
                            <td className="px-4 py-3 text-white font-mono">
                              {inst.instrumentNumber || '-'}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">{inst.bankName || '-'}</td>
                            <td className="px-4 py-3 text-zinc-300">
                              {inst.party?.name || 'Local Party'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-white">
                              {formatCurrency(inst.amount)}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {inst.status === 'PENDING' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    reconcileInstrumentMutation.mutate(inst.id, {
                                      onSuccess: () => {
                                        toast.success(
                                          'Payment successfully cleared and reconciled!'
                                        );
                                        refetch();
                                      },
                                      onError: (err) => {
                                        toast.error(
                                          err.response?.data?.error || 'Clearance failed'
                                        );
                                      },
                                    });
                                  }}
                                  disabled={reconcileInstrumentMutation.isPending}
                                  className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-black text-black transition"
                                >
                                  {reconcileInstrumentMutation.isPending
                                    ? 'Clearing...'
                                    : 'Mark as Cashed'}
                                </button>
                              ) : (
                                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                                  Cashed
                                </span>
                              )}
                            </td>
                          </tr>,
                        ]
                      : []
                  )}
                  {(hub.paymentInstruments || []).filter((inst) => inst.type === 'RECEIVABLE')
                    .length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-6 text-center text-zinc-500">
                        No received instruments found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Issued Instruments (Outward Cheques & Outflows)"
            description="Clear cheques, reconcile bank transfers, or card settlements given to suppliers."
          >
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Recorded Date</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Instrument/Ref No.</th>
                    <th className="px-4 py-3 font-semibold">Bank Name</th>
                    <th className="px-4 py-3 font-semibold">Whose Cheque (Drawer)</th>
                    <th className="px-4 py-3 font-semibold">To Party</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Due Date</th>
                    <th className="px-4 py-3 text-center font-semibold">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {(hub.paymentInstruments || []).flatMap((inst) =>
                    inst.type === 'PAYABLE'
                      ? [
                          <tr key={inst.id} className="bg-[#121212]">
                            <td className="px-4 py-3 text-zinc-400">
                              {new Date(inst.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-zinc-300">{inst.paymentMethod}</td>
                            <td className="px-4 py-3 text-white font-mono">
                              {inst.instrumentNumber || '-'}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">{inst.bankName || '-'}</td>
                            <td className="px-4 py-3 text-zinc-300 font-medium text-amber-200">
                              {inst.drawerName || 'Self'}
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {inst.party?.name || 'Local Party'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-white">
                              {formatCurrency(inst.amount)}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {inst.status === 'PENDING' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    reconcileInstrumentMutation.mutate(inst.id, {
                                      onSuccess: () => {
                                        toast.success(
                                          'Payment successfully cleared and reconciled!'
                                        );
                                        refetch();
                                      },
                                      onError: (err) => {
                                        toast.error(
                                          err.response?.data?.error || 'Clearance failed'
                                        );
                                      },
                                    });
                                  }}
                                  disabled={reconcileInstrumentMutation.isPending}
                                  className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-black text-black transition"
                                >
                                  {reconcileInstrumentMutation.isPending
                                    ? 'Clearing...'
                                    : 'Mark as Cashed'}
                                </button>
                              ) : (
                                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                                  Cashed
                                </span>
                              )}
                            </td>
                          </tr>,
                        ]
                      : []
                  )}
                  {(hub.paymentInstruments || []).filter((inst) => inst.type === 'PAYABLE')
                    .length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-6 text-center text-zinc-500">
                        No issued instruments found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'parties' ? (
        <SectionCard
          title="Party Ledger"
          description="Maintain local customers, B2B buyers, and suppliers with opening balances and ongoing settlements."
          action={
            <button
              type="button"
              onClick={() => setShowPartyModal(true)}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-black"
            >
              Add Party
            </button>
          }
        >
          {/* Sub-tabs for Party Categories */}
          <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
            {[
              ['all', 'All Parties'],
              ['customers', 'Customers'],
              ['suppliers', 'Suppliers / Clients'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPartyCategory(key)}
                className={cn(
                  'rounded-xl px-4 py-2 text-xs font-bold transition border',
                  partyCategory === key
                    ? 'bg-amber-500 text-black border-amber-500'
                    : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800 text-sm">
              <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Party</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">They Owe You</th>
                  <th className="px-4 py-3 text-right font-semibold">You Owe Them</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(() => {
                  const filteredParties = hub.parties.filter((party) => {
                    if (partyCategory === 'customers') {
                      return party.type === 'CUSTOMER' || party.type === 'BOTH';
                    }
                    if (partyCategory === 'suppliers') {
                      return party.type === 'SUPPLIER' || party.type === 'BOTH';
                    }
                    return true;
                  });

                  return filteredParties.map((party) => {
                    const canReceive = party.type === 'CUSTOMER' || party.type === 'BOTH';
                    const canPay = party.type === 'SUPPLIER' || party.type === 'BOTH';

                    return (
                      <tr key={party.id} className="bg-[#121212] hover:bg-zinc-900/30 transition">
                        <td className="px-4 py-3 text-white">
                          <button
                            type="button"
                            onClick={() => setSelectedPartyId(party.id)}
                            className="font-bold text-left text-amber-400 hover:text-amber-300 hover:underline transition"
                          >
                            {party.name}
                          </button>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {party.linkedUser?.email || party.phone || party.email || 'Local party'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                              party.type === 'CUSTOMER'
                                ? 'bg-blue-500/10 text-blue-400'
                                : party.type === 'SUPPLIER'
                                  ? 'bg-purple-500/10 text-purple-400'
                                  : 'bg-pink-500/10 text-pink-400'
                            )}
                          >
                            {party.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-200">
                          {formatCurrency(party.receivable)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-200">
                          {formatCurrency(party.payable)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSettlementContext({ partyId: party.id, direction: 'IN' })
                              }
                              disabled={!canReceive}
                              className={cn(
                                'rounded-xl border px-3 py-2 text-xs font-bold transition',
                                canReceive
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed opacity-40'
                              )}
                            >
                              Receive
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSettlementContext({ partyId: party.id, direction: 'OUT' })
                              }
                              disabled={!canPay}
                              className={cn(
                                'rounded-xl border px-3 py-2 text-xs font-bold transition',
                                canPay
                                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed opacity-40'
                              )}
                            >
                              Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
                {hub.parties.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 text-center text-zinc-500">
                      No parties yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'ledger'
        ? (() => {
            const OFFLINE_SOURCES = [
              'MANUAL',
              'OFFLINE_SALE_CREDIT',
              'OFFLINE_SALE_PAYMENT',
              'PARTY_OPENING_BALANCE',
              'PARTY_ADJUSTMENT',
            ];
            const ECOMMERCE_SOURCES = [
              'ORDER_CHARGE',
              'ORDER_AUTO_PAYMENT',
              'ORDER_PREPAID_PAYMENT',
              'ORDER_CANCELLATION',
              'CUSTOMER_RETURN',
              'RETURN_REFUND',
              'RETURN_ADJUSTMENT',
            ];

            const filteredEntries = hub.ledgerEntries.filter((entry) => {
              if (ledgerFilter === 'offline') {
                return OFFLINE_SOURCES.includes(entry.source);
              }
              if (ledgerFilter === 'ecommerce') {
                return ECOMMERCE_SOURCES.includes(entry.source);
              }
              return true;
            });

            return (
              <SectionCard
                title="Ledger History"
                description="Review manual bookkeeping entries, offline credits, and automated e-commerce transaction postings."
                action={
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Filter Source:</span>
                    <select
                      value={ledgerFilter}
                      onChange={(e) => setLedgerFilter(e.target.value)}
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 transition"
                    >
                      <option value="all">All Entries</option>
                      <option value="offline">Offline & Manual Only</option>
                      <option value="ecommerce">Ecommerce Only</option>
                    </select>
                  </div>
                }
              >
                <div className="overflow-hidden rounded-2xl border border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-800 text-sm">
                    <thead className="bg-[#0d0d0d] text-left text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Party / Buyer</th>
                        <th className="px-4 py-3 font-semibold">Description</th>
                        <th className="px-4 py-3 font-semibold">Source</th>
                        <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="bg-[#121212]">
                          <td className="px-4 py-3 text-zinc-400">
                            {new Date(entry.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-white">
                            {entry.user?.name || 'System'}
                            {entry.user?.email ? (
                              <div className="text-xs text-zinc-500">{entry.user.email}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">{entry.description}</td>
                          <td className="px-4 py-3 text-xs uppercase tracking-wider text-zinc-500 font-mono">
                            {entry.source}
                          </td>
                          <td
                            className={cn(
                              'px-4 py-3 text-right font-bold',
                              Number(entry.amount) >= 0 ? 'text-emerald-300' : 'text-amber-200'
                            )}
                          >
                            {formatCurrency(entry.amount)}
                          </td>
                        </tr>
                      ))}
                      {filteredEntries.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-zinc-500">
                            No ledger entries found matching this filter.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            );
          })()
        : null}

      {showPartyModal ? (
        <PartyModal
          onClose={() => {
            setShowPartyModal(false);
            refetch();
          }}
          buyers={buyers}
        />
      ) : null}

      {showSaleModal ? (
        <SaleModal
          onClose={() => {
            setShowSaleModal(false);
            refetch();
          }}
          parties={hub.parties}
          products={products}
        />
      ) : null}

      {showPurchaseModal ? (
        <PurchaseModal
          onClose={() => {
            setShowPurchaseModal(false);
            setOcrPurchaseValues(null);
            refetch();
          }}
          parties={hub.parties}
          products={products}
          initialFormValues={ocrPurchaseValues}
        />
      ) : null}

      {settlementContext && selectedParty ? (
        <SettlementModal
          onClose={() => {
            setSettlementContext(null);
            refetch();
          }}
          selectedParty={selectedParty}
          initialDirection={settlementContext.direction}
        />
      ) : null}

      {/* Party Details Modal */}
      {selectedPartyId && (
        <PartyDetailsModal
          onClose={() => setSelectedPartyId(null)}
          partyDetails={partyDetails}
          isLoading={isPartyDetailsLoading}
          formatCurrency={formatCurrency}
          onSelectBill={setSelectedBill}
        />
      )}

      {/* Bill Summary Modal */}
      {selectedBill && (
        <BillSummaryModal
          onClose={() => setSelectedBill(null)}
          selectedBill={selectedBill}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Account Transactions Detail Modal */}
      {selectedAccountId && (
        <AccountReportModal
          onClose={() => setSelectedAccountId(null)}
          accountDetail={accountDetail}
          isLoading={isAccountDetailLoading}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
}
