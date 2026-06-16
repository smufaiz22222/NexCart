import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
    },
  },
});

const Login = lazy(() => import('./pages/login'));
const Register = lazy(() => import('./pages/Register'));
const Products = lazy(() => import('./pages/Products'));
const WholesalerLayout = lazy(() => import('./layouts/WholesalerLayout'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'));
const Store = lazy(() => import('./pages/Store'));
const Orders = lazy(() => import('./pages/Orders'));
const Ledger = lazy(() => import('./pages/Ledger'));
const AiKhatta = lazy(() => import('./pages/AiKhatta'));
const BusinessAdvisor = lazy(() => import('./pages/BusinessAdvisor'));
const SellerProductDetails = lazy(() => import('./pages/SellerProductDetails'));
const Storefront = lazy(() => import('./pages/Storefront'));
const Cart = lazy(() => import('./pages/Cart'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

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

function App() {
  const { isAuthenticated, user } = useAuthStore();

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
                    <Navigate to="/login" />
                  ) : user?.role === 'SUPER_ADMIN' ? (
                    <Navigate to="/admin" />
                  ) : user?.role === 'WHOLESALER' ? (
                    <Navigate to="/wholesaler" />
                  ) : (
                    <Navigate to="/store" />
                  )
                }
              />

              <Route
                path="/store/*"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Storefront />} />
                <Route path="cart" element={<Cart />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route path="orders" element={<Orders />} />
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
                <Route path="analytics" element={<Analytics />} />
                <Route path="products" element={<Products />} />
                <Route path="products/:id" element={<SellerProductDetails />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="orders" element={<Orders />} />
                <Route path="ledger" element={<Ledger />} />
                <Route path="advisor" element={<BusinessAdvisor />} />
                <Route path="khatta" element={<AiKhatta />} />
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
