import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  ChevronDown,
  ChevronUp,
  Hourglass,
  PackageCheck,
  RotateCcw,
  Truck,
  Wallet,
  Settings,
  Landmark,
  Package as PackageIcon,
} from 'lucide-react';

import StatCard from './StatCard';
import QuickStrip from './QuickStrip';
import InfoTile from './InfoTile';
import MiniMetric from './MiniMetric';
import AlertRow from './AlertRow';
import WatchRow from './WatchRow';
import StockPressureChart from './StockPressureChart';

export function DashboardOperationsHero({
  pendingOrders,
  returnRequests,
  refundExceptions,
  advisorContext,
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[28px] border border-zinc-800 bg-[#111111] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-500/80">
          Operations Desk
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
          Daily execution up front, deeper analytics one click away.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
          Monitor stock pressure, collections, and marketplace movement. Jump to analytics for
          profit, retention, slow movers, and recommendation performance.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <QuickStrip
            label="Pending Orders"
            value={pendingOrders}
            detail="Waiting for acceptance or packing"
          />
          <QuickStrip
            label="Return Requests"
            value={returnRequests}
            detail="Customer returns awaiting decision"
          />
          <QuickStrip
            label="Refund Exceptions"
            value={refundExceptions}
            detail="Refund failures needing follow-up"
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
              value, churn risk, and recommendation performance.
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
            detail="Full sales mix lives in analytics"
          />
          <InfoTile
            label="Unsold Inventory"
            value={advisorContext?.unsoldInventory || 0}
            detail="Products with no historical orders"
          />
        </div>
      </Link>
    </section>
  );
}

export function DashboardKeyMetrics({
  ledgerStats,
  processingOrders,
  shippedOrders,
  totalUnitsInStock,
  totalProducts,
  lowStockProducts,
  outOfStockProducts,
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-amber-500/60" />
        <h2 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
          Key Metrics
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Market Debt"
          value={`₹${Number(ledgerStats.totalDebt || 0).toLocaleString()}`}
          icon={AlertCircle}
          tone="text-rose-300 border-rose-500/20 bg-rose-500/10"
          desc="Money owed to you"
        />
        <StatCard
          title="Collection"
          value={`₹${Number(ledgerStats.totalCollection || 0).toLocaleString()}`}
          icon={Wallet}
          tone="text-emerald-300 border-emerald-500/20 bg-emerald-500/10"
          desc="Cash received via marketplace"
        />
        <StatCard
          title="In Progress"
          value={(processingOrders + shippedOrders).toLocaleString()}
          icon={Truck}
          tone="text-sky-300 border-sky-500/20 bg-sky-500/10"
          desc={`${processingOrders} processing · ${shippedOrders} shipped`}
        />
        <StatCard
          title="Units In Stock"
          value={totalUnitsInStock.toLocaleString()}
          icon={Boxes}
          tone="text-zinc-200 border-zinc-700 bg-zinc-800/70"
          desc={`${totalProducts} catalog products`}
        />
        <StatCard
          title="Low / Out"
          value={`${lowStockProducts.length} / ${outOfStockProducts.length}`}
          icon={PackageCheck}
          tone="text-amber-300 border-amber-500/20 bg-amber-500/10"
          desc="Low stock / out of stock"
        />
      </div>
    </section>
  );
}

export function DashboardStockAndAlerts({
  chartData,
  pendingOrders,
  returnRequests,
  refundExceptions,
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-amber-500/60" />
        <h2 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
          Inventory &amp; Alerts
        </h2>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Inventory Snapshot
            </p>
            <h3 className="mt-2 text-lg font-black text-white">Stock asset pressure</h3>
          </div>
          <div className="h-72">
            <StockPressureChart chartData={chartData} />
          </div>
        </div>

        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Operational Alerts
            </p>
            <h3 className="mt-2 text-lg font-black text-white">What needs attention</h3>
          </div>

          <div className="grid gap-3">
            <AlertRow
              icon={Hourglass}
              label="Pending queue"
              value={pendingOrders}
              detail="Orders waiting for your first action"
              tone="text-orange-300 border-orange-500/20 bg-orange-500/10"
            />
            <AlertRow
              icon={RotateCcw}
              label="Return requests"
              value={returnRequests}
              detail="Approve or reject pending returns"
              tone="text-violet-300 border-violet-500/20 bg-violet-500/10"
            />
            <AlertRow
              icon={AlertCircle}
              label="Refund exceptions"
              value={refundExceptions}
              detail="Refund recovery needs attention"
              tone="text-rose-300 border-rose-500/20 bg-rose-500/10"
            />
          </div>

          <div className="mt-5 rounded-[18px] border border-zinc-800 bg-[#0a0a0a] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
              Next step
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Check the analytics page for profit view, slow movers, customer risk, and
              recommendation performance.
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
      </div>
    </section>
  );
}

export function DashboardCatalogAndOrders({ outOfStockProducts, lowStockProducts, recentOrders }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <div className="h-1 w-6 rounded-full bg-amber-500/60" />
        <h2 className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
          Catalog &amp; Orders
        </h2>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Catalog Watchlist */}
        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
              <PackageIcon className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Restock Watchlist</h3>
              <p className="text-xs text-zinc-500">Products needing reorder attention</p>
            </div>
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
                detail="Reorder soon to avoid gaps"
                tone="text-amber-300 border-amber-500/20 bg-amber-500/10"
              />
            ))}
            {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
              <div className="rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-5 text-sm text-emerald-100">
                No stock pressure. Catalog is clear of alerts.
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2">
              <Truck className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Recent Orders</h3>
              <p className="text-xs text-zinc-500">Latest marketplace activity</p>
            </div>
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
                      label="Total"
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
      </div>
    </section>
  );
}

export function DashboardBusinessSettings({
  settingsOpen,
  setSettingsOpen,
  bankDetails,
  setBankDetails,
  handleSaveBankDetails,
  isSavingBank,
  handleSaveDeliveryDetails,
  isSavingDelivery,
}) {
  return (
    <section id="bank-settings">
      <button
        type="button"
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="w-full flex items-center justify-between rounded-[18px] border border-zinc-800 bg-[#111111] px-6 py-4 transition hover:border-zinc-700"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
            <Settings className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-black text-white">Business Settings</h3>
            <p className="text-xs text-zinc-500">
              Bank details, UPI credentials, and delivery configuration
            </p>
          </div>
        </div>
        {settingsOpen ? (
          <ChevronUp className="h-5 w-5 text-zinc-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-zinc-400" />
        )}
      </button>

      {settingsOpen && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Bank & UPI Settings */}
          <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
                <Landmark className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">B2B Bank &amp; UPI</h3>
                <p className="text-xs text-zinc-500">
                  Shown to verified B2B buyers for bank transfer / UPI payments
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveBankDetails} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="dashboard-bank-name"
                  className="block text-sm font-medium text-zinc-400 mb-1"
                >
                  Bank Name
                </label>
                <input
                  id="dashboard-bank-name"
                  type="text"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  placeholder="e.g. State Bank of India"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label
                  htmlFor="dashboard-account-number"
                  className="block text-sm font-medium text-zinc-400 mb-1"
                >
                  Account Number
                </label>
                <input
                  id="dashboard-account-number"
                  type="text"
                  value={bankDetails.bankAccountNo}
                  onChange={(e) =>
                    setBankDetails({ ...bankDetails, bankAccountNo: e.target.value })
                  }
                  placeholder="e.g. 123456789012"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label
                  htmlFor="dashboard-ifsc-code"
                  className="block text-sm font-medium text-zinc-400 mb-1"
                >
                  IFSC Code
                </label>
                <input
                  id="dashboard-ifsc-code"
                  type="text"
                  value={bankDetails.bankIfsc}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankIfsc: e.target.value })}
                  placeholder="e.g. SBIN0001234"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label
                  htmlFor="dashboard-upi-id"
                  className="block text-sm font-medium text-zinc-400 mb-1"
                >
                  UPI ID
                </label>
                <input
                  id="dashboard-upi-id"
                  type="text"
                  value={bankDetails.upiId}
                  onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                  placeholder="e.g. company@ybl"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={isSavingBank}
                  className="rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-6 py-2.5 text-xs font-bold text-[#0a0a0a] transition"
                >
                  {isSavingBank ? 'Saving...' : 'Save Bank Credentials'}
                </button>
              </div>
            </form>
          </div>

          {/* Delivery Settings */}
          <div className="rounded-[24px] border border-zinc-800 bg-[#111111] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2">
                <Truck className="h-4 w-4 text-sky-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delivery &amp; Shipping</h3>
                <p className="text-xs text-zinc-500">
                  Delivery fee rules for retail (B2C) customer orders
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDeliveryDetails} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="dashboard-delivery-fee"
                  className="block text-sm font-medium text-zinc-400 mb-1"
                >
                  Flat Delivery Fee (₹)
                </label>
                <input
                  id="dashboard-delivery-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bankDetails.deliveryFee}
                  onChange={(e) => setBankDetails({ ...bankDetails, deliveryFee: e.target.value })}
                  placeholder="e.g. 50.00"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="dashboard-free-delivery-threshold"
                  className="block text-sm font-medium text-zinc-400 mb-1"
                >
                  Free Delivery Threshold (₹)
                </label>
                <input
                  id="dashboard-free-delivery-threshold"
                  type="number"
                  step="0.01"
                  min="0"
                  value={bankDetails.freeDeliveryThreshold}
                  onChange={(e) =>
                    setBankDetails({ ...bankDetails, freeDeliveryThreshold: e.target.value })
                  }
                  placeholder="e.g. 1000 (empty = flat rate always)"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={isSavingDelivery}
                  className="rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-6 py-2.5 text-xs font-bold text-[#0a0a0a] transition"
                >
                  {isSavingDelivery ? 'Saving...' : 'Save Delivery Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
