import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  LogIn,
  ShoppingBag,
  Store,
  LayoutDashboard,
  Package,
  Building2,
  MessageSquare,
  Menu,
  X,
  UserRound,
  Heart,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCartStore from '../store/cartStore';
import useB2BCartStore from '../store/b2bCartStore';
import AuthModal from '../components/AuthModal';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import CategoryMegaMenu from '../components/storefront/CategoryMegaMenu';
import CustomerSidebarLayout from './CustomerSidebarLayout';
import CustomerStorefrontLayout from './CustomerStorefrontLayout';

const STOREFRONT_INFO_LINKS = [
  { label: 'About', to: '/store/about' },
  { label: 'FAQ', to: '/store/faq' },
  { label: 'Contact', to: '/store/contact' },
  { label: 'Privacy', to: '/store/privacy' },
];

export default function CustomerLayout() {
  const { logout, isAuthenticated, user } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isCustomer = user?.role === 'CUSTOMER';
  const hasApprovedB2BAccess =
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const resetCartState = useCartStore((state) => state.resetCartState);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const b2bTotalItems = useB2BCartStore((state) => state.totals.itemCount);
  const navigate = useNavigate();
  const location = useLocation();

  const storefrontPrimaryLinks = [
    { label: 'Shop', to: '/store' },
    { label: 'All Products', to: '/store#products-section' },
    ...(isAuthenticated && isCustomer
      ? [{ label: 'Business', to: '/store/dashboard/b2b-onboarding' }]
      : []),
  ];

  const handleMobileCategoryNavigate = (categoryName) => {
    const params = new URLSearchParams();
    params.set('category', categoryName);
    setIsMobileMenuOpen(false);
    navigate(`/store?${params.toString()}`);
  };

  useEffect(() => {
    if (isAuthenticated && !isCustomer) {
      return;
    }

    if (!hasHydrated) {
      hydrateCart().catch((error) => console.error('Failed to hydrate cart:', error));
    }
  }, [hasHydrated, hydrateCart, isAuthenticated, isCustomer]);

  useEffect(() => {
    if (isAuthenticated && hasApprovedB2BAccess) {
      useB2BCartStore.getState().hydrateCart();
    }
  }, [isAuthenticated, hasApprovedB2BAccess]);

  useEffect(() => {
    const handleOpen = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handleOpen);
    return () => window.removeEventListener('open-auth-modal', handleOpen);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    resetCartState();
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    logout();
    navigate('/store');
  };

  const isStoreRoute = location.pathname === '/store';
  const isB2BDashboardRoute =
    location.pathname.startsWith('/store/dashboard/b2b') ||
    location.pathname.startsWith('/store/dashboard/rfqs');
  const isB2CDashboardRoute =
    location.pathname.startsWith('/store/dashboard') && !isB2BDashboardRoute;
  const showB2BSidebar = hasApprovedB2BAccess && isB2BDashboardRoute;
  const showB2CSidebar = isAuthenticated && isCustomer && isB2CDashboardRoute;

  // Sidebar specific navigation list for B2B Portal
  const b2bSidebarNavigation = [
    { name: 'Shop Catalog', href: '/store', icon: Store },
    { name: 'B2B Dashboard', href: '/store/dashboard/b2b', icon: LayoutDashboard },
    { name: 'Price Quotes (RFQs)', href: '/store/dashboard/rfqs', icon: MessageSquare },
    {
      name: 'B2B Cart',
      href: '/store/dashboard/b2b/cart',
      icon: ShoppingBag,
      badge: b2bTotalItems,
    },
    { name: 'B2B Orders', href: '/store/dashboard/b2b/orders', icon: FileText },
    { name: 'Business Account', href: '/store/dashboard/b2b-onboarding', icon: Building2 },
  ];

  // Sidebar navigation for B2C Dashboard
  const b2cSidebarNavigation = [
    { name: 'Shop Catalog', href: '/store', icon: Store },
    { name: 'My Dashboard', href: '/store/dashboard', icon: LayoutDashboard },
    { name: 'Order History', href: '/store/dashboard/orders', icon: Package },
    { name: 'Buy Again', href: '/store/buy-again', icon: RotateCcw },
    { name: 'Shopping Cart', href: '/store/cart', icon: ShoppingBag, badge: totalItems },
    { name: 'Wishlist', href: '/store/wishlist', icon: Heart },
    { name: 'My Profile', href: '/store/profile', icon: UserRound },
  ];

  // Choose which sidebar nav to show
  const sidebarNavigation = showB2BSidebar ? b2bSidebarNavigation : b2cSidebarNavigation;
  const showSidebar = showB2BSidebar || showB2CSidebar;

  if (showSidebar) {
    const sidebarAccent = showB2BSidebar ? '#f97316' : '#4f46e5';
    const sidebarLabel = showB2BSidebar ? 'B2B' : 'B2C';

    return (
      <CustomerSidebarLayout
        sidebarAccent={sidebarAccent}
        sidebarLabel={sidebarLabel}
        sidebarNavigation={sidebarNavigation}
        navigate={navigate}
        location={location}
        approvedB2B={hasApprovedB2BAccess}
        b2bSidebar={showB2BSidebar}
        user={user}
        handleLogout={handleLogout}
        authModalOpen={isAuthModalOpen}
        setAuthModalOpen={setIsAuthModalOpen}
        mobileMenuOpen={isMobileMenuOpen}
        setMobileMenuOpen={setIsMobileMenuOpen}
        totalItems={totalItems}
        storeRoute={isStoreRoute}
      />
    );
  }

  // Otherwise, render normal e-commerce header/footer layout without left sidebar
  return (
    <CustomerStorefrontLayout
      mobileMenuOpen={isMobileMenuOpen}
      setMobileMenuOpen={setIsMobileMenuOpen}
      navigate={navigate}
      storefrontPrimaryLinks={storefrontPrimaryLinks}
      handleMobileCategoryNavigate={handleMobileCategoryNavigate}
      totalItems={totalItems}
      user={user}
      setAuthModalOpen={setIsAuthModalOpen}
      authModalOpen={isAuthModalOpen}
      storeRoute={isStoreRoute}
    />
  );
}
