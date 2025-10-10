import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useAdmin } from '@/lib/use-admin';
import { 
  Users, 
  Settings, 
  BarChart3, 
  Palette, 
  Calendar,
  DollarSign,
  ArrowLeft,
  Shield,
  Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminLayout() {
  const { user } = useAuth();
  const { siteSettings, isAdmin } = useAdmin();
  const location = useLocation();

  // Define all navigation items with admin-only flags
  const allNavigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart3, adminOnly: false },
    { name: 'Users', href: '/admin/users', icon: Users, adminOnly: true },
    { name: 'Messages', href: '/admin/messages', icon: Calendar, adminOnly: false },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: DollarSign, adminOnly: true },
    { name: 'Site Customization', href: '/admin/customize', icon: Palette, adminOnly: true },
    { name: 'Security & Blocking', href: '/admin/security', icon: Ban, adminOnly: true },
    { name: 'Admin Profile', href: '/admin/profile', icon: Settings, adminOnly: true },
  ];

  // Filter navigation based on admin status
  const navigation = allNavigation.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Link>
              <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Shield className="w-6 h-6 mr-2 text-red-600 dark:text-red-500" />
                {siteSettings.siteName} Admin
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.name} • {user?.plan}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white dark:bg-gray-900 shadow-sm min-h-screen border-r dark:border-gray-800">
          <div className="p-6">
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-gray-900 dark:bg-gray-700 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}