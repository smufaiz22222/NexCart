import { Outlet, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function CustomerLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const _handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <header className="h-14 bg-[#1c1c1c]/95 backdrop-blur-md border-b border-zinc-800 shadow-[0_1px_5px_rgba(0,0,0,0.5)] flex items-center justify-between px-6 z-50">
        <div className="flex items-center">
          <div className="bg-amber-500/10 p-1.5 rounded-md border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)]">
            <Store className="h-4 w-4 text-amber-500" />
          </div>
        </div>
        <div className="flex items-center">
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase hidden sm:block border border-zinc-800 bg-[#0a0a0a] px-3 py-1 rounded-full">
            {user?.email ? `Session: ${user.email}` : 'Guest Session'}
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
