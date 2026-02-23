import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import WholesalerLayout from './layouts/WholesalerLayout';
import Inventory from './pages/Inventory';
import Dashboard from './pages/Dashboard';
import CustomerLayout from './layouts/CustomerLayout';
import Store from './pages/Store';
import Orders from './pages/Orders';
import Ledger from './pages/Ledger';
import AiKhatta from './pages/AiKhatta';
import Storefront from './pages/Storefront';
import Cart from './pages/Cart';
// ==========================================
// 1. ROLE-BASED ROUTE GUARD
// ==========================================
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

// ==========================================
// 2. TEMPORARY PLACEHOLDER PAGES
// ==========================================
const Unauthorized = () => <div className="p-10 text-2xl font-bold text-red-600">403 - Unauthorized Access</div>;

const CustomerStore = () => <div className="p-10 text-2xl font-bold">🛒 Customer Storefront</div>;
// const WholesalerDashboard = () => <div className="p-10 text-2xl font-bold">🏢 Wholesaler ERP Dashboard</div>;
const SuperAdminPanel = () => <div className="p-10 text-2xl font-bold">👑 Super Admin Global View</div>;

// ==========================================
// 3. MAIN APP ROUTER
// ==========================================
function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Dynamic Home Route based on Role */}
        <Route
          path="/"
          element={
            !isAuthenticated ? <Navigate to="/login" /> :
              user?.role === 'SUPER_ADMIN' ? <Navigate to="/admin" /> :
                user?.role === 'WHOLESALER' ? <Navigate to="/wholesaler" /> :
                  <Navigate to="/store" />
          }
        />

        {/* Protected Customer Routes */}
        <Route
          path="/store/*"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Storefront />} />
        </Route>
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />

        {/* Protected Wholesaler Routes */}
        <Route
          path="/wholesaler/*"
          element={
            <ProtectedRoute allowedRoles={['WHOLESALER']}>
              <WholesalerLayout />
            </ProtectedRoute>
          }
        >
          {/* These render INSIDE the <Outlet /> of the WholesalerLayout */}
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<Orders />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="khatta" element={<AiKhatta />} />
        </Route>

        {/* Protected Super Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <SuperAdminPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;