import { Link, Outlet } from 'react-router-dom';
import {
  LogOut,
  LogIn,
  ShoppingBag,
  Store,
  LayoutDashboard,
  Building2,
  Menu,
  X,
} from 'lucide-react';
import AuthModal from '../components/AuthModal';
import NotificationBell from '../components/NotificationBell';

export default function CustomerSidebarLayout({
  sidebarAccent,
  sidebarLabel,
  sidebarNavigation,
  navigate,
  location,
  approvedB2B,
  b2bSidebar,
  user,
  handleLogout,
  authModalOpen,
  setAuthModalOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
  totalItems,
  storeRoute,
}) {
  const isAuthenticated = !!user;

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] flex font-sans selection:bg-[#4f46e5] selection:text-white">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-[#1e1b4b] text-[#e0e7ff] border-r border-[#312e81] z-20 shrink-0">
        <div className="h-20 flex items-center justify-between px-8 border-b border-[#312e81]">
          <button
            type="button"
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
                    ? 'text-white bg-[#312e81]'
                    : 'text-[#a5b4fc] hover:bg-[#312e81]/50 hover:text-white'
                }`}
              >
                <div className="flex items-center">
                  <Icon
                    className={`h-5 w-5 mr-3 transition-transform duration-300 ${isActive ? 'scale-110 text-[#a5b4fc]' : 'text-[#6366f1]'}`}
                  />
                  {item.name}
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f97316] px-1 text-[10px] font-black text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Static Links & User Info */}
        <div className="p-4 border-t border-[#312e81] bg-[#1a1745]">
          {/* Switch between B2B/B2C */}
          {approvedB2B && (
            <div className="mb-4">
              <Link
                to={b2bSidebar ? '/store/dashboard' : '/store/dashboard/b2b'}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#312e81] hover:border-[#6366f1] px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#a5b4fc] hover:text-white transition-all duration-300"
              >
                {b2bSidebar ? (
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
          <div className="grid grid-cols-2 gap-2 mb-4 text-[10px] font-bold uppercase tracking-wider text-[#6366f1] px-2">
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

          <div className="border-t border-[#312e81]/60 pt-4">
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="px-2">
                  <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-[#a5b4fc] truncate mt-0.5">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-red-400 transition-all duration-300"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all duration-300"
              >
                <LogIn className="h-4 w-4" />
                Login / Register
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-[#1e1b4b] text-white flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-indigo-300 hover:text-white focus:outline-none transition-colors p-2"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <button
            type="button"
            onClick={() => navigate('/store')}
            className="text-xl font-black tracking-tight text-white"
          >
            Nex<span className="text-[#a5b4fc]">Cart</span>
          </button>

          <div className="flex items-center gap-2">
            {isAuthenticated && <NotificationBell />}
            <button type="button" onClick={() => navigate('/store/cart')} className="relative p-2">
              <ShoppingBag className="h-5 w-5 text-white" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f97316] px-1 text-[9px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto md:hidden bg-[#1e1b4b] text-white border-b border-[#312e81] shadow-2xl z-20">
            <div className="px-4 pt-2 pb-6 space-y-1">
              {sidebarNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 text-sm font-bold tracking-wide rounded-xl transition-all ${
                      isActive ? 'bg-[#312e81] text-white' : 'text-[#a5b4fc] hover:bg-[#312e81]/50'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="h-5 w-5 mr-3 text-[#6366f1]" />
                      {item.name}
                    </div>
                    {item.badge && item.badge > 0 ? (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f97316] px-1 text-[9px] font-bold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
              <div className="pt-4 border-t border-[#312e81] mt-4 grid grid-cols-2 gap-3 text-[10px] font-bold uppercase tracking-wider text-[#6366f1] px-2">
                <Link to="/store/about" onClick={() => setMobileMenuOpen(false)}>
                  About
                </Link>
                <Link to="/store/faq" onClick={() => setMobileMenuOpen(false)}>
                  FAQ
                </Link>
                <Link to="/store/contact" onClick={() => setMobileMenuOpen(false)}>
                  Contact
                </Link>
                <Link to="/store/privacy" onClick={() => setMobileMenuOpen(false)}>
                  Privacy
                </Link>
              </div>
              <div className="pt-4 mt-2">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider border border-red-500/20"
                  >
                    Logout
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-3 bg-[#4f46e5] text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Login / Register
                  </button>
                )}
              </div>
            </div>
          </nav>
        )}

        <header className="hidden md:flex h-20 items-center justify-between px-8 border-b border-[#e2e8f0] bg-white/80 backdrop-blur sticky top-0 z-30">
          <h2 className="text-xl font-bold text-[#1e293b]">
            {b2bSidebar ? 'B2B Portal' : 'Customer Account'}
          </h2>
          <div className="flex items-center gap-4">{isAuthenticated && <NotificationBell />}</div>
        </header>

        <main
          className={`${storeRoute ? '' : 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8'} flex-1 overflow-y-auto`}
        >
          <Outlet />
        </main>
      </div>

      <AuthModal
        key={authModalOpen ? 'open' : 'closed'}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
