import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Archive, ShoppingCart, BookOpen, LogOut, Menu, X, Camera } from 'lucide-react';
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

  // Define our navigation links
  const navigation = [
    { name: 'Dashboard', href: '/wholesaler', icon: LayoutDashboard },
    { name: 'Products', href: '/wholesaler/products', icon: Package },
    { name: 'Inventory Logs', href: '/wholesaler/inventory', icon: Archive },
    { name: 'Orders', href: '/wholesaler/orders', icon: ShoppingCart },
    { name: 'Financial Ledger', href: '/wholesaler/ledger', icon: BookOpen },
    { name: 'AI Khatta Scan', href: '/wholesaler/khatta', icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* --- SIDEBAR (Desktop) --- */}
      <aside className="hidden md:flex w-64 flex-col bg-gray-900 text-white">
        <div className="h-16 flex items-center px-6 font-bold text-xl border-b border-gray-800 tracking-wider">
          ERP SYSTEM
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* --- TOP NAVBAR --- */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-500 hover:text-gray-900 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          <div className="hidden md:block text-xl font-semibold text-gray-800">
            {/* If businessName exists (it should for wholesalers), display it */}
            {user?.wholesalerProfile?.businessName || 'Wholesaler Portal'}
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </button>
          </div>
        </header>

        {/* --- MOBILE SIDEBAR (Dropdown) --- */}
        {isMobileMenuOpen && (
          <nav className="md:hidden bg-gray-900 text-white border-t border-gray-800">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 text-base font-medium ${isActive ? 'bg-blue-600' : 'hover:bg-gray-800'
                    }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        )}

        {/* --- DYNAMIC PAGE CONTENT --- */}
        <main className="flex-1 p-6 overflow-auto">
          {/* <Outlet /> is where React Router injects the actual page (Dashboard, Products, etc.) */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}