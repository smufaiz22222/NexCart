import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

import Login from './pages/login';
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
import ProductDetails from './pages/ProductDetails';

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

const Unauthorized = () => <div className="p-10 text-2xl font-bold text-red-600">403 - Unauthorized Access</div>;

const CustomerStore = () => <div className="p-10 text-2xl font-bold">Customer Storefront</div>;
const SuperAdminPanel = () => <div className="p-10 text-2xl font-bold">Super Admin Global View</div>;

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          path="/"
          element={
            !isAuthenticated ? <Navigate to="/login" /> :
              user?.role === 'SUPER_ADMIN' ? <Navigate to="/admin" /> :
                user?.role === 'WHOLESALER' ? <Navigate to="/wholesaler" /> :
                  <Navigate to="/store" />
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
          {/* These render INSIDE the <Outlet /> of the WholesalerLayout */}
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<Orders />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="khatta" element={<AiKhatta />} />
        </Route>

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