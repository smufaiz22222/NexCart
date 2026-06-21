import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useNotificationStore from './store/notificationStore';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './api/queryClient';
import {
  OperationalAccessNotice,
  PremiumFeatureNotice,
} from './components/wholesaler/WholesalerAccessPanel';
import apiClient from './api/axios';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Products = lazy(() => import('./pages/Products'));
const WholesalerLayout = lazy(() => import('./layouts/WholesalerLayout'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'));
const RetailDashboard = lazy(() => import('./pages/RetailDashboard'));
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard'));
const Orders = lazy(() => import('./pages/Orders'));
const Ledger = lazy(() => import('./pages/Ledger'));
const AiKhatta = lazy(() => import('./pages/AiKhatta'));
const BusinessAdvisor = lazy(() => import('./pages/BusinessAdvisor'));
const SellerProductDetails = lazy(() => import('./pages/SellerProductDetails'));
const Storefront = lazy(() => import('./pages/Storefront'));
const Cart = lazy(() => import('./pages/Cart'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const SuperAdminSubscriptions = lazy(() => import('./pages/SuperAdminSubscriptions'));
const WholesalerBilling = lazy(() => import('./pages/WholesalerBilling'));
const EcommerceAccounting = lazy(() => import('./pages/EcommerceAccounting'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Faq = lazy(() => import('./pages/Faq'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const NotFound = lazy(() => import('./pages/NotFound'));
const B2BOnboarding = lazy(() => import('./pages/B2BOnboarding'));
const RfqManager = lazy(() => import('./pages/RfqManager'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const BuyAgain = lazy(() => import('./pages/BuyAgain'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const B2BCart = lazy(() => import('./pages/B2BCart'));
const B2BOrders = lazy(() => import('./pages/B2BOrders'));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const Unauthorized = () => (
  <div className="p-10 text-2xl font-bold text-red-600">403 - Unauthorized Access</div>
);

const OperationalRoute = ({ children }) => {
  const { user } = useAuthStore();
  const status = user?.wholesalerProfile?.onboardingStatus;

  if (user?.role === 'WHOLESALER' && !['APPROVED', 'ACTIVE', 'PAST_DUE'].includes(status)) {
    return (
      <OperationalAccessNotice
        status={status}
        rejectionReason={user?.wholesalerProfile?.rejectionReason}
      />
    );
  }

  return children;
};

const PremiumRoute = ({ feature, title, children }) => {
  const { user } = useAuthStore();

  if (user?.role === 'WHOLESALER' && !user?.featureAccess?.[feature]) {
    return <PremiumFeatureNotice featureName={title} />;
  }

  return children;
};

const ApprovedB2BCustomerRoute = ({ children }) => {
  const { user } = useAuthStore();
  const hasApprovedB2BAccess =
    user?.role === 'CUSTOMER' &&
    user?.businessProfile?.verification === 'APPROVED' &&
    user?.businessProfile?.status === 'ACTIVE';

  if (!hasApprovedB2BAccess) {
    return <Navigate to="/store/dashboard/b2b-onboarding" replace />;
  }

  return children;
};

function App() {
  const { isAuthenticated, user, setUser } = useAuthStore();
  const startPolling = useNotificationStore((state) => state.startPolling);
  const stopPolling = useNotificationStore((state) => state.stopPolling);

  useEffect(() => {
    if (isAuthenticated) {
      startPolling();
      apiClient
        .get('/auth/profile')
        .then((response) => {
          if (response.data?.user) {
            setUser(response.data.user);
          }
        })
        .catch((error) => {
          console.error('Failed to sync user profile on mount:', error);
        });
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [isAuthenticated, startPolling, stopPolling, setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Toaster richColors closeButton position="top-right" />
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              <Route
                path="/"
                element={
                  !isAuthenticated ? (
                    <Navigate to="/store" />
                  ) : user?.role === 'SUPER_ADMIN' ? (
                    <Navigate to="/admin" />
                  ) : user?.role === 'WHOLESALER' ? (
                    <Navigate to="/wholesaler" />
                  ) : (
                    <Navigate to="/store/dashboard" />
                  )
                }
              />

              <Route path="/store/*" element={<CustomerLayout />}>
                <Route index element={<Storefront />} />
                <Route path="cart" element={<Cart />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route
                  path="profile"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                      <UserProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="buy-again"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                      <BuyAgain />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="wishlist"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                      <Wishlist />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                      <Outlet />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<RetailDashboard />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="b2b-onboarding" element={<B2BOnboarding />} />
                  <Route
                    path="rfqs"
                    element={
                      <ApprovedB2BCustomerRoute>
                        <RfqManager />
                      </ApprovedB2BCustomerRoute>
                    }
                  />
                  <Route
                    path="b2b"
                    element={
                      <ApprovedB2BCustomerRoute>
                        <Outlet />
                      </ApprovedB2BCustomerRoute>
                    }
                  >
                    <Route index element={<BusinessDashboard />} />
                    <Route path="cart" element={<B2BCart />} />
                    <Route path="orders" element={<B2BOrders />} />
                  </Route>
                </Route>
                <Route path="about" element={<AboutUs />} />
                <Route path="faq" element={<Faq />} />
                <Route path="contact" element={<ContactUs />} />
                <Route path="privacy" element={<PrivacyPolicy />} />
              </Route>

              <Route
                path="/wholesaler/*"
                element={
                  <ProtectedRoute allowedRoles={['WHOLESALER']}>
                    <WholesalerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route
                  path="analytics"
                  element={
                    <PremiumRoute feature="analytics" title="Advanced Analytics">
                      <Analytics />
                    </PremiumRoute>
                  }
                />
                <Route
                  path="rfqs"
                  element={
                    <OperationalRoute>
                      <RfqManager />
                    </OperationalRoute>
                  }
                />
                <Route
                  path="products"
                  element={
                    <OperationalRoute>
                      <Products />
                    </OperationalRoute>
                  }
                />
                <Route
                  path="products/:id"
                  element={
                    <OperationalRoute>
                      <SellerProductDetails />
                    </OperationalRoute>
                  }
                />
                <Route
                  path="inventory"
                  element={
                    <OperationalRoute>
                      <Inventory />
                    </OperationalRoute>
                  }
                />
                <Route
                  path="orders"
                  element={
                    <OperationalRoute>
                      <Orders />
                    </OperationalRoute>
                  }
                />
                <Route
                  path="ledger"
                  element={
                    <OperationalRoute>
                      <Ledger />
                    </OperationalRoute>
                  }
                />
                <Route
                  path="ecommerce-accounting"
                  element={
                    <OperationalRoute>
                      <EcommerceAccounting />
                    </OperationalRoute>
                  }
                />
                <Route path="billing" element={<WholesalerBilling />} />
                <Route
                  path="advisor"
                  element={
                    <PremiumRoute feature="advisor" title="Business Advisor">
                      <BusinessAdvisor />
                    </PremiumRoute>
                  }
                />
                <Route
                  path="khatta"
                  element={
                    <PremiumRoute feature="khatta" title="AI Khatta Scan">
                      <AiKhatta />
                    </PremiumRoute>
                  }
                />
              </Route>

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<SuperAdminDashboard />} />
                <Route path="subscriptions" element={<SuperAdminSubscriptions />} />
              </Route>

              {/* Global Wildcard 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
