import { ArrowRight, TrendingUp } from 'lucide-react';
import ProductCard from './ProductCard';

export default function TrendingSection({
  topSelling,
  handleProductClick,
  wishlist,
  handleWishlistToggle,
  navigate,
}) {
  if (!topSelling || topSelling.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f46e5]">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight">Trending Now</h2>
        </div>
        <button
          onClick={() => navigate('/store/trending')}
          className="flex items-center gap-1 text-sm font-semibold text-[#4f46e5] transition hover:underline"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {topSelling.slice(0, 4).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={() => handleProductClick(product, 'trending_section')}
            isWishlisted={wishlist.some((item) => item.id === product.id)}
            onWishlistToggle={(e) => handleWishlistToggle(e, product.id, product.name)}
          />
        ))}
      </div>
    </section>
  );
}
