import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from '@/components/nav';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy-load pages
import { lazy, Suspense } from 'react';

const Login = lazy(() => import('@/pages/Login'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const POS = lazy(() => import('@/pages/POS'));
const CreateOrder = lazy(() => import('@/pages/CreateOrder'));
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
const History = lazy(() => import('@/pages/History'));
const Staff = lazy(() => import('@/pages/Staff'));
const Settings = lazy(() => import('@/pages/Settings'));

const queryClient = new QueryClient();

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
  if (!hasRole('manager')) return <Navigate to={defaultRouteForRole('cashier')} replace />;
  return <Outlet />;
}

/** Default landing page per role */
function defaultRouteForRole(role: string): string {
  switch (role) {
    case 'owner':
    case 'manager':
      return '/dashboard';
    case 'cashier':
      return '/pos';
    default:
      return '/pos';
  }
}

function RoleRedirect() {
  const { profile } = useAuth();
  return <Navigate to={defaultRouteForRole(profile?.role || 'cashier')} replace />;
}

function AppRoutes() {
  return (
    <ErrorBoundary section="Application">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public — no nav shell */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding — no nav shell (first-time setup) */}
            <Route path="/onboarding" element={<Onboarding />} />

            {/* All app pages — wrapped in responsive AppShell (Sidebar/TopNav/BottomNav) */}
            <Route element={<AppShell />}>
              {/* Dashboard — landing page */}
              <Route path="/dashboard" element={<ErrorBoundary section="Dashboard"><Dashboard /></ErrorBoundary>} />

              {/* POS */}
              <Route path="/pos" element={<ErrorBoundary section="POS"><POS /></ErrorBoundary>} />
              <Route path="/orders/new" element={<ErrorBoundary section="Create Order"><CreateOrder /></ErrorBoundary>} />
              <Route path="/pos/checkout" element={<ErrorBoundary section="Checkout"><Checkout /></ErrorBoundary>} />
              <Route path="/pos/receipt/:orderId" element={<ErrorBoundary section="Receipt"><Receipt /></ErrorBoundary>} />
              <Route path="/pos/tickets" element={<ErrorBoundary section="Kitchen Display"><Tickets /></ErrorBoundary>} />

              {/* Orders */}
              <Route path="/orders" element={<ErrorBoundary section="Orders"><Orders /></ErrorBoundary>} />
              <Route path="/orders/:orderId" element={<ErrorBoundary section="Order Detail"><OrderDetail /></ErrorBoundary>} />
              <Route path="/history" element={<ErrorBoundary section="History"><History /></ErrorBoundary>} />

              {/* Customers */}
              <Route path="/customers" element={<ErrorBoundary section="Customers"><Customers /></ErrorBoundary>} />
              <Route path="/customers/:customerId" element={<ErrorBoundary section="Customer Detail"><CustomerDetail /></ErrorBoundary>} />

              {/* Tables & floor — all roles (cashiers need for dine-in) */}
              <Route path="/table-floor" element={<ErrorBoundary section="Table Floor"><TableFloor /></ErrorBoundary>} />
              <Route path="/reservations" element={<ErrorBoundary section="Reservations"><Reservations /></ErrorBoundary>} />

              {/* Manager+ routes */}
              <Route element={<ManagerRoute />}>
                <Route path="/staff" element={<ErrorBoundary section="Staff"><Staff /></ErrorBoundary>} />
                <Route path="/catalog" element={<ErrorBoundary section="Catalog"><Catalog /></ErrorBoundary>} />
                <Route path="/inventory" element={<ErrorBoundary section="Inventory"><Inventory /></ErrorBoundary>} />
                <Route path="/suppliers" element={<ErrorBoundary section="Suppliers"><Suppliers /></ErrorBoundary>} />
                <Route path="/purchasing" element={<ErrorBoundary section="Purchasing"><Purchasing /></ErrorBoundary>} />
                <Route path="/quotations" element={<ErrorBoundary section="Quotations"><Quotations /></ErrorBoundary>} />
                <Route path="/expenses" element={<ErrorBoundary section="Expenses"><Expenses /></ErrorBoundary>} />
                <Route path="/reports" element={<ErrorBoundary section="Reports"><Reports /></ErrorBoundary>} />
                <Route path="/reports/closeout" element={<ErrorBoundary section="Closeout"><Closeout /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary section="Settings"><Settings /></ErrorBoundary>} />
              </Route>

              {/* Default — role-aware redirect */}
              <Route path="/" element={<RoleRedirect />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
