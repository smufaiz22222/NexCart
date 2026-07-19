import { Clock, Store, Zap } from 'lucide-react';

export default function DealsSection({ dealProducts, handleProductClick }) {
  if (!dealProducts || dealProducts.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316]/10">
            <Zap className="h-4 w-4 text-[#f97316]" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Deals of the Day</h2>
          <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#94a3b8]">
            <Clock className="h-3.5 w-3.5" />
            Limited time offers
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {dealProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product, 'deal_section')}
              className="group rounded-xl border border-[#e2e8f0]/60 bg-[#f8fafc] p-3 text-left transition hover:border-[#4f46e5]/40 hover:shadow-md"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f1f5f9] p-2">
                <span className="absolute left-1.5 top-1.5 z-10 rounded bg-[#f97316] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  -{product.discountPercent}%
                </span>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain transition group-hover:scale-105"
                  />
                ) : (
                  <Store className="mx-auto mt-4 h-8 w-8 text-[#94a3b8]" />
                )}
              </div>
              <p className="mt-2 truncate text-xs font-bold text-[#1e293b]">{product.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-black text-[#1e293b]">
                  {formatCurrency(product.price)}
                </span>
                {product.originalPrice > product.price && (
                  <span className="text-[10px] text-[#94a3b8] line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}
