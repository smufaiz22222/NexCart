import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, Star, Store, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/axios';

const testimonialCards = [
  {
    name: 'Aarav',
    quote: 'The storefront feels premium, but checkout is still fast enough for repeat buying.',
  },
  {
    name: 'Sana',
    quote: 'Search and category browsing finally feel like a real shopping experience.',
  },
  {
    name: 'Kabir',
    quote: 'I can actually compare products quickly instead of hunting through plain cards.',
  },
];

export default function Storefront() {
  const [marketplaceProducts, setMarketplaceProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [recommendedProductIds, setRecommendedProductIds] = useState(new Set());
  const [recommendationId, setRecommendationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCollection, setSelectedCollection] = useState('Trending');
  const navigate = useNavigate();
  const loggedImpressionRecommendationIds = useRef(new Set());

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const [marketplaceResponse, recommendationResponse] = await Promise.all([
          apiClient.get('/products/marketplace'),
          apiClient.get('/recommendations/popular?scope=trending&limit=100'),
        ]);

        const marketplace = marketplaceResponse.data.products || [];
        const recommendationItems = recommendationResponse.data.recommendations || [];
        const recommendedProducts = recommendationItems.map((item) => item.product).slice(0, 24);

        setMarketplaceProducts(marketplace);
        setTrendingProducts(
          recommendedProducts.length ? recommendedProducts : marketplace.slice(0, 24)
        );
        setRecommendedProductIds(new Set(recommendedProducts.map((product) => product.id)));
        setRecommendationId(recommendationResponse.data.recommendationId || null);
      } catch (error) {
        console.error('Failed to load marketplace:', error);
        try {
          const fallbackResponse = await apiClient.get('/products/marketplace');
          const fallbackProducts = fallbackResponse.data.products || [];
          setMarketplaceProducts(fallbackProducts);
          setTrendingProducts(fallbackProducts.slice(0, 24));
          setRecommendedProductIds(new Set());
          setRecommendationId(null);
        } catch (fallbackError) {
          console.error('Failed to load fallback marketplace:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketplace();
  }, []);

  useEffect(() => {
    if (!recommendationId || trendingProducts.length === 0) return;
    if (loggedImpressionRecommendationIds.current.has(recommendationId)) return;

    loggedImpressionRecommendationIds.current.add(recommendationId);
    apiClient
      .post('/interactions/recommendation-events', {
        recommendationId,
        events: trendingProducts.map((product) => ({
          productId: product.id,
          eventType: 'impression',
        })),
      })
      .catch((error) => console.error('Failed to log recommendation impressions:', error));
  }, [recommendationId, trendingProducts]);

  const handleProductClick = (product, source = 'storefront') => {
    let recommendationContext = null;

    if (recommendationId && recommendedProductIds.has(product.id)) {
      recommendationContext = {
        recommendationId,
        productId: product.id,
        source,
      };

      apiClient
        .post('/interactions/recommendation-event', {
          recommendationId,
          productId: product.id,
          eventType: 'click',
        })
        .catch((error) => console.error('Failed to log recommendation click:', error));
    }

    navigate(
      `/store/product/${product.id}`,
      recommendationContext ? { state: { recommendationContext } } : undefined
    );
  };

  const categories = [
    'All',
    ...new Set(marketplaceProducts.map((product) => product.category || 'General')),
  ];
  const collections = ['Trending', 'New Arrivals', 'Top Rated'];
  const featuredProducts =
    selectedCollection === 'Top Rated'
      ? [...marketplaceProducts]
          .sort((left, right) => (right.ratingAverage || 0) - (left.ratingAverage || 0))
          .slice(0, 12)
      : selectedCollection === 'New Arrivals'
        ? [...marketplaceProducts].slice(0, 12)
        : trendingProducts.slice(0, 12);

  const filteredProducts = featuredProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.wholesaler?.businessName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || (product.category || 'General') === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categoryHighlights = categories.filter((category) => category !== 'All').slice(0, 4);
  const topSelling = [...marketplaceProducts]
    .sort((left, right) => (right.reviewCount || 0) - (left.reviewCount || 0))
    .slice(0, 8);

  return (
    <div className="bg-[#f2f0ea] pb-16 text-[#161412]">
      <section className="border-b border-[#ddd7cc] bg-[#f8f6f1]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8f5d31]">
              New season marketplace
            </p>
            <h1 className="mt-5 max-w-xl text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">
              Find clothes that match your rhythm.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#5f5951]">
              Discover trend-driven product cards, cleaner categories, seller-aware merchandising,
              and a customer journey shaped more like a real fashion storefront than a basic
              catalog.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() =>
                  document.getElementById('new-arrivals')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="rounded-full bg-[#161412] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#2d2a27]"
              >
                Shop now
              </button>
              <button
                onClick={() =>
                  document.getElementById('browse-style')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="rounded-full border border-[#161412] px-6 py-4 text-sm font-bold text-[#161412] transition hover:bg-[#161412] hover:text-white"
              >
                Browse styles
              </button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <HeroStat label="International brands" value="200+" />
              <HeroStat label="Active customers" value="2,000+" />
              <HeroStat label="Quality products" value="30,000+" />
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#d3c4aa_0%,#ede4d6_54%,#f9f6f1_100%)] p-6 sm:min-h-[420px] sm:p-8">
            <div className="absolute left-6 top-6 rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#161412] shadow-[0_12px_30px_rgba(22,20,18,0.08)]">
              Bestsellers
            </div>
            <div className="absolute right-6 top-20 max-w-[170px] rounded-[28px] bg-white/88 p-4 shadow-[0_18px_45px_rgba(22,20,18,0.1)]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                Fresh picks
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#3f3a34]">
                Merchandising blocks now use live marketplace products instead of static mock cards.
              </p>
            </div>
            <div className="absolute bottom-6 left-6 right-6 grid gap-4 sm:grid-cols-2">
              {(marketplaceProducts.slice(0, 2) || []).map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product, 'hero_feature')}
                  className="rounded-[28px] bg-white/92 p-5 text-left shadow-[0_18px_45px_rgba(22,20,18,0.1)] transition hover:-translate-y-1"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                    {product.category || 'General'}
                  </p>
                  <p className="mt-3 text-lg font-black tracking-tight">{product.name}</p>
                  <p className="mt-2 text-sm text-[#6b665f]">{formatCurrency(product.price)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#ddd7cc] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-5 px-4 py-8 text-lg font-black tracking-tight text-[#161412] sm:px-6 lg:px-8">
          <span>VERSACE</span>
          <span>ZARA</span>
          <span>GUCCI</span>
          <span>PRADA</span>
          <span>Calvin Klein</span>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[30px] border border-[#ddd7cc] bg-white px-5 py-5 shadow-[0_18px_45px_rgba(22,20,18,0.05)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-full border border-[#ddd7cc] bg-[#fbfaf7] px-4 py-3">
            <Search className="h-4 w-4 text-[#8b857c]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products, shops, categories"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#8b857c]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {collections.map((collection) => (
              <button
                key={collection}
                onClick={() => setSelectedCollection(collection)}
                className={`rounded-full px-4 py-3 text-sm font-bold transition ${
                  selectedCollection === collection
                    ? 'bg-[#161412] text-white'
                    : 'border border-[#ddd7cc] bg-[#fbfaf7] text-[#49443d]'
                }`}
              >
                {collection}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="new-arrivals" className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <SectionHeading
          title="New Arrivals"
          description="A storefront-first product grid with live ratings, discount cues, and better seller context."
        />
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                selectedCategory === category
                  ? 'bg-[#161412] text-white'
                  : 'bg-white text-[#49443d] border border-[#ddd7cc]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {isLoading ? (
          <ProductGridSkeleton />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="No products match this filter"
            description="Try another collection or clear your search to see more products."
          />
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product, 'storefront_collection')}
              />
            ))}
          </div>
        )}
      </section>

      <section id="top-selling" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading
          title="Top Selling"
          description="Products customers are reviewing and revisiting most often."
        />
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {topSelling.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => handleProductClick(product, 'storefront_top_selling')}
            />
          ))}
        </div>
      </section>

      <section id="browse-style" className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="rounded-[36px] bg-[#161412] px-6 py-8 text-white sm:px-10 sm:py-10">
          <SectionHeading
            title="Browse By Dress Style"
            description="Adapted from the Figma browsing blocks, but driven by your live marketplace categories."
            invert
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {categoryHighlights.map((category, index) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  document.getElementById('new-arrivals')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`rounded-[30px] px-6 py-8 text-left transition hover:-translate-y-1 ${
                  index % 2 === 0 ? 'bg-[#f2f0ea] text-[#161412]' : 'bg-[#2a2724] text-white'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
                  Category
                </p>
                <p className="mt-3 text-3xl font-black tracking-tight">{category}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading
          title="Our Happy Customers"
          description="The original template uses testimonials. Here they reinforce the improved buying flow and product discovery."
        />
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {testimonialCards.map((card) => (
            <div key={card.name} className="rounded-[30px] border border-[#ddd7cc] bg-white p-6">
              <div className="flex items-center gap-1 text-[#161412]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-5 text-lg font-black tracking-tight">{card.name}</p>
              <p className="mt-3 text-sm leading-7 text-[#6b665f]">"{card.quote}"</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <div className="rounded-[36px] bg-[#161412] px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[#d7cdbd]">
                <Sparkles className="h-4 w-4" />
                Newsletter
              </p>
              <h2 className="mt-5 text-4xl font-black leading-none tracking-tight">
                Stay up to date about our latest offers
              </h2>
            </div>
            <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="Enter your email address"
                className="w-full rounded-full bg-white px-5 py-4 text-sm text-[#161412] outline-none"
              />
              <button className="rounded-full bg-[#f2f0ea] px-6 py-4 text-sm font-bold text-[#161412] transition hover:bg-white">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[30px] bg-white p-4 text-left shadow-[0_18px_45px_rgba(22,20,18,0.05)] transition hover:-translate-y-1"
    >
      <div className="relative flex aspect-[0.95] items-center justify-center overflow-hidden rounded-[24px] bg-[#f0eeea] p-4">
        {product.discountPercent > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-[#161412] px-3 py-1 text-[11px] font-bold text-white">
            -{product.discountPercent}%
          </span>
        )}
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain mix-blend-multiply transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Store className="h-10 w-10 text-[#a49d92]" />
        )}
      </div>
      <div className="px-2 pb-2 pt-5">
        <h3 className="text-lg font-black leading-6 tracking-tight text-[#161412]">
          {product.name}
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-1 text-[#161412]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-4 w-4 ${index < Math.round(product.ratingAverage || 0) ? 'fill-current' : ''}`}
              />
            ))}
          </div>
          <span className="text-sm text-[#6b665f]">
            {product.ratingAverage || 0}/5 ({product.reviewCount || 0})
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6b665f]">
          {product.description || 'No description available for this product yet.'}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-2xl font-black tracking-tight text-[#161412]">
            {formatCurrency(product.price)}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-sm font-semibold text-[#8b857c] line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-[#6b665f]">
          <span>{product.category || 'General'}</span>
          <span className="font-semibold">
            {product.wholesaler?.businessName || 'Unknown shop'}
          </span>
        </div>
      </div>
    </button>
  );
}

function SectionHeading({ title, description, invert = false }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2
          className={`text-4xl font-black tracking-tight ${invert ? 'text-white' : 'text-[#161412]'}`}
        >
          {title}
        </h2>
        <p
          className={`mt-3 max-w-2xl text-sm leading-7 ${invert ? 'text-[#d7cdbd]' : 'text-[#6b665f]'}`}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-[28px] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(22,20,18,0.05)]">
      <p className="text-3xl font-black tracking-tight text-[#161412]">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-[#8b857c]">{label}</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="mt-8 rounded-[30px] border border-dashed border-[#d8d2c8] bg-white px-6 py-14 text-center">
      <p className="text-xl font-black tracking-tight text-[#161412]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[#6b665f]">{description}</p>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-[30px] bg-white p-4">
          <div className="aspect-[0.95] rounded-[24px] bg-[#ece7de]" />
          <div className="mt-5 h-5 rounded bg-[#ece7de]" />
          <div className="mt-3 h-4 w-2/3 rounded bg-[#ece7de]" />
          <div className="mt-4 h-4 w-5/6 rounded bg-[#ece7de]" />
          <div className="mt-5 h-6 w-1/2 rounded bg-[#ece7de]" />
        </div>
      ))}
    </div>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
