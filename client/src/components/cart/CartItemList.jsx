import React from 'react';
import { Minus, Plus, Package, Trash2 } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value) => {
  return currencyFormatter.format(Number(value || 0));
};

export default function CartItemList({ cart, updateQuantity, removeFromCart }) {
  return (
    <div className="mt-6 divide-y divide-[#e2e8f0]">
      {cart.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 group sm:flex-row"
        >
          {/* Product Image */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-2 shrink-0">
            {item.selectedSize && (
              <span className="absolute -right-1.5 -top-1.5 rounded-md bg-[#4f46e5] px-1.5 py-0.5 text-[8px] font-bold text-white shadow-sm">
                {item.selectedSize}
              </span>
            )}
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
            ) : (
              <Package className="h-8 w-8 text-[#c7d2fe]" />
            )}
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0f172a] line-clamp-1 group-hover:text-[#4f46e5] transition-colors">
                {item.name}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#64748b]">
                {item.wholesaler?.businessName || 'Unknown shop'}
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Quantity Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={item.quantity <= 1}
                  onClick={() => updateQuantity(item.id, item.quantity - 1).catch(() => {})}
                  className="w-7 h-7 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#eef2ff] hover:text-[#4f46e5] hover:border-[#c7d2fe] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-bold font-mono text-[#0f172a]">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1).catch(() => {})}
                  className="w-7 h-7 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#eef2ff] hover:text-[#4f46e5] hover:border-[#c7d2fe] transition-all"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Price & Remove */}
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <div className="text-right">
                  <p className="text-base font-black font-mono text-[#0f172a]">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-[10px] text-[#94a3b8]">{formatCurrency(item.price)} each</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id).catch(() => {})}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-red-500 hover:bg-red-50 transition-all"
                  title="Remove item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
