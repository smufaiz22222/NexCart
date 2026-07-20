import { useEffect, useState } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardData } from '../api/queries';
import apiClient from '../api/axios';
import {
  DashboardOperationsHero,
  DashboardKeyMetrics,
  DashboardStockAndAlerts,
  DashboardCatalogAndOrders,
  DashboardBusinessSettings,
} from '../components/dashboard/WholesalerDashboardComponents';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useDashboardData();

  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    upiId: '',
    deliveryFee: '0',
    freeDeliveryThreshold: '',
  });
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (data?.wholesalerProfile) {
      const w = data.wholesalerProfile;
      setBankDetails({
        bankName: w.bankName || '',
        bankAccountNo: w.bankAccountNo || '',
        bankIfsc: w.bankIfsc || '',
        upiId: w.upiId || '',
        deliveryFee:
          w.deliveryFee !== undefined && w.deliveryFee !== null ? String(w.deliveryFee) : '0',
        freeDeliveryThreshold:
          w.freeDeliveryThreshold !== undefined && w.freeDeliveryThreshold !== null
            ? String(w.freeDeliveryThreshold)
            : '',
      });
    }
  }, [data?.wholesalerProfile]);

  useEffect(() => {
    let timerId;
    if (!isLoading && window.location.hash === '#bank-settings') {
      timerId = setTimeout(() => {
        const element = document.getElementById('bank-settings');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          setSettingsOpen(true);
        }
      }, 100);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isLoading]);

  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    try {
      setIsSavingBank(true);
      await apiClient.put('/b2b/wholesaler/bank-details', {
        bankName: bankDetails.bankName,
        bankAccountNo: bankDetails.bankAccountNo,
        bankIfsc: bankDetails.bankIfsc,
        upiId: bankDetails.upiId,
      });
      alert('Bank & UPI details updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'data'] });
    } catch (err) {
      console.error('Failed to update bank details:', err);
      alert(err.response?.data?.error || 'Failed to update details');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleSaveDeliveryDetails = async (e) => {
    e.preventDefault();
    try {
      setIsSavingDelivery(true);
      await apiClient.put('/b2b/wholesaler/bank-details', bankDetails);
      alert('Delivery & shipping settings updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'data'] });
    } catch (err) {
      console.error('Failed to update delivery settings:', err);
      alert(err.response?.data?.error || 'Failed to update delivery settings');
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const products = data?.products || [];
  const orders = data?.orders || [];
  const ledgerStats = data?.ledgerStats || { totalDebt: 0, totalCollection: 0 };
  const advisorContext = data?.advisorContext || null;

  const totalProducts = products.length;
  const totalUnitsInStock = products.reduce(
    (sum, product) => sum + Number(product.currentStock || 0),
    0
  );
  const lowStockProducts = products.filter(
    (product) => Number(product.currentStock || 0) > 0 && Number(product.currentStock || 0) < 10
  );
  const outOfStockProducts = products.filter((product) => Number(product.currentStock || 0) === 0);

  const chartData = products.slice(0, 8).map((product) => ({
    name: product.name.split(' ').slice(0, 2).join(' '),
    stock: Number(product.currentStock || 0),
    value: Number(product.price || 0) * Number(product.currentStock || 0),
  }));

  const pendingOrders = orders.filter((order) => order.status === 'PENDING').length;
  const processingOrders = orders.filter((order) => order.status === 'PROCESSING').length;
  const shippedOrders = orders.filter((order) => order.status === 'SHIPPED').length;
  const returnRequests = orders.reduce(
    (sum, order) => sum + order.items.filter((item) => item.returnStatus === 'REQUESTED').length,
    0
  );
  const refundExceptions = orders.reduce(
    (sum, order) =>
      sum +
      order.items.filter(
        (item) =>
          item.returnRefundStatus === 'FAILED' ||
          (item.status === 'CANCELLED' && ['FAILED', 'PENDING'].includes(item.refundStatus))
      ).length,
    0
  );
  const recentOrders = orders.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-zinc-400">
        <Activity className="h-8 w-8 animate-pulse text-amber-500" />
        <p className="text-sm font-bold uppercase tracking-[0.24em]">Loading operations desk</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-rose-400">
        <AlertCircle className="h-8 w-8 text-rose-500 animate-pulse" />
        <p className="text-sm font-bold uppercase tracking-[0.24em]">
          Failed to load operations desk
        </p>
        <p className="text-xs text-zinc-500">{error?.message || 'Unknown network error'}</p>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'data'] })}
          className="mt-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white">
      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION 1: Platform Disclaimer
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/10 p-4 flex gap-3 text-amber-200">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-black uppercase tracking-wider text-amber-400 mr-2">
            Platform Disclaimer:
          </span>
          NexCart is a technology marketplace. The platform is not responsible for any default,
          fraud, or disputes in B2B credit or bank transfer deals.
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION 2: Operations Hero + Analytics CTA
      ───────────────────────────────────────────────────────────────────────── */}
      <DashboardOperationsHero
        pendingOrders={pendingOrders}
        returnRequests={returnRequests}
        refundExceptions={refundExceptions}
        advisorContext={advisorContext}
      />

      <DashboardKeyMetrics
        ledgerStats={ledgerStats}
        processingOrders={processingOrders}
        shippedOrders={shippedOrders}
        totalUnitsInStock={totalUnitsInStock}
        totalProducts={totalProducts}
        lowStockProducts={lowStockProducts}
        outOfStockProducts={outOfStockProducts}
      />

      <DashboardStockAndAlerts
        chartData={chartData}
        pendingOrders={pendingOrders}
        returnRequests={returnRequests}
        refundExceptions={refundExceptions}
      />

      <DashboardCatalogAndOrders
        outOfStockProducts={outOfStockProducts}
        lowStockProducts={lowStockProducts}
        recentOrders={recentOrders}
      />

      <DashboardBusinessSettings
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        bankDetails={bankDetails}
        setBankDetails={setBankDetails}
        handleSaveBankDetails={handleSaveBankDetails}
        isSavingBank={isSavingBank}
        handleSaveDeliveryDetails={handleSaveDeliveryDetails}
        isSavingDelivery={isSavingDelivery}
      />
    </div>
  );
}
