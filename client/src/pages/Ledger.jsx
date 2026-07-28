import { useState, useRef } from 'react';
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
import {
  LedgerHeaderSection,
  LedgerMetricsSection,
  LedgerOverviewTab,
  LedgerSalesTab,
  LedgerPurchasesTab,
  LedgerPartiesTab,
  LedgerReconciliationTab,
  LedgerHistoryTab,
} from '../components/ledger/LedgerTabsComponents';
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
      <LedgerHeaderSection
        ocrInputRef={ocrInputRef}
        handleOcrFileChange={handleOcrFileChange}
        isOcrLoading={isOcrLoading}
        setOcrPurchaseValues={setOcrPurchaseValues}
        setShowPurchaseModal={setShowPurchaseModal}
        setShowSaleModal={setShowSaleModal}
        setShowPartyModal={setShowPartyModal}
      />

      <LedgerMetricsSection hub={hub} isLoading={isLoading} formatCurrency={formatCurrency} />

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

      {activeTab === 'overview' && (
        <LedgerOverviewTab
          hub={hub}
          formatCurrency={formatCurrency}
          setSelectedAccountId={setSelectedAccountId}
        />
      )}

      {activeTab === 'sales' && (
        <LedgerSalesTab
          hub={hub}
          formatCurrency={formatCurrency}
          setShowSaleModal={setShowSaleModal}
          verifyBankPaymentMutation={verifyBankPaymentMutation}
          refetch={refetch}
        />
      )}

      {activeTab === 'purchases' && (
        <LedgerPurchasesTab
          hub={hub}
          formatCurrency={formatCurrency}
          setOcrPurchaseValues={setOcrPurchaseValues}
          setShowPurchaseModal={setShowPurchaseModal}
        />
      )}

      {activeTab === 'reconciliation' && (
        <LedgerReconciliationTab
          hub={hub}
          formatCurrency={formatCurrency}
          reconcileInstrumentMutation={reconcileInstrumentMutation}
          refetch={refetch}
        />
      )}

      {activeTab === 'parties' && (
        <LedgerPartiesTab
          hub={hub}
          partyCategory={partyCategory}
          setPartyCategory={setPartyCategory}
          setShowPartyModal={setShowPartyModal}
          setSelectedPartyId={setSelectedPartyId}
          setSettlementContext={setSettlementContext}
          formatCurrency={formatCurrency}
        />
      )}

      {activeTab === 'ledger' && (
        <LedgerHistoryTab
          hub={hub}
          ledgerFilter={ledgerFilter}
          setLedgerFilter={setLedgerFilter}
          formatCurrency={formatCurrency}
        />
      )}

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
