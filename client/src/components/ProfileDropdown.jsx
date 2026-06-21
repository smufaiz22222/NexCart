import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserRound,
  ShoppingBag,
  Package,
  Heart,
  Settings,
  LogOut,
  LogIn,
  LayoutDashboard,
  Briefcase,
  RotateCcw,
  ChevronDown,
  MessageSquare,
  FileText,
  Building2,
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
        className="flex items-center gap-2 rounded-full border border-[#ddd7cc] bg-white/60 px-3.5 py-2 text-xs font-bold text-[#49443d] hover:bg-white hover:border-[#161412] transition-all"
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
        className="flex items-center gap-2 rounded-full border border-[#ddd7cc] bg-white/60 px-2.5 py-1.5 hover:bg-white hover:border-[#161412] transition-all group"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-full bg-[#161412] text-white flex items-center justify-center text-[10px] font-bold">
          {initials}
        </div>
        <span className="hidden sm:block text-xs font-semibold text-[#49443d] max-w-[100px] truncate">
          {user?.name?.split(' ')[0]}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#6C757D] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 max-h-[80vh] overflow-y-auto rounded-2xl border border-[#ddd7cc] bg-white shadow-xl shadow-black/8 z-50">
          {/* User info header */}
          <div className="px-5 py-4 border-b border-[#EFEFEF] bg-[#faf9f7]">
            <p className="text-sm font-bold text-[#161412] truncate">{user?.name}</p>
            <p className="text-[11px] text-[#6C757D] truncate mt-0.5">{user?.email}</p>
            {hasApprovedB2BAccess && (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Briefcase className="w-3 h-3" /> B2B Verified
              </span>
            )}
          </div>

          {/* B2C Section */}
          <div className="px-2 pt-2 pb-1">
            <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#0047AB]">
              B2C Shopping
            </p>
            <Link
              to="/store/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f8f6f1] transition-colors group/item"
            >
              <div className="w-7 h-7 rounded-lg bg-[#EFEFEF] border border-[#ddd7cc] flex items-center justify-center group-hover/item:border-[#0047AB] group-hover/item:bg-blue-50 transition-colors">
                <LayoutDashboard className="w-3.5 h-3.5 text-[#6C757D] group-hover/item:text-[#0047AB]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#161412]">B2C Dashboard</p>
                <p className="text-[10px] text-[#6C757D]">Shopping overview & rewards</p>
              </div>
            </Link>
            <Link
              to="/store/dashboard/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f8f6f1] transition-colors group/item"
            >
              <Package className="w-4 h-4 text-[#6C757D] group-hover/item:text-[#161412]" />
              <p className="text-xs font-semibold text-[#161412]">Order History</p>
            </Link>
            <Link
              to="/store/buy-again"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f8f6f1] transition-colors group/item"
            >
              <RotateCcw className="w-4 h-4 text-[#6C757D] group-hover/item:text-[#161412]" />
              <p className="text-xs font-semibold text-[#161412]">Buy Again</p>
            </Link>
            <Link
              to="/store/cart"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f8f6f1] transition-colors group/item"
            >
              <ShoppingBag className="w-4 h-4 text-[#6C757D] group-hover/item:text-[#161412]" />
              <p className="text-xs font-semibold text-[#161412]">Shopping Cart</p>
            </Link>
            <Link
              to="/store/wishlist"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f8f6f1] transition-colors group/item"
            >
              <Heart className="w-4 h-4 text-[#6C757D] group-hover/item:text-[#161412]" />
              <p className="text-xs font-semibold text-[#161412]">Wishlist</p>
            </Link>
          </div>

          {/* B2B Section */}
          {hasApprovedB2BAccess && (
            <div className="px-2 pt-1 pb-1 border-t border-[#EFEFEF]">
              <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                B2B Business
              </p>
              <Link
                to="/store/dashboard/b2b"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-50/50 transition-colors group/item"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center group-hover/item:border-emerald-400 transition-colors">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#161412]">B2B Dashboard</p>
                  <p className="text-[10px] text-[#6C757D]">Procurement & wholesale hub</p>
                </div>
              </Link>
              <Link
                to="/store/dashboard/rfqs"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-50/50 transition-colors group/item"
              >
                <MessageSquare className="w-4 h-4 text-[#6C757D] group-hover/item:text-emerald-700" />
                <p className="text-xs font-semibold text-[#161412]">Price Desk (RFQs)</p>
              </Link>
              <Link
                to="/store/dashboard/b2b/cart"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-50/50 transition-colors group/item"
              >
                <ShoppingBag className="w-4 h-4 text-[#6C757D] group-hover/item:text-emerald-700" />
                <p className="text-xs font-semibold text-[#161412]">B2B Cart</p>
              </Link>
              <Link
                to="/store/dashboard/b2b/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-50/50 transition-colors group/item"
              >
                <FileText className="w-4 h-4 text-[#6C757D] group-hover/item:text-emerald-700" />
                <p className="text-xs font-semibold text-[#161412]">B2B Orders</p>
              </Link>
              <Link
                to="/store/dashboard/b2b-onboarding"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-50/50 transition-colors group/item"
              >
                <Building2 className="w-4 h-4 text-[#6C757D] group-hover/item:text-emerald-700" />
                <p className="text-xs font-semibold text-[#161412]">Business Account</p>
              </Link>
            </div>
          )}

          {/* Account Section */}
          <div className="px-2 py-1 border-t border-[#EFEFEF]">
            <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#6C757D]">
              Account
            </p>
            <Link
              to="/store/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f8f6f1] transition-colors group/item"
            >
              <UserRound className="w-4 h-4 text-[#6C757D] group-hover/item:text-[#161412]" />
              <div>
                <p className="text-xs font-semibold text-[#161412]">Your Profile</p>
                <p className="text-[10px] text-[#6C757D]">Manage account & addresses</p>
              </div>
            </Link>
            <Link
              to="/store/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f8f6f1] transition-colors group/item"
            >
              <Settings className="w-4 h-4 text-[#6C757D] group-hover/item:text-[#161412]" />
              <p className="text-xs font-semibold text-[#161412]">Settings</p>
            </Link>
          </div>

          {/* Logout */}
          <div className="px-2 py-2 border-t border-[#EFEFEF] sticky bottom-0 bg-white">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 transition-colors text-left group/logout"
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
