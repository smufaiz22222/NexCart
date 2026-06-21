import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Boxes,
  Hourglass,
  PackageCheck,
  RotateCcw,
  Truck,
  Wallet,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardData } from '../api/queries';
import apiClient from '../api/axios';
import StatCard from '../components/dashboard/StatCard';
import QuickStrip from '../components/dashboard/QuickStrip';
import InfoTile from '../components/dashboard/InfoTile';
import MiniMetric from '../components/dashboard/MiniMetric';
import AlertRow from '../components/dashboard/AlertRow';
import WatchRow from '../components/dashboard/WatchRow';
import StockPressureChart from '../components/dashboard/StockPressureChart';

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
        <AlertCircle className="h-8 w-8 text-rose-500 animate-bounce" />
        <p className="text-sm font-bold uppercase tracking-[0.24em]">
          Failed to load operations desk
        </p>
        <p className="text-xs text-zinc-500">{error?.message || 'Unknown network error'}</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard', 'data'] })}
          className="mt-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {/* Platform Disclaimer Warning Banner */}
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-zinc-800 bg-[#111111] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-500/80">
            Operations Desk
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
            Daily execution up front, deeper analytics one click away.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Use this screen to monitor stock pressure, collections, and marketplace movement. When
            you need profit, retention, slow movers, or recommendation performance, jump to the
            analytics workspace.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <QuickStrip
              label="Pending Orders"
              value={pendingOrders}
              detail="New orders waiting for acceptance or packing"
            />
            <QuickStrip
              label="Return Requests"
              value={returnRequests}
              detail="Customer returns currently waiting on a decision"
            />
            <QuickStrip
              label="Refund Exceptions"
              value={refundExceptions}
              detail="Refund failures or pending item-level follow-ups"
            />
          </div>
        </div>

        <Link
          to="/wholesaler/analytics"
          className="group rounded-[28px] border border-amber-500/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.2),transparent_40%),linear-gradient(180deg,#171717_0%,#0a0a0a_100%)] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] transition hover:border-amber-500/40"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-300/90">
            Analytics Workspace
          </p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Open the deeper business board
              </h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-zinc-400">
                Review net profit, margins, best-selling SKUs, slow inventory, customer lifetime
                value, churn risk, and recommendation performance in one place.
              </p>
            </div>
            <div className="rounded-full border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300 transition group-hover:translate-x-1">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <InfoTile
              label="Top Category"
              value={advisorContext?.topSellingCategory || 'N/A'}
              detail="Still useful, but the full sales mix lives in analytics"
            />
            <InfoTile
              label="Unsold Inventory"
              value={advisorContext?.unsoldInventory || 0}
              detail="Products with no historical order items"
            />
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Market Debt"
          value={`₹${Number(ledgerStats.totalDebt || 0).toLocaleString()}`}
          icon={AlertCircle}
          tone="text-rose-300 border-rose-500/20 bg-rose-500/10"
          desc="Money currently owed to you"
        />
        <StatCard
          title="Total Collection"
          value={`₹${Number(ledgerStats.totalCollection || 0).toLocaleString()}`}
          icon={Wallet}
          tone="text-emerald-300 border-emerald-500/20 bg-emerald-500/10"
          desc="Cash received through the marketplace"
        />
        <StatCard
          title="Orders In Progress"
          value={(processingOrders + shippedOrders).toLocaleString()}
          icon={Truck}
          tone="text-sky-300 border-sky-500/20 bg-sky-500/10"
          desc={`${processingOrders} processing and ${shippedOrders} shipped`}
        />
        <StatCard
          title="Total Units In Stock"
          value={totalUnitsInStock.toLocaleString()}
          icon={Boxes}
          tone="text-zinc-200 border-zinc-700 bg-zinc-800/70"
          desc={`${totalProducts} active catalog products`}
        />
        <StatCard
          title="Low / Out Of Stock"
          value={`${lowStockProducts.length} / ${outOfStockProducts.length}`}
          icon={PackageCheck}
          tone="text-amber-300 border-amber-500/20 bg-amber-500/10"
          desc="Low stock first, out of stock second"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Inventory Snapshot
            </p>
            <h2 className="mt-2 text-lg font-black text-white">Stock asset pressure</h2>
          </div>
          <div className="h-80">
            <StockPressureChart chartData={chartData} />
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Operational Alerts
            </p>
            <h2 className="mt-2 text-lg font-black text-white">What needs attention</h2>
          </div>

          <div className="grid gap-3">
            <AlertRow
              icon={Hourglass}
              label="Pending queue"
              value={pendingOrders}
              detail="Orders waiting for your first operational action"
              tone="text-orange-300 border-orange-500/20 bg-orange-500/10"
            />
            <AlertRow
              icon={RotateCcw}
              label="Return requests"
              value={returnRequests}
              detail="Items blocked until you approve or reject the return"
              tone="text-violet-300 border-violet-500/20 bg-violet-500/10"
            />
            <AlertRow
              icon={AlertCircle}
              label="Refund exceptions"
              value={refundExceptions}
              detail="Items where refund recovery still needs attention"
              tone="text-rose-300 border-rose-500/20 bg-rose-500/10"
            />
          </div>

          <div className="mt-5 rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Immediate next step
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Review the analytics page for the profit view, slow movers by value, customer risk,
              and deeper recommendation performance before deciding what to restock or promote.
            </p>
            <Link
              to="/wholesaler/analytics"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-amber-400"
            >
              Open Analytics
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Catalog Watchlist
            </p>
            <h2 className="mt-2 text-lg font-black text-white">Restock and dormancy scan</h2>
          </div>

          <div className="space-y-3">
            {outOfStockProducts.slice(0, 3).map((product) => (
              <WatchRow
                key={`out-${product.id}`}
                name={product.name}
                meta="Out of stock"
                detail="Unavailable for sale until restocked"
                tone="text-rose-300 border-rose-500/20 bg-rose-500/10"
              />
            ))}
            {lowStockProducts.slice(0, 3).map((product) => (
              <WatchRow
                key={`low-${product.id}`}
                name={product.name}
                meta={`${product.currentStock} left`}
                detail="Reorder soon to avoid availability gaps"
                tone="text-amber-300 border-amber-500/20 bg-amber-500/10"
              />
            ))}
            {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
              <div className="rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">
                No immediate stock pressure. The catalog is currently clear of low-stock and
                out-of-stock alerts.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Recent Orders
            </p>
            <h2 className="mt-2 text-lg font-black text-white">Latest marketplace movement</h2>
          </div>

          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {order.buyer?.name || order.buyer?.email || 'Customer'}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {order.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniMetric
                      label="Placed"
                      value={new Date(order.createdAt).toLocaleDateString()}
                    />
                    <MiniMetric label="Items" value={order.items?.length || 0} />
                    <MiniMetric
                      label="Order Total"
                      value={`₹${Number(order.totalAmount || 0).toLocaleString()}`}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-zinc-800 bg-[#0a0a0a] px-4 py-6 text-sm text-zinc-500">
                No recent orders yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* B2B GST Bank & UPI Settings Card */}
      <section className="rounded-[24px] border border-zinc-800 bg-[#111111] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-500">
            B2B GST Bank & UPI Settings
          </p>
          <h2 className="mt-2 text-lg font-black text-white">
            Configure your direct settlement credentials
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            These details are shown to verified B2B buyers when they pay via Bank Transfer / UPI.
          </p>
        </div>

        <form onSubmit={handleSaveBankDetails} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Bank Name
            </label>
            <input
              type="text"
              value={bankDetails.bankName}
              onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
              placeholder="e.g. State Bank of India"
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={bankDetails.bankAccountNo}
              onChange={(e) => setBankDetails({ ...bankDetails, bankAccountNo: e.target.value })}
              placeholder="e.g. 123456789012"
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              IFSC Code
            </label>
            <input
              type="text"
              value={bankDetails.bankIfsc}
              onChange={(e) => setBankDetails({ ...bankDetails, bankIfsc: e.target.value })}
              placeholder="e.g. SBIN0001234"
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              UPI ID
            </label>
            <input
              type="text"
              value={bankDetails.upiId}
              onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
              placeholder="e.g. company@ybl"
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end mt-2">
            <button
              type="submit"
              disabled={isSavingBank}
              className="rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-6 py-2.5 text-xs font-bold text-[#0a0a0a] transition"
            >
              {isSavingBank ? 'Saving settings...' : 'Save Bank Credentials'}
            </button>
          </div>
        </form>
      </section>

      {/* Delivery & Shipping Settings Card */}
      <section className="rounded-[24px] border border-zinc-800 bg-[#111111] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)] mt-6">
        <div className="mb-5">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-500">
            Delivery & Shipping Settings
          </p>
          <h2 className="mt-2 text-lg font-black text-white">Configure your delivery charges</h2>
          <p className="text-xs text-zinc-500 mt-1">
            These rules apply to retail (B2C) customer orders placed from your store catalog.
          </p>
        </div>

        <form onSubmit={handleSaveDeliveryDetails} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Flat Delivery Fee (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bankDetails.deliveryFee}
              onChange={(e) => setBankDetails({ ...bankDetails, deliveryFee: e.target.value })}
              placeholder="e.g. 50.00"
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Free Delivery Threshold (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bankDetails.freeDeliveryThreshold}
              onChange={(e) =>
                setBankDetails({ ...bankDetails, freeDeliveryThreshold: e.target.value })
              }
              placeholder="e.g. 1000.00 (leave empty for flat rate always)"
              className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end mt-2">
            <button
              type="submit"
              disabled={isSavingDelivery}
              className="rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-6 py-2.5 text-xs font-bold text-[#0a0a0a] transition"
            >
              {isSavingDelivery ? 'Saving settings...' : 'Save Delivery Settings'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
