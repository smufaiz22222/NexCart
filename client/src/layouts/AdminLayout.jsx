import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, LayoutDashboard, Shield, LogOut, Menu, X } from 'lucide-react';
import useAuthStore from '../store/authStore';

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
      name: 'Subscriptions',
      href: '/admin/subscriptions',
      icon: CreditCard,
      description: 'Plans and billing control',
      matcher: (pathname) => pathname.startsWith('/admin/subscriptions'),
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f5efe4] text-[#221c16] selection:bg-[#221c16] selection:text-[#f5efe4]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(200,122,58,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(28,84,77,0.14),_transparent_28%)]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[#d8ccb9] bg-[#f8f2e8]/90 backdrop-blur md:flex md:flex-col">
          <div className="border-b border-[#d8ccb9] px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#221c16] p-3 text-[#f5efe4] shadow-[0_14px_30px_rgba(34,28,22,0.18)]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#8f5d31]">
                  Super Admin
                </p>
                <h1 className="text-xl font-black tracking-tight">NexCart Control</h1>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {navigation.map((item) => {
              const isActive = item.matcher(location.pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-[#221c16] text-[#f5efe4] shadow-[0_18px_34px_rgba(34,28,22,0.18)]'
                      : 'text-[#5d5247] hover:bg-[#efe4d3] hover:text-[#221c16]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <p>{item.name}</p>
                    <p
                      className={`mt-0.5 text-[11px] font-medium ${isActive ? 'text-[#d8d1c5]' : 'text-[#8b7e70]'}`}
                    >
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[#d8ccb9] px-6 py-5">
            <div className="rounded-2xl bg-[#efe4d3] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
                Active Session
              </p>
              <p className="mt-2 text-sm font-semibold">{user?.name || 'Super Admin'}</p>
              <p className="mt-1 text-xs text-[#6b6155]">{user?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d0a274] bg-[#fff9f1] px-4 py-3 text-sm font-bold text-[#8f5d31] transition hover:bg-[#f4e3cb]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[#d8ccb9] bg-[#f8f2e8]/85 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen((value) => !value)}
                  className="rounded-xl border border-[#d8ccb9] bg-white/70 p-2 text-[#221c16] md:hidden"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f5d31]">
                    Platform Oversight
                  </p>
                  <h2 className="text-lg font-black tracking-tight text-[#221c16]">
                    Super Admin Dashboard
                  </h2>
                </div>
              </div>

              <div className="hidden rounded-2xl border border-[#d8ccb9] bg-white/70 px-4 py-2 text-right sm:block">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8f5d31]">
                  Signed in as
                </p>
                <p className="text-sm font-semibold text-[#221c16]">{user?.email}</p>
              </div>
            </div>

            {isMobileMenuOpen && (
              <nav className="space-y-2 border-t border-[#d8ccb9] px-4 py-4 md:hidden">
                {navigation.map((item) => {
                  const isActive = item.matcher(location.pathname);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                        isActive ? 'bg-[#221c16] text-[#f5efe4]' : 'bg-white/70 text-[#221c16]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            )}
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
