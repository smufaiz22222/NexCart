import { Outlet, useNavigate } from 'react-router-dom';
import { Store, ShoppingCart, LogOut } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function CustomerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* TOP NAVBAR */}
      <header className="h-16 bg-blue-600 text-white shadow-md flex items-center justify-between px-6">
        <div className="flex items-center space-x-2 text-xl font-bold">
          <Store className="h-6 w-6" />
          <span>Retail Storefront</span>
        </div>

        <div className="flex items-center space-x-6">
          <span className="text-sm text-blue-100 hidden sm:block">
            Logged in as: {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center text-sm font-medium text-white hover:text-blue-200 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}