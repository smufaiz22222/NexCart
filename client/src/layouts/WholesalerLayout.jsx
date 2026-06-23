import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Archive,
  BarChart3,
  CreditCard,
  ShoppingCart,
  BookOpen,
  LogOut,
  Menu,
  X,
  Camera,
  BrainCircuit,
  MessageSquare,
  Landmark,
  Sun,
  Moon,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import NotificationBell from '../components/NotificationBell';

export default function WholesalerLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Theme state with localStorage persistence, defaulting to light mode
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('wholesaler-theme') || 'light';
  });

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('wholesaler-theme', newTheme);
  };

  // Sync theme classes on document and body to ensure portals inherit styles
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.add('wholesaler-theme');
    body.classList.add('wholesaler-theme');

    if (theme === 'dark') {
      root.classList.add('theme-dark');
      root.classList.remove('theme-light');
      body.classList.add('theme-dark');
      body.classList.remove('theme-light');
    } else {
      root.classList.add('theme-light');
      root.classList.remove('theme-dark');
      body.classList.add('theme-light');
      body.classList.remove('theme-dark');
    }

    return () => {
      root.classList.remove('wholesaler-theme', 'theme-light', 'theme-dark');
      body.classList.remove('wholesaler-theme', 'theme-light', 'theme-dark');
    };
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/wholesaler', icon: LayoutDashboard },
    { name: 'Analytics', href: '/wholesaler/analytics', icon: BarChart3 },
    { name: 'Billing', href: '/wholesaler/billing', icon: CreditCard },
    { name: 'Products', href: '/wholesaler/products', icon: Package },
    { name: 'Inventory Logs', href: '/wholesaler/inventory', icon: Archive },
    { name: 'Orders', href: '/wholesaler/orders', icon: ShoppingCart },
    { name: 'Price Quotes (RFQs)', href: '/wholesaler/rfqs', icon: MessageSquare },
    { name: 'Payment & Billing', href: '/wholesaler/ledger', icon: CreditCard },
    { name: 'Ecommerce Accounting', href: '/wholesaler/ecommerce-accounting', icon: BookOpen },
    { name: 'Withdrawals & Payouts', href: '/wholesaler/payouts', icon: Landmark },
    { name: 'Business Advisor', href: '/wholesaler/advisor', icon: BrainCircuit },
    { name: 'AI Khatta Scan', href: '/wholesaler/khatta', icon: Camera },
  ];

  return (
    <div
      className={`wholesaler-theme ${theme === 'light' ? 'theme-light bg-[#f0fdf9]' : 'theme-dark bg-[#0B0F19]'} min-h-screen flex font-sans selection:bg-[#059669]/30 selection:text-[#0F172A] transition-colors duration-300`}
    >
      {/* Sidebar Layout */}
      <aside
        className={`hidden md:flex w-64 flex-col z-20 transition-colors duration-300 ${
          theme === 'light'
            ? 'bg-white border-r border-teal-100'
            : 'bg-[#0F172A] border-r border-[#1E293B]'
        }`}
      >
        <div
          className={`h-16 flex items-center px-6 font-bold text-lg border-b transition-colors duration-300 tracking-wide ${
            theme === 'light' ? 'border-teal-100 text-teal-900' : 'border-[#1E293B] text-white'
          }`}
        >
          <span className="text-[#059669] mr-2">✦</span>{' '}
          <h1
            className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
              theme === 'light' ? 'text-teal-900' : 'text-white'
            }`}
          >
            Nex<span className="text-[#059669]">Cart</span>
          </h1>
        </div>

        <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-6 py-3 text-sm font-semibold tracking-wide transition-all duration-300 relative ${
                  isActive
                    ? theme === 'light'
                      ? 'text-teal-900 bg-teal-50'
                      : 'text-white bg-[#1E293B]'
                    : theme === 'light'
                      ? 'text-slate-500 hover:bg-teal-50/60 hover:text-teal-800'
                      : 'text-slate-400 hover:bg-[#1E293B]/50 hover:text-white'
                }`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#059669]" />}
                <Icon
                  className={`h-5 w-5 mr-3 transition-transform duration-300 ${
                    isActive
                      ? 'scale-110 text-[#059669]'
                      : theme === 'light'
                        ? 'text-slate-400 group-hover:text-teal-700'
                        : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div
        className={`flex-1 flex flex-col min-w-0 transition-colors duration-300 ${theme === 'light' ? 'bg-[#f0fdf9]' : 'bg-[#0B0F19]'}`}
      >
        {/* Header Bar */}
        <header
          className={`h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-sm transition-colors duration-300 border-b ${
            theme === 'light' ? 'bg-white/80 backdrop-blur-md border-teal-100' : 'bg-[#111827] border-[#1F2937]'
          }`}
        >
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`focus:outline-none transition-all p-2 -ml-2 rounded-md ${
                theme === 'light'
                  ? 'text-slate-500 hover:text-teal-800 hover:bg-teal-50'
                  : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
              }`}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          <div
            className={`hidden md:block text-lg font-bold tracking-tight transition-colors duration-300 ${
              theme === 'light' ? 'text-teal-900' : 'text-white'
            }`}
          >
            {user?.wholesalerProfile?.businessName || 'Wholesaler Portal'}
          </div>

          <div className="flex items-center space-x-5">
            {/* Segmented Control Theme Toggle */}
            <div
              className={`flex items-center p-0.5 rounded-lg border transition-all duration-300 ${
                theme === 'light'
                  ? 'bg-teal-50 border-teal-200'
                  : 'bg-[#0B0F19] border-[#1F2937]'
              }`}
            >
              <button
                onClick={() => toggleTheme('light')}
                className={`flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide transition-all duration-300 ${
                  theme === 'light'
                    ? 'bg-white text-teal-800 shadow-sm border border-teal-200'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun
                  className={`h-3.5 w-3.5 mr-1 transition-transform duration-300 ${theme === 'light' ? 'rotate-0 scale-100 text-[#059669]' : 'rotate-45 scale-90'}`}
                />
                Light
              </button>
              <button
                onClick={() => toggleTheme('dark')}
                className={`flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-[#1E293B] text-white shadow-sm border border-[#1F2937]'
                    : 'text-slate-500 hover:text-teal-800'
                }`}
              >
                <Moon
                  className={`h-3.5 w-3.5 mr-1 transition-transform duration-300 ${theme === 'dark' ? 'rotate-0 scale-100 text-[#059669]' : '-rotate-45 scale-90 text-slate-400'}`}
                />
                Dark
              </button>
            </div>

            <span
              className={`text-xs font-medium tracking-wide hidden sm:block px-3 py-1.5 rounded-md border transition-colors duration-300 ${
                theme === 'light'
                  ? 'text-slate-600 bg-teal-50 border-teal-200'
                  : 'text-slate-300 bg-[#0B0F19] border-[#1F2937]'
              }`}
            >
              {user?.email}
            </span>
            <NotificationBell />
            <button
              onClick={handleLogout}
              className={`flex items-center text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-md transition-all duration-300 border ${
                theme === 'light'
                  ? 'text-white bg-red-500 hover:bg-red-600 border-red-600'
                  : 'text-red-300 bg-red-500/15 hover:bg-red-500/25 border-red-400/30'
              }`}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </button>
          </div>
        </header>

        {isMobileMenuOpen && (
          <nav
            className={`md:hidden shadow-2xl absolute w-full z-20 border-b transition-colors duration-300 ${
              theme === 'light'
                ? 'bg-white text-teal-900 border-teal-100'
                : 'bg-[#0F172A] text-white border-[#1E293B]'
            }`}
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-semibold tracking-wide rounded-md transition-all duration-200 ${
                      isActive
                        ? theme === 'light'
                          ? 'bg-teal-50 text-teal-900 border border-teal-200'
                          : 'bg-[#1E293B] text-white border border-[#1E293B]'
                        : theme === 'light'
                          ? 'text-slate-500 hover:bg-teal-50/60 hover:text-teal-800'
                          : 'text-slate-400 hover:bg-[#1E293B]/50 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3 text-[#059669]" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        <main
          className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-auto transition-colors duration-300 ${
            theme === 'light' ? 'bg-[#f0fdf9]' : 'bg-[#0B0F19]'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
