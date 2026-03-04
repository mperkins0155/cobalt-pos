import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

// Lazy-load pages
import { lazy, Suspense } from 'react';

const Login = lazy(() => import('@/pages/Login'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const POS = lazy(() => import('@/pages/POS'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Receipt = lazy(() => import('@/pages/Receipt'));
const Tickets = lazy(() => import('@/pages/Tickets'));
const Orders = lazy(() => import('@/pages/Orders'));
const OrderDetail = lazy(() => import('@/pages/OrderDetail'));
const Customers = lazy(() => import('@/pages/Customers'));
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'));
const Catalog = lazy(() => import('@/pages/Catalog'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Reservations = lazy(() => import('@/pages/Reservations'));
const TableFloor = lazy(() => import('@/pages/TableFloor'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Purchasing = lazy(() => import('@/pages/Purchasing'));
const Quotations = lazy(() => import('@/pages/Quotations'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const Reports = lazy(() => import('@/pages/Reports'));
const Closeout = lazy(() => import('@/pages/Closeout'));
const Settings = lazy(() => import('@/pages/Settings'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { isAuthenticated, loading, profile } = useAuth();

  if (loading) return <LoadingFallback />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}

function ManagerRoute() {
  const { hasRole, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!hasRole('manager')) return <Navigate to="/pos" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />

          {/* POS */}
          <Route path="/pos" element={<POS />} />
          <Route path="/pos/checkout" element={<Checkout />} />
          <Route path="/pos/receipt/:orderId" element={<Receipt />} />
          <Route path="/pos/tickets" element={<Tickets />} />

          {/* Orders */}
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />

          {/* Customers */}
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:customerId" element={<CustomerDetail />} />

          {/* Manager+ routes */}
          <Route element={<ManagerRoute />}>
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/reservations" element={<Reservations />} />
            <Route path="/table-floor" element={<TableFloor />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchasing" element={<Purchasing />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/closeout" element={<Closeout />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Default */}
          <Route path="/" element={<Navigate to="/pos" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
