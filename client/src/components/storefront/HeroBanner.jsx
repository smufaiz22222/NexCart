import { Sparkles, Star, Store, Zap } from 'lucide-react';

const handleScrollToProducts = () => {
  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
};

const handleScrollToCategories = () => {
  document.getElementById('categories-section')?.scrollIntoView({ behavior: 'smooth' });
};

export default function HeroBanner() {
  return (
    <section className="bg-gradient-to-br from-[#1e1b4b] to-[#312e81] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#a5b4fc]">
              NexCart Marketplace
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Everything you need, delivered to your door.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-[#c7d2fe]">
              Shop across thousands of products from verified wholesalers. Best prices, quality
              guaranteed.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleScrollToProducts}
                className="rounded-full bg-[#f97316] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ea580c]"
              >
                Shop Now
              </button>
              <button
                onClick={handleScrollToCategories}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Browse Categories
              </button>
            </div>
          </div>

          {/* Hero Visual — Trust & Value Props */}
          <div className="hidden lg:flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316]">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">Flash Deals</h3>
                <p className="text-xs text-[#c7d2fe] leading-relaxed">
                  Up to 40% off daily picks from top sellers
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#a5b4fc]">
                  <Star className="h-5 w-5 text-[#1e1b4b]" />
                </div>
                <h3 className="text-sm font-bold text-white">Verified Sellers</h3>
                <p className="text-xs text-[#c7d2fe] leading-relaxed">
                  Every wholesaler is vetted for quality
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4f46e5]">
                  <Store className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">10,000+ Products</h3>
                <p className="text-xs text-[#c7d2fe] leading-relaxed">
                  Explore a massive catalog across categories
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5 flex flex-col gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white">AI Recommendations</h3>
                <p className="text-xs text-[#c7d2fe] leading-relaxed">
                  Personalized picks powered by smart AI
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
