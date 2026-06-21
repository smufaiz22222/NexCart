import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  LogIn,
  ShoppingBag,
  Store,
  LayoutDashboard,
  Package,
  Building2,
  MessageSquare,
  Menu,
  X,
  UserRound,
  Heart,
  RotateCcw,
  FileText,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import useB2BCartStore from '../store/b2bCartStore';
import AuthModal from '../components/AuthModal';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';

export default function CustomerLayout() {
  const { logout, isAuthenticated, user } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isCustomer = user?.role === 'CUSTOMER';
  const hasApprovedB2BAccess =
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const resetCartState = useCartStore((state) => state.resetCartState);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const b2bTotalItems = useB2BCartStore((state) => state.totals.itemCount);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && !isCustomer) {
      return;
    }

    if (!hasHydrated) {
      hydrateCart().catch((error) => console.error('Failed to hydrate cart:', error));
    }
  }, [hasHydrated, hydrateCart, isAuthenticated, isCustomer]);

  useEffect(() => {
    if (isAuthenticated && hasApprovedB2BAccess) {
      useB2BCartStore.getState().hydrateCart();
    }
  }, [isAuthenticated, hasApprovedB2BAccess]);

  useEffect(() => {
    const handleOpen = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpen);
    return () => window.removeEventListener('open-auth-modal', handleOpen);
  }, []);

  const handleLogout = () => {
    resetCartState();
    logout();
    navigate('/login');
  };

  const isStoreRoute = location.pathname === '/store';
  const isB2BDashboardRoute =
    location.pathname.startsWith('/store/dashboard/b2b') ||
    location.pathname.startsWith('/store/dashboard/rfqs');
  const isB2CDashboardRoute =
    location.pathname.startsWith('/store/dashboard') && !isB2BDashboardRoute;
  const showB2BSidebar = hasApprovedB2BAccess && isB2BDashboardRoute;
  const showB2CSidebar = isAuthenticated && isCustomer && isB2CDashboardRoute;

  // Sidebar specific navigation list for B2B Portal
  const b2bSidebarNavigation = [
    { name: 'Shop Catalog', href: '/store', icon: Store },
    { name: 'B2B Dashboard', href: '/store/dashboard/b2b', icon: LayoutDashboard },
    { name: 'Price Quotes (RFQs)', href: '/store/dashboard/rfqs', icon: MessageSquare },
    {
      name: 'B2B Cart',
      href: '/store/dashboard/b2b/cart',
      icon: ShoppingBag,
      badge: b2bTotalItems,
    },
    { name: 'B2B Orders', href: '/store/dashboard/b2b/orders', icon: FileText },
    { name: 'Business Account', href: '/store/dashboard/b2b-onboarding', icon: Building2 },
  ];

  // Sidebar navigation for B2C Dashboard
  const b2cSidebarNavigation = [
    { name: 'Shop Catalog', href: '/store', icon: Store },
    { name: 'My Dashboard', href: '/store/dashboard', icon: LayoutDashboard },
    { name: 'Order History', href: '/store/dashboard/orders', icon: Package },
    { name: 'Buy Again', href: '/store/buy-again', icon: RotateCcw },
    { name: 'Shopping Cart', href: '/store/cart', icon: ShoppingBag, badge: totalItems },
    { name: 'Wishlist', href: '/store/wishlist', icon: Heart },
    { name: 'My Profile', href: '/store/profile', icon: UserRound },
  ];

  // Choose which sidebar nav to show
  const sidebarNavigation = showB2BSidebar ? b2bSidebarNavigation : b2cSidebarNavigation;
  const showSidebar = showB2BSidebar || showB2CSidebar;

  if (showSidebar) {
    const sidebarAccent = showB2BSidebar ? '#8f5d31' : '#0047AB';
    const sidebarLabel = showB2BSidebar ? 'B2B' : 'B2C';

    return (
      <div className="min-h-screen bg-[#f2f0ea] flex font-sans selection:bg-[#161412] selection:text-[#f2f0ea]">
        {/* Desktop Left Sidebar */}
        <aside className="hidden md:flex w-72 flex-col bg-[#161412] text-[#f2f0ea] border-r border-[#2d2926] z-20 shrink-0">
          <div className="h-20 flex items-center justify-between px-8 border-b border-[#2d2926]">
            <button
              onClick={() => navigate('/store')}
              className="text-2xl font-black tracking-tight text-white flex items-center gap-2"
            >
              <span style={{ color: sidebarAccent }}>✦</span>
              Nex<span style={{ color: sidebarAccent }}>Cart</span>
            </button>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
              style={{
                color: sidebarAccent,
                borderColor: sidebarAccent + '40',
                backgroundColor: sidebarAccent + '15',
              }}
            >
              {sidebarLabel}
            </span>
          </div>

          <nav className="flex-1 py-8 px-4 space-y-1.5 overflow-y-auto">
            {sidebarNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 relative ${
                    isActive
                      ? 'text-white bg-[#2c2926]'
                      : 'text-[#c8c1b4] hover:bg-[#2c2926]/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon
                      className={`h-5 w-5 mr-3 transition-transform duration-300 ${isActive ? 'scale-110 text-[#8f5d31]' : 'text-[#8f877b]'}`}
                    />
                    {item.name}
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8f5d31] px-1 text-[10px] font-black text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer / Static Links & User Info */}
          <div className="p-4 border-t border-[#2d2926] bg-[#1c1a18]">
            {/* Switch between B2B/B2C */}
            {hasApprovedB2BAccess && (
              <div className="mb-4">
                <Link
                  to={showB2BSidebar ? '/store/dashboard' : '/store/dashboard/b2b'}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2d2926] hover:border-[#8f877b] px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#c8c1b4] hover:text-white transition-all duration-300"
                >
                  {showB2BSidebar ? (
                    <>
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Switch to B2C Dashboard
                    </>
                  ) : (
                    <>
                      <Building2 className="h-3.5 w-3.5" />
                      Switch to B2B Dashboard
                    </>
                  )}
                </Link>
              </div>
            )}
            {/* Static Pages Links */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] font-bold uppercase tracking-wider text-[#8b8276] px-2">
              <Link to="/store/about" className="hover:text-white transition">
                About
              </Link>
              <Link to="/store/faq" className="hover:text-white transition">
                FAQ
              </Link>
              <Link to="/store/contact" className="hover:text-white transition">
                Contact
              </Link>
              <Link to="/store/privacy" className="hover:text-white transition">
                Privacy
              </Link>
            </div>

            <div className="border-t border-[#2d2926]/60 pt-4">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="px-2">
                    <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                    <p className="text-[10px] text-[#8f877b] truncate mt-0.5">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-red-400 transition-all duration-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8f5d31] hover:bg-[#a06a3a] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all duration-300"
                >
                  <LogIn className="h-4 w-4" />
                  Login / Register
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f2f0ea]">
          {/* Mobile Header */}
          <header className="md:hidden h-16 bg-[#161412] text-white flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-zinc-400 hover:text-white focus:outline-none transition-colors p-2"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <button
              onClick={() => navigate('/store')}
              className="text-xl font-black tracking-tight text-white"
            >
              Nex<span className="text-[#8f5d31]">Cart</span>
            </button>

            <div className="flex items-center gap-2">
              {isAuthenticated && <NotificationBell />}
              <button onClick={() => navigate('/store/cart')} className="relative p-2">
                <ShoppingBag className="h-5 w-5 text-white" />
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8f5d31] px-1 text-[9px] font-bold text-white">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Mobile Navigation Drawer */}
          {isMobileMenuOpen && (
            <nav className="md:hidden bg-[#161412] text-white border-b border-[#2d2926] shadow-2xl absolute w-full z-20">
              <div className="px-4 pt-2 pb-4 space-y-1">
                {sidebarNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 text-sm font-bold tracking-wide rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#2c2926] text-white'
                          : 'text-[#c8c1b4] hover:bg-[#2c2926]/50'
                      }`}
                    >
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 mr-3 text-[#8f877b]" />
                        {item.name}
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8f5d31] px-1 text-[9px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
                <div className="pt-4 border-t border-[#2d2926] mt-4 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#8b8276] px-2">
                  <Link to="/store/about" onClick={() => setIsMobileMenuOpen(false)}>
                    About
                  </Link>
                  <Link to="/store/faq" onClick={() => setIsMobileMenuOpen(false)}>
                    FAQ
                  </Link>
                  <Link to="/store/contact" onClick={() => setIsMobileMenuOpen(false)}>
                    Contact
                  </Link>
                  <Link to="/store/privacy" onClick={() => setIsMobileMenuOpen(false)}>
                    Privacy
                  </Link>
                </div>
                <div className="pt-4 mt-2">
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider border border-red-500/20"
                    >
                      Logout
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full py-3 bg-[#8f5d31] text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                      Login / Register
                    </button>
                  )}
                </div>
              </div>
            </nav>
          )}

          {showSidebar && (
            <header className="hidden md:flex h-20 items-center justify-between px-8 border-b border-[#ddd7cc] bg-white/70 backdrop-blur sticky top-0 z-30">
              <h2 className="text-xl font-bold text-[#161412]">
                {showB2BSidebar ? 'B2B Portal' : 'Customer Account'}
              </h2>
              <div className="flex items-center gap-4">
                {isAuthenticated && <NotificationBell />}
              </div>
            </header>
          )}

          <main
            className={isStoreRoute ? '' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'}
          >
            <Outlet />
          </main>
        </div>

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  // Otherwise, render normal e-commerce header/footer layout without left sidebar
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
              Nex<span className="text-[#8f5d31]">Cart</span>
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
              {isAuthenticated && isCustomer && (
                <Link
                  className="transition hover:text-[#161412]"
                  to="/store/dashboard/b2b-onboarding"
                >
                  Business Verification
                </Link>
              )}
            </nav>
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

            {isAuthenticated && <NotificationBell />}

            <ProfileDropdown onLoginClick={() => setIsAuthModalOpen(true)} />
          </div>
        </div>
      </header>

      <main className={isStoreRoute ? '' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'}>
        <Outlet />
      </main>

      <footer className="mt-16 bg-[#161412] text-[#f2f0ea]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.2fr_repeat(3,1fr)] lg:px-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight">
              Nex<span className="text-amber-500">Cart</span>
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-[#c8c1b4]">
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
            items={[
              ['My Account', '/store/dashboard'],
              ['Saved Cart', '/store/cart'],
              ['Sign Out', '/store'],
            ]}
          />
        </div>
      </footer>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
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
