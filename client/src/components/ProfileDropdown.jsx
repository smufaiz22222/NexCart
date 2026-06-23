import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserRound,
  ShoppingBag,
  Package,
  Heart,
  LogOut,
  LogIn,
  LayoutDashboard,
  Briefcase,
  RotateCcw,
  ChevronDown,
  MessageSquare,
  FileText,
  Building2,
  Sparkles,
  Shield,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';

export default function ProfileDropdown({ onLoginClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const resetCartState = useCartStore((state) => state.resetCartState);

  const hasApprovedB2BAccess =
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    resetCartState();
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-bold text-[#1e293b] hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all shadow-sm"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Login</span>
      </button>
    );
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-full border border-[#e2e8f0] bg-white px-3 py-1.5 hover:border-[#4f46e5] hover:shadow-md hover:shadow-[#4f46e5]/5 transition-all group"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white flex items-center justify-center text-[10px] font-black tracking-wide shadow-sm">
          {initials}
        </div>
        <span className="hidden sm:block text-xs font-bold text-[#1e293b] max-w-[100px] truncate">
          {user?.name?.split(' ')[0]}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#64748b] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[320px] max-h-[85vh] overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl shadow-black/10 z-50 animate-scale-in scrollbar-thin">
          {/* User info header */}
          <div className="px-5 py-5 bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-sm font-black border border-white/30">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-indigo-200 truncate mt-0.5">{user?.email}</p>
              </div>
            </div>
            {hasApprovedB2BAccess && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/15 backdrop-blur-sm text-white border border-white/20">
                <Shield className="w-3 h-3" /> B2B Verified
              </div>
            )}
          </div>

          {/* B2C Section */}
          <div className="px-3 pt-4 pb-2 stagger-children">
            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#4f46e5]">
              Shopping
            </p>
            <Link
              to="/store/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f1f5f9] transition-all group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-[#eef2ff] border border-[#c7d2fe] flex items-center justify-center group-hover/item:border-[#4f46e5] group-hover/item:bg-[#4f46e5] group-hover/item:text-white transition-all">
                <LayoutDashboard className="w-4 h-4 text-[#4f46e5] group-hover/item:text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1e293b]">My Dashboard</p>
                <p className="text-[10px] text-[#64748b]">Overview, rewards & activity</p>
              </div>
            </Link>
            <Link
              to="/store/dashboard/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f1f5f9] transition-all group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#eef2ff] transition-all">
                <Package className="w-4 h-4 text-[#64748b] group-hover/item:text-[#4f46e5]" />
              </div>
              <p className="text-xs font-bold text-[#1e293b]">Order History</p>
            </Link>
            <Link
              to="/store/buy-again"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f1f5f9] transition-all group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#eef2ff] transition-all">
                <RotateCcw className="w-4 h-4 text-[#64748b] group-hover/item:text-[#4f46e5]" />
              </div>
              <p className="text-xs font-bold text-[#1e293b]">Buy Again</p>
            </Link>
            <Link
              to="/store/cart"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f1f5f9] transition-all group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#eef2ff] transition-all">
                <ShoppingBag className="w-4 h-4 text-[#64748b] group-hover/item:text-[#4f46e5]" />
              </div>
              <p className="text-xs font-bold text-[#1e293b]">Shopping Cart</p>
            </Link>
            <Link
              to="/store/wishlist"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f1f5f9] transition-all group/item"
            >
              <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#fef2f2] transition-all">
                <Heart className="w-4 h-4 text-[#64748b] group-hover/item:text-[#ef4444]" />
              </div>
              <p className="text-xs font-bold text-[#1e293b]">Wishlist</p>
            </Link>
          </div>

          {/* B2B Section */}
          {hasApprovedB2BAccess && (
            <div className="px-3 pt-2 pb-2 border-t border-[#e2e8f0] mx-3">
              <p className="px-3 pt-3 pb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#7c3aed]">
                Business
              </p>
              <Link
                to="/store/dashboard/b2b"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#faf5ff] transition-all group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f5f3ff] border border-[#ddd6fe] flex items-center justify-center group-hover/item:border-[#7c3aed] group-hover/item:bg-[#7c3aed] transition-all">
                  <Briefcase className="w-4 h-4 text-[#7c3aed] group-hover/item:text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#1e293b]">B2B Dashboard</p>
                  <p className="text-[10px] text-[#64748b]">Procurement & wholesale hub</p>
                </div>
              </Link>
              <Link
                to="/store/dashboard/rfqs"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#faf5ff] transition-all group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#f5f3ff] transition-all">
                  <MessageSquare className="w-4 h-4 text-[#64748b] group-hover/item:text-[#7c3aed]" />
                </div>
                <p className="text-xs font-bold text-[#1e293b]">Price Desk (RFQs)</p>
              </Link>
              <Link
                to="/store/dashboard/b2b/cart"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#faf5ff] transition-all group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#f5f3ff] transition-all">
                  <ShoppingBag className="w-4 h-4 text-[#64748b] group-hover/item:text-[#7c3aed]" />
                </div>
                <p className="text-xs font-bold text-[#1e293b]">B2B Cart</p>
              </Link>
              <Link
                to="/store/dashboard/b2b/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#faf5ff] transition-all group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#f5f3ff] transition-all">
                  <FileText className="w-4 h-4 text-[#64748b] group-hover/item:text-[#7c3aed]" />
                </div>
                <p className="text-xs font-bold text-[#1e293b]">B2B Orders</p>
              </Link>
              <Link
                to="/store/dashboard/b2b-onboarding"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#faf5ff] transition-all group/item"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#f5f3ff] transition-all">
                  <Building2 className="w-4 h-4 text-[#64748b] group-hover/item:text-[#7c3aed]" />
                </div>
                <p className="text-xs font-bold text-[#1e293b]">Business Account</p>
              </Link>
            </div>
          )}

          {/* Profile & Settings */}
          <div className="px-3 pt-2 pb-2 border-t border-[#e2e8f0] mx-3">
            <Link
              to="/store/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f1f5f9] transition-all group/item mt-1"
            >
              <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center group-hover/item:bg-[#eef2ff] transition-all">
                <UserRound className="w-4 h-4 text-[#64748b] group-hover/item:text-[#4f46e5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1e293b]">Your Profile</p>
                <p className="text-[10px] text-[#64748b]">Account & addresses</p>
              </div>
            </Link>
          </div>

          {/* Logout */}
          <div className="px-4 py-3 border-t border-[#e2e8f0] bg-[#f8fafc] rounded-b-2xl">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-all text-left btn-press"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-600">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
