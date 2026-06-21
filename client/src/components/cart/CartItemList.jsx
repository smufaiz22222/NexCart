import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

export default function CartItemList({ cart, updateQuantity, removeFromCart }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  };

  return (
    <div className="mt-8 space-y-4">
      {cart.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-5 rounded-[28px] border border-[#ece7de] bg-[#fbfaf7] p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[22px] bg-[#f0eeea] p-3">
              {item.selectedSize && (
                <span className="absolute right-2 top-2 rounded-full bg-[#161412] px-2 py-1 text-[10px] font-bold text-white">
                  {item.selectedSize}
                </span>
              )}
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-contain mix-blend-multiply"
                />
              ) : (
                <ShoppingBag className="h-8 w-8 text-[#8b857c]" />
              )}
            </div>

            <div>
              <h3 className="text-lg font-black tracking-tight text-[#161412]">{item.name}</h3>
              <p className="mt-1 text-sm text-[#6b665f]">
                {item.wholesaler?.businessName || 'Unknown shop'}
              </p>
              <p className="mt-3 text-xl font-black text-[#161412]">{formatCurrency(item.price)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center rounded-full border border-[#ddd7cc] bg-white">
              <button
                disabled={item.quantity <= 1}
                onClick={() => updateQuantity(item.id, item.quantity - 1).catch(() => {})}
                className="p-3 text-[#6b665f] transition hover:text-[#161412] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center text-sm font-bold text-[#161412]">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1).catch(() => {})}
                className="p-3 text-[#6b665f] transition hover:text-[#161412]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => removeFromCart(item.id).catch(() => {})}
              className="rounded-full border border-[#efcdc7] bg-[#fff3f1] p-3 text-[#b34d3f]"
              title="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
