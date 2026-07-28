import { Link, Outlet } from 'react-router-dom';
import { Menu, X, ShoppingBag } from 'lucide-react';
import CategoryMegaMenu from '../components/storefront/CategoryMegaMenu';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import AuthModal from '../components/AuthModal';
import categoryData from '../data/categoryData';

const STOREFRONT_INFO_LINKS = [
  { label: 'About', to: '/store/about' },
  { label: 'FAQ', to: '/store/faq' },
  { label: 'Contact', to: '/store/contact' },
  { label: 'Privacy', to: '/store/privacy' },
];

export default function CustomerStorefrontLayout({
  mobileMenuOpen,
  setMobileMenuOpen,
  navigate,
  storefrontPrimaryLinks,
  handleMobileCategoryNavigate,
  totalItems,
  user,
  setAuthModalOpen,
  authModalOpen,
  storeRoute,
}) {
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] selection:bg-[#4f46e5] selection:text-white">
      <div className="bg-[#1e1b4b] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.26em] text-[#e0e7ff]">
        Your one-stop wholesale marketplace — browse, order, and grow your business.
      </div>

      <header className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-8">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-full border border-[#e2e8f0] bg-white p-2.5 text-[#1e293b] transition hover:border-[#4f46e5] hover:text-[#4f46e5] md:hidden"
              aria-label="Toggle storefront menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/store')}
              className="text-2xl font-black tracking-tight text-[#1e293b] sm:text-3xl"
            >
              Nex<span className="text-[#4f46e5]">Cart</span>
            </button>

            <nav className="hidden items-center gap-5 text-sm font-semibold text-[#64748b] md:flex">
              <Link className="transition hover:text-[#4f46e5]" to="/store">
                Shop
              </Link>
              <CategoryMegaMenu />
              <Link className="transition hover:text-[#4f46e5]" to="/store#products-section">
                All Products
              </Link>
              {isAuthenticated && (
                <Link
                  className="transition hover:text-[#4f46e5]"
                  to="/store/dashboard/b2b-onboarding"
                >
                  Business
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/store/cart')}
              className="relative rounded-full border border-[#e2e8f0] bg-white p-2.5 text-[#1e293b] transition hover:border-[#4f46e5] hover:text-[#4f46e5] sm:p-3"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4f46e5] px-1 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>

            {isAuthenticated && <NotificationBell />}

            <ProfileDropdown onLoginClick={() => setAuthModalOpen(true)} />
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <nav className="sticky top-[73px] z-30 border-b border-[#e2e8f0] bg-white shadow-lg md:hidden">
          <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5 sm:px-6">
            <div className="space-y-1">
              {storefrontPrimaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-bold text-[#1e293b] transition hover:bg-[#eef2ff] hover:text-[#4f46e5]"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-[#e2e8f0] pt-4">
              <p className="px-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#94a3b8]">
                Browse by category
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {categoryData.slice(0, 8).map((category) => (
                  <button
                    key={category.slug}
                    type="button"
                    onClick={() => handleMobileCategoryNavigate(category.name)}
                    className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-semibold text-[#475569] transition hover:border-[#4f46e5] hover:bg-[#eef2ff] hover:text-[#4f46e5]"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[#e2e8f0] pt-4">
              {STOREFRONT_INFO_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-[#e2e8f0] px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-[#64748b] transition hover:border-[#4f46e5] hover:text-[#4f46e5]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main className={storeRoute ? '' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'}>
        <Outlet />
      </main>

      <footer className="mt-16 bg-[#1e1b4b] text-[#e0e7ff]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_repeat(3,1fr)] lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              Nex<span className="text-[#a5b4fc]">Cart</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#a5b4fc]">
              A marketplace experience tuned for fashion-style discovery, wholesaler credibility,
              and smooth repeat buying.
            </p>
          </div>
          <FooterColumn
            title="Company"
            items={[
              ['About Us', '/store/about'],
              ['Storefront', '/store'],
              ['Privacy Policy', '/store/privacy'],
            ]}
          />
          <FooterColumn
            title="Help"
            items={[
              ['FAQ', '/store/faq'],
              ['Contact Us', '/store/contact'],
              ['Cart', '/store/cart'],
            ]}
          />
          <FooterColumn
            title="Account"
            items={
              isAuthenticated
                ? [
                    ['My Account', '/store/dashboard'],
                    ['Saved Cart', '/store/cart'],
                    ['Shopping Catalog', '/store'],
                  ]
                : [
                    ['Sign In', '/login'],
                    ['Create Account', '/register'],
                    ['Browse Store', '/store'],
                  ]
            }
          />
        </div>
      </footer>
      <AuthModal
        key={authModalOpen ? 'open' : 'closed'}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

function FooterColumn({ title, items }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6366f1]">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map(([label, href]) => (
          <Link
            key={label}
            to={href}
            className="block text-sm text-[#e0e7ff] transition hover:text-[#a5b4fc]"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
