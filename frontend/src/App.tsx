import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

// Admin imports
import AdminLayout from './admin/components/AdminLayout';
import AdminDashboard from './admin/pages/AdminDashboard';
import MembersList from './admin/pages/MembersList';
import NewMember from './admin/pages/NewMember';
import EventsList from './admin/pages/EventsList';
import EventBuilder from './admin/pages/EventBuilder';

// Shopify Embedded App imports
import { EmbeddedApp } from './embedded';
import { useShopifyBridge } from './hooks/useShopifyBridge';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Admin protected route - for now just checks localStorage
// TODO: Add proper admin auth with role verification
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = localStorage.getItem('admin_token');

  if (!isAdmin) {
    // For now, allow access without token for development
    // In production, redirect to admin login
    // return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

// Shopify Embedded App Wrapper
function ShopifyEmbeddedRoutes() {
  const { shop } = useShopifyBridge();
  return <EmbeddedApp shop={shop} />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Member dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Shopify Embedded App routes (Polaris UI) */}
      <Route path="/app/*" element={<ShopifyEmbeddedRoutes />} />

      {/* Admin routes (standalone) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="members" element={<MembersList />} />
        <Route path="members/new" element={<NewMember />} />
        <Route path="members/:id" element={<div>Member Detail (TODO)</div>} />
        <Route path="events" element={<EventsList />} />
        <Route path="events/new" element={<EventBuilder />} />
        <Route path="events/:id" element={<div>Event Detail (TODO)</div>} />
        <Route path="settings" element={<div>Settings (TODO)</div>} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
