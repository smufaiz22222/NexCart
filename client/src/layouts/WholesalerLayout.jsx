import { useState } from 'react';
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
} from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function WholesalerLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

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
    { name: 'Financial Ledger', href: '/wholesaler/ledger', icon: BookOpen },
    { name: 'Business Advisor', href: '/wholesaler/advisor', icon: BrainCircuit },
    { name: 'AI Khatta Scan', href: '/wholesaler/khatta', icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <aside className="hidden md:flex w-64 flex-col bg-[#0a0a0a] border-r border-zinc-800 z-20">
        <div className="h-16 flex items-center px-6 font-black text-lg border-b border-zinc-800 tracking-widest text-white">
          <span className="text-amber-500 mr-2 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">✦</span>{' '}
          <h1 className="text-xl font-bold text-white tracking-tight">
            Nex<span className="text-amber-500">Cart</span>
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
                className={`flex items-center px-6 py-3 text-sm font-bold tracking-wide transition-all duration-300 relative ${
                  isActive
                    ? 'text-amber-500 bg-[#1c1c1c]'
                    : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                )}
                <Icon
                  className={`h-5 w-5 mr-3 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_5px_rgba(245,158,11,0.3)]' : ''}`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        <header className="h-16 bg-[#1c1c1c]/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-zinc-400 hover:text-amber-500 focus:outline-none transition-colors p-2 -ml-2 rounded-md hover:bg-zinc-800"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          <div className="hidden md:block text-lg font-bold text-white tracking-wide">
            {user?.wholesalerProfile?.businessName || 'Wholesaler Portal'}
          </div>

          <div className="flex items-center space-x-5">
            <span className="text-xs font-bold text-zinc-500 tracking-wider hidden sm:block bg-[#0a0a0a] px-3 py-1.5 rounded-md border border-zinc-800">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 px-3.5 py-2 rounded-md transition-all duration-300"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </button>
          </div>
        </header>

        {isMobileMenuOpen && (
          <nav className="md:hidden bg-[#1c1c1c] text-white border-b border-zinc-800 shadow-2xl absolute w-full z-20">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-bold tracking-wide rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-[#0a0a0a] text-amber-500 border border-zinc-800 shadow-inner'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
