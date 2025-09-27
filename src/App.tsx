import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider } from 'next-themes';
import { Navbar } from '@/components/layout/navbar';
import { SignInPage } from '@/pages/auth/sign-in';
import { SignUpPage } from '@/pages/auth/sign-up';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { UpdatePasswordPage } from '@/pages/auth/update-password';
import { Dashboard } from '@/pages/dashboard/dashboard';
import { LandingPage } from '@/pages/landing-page';
import { AdminLayout } from '@/components/admin/admin-layout';
import { AdminDashboard } from '@/pages/admin/admin-dashboard';
import { AdminUsers } from '@/pages/admin/admin-users';
import { AdminMessages } from '@/pages/admin/admin-messages';
import { SubscriptionManagement } from '@/pages/admin/subscription-management';
import { SiteCustomization } from '@/pages/admin/site-customization';
import { AdminProfile } from '@/pages/admin/admin-profile';
import { ProfilePage } from '@/pages/dashboard/profile';
import { StorageNotification } from '@/components/ui/storage-notification';
import { MediaViewerPage } from '@/pages/media-viewer';
import { MediaLibraryPage } from '@/pages/dashboard/media-library';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user || user.plan !== 'LEGACY') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  
  // Auto-navigate after successful login
  React.useEffect(() => {
    if (user && window.location.pathname.startsWith('/auth/')) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <StorageNotification />
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/auth/sign-in"
          element={
            <PublicRoute>
              <SignInPage />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/sign-up"
          element={
            <PublicRoute>
              <SignUpPage />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/update-password"
          element={
            <PublicRoute>
              <UpdatePasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/media"
          element={
            <ProtectedRoute>
              <MediaLibraryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/view" element={<MediaViewerPage />} />
        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="subscriptions" element={<SubscriptionManagement />} />
          <Route path="customize" element={<SiteCustomization />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;