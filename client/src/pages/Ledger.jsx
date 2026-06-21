import { useState, useRef } from 'react';
import {
  BookOpen,
  Building2,
  CreditCard,
  HandCoins,
  Landmark,
  Package2,
  Plus,
  ReceiptIndianRupee,
  Wallet,
  Camera,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import apiClient from '../api/axios';
import {
  useCreateBusinessParty,
  useCreateOfflineSale,
  useLedgerHub,
  useProducts,
  useRecordPartyTransaction,
  useWholesalerBuyers,
  useCreateOfflinePurchase,
  useReconcileInstrument,
  useVerifyBankPayment,
  usePartyDetails,
  useAccountEntries,
} from '../api/queries';

const PAYMENT_METHODS = ['CASH', 'CREDIT', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'];

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

const emptyPurchaseForm = {
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

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function MetricCard({ icon: Icon, label, value, tone = 'amber' }) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      : tone === 'rose'
        ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-200';

  return (
    <div className={cn('rounded-2xl border p-4', toneClass)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-80">{label}</p>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function SectionCard({ title, description, action, children }) {
  return (
    <section className="rounded-[24px] border border-zinc-800 bg-[#121212] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-zinc-800 bg-[#111111] shadow-2xl">
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function inputClassName() {
  return 'w-full rounded-2xl border border-zinc-700 bg-[#0b0b0b] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500';
}

export default function Ledger() {
  const [activeTab, setActiveTab] = useState('overview');
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const ocrInputRef = useRef(null);

  const [settlementContext, setSettlementContext] = useState(null);
  const [partyForm, setPartyForm] = useState(emptyPartyForm);
  const [saleForm, setSaleForm] = useState(emptySaleForm);
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchaseForm);
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    direction: 'IN',
    paymentMethod: 'CASH',
    description: '',
    referenceId: '',
    instrumentNumber: '',
    bankName: '',
    drawerName: '',
    dueDate: '',
    awaitingClearance: false,
  });

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
  const createPartyMutation = useCreateBusinessParty();
  const createOfflineSaleMutation = useCreateOfflineSale();
  const recordPartyTransactionMutation = useRecordPartyTransaction();
  const createOfflinePurchaseMutation = useCreateOfflinePurchase();
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

        setPurchaseForm({
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
          setShowPurchaseModal(false);
          setPurchaseForm(emptyPurchaseForm);
        },
        onError: (mutationError) => {
          toast.error(mutationError.response?.data?.error || 'Failed to create offline purchase.');
        },
      }
    );
  };

  const handlePartySubmit = (event) => {
    event.preventDefault();
    createPartyMutation.mutate(partyForm, {
      onSuccess: () => {
        toast.success('Party created successfully.');
        setShowPartyModal(false);
        setPartyForm(emptyPartyForm);
      },
      onError: (mutationError) => {
        toast.error(mutationError.response?.data?.error || 'Failed to create party.');
      },
    });
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
          setShowSaleModal(false);
          setSaleForm(emptySaleForm);
        },
        onError: (mutationError) => {
          toast.error(mutationError.response?.data?.error || 'Failed to create offline sale.');
        },
      }
    );
  };

  const openSettlementModal = (partyId, direction) => {
    setSettlementContext({ partyId, direction });
    setSettlementForm({
      amount: '',
      direction,
      paymentMethod: 'CASH',
      description: direction === 'IN' ? 'Payment received from party' : 'Payment made to party',
      referenceId: '',
      instrumentNumber: '',
      bankName: '',
      drawerName: '',
      dueDate: '',
      awaitingClearance: false,
    });
  };

  const handleSettlementSubmit = (event) => {
    event.preventDefault();
    if (!settlementContext?.partyId) return;

    recordPartyTransactionMutation.mutate(
      {
        partyId: settlementContext.partyId,
        ...settlementForm,
      },
      {
        onSuccess: () => {
          toast.success('Party transaction recorded.');
          setSettlementContext(null);
        },
        onError: (mutationError) => {
          toast.error(mutationError.response?.data?.error || 'Failed to record party transaction.');
        },
      }
    );
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
                setPurchaseForm(emptyPurchaseForm);
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
        <MetricCard
          icon={ReceiptIndianRupee}
          label="Offline Sales"
          value={isLoading ? 'Loading...' : formatCurrency(hub.overview.totalSales)}
          tone="emerald"
        />
        <MetricCard
          icon={BookOpen}
          label="Collected"
          value={isLoading ? 'Loading...' : formatCurrency(hub.overview.totalReceived)}
          tone="emerald"
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
                  setPurchaseForm(emptyPurchaseForm);
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
                  {(hub.paymentInstruments || [])
                    .filter((inst) => inst.type === 'RECEIVABLE')
                    .map((inst) => (
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
                                    toast.success('Payment successfully cleared and reconciled!');
                                    refetch();
                                  },
                                  onError: (err) => {
                                    toast.error(err.response?.data?.error || 'Clearance failed');
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
                      </tr>
                    ))}
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
                  {(hub.paymentInstruments || [])
                    .filter((inst) => inst.type === 'PAYABLE')
                    .map((inst) => (
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
                                    toast.success('Payment successfully cleared and reconciled!');
                                    refetch();
                                  },
                                  onError: (err) => {
                                    toast.error(err.response?.data?.error || 'Clearance failed');
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
                      </tr>
                    ))}
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
                              onClick={() => openSettlementModal(party.id, 'IN')}
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
                              onClick={() => openSettlementModal(party.id, 'OUT')}
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
        <ModalShell
          title="Create Party"
          subtitle="Add a customer, supplier, or both. You can also start them with an opening receivable or payable balance."
          onClose={() => setShowPartyModal(false)}
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
      ) : null}

      {showSaleModal ? (
        <ModalShell
          title="New Offline Sale"
          subtitle="Create a manual invoice, choose how much was received now, and the system will reduce inventory and update receivables."
          onClose={() => setShowSaleModal(false)}
        >
          <form onSubmit={handleSaleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Invoice number">
                <input
                  placeholder="Auto-generated if left blank"
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
                  {hub.parties.map((party) => (
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
                    {PAYMENT_METHODS.filter(
                      (method) => method !== 'CREDIT' && method !== 'CHEQUE'
                    ).map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
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
      ) : null}

      {showPurchaseModal ? (
        <ModalShell
          title="New Offline Purchase"
          subtitle="Record inventory purchases from suppliers. This will automatically increase product stock."
          onClose={() => setShowPurchaseModal(false)}
        >
          <form onSubmit={handlePurchaseSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Invoice number">
                <input
                  placeholder="Auto-generated if left blank"
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
                  {hub.parties.map((party) => (
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
                    {PAYMENT_METHODS.filter(
                      (method) => method !== 'CREDIT' && method !== 'CHEQUE'
                    ).map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
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
                {purchaseForm.items.map((item, index) => (
                  <div
                    key={`${index}-${item.productId}`}
                    className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#111111] p-4 md:grid-cols-[1.4fr_0.6fr_0.8fr_auto]"
                  >
                    <Field label={`Product ${index + 1}`}>
                      <select
                        required
                        value={item.productId}
                        onChange={(event) =>
                          updatePurchaseItem(index, 'productId', event.target.value)
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
                        value={item.quantity}
                        onChange={(event) =>
                          updatePurchaseItem(index, 'quantity', event.target.value)
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
                        value={item.unitPrice}
                        onChange={(event) =>
                          updatePurchaseItem(index, 'unitPrice', event.target.value)
                        }
                        className={inputClassName()}
                      />
                    </Field>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removePurchaseItem(index)}
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
      ) : null}

      {settlementContext && selectedParty ? (
        <ModalShell
          title={settlementForm.direction === 'IN' ? 'Receive Payment' : 'Pay Party'}
          subtitle={`Record a manual settlement for ${selectedParty.name}.`}
          onClose={() => setSettlementContext(null)}
        >
          <form onSubmit={handleSettlementSubmit} className="grid gap-4 md:grid-cols-2">
            <Field label="Amount">
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
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
                {PAYMENT_METHODS.filter((method) => method !== 'CREDIT').map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
            {['CHEQUE', 'UPI', 'BANK_TRANSFER', 'CARD'].includes(settlementForm.paymentMethod) && (
              <div className="md:col-span-2 grid gap-4 md:grid-cols-2 rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4">
                <div className="md:col-span-2 flex items-center justify-between">
                  <h5 className="text-sm font-bold text-amber-400">Payment Instrument Details</h5>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
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
                    value={settlementForm.dueDate}
                    onChange={(event) =>
                      setSettlementForm((current) => ({ ...current, dueDate: event.target.value }))
                    }
                    className={inputClassName()}
                  />
                </Field>
                {settlementForm.paymentMethod === 'CHEQUE' &&
                  settlementForm.direction === 'OUT' && (
                    <div className="md:col-span-2">
                      <Field label="Whose cheque is this? (Drawer Name)">
                        <input
                          placeholder="e.g. Self, or Customer/Party Name (if forwarding)"
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
      ) : null}

      {/* Party Details Modal */}
      {selectedPartyId && (
        <ModalShell
          title={
            isPartyDetailsLoading
              ? 'Loading Party Details...'
              : `Party Ledger: ${partyDetails?.party?.name}`
          }
          subtitle={
            partyDetails?.party?.type
              ? `Type: ${partyDetails.party.type} | Phone: ${partyDetails.party.phone || '-'} | Email: ${partyDetails.party.email || '-'}`
              : ''
          }
          onClose={() => setSelectedPartyId(null)}
        >
          {isPartyDetailsLoading ? (
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
                              onClick={() => setSelectedBill(bill)}
                              className="font-semibold text-amber-400 hover:underline text-left"
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
                          <td
                            colSpan="6"
                            className="px-4 py-6 text-center text-zinc-500 bg-[#121212]"
                          >
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
                          <td className="px-4 py-3 text-white font-semibold text-left">
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
                          <td
                            colSpan="4"
                            className="px-4 py-6 text-center text-zinc-500 bg-[#121212]"
                          >
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
      )}

      {/* Bill Item Summary Modal */}
      {selectedBill && (
        <ModalShell
          title={`Bill Summary: ${selectedBill.invoiceNumber}`}
          subtitle={`Type: ${selectedBill.type} | Date: ${new Date(selectedBill.date).toLocaleString()}`}
          onClose={() => setSelectedBill(null)}
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
                <strong className="text-zinc-300">Payment Method:</strong>{' '}
                {selectedBill.paymentMethod}
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
              <div className="overflow-hidden rounded-2xl border border-zinc-800">
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
                        <td className="px-4 py-3 text-white font-semibold text-left">
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
      )}

      {/* Account Transactions Detail Modal */}
      {selectedAccountId && (
        <ModalShell
          title={
            isAccountDetailLoading
              ? 'Loading Account...'
              : `Account Report: ${accountDetail?.account?.name || ''}`
          }
          subtitle={
            !isAccountDetailLoading && accountDetail?.account
              ? `Code: ${accountDetail.account.code} | Category: ${accountDetail.account.category}`
              : ''
          }
          onClose={() => setSelectedAccountId(null)}
        >
          {isAccountDetailLoading ? (
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
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Current Balance
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {formatCurrency(
                      Number(accountDetail.account.openingBalance || 0) +
                        accountDetail.entries.reduce((sum, entry) => sum + Number(entry.amount), 0)
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Opening Balance
                  </p>
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
                          <td className="px-4 py-3 text-white font-semibold text-left">
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
                          <td
                            colSpan="4"
                            className="px-4 py-6 text-center text-zinc-500 bg-[#121212]"
                          >
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
            <div className="text-center py-6 text-zinc-400">
              Failed to load account report details.
            </div>
          )}
        </ModalShell>
      )}
    </div>
  );
}
