import { Sparkles, Store } from 'lucide-react';

export default function RecommendationsSection({
  userRecommendedItems,
  isLoadingUserRecs,
  handleProductClick,
}) {
  if (!isLoadingUserRecs && (!userRecommendedItems || userRecommendedItems.length === 0)) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5]/10">
          <Sparkles className="h-4 w-4 text-[#4f46e5]" />
        </div>
        <h2 className="text-xl font-black tracking-tight">Recommended For You</h2>
      </div>

      {isLoadingUserRecs ? (
        <div className="mt-5 flex h-40 items-center justify-center text-[#64748b]">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-md bg-[#f1f5f9] h-10 w-10"></div>
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-[#f1f5f9] rounded"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-2 bg-[#f1f5f9] rounded col-span-2"></div>
                  <div className="h-2 bg-[#f1f5f9] rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-[#f1f5f9] rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
          {userRecommendedItems.map((item) => {
            const product = item.product;
            const reason = item.reasons?.[0] || 'Based on products you explored';

            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product, 'recommended_for_you')}
                className="min-w-[220px] max-w-[220px] flex-shrink-0 rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm hover:border-[#4f46e5] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 w-full rounded-md bg-[#f8fafc] flex items-center justify-center overflow-hidden border border-[#e2e8f0]/40">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Store className="h-10 w-10 text-[#94a3b8]" />
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748b]">
                      {product.category}
                    </span>
                    <h4 className="font-bold text-sm text-[#1e293b] line-clamp-1 mt-0.5">
                      {product.name}
                    </h4>
                    <p className="mt-2 text-base font-black font-mono text-[#4f46e5]">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 border-t border-[#e2e8f0] pt-2">
                  <p className="text-[10px] text-[#64748b] font-semibold flex items-center gap-1 line-clamp-1">
                    <Sparkles className="h-3.5 w-3.5 text-[#4f46e5] flex-shrink-0" /> {reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
