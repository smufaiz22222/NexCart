import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Search, ShoppingBag, UserRound } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function CustomerLayout() {
  const { logout } = useAuthStore();
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const resetCartState = useCartStore((state) => state.resetCartState);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!hasHydrated) {
      hydrateCart().catch((error) => console.error('Failed to hydrate cart:', error));
    }
  }, [hasHydrated, hydrateCart]);

  const handleLogout = () => {
    resetCartState();
    logout();
    navigate('/login');
  };

  const isStoreRoute = location.pathname === '/store';

  return (
    <div className="min-h-screen bg-[#f2f0ea] text-[#161412] selection:bg-[#161412] selection:text-[#f2f0ea]">
      <div className="bg-[#161412] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.26em] text-[#f2f0ea]">
        Sign up and get 20% off your first wholesale-ready order.
      </div>

      <header className="sticky top-0 z-40 border-b border-[#ddd7cc] bg-[#f8f6f1]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/store')}
              className="text-3xl font-black tracking-tight text-[#161412]"
            >
              SHOP.CO
            </button>

            <nav className="hidden items-center gap-6 text-sm font-semibold text-[#49443d] md:flex">
              <Link className="transition hover:text-[#161412]" to="/store">
                Shop
              </Link>
              <a className="transition hover:text-[#161412]" href="#new-arrivals">
                New Arrivals
              </a>
              <a className="transition hover:text-[#161412]" href="#top-selling">
                Top Selling
              </a>
              <a className="transition hover:text-[#161412]" href="#browse-style">
                Categories
              </a>
            </nav>
          </div>

          <div className="hidden flex-1 justify-center lg:flex">
            <div className="flex w-full max-w-xl items-center gap-3 rounded-full border border-[#ddd7cc] bg-white px-4 py-3">
              <Search className="h-4 w-4 text-[#8b857c]" />
              <input
                readOnly
                value=""
                placeholder="Search for products, styles and stores"
                className="w-full bg-transparent text-sm text-[#161412] outline-none placeholder:text-[#8b857c]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/store/cart')}
              className="relative rounded-full border border-[#ddd7cc] bg-white p-3 text-[#161412] transition hover:border-[#161412]"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#161412] px-1 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/store/orders')}
              className="rounded-full border border-[#ddd7cc] bg-white p-3 text-[#161412] transition hover:border-[#161412]"
              aria-label="Orders"
            >
              <UserRound className="h-5 w-5" />
            </button>

            <button
              onClick={handleLogout}
              className="hidden items-center gap-2 rounded-full border border-[#161412] px-4 py-3 text-sm font-bold text-[#161412] transition hover:bg-[#161412] hover:text-white sm:flex"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className={isStoreRoute ? '' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'}>
        <Outlet />
      </main>

      <footer className="mt-16 bg-[#161412] text-[#f2f0ea]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_repeat(3,1fr)] lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">SHOP.CO</h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#c8c1b4]">
              A marketplace experience tuned for fashion-style discovery, wholesaler credibility,
              and smooth repeat buying.
            </p>
          </div>
          <FooterColumn
            title="Company"
            items={[
              ['About', '/store'],
              ['Storefront', '/store'],
              ['Orders', '/store/orders'],
            ]}
          />
          <FooterColumn
            title="Help"
            items={[
              ['Cart', '/store/cart'],
              ['Login', '/login'],
              ['Register', '/register'],
            ]}
          />
          <FooterColumn
            title="Account"
            items={[
              ['My Account', '/store/orders'],
              ['Saved Cart', '/store/cart'],
              ['Sign Out', '/store'],
            ]}
          />
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, items }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f877b]">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map(([label, href]) => (
          <Link
            key={label}
            to={href}
            className="block text-sm text-[#f2f0ea] transition hover:text-[#c8c1b4]"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
