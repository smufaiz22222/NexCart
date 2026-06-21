import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ShoppingBag,
  MessageSquare,
  AlertTriangle,
  Archive,
  Shield,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import useNotificationStore from '../store/notificationStore';
import useAuthStore from '../store/authStore';
import { cn } from '../utils/cn';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Adapt to dark theme for wholesalers, light linen/cream for customer & admin portals
  const isDark = user?.role === 'WHOLESALER';

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotificationStore();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch once on open just to ensure up-to-date state
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = async (n) => {
    await markAsRead(n.id);
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ORDER':
        return <ShoppingBag className="h-5 w-5 text-indigo-500" />;
      case 'RFQ':
        return <MessageSquare className="h-5 w-5 text-amber-500" />;
      case 'DISPUTE':
        return <AlertTriangle className="h-5 w-5 text-rose-500" />;
      case 'STOCK_ALERT':
        return <Archive className="h-5 w-5 text-amber-600" />;
      case 'ONBOARDING':
        return <Shield className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative z-50 flex" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative rounded-xl border p-2.5 transition-all duration-300 focus:outline-none cursor-pointer',
          isDark
            ? 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'border-[#ddd7cc] bg-white/50 text-zinc-600 hover:text-[#161412] hover:bg-white',
          isOpen &&
            (isDark
              ? 'text-white border-amber-500/50 bg-zinc-800'
              : 'text-[#161412] border-[#8f5d31]/50 bg-white')
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 transition-transform duration-300 hover:rotate-12" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-12 w-80 sm:w-96 rounded-2xl border p-4 animate-in fade-in slide-in-from-top-3 duration-200 z-50',
            isDark
              ? 'border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)]'
              : 'border-[#ddd7cc] bg-[#f8f6f1]/98 backdrop-blur-xl shadow-[0_10px_40px_rgba(22,20,18,0.12)] text-[#161412]'
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-between border-b pb-3 mb-3',
              isDark ? 'border-zinc-800' : 'border-[#ddd7cc]'
            )}
          >
            <div>
              <h3 className={cn('font-bold text-base', isDark ? 'text-white' : 'text-[#161412]')}>
                Notifications
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={cn(
                  'flex items-center gap-1 text-xs font-bold transition cursor-pointer',
                  isDark
                    ? 'text-amber-500 hover:text-amber-400'
                    : 'text-[#8f5d31] hover:text-[#a06a3a]'
                )}
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                <Bell className="h-10 w-10 mx-auto text-zinc-450 stroke-[1.5] mb-2" />
                <p className="text-sm font-semibold">No notifications yet</p>
                <p className="text-xs text-zinc-650 mt-1">
                  We will notify you here when things happen
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'group relative flex items-start gap-3 p-3 rounded-xl transition duration-200 cursor-pointer border border-transparent',
                    isDark
                      ? !n.isRead
                        ? 'bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-900/60'
                        : 'hover:bg-zinc-900/60'
                      : !n.isRead
                        ? 'bg-[#f4ebd9]/30 border-[#eadaa2]/50 hover:bg-[#f4ebd9]/55'
                        : 'hover:bg-[#f2efe6]'
                  )}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div
                    className={cn(
                      'mt-0.5 rounded-lg p-2 border',
                      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#ddd7cc]'
                    )}
                  >
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1.5">
                      <p
                        className={cn(
                          'text-xs truncate font-bold',
                          isDark
                            ? !n.isRead
                              ? 'text-white'
                              : 'text-zinc-300'
                            : !n.isRead
                              ? 'text-[#161412]'
                              : 'text-zinc-700'
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] text-zinc-500 font-semibold whitespace-nowrap shrink-0">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'text-xs mt-1 leading-relaxed break-words line-clamp-2',
                        isDark
                          ? !n.isRead
                            ? 'text-zinc-200 font-medium'
                            : 'text-zinc-400'
                          : !n.isRead
                            ? 'text-zinc-800 font-medium'
                            : 'text-zinc-500'
                      )}
                    >
                      {n.message}
                    </p>
                  </div>

                  {/* Dot indicator */}
                  {!n.isRead && (
                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-500" />
                  )}

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className={cn(
                      'absolute right-2 bottom-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer',
                      isDark
                        ? 'text-zinc-650 hover:text-red-400 hover:bg-zinc-900'
                        : 'text-zinc-450 hover:text-red-500 hover:bg-zinc-100'
                    )}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
