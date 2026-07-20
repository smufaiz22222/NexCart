import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  Shield,
  ShoppingBag,
  X,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import NotificationBell from '../components/NotificationBell';

export default function AdminLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    {
      name: 'Platform Overview',
      href: '/admin',
      icon: LayoutDashboard,
      description: 'Marketplace pulse',
      matcher: (pathname) => pathname === '/admin',
    },
    {
      name: 'Wholesalers',
      href: '/admin/wholesalers',
      icon: Building2,
      description: 'Directory and applications',
      matcher: (pathname) => pathname.startsWith('/admin/wholesalers'),
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: ShoppingBag,
      description: 'Platform-wide order tracking',
      matcher: (pathname) => pathname.startsWith('/admin/orders'),
    },
    {
      name: 'Subscriptions',
      href: '/admin/subscriptions',
      icon: CreditCard,
      description: 'Plans and billing control',
      matcher: (pathname) => pathname.startsWith('/admin/subscriptions'),
    },
    {
      name: 'Supplier Payouts',
      href: '/admin/payouts',
      icon: Landmark,
      description: 'Review and settle requests',
      matcher: (pathname) => pathname.startsWith('/admin/payouts'),
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0B0E11] text-[#EAECEF] selection:bg-[#F0B90B] selection:text-[#0B0E11]">
      <div className="relative flex h-full overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-[260px] shrink-0 border-r border-[#2B3139] bg-[#12161C] md:flex md:flex-col">
          <div className="border-b border-[#2B3139] px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#F0B90B] p-2.5">
                <Shield className="h-5 w-5 text-[#0B0E11]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0B90B]">
                  Super Admin
                </p>
                <h1 className="text-lg font-extrabold tracking-tight text-white">NexCart</h1>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = item.matcher(location.pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#2B3139] text-[#F0B90B]'
                      : 'text-[#848E9C] hover:bg-[#1E2329] hover:text-[#EAECEF]'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-[#F0B90B]' : ''}`} />
                  <div>
                    <p>{item.name}</p>
                    <p
                      className={`text-[11px] font-normal ${isActive ? 'text-[#B7BDC6]' : 'text-[#5E6673]'}`}
                    >
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#2B3139] px-4 py-4">
            <div className="rounded-lg bg-[#1E2329] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#848E9C]">
                Session
              </p>
              <p className="mt-1.5 text-sm font-semibold text-[#EAECEF]">
                {user?.name || 'Super Admin'}
              </p>
              <p className="mt-0.5 text-xs text-[#5E6673]">{user?.email}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2B3139] bg-[#1E2329] px-3 py-2.5 text-sm font-medium text-[#848E9C] transition hover:border-[#F0B90B]/30 hover:text-[#F0B90B]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Area */}
        <div className="relative flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-[#2B3139] bg-[#12161C]/95 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Toggle navigation menu"
                  onClick={() => setIsMobileMenuOpen((v) => !v)}
                  className="rounded-lg border border-[#2B3139] bg-[#1E2329] p-2 text-[#848E9C] md:hidden"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F0B90B]">
                    Control Panel
                  </p>
                  <h2 className="text-base font-bold text-white">Super Admin Dashboard</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="hidden rounded-lg border border-[#2B3139] bg-[#1E2329] px-3 py-1.5 text-right sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#848E9C]">
                    Signed in
                  </p>
                  <p className="text-xs font-medium text-[#EAECEF]">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <nav className="space-y-1 border-t border-[#2B3139] px-3 py-3 md:hidden">
                {navigation.map((item) => {
                  const isActive = item.matcher(location.pathname);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive
                          ? 'bg-[#2B3139] text-[#F0B90B]'
                          : 'text-[#848E9C] hover:bg-[#1E2329]'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            )}
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
