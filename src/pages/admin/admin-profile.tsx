import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { useAdmin } from '@/lib/use-admin';
import { AuditLogViewer } from '@/components/admin/audit-log-viewer';
import { SystemBackupDialog } from '@/components/admin/system-backup-dialog';
import { addAuditLog } from '@/lib/audit-log';
import { getSystemStats, formatBytes, formatNumber, type SystemStats } from '@/lib/system-stats';
import { Switch } from '@/components/ui/switch';
import { 
  getAdminMediaSettings, 
  updateAdminMediaSettings, 
  AdminMediaSettings 
} from '@/lib/admin-media-access';
import { 
  User, 
  Mail, 
  Globe, 
  Shield, 
  Camera, 
  Save,
  Settings,
  Key,
  Database,
  Server,
  Lock,
  Users,
  Activity,
  BarChart,
  Clock,
  HardDrive,
  TrendingUp,
  Video,
  Mic,
  Image as ImageIcon,
  FileText,
  Calendar as CalendarIcon,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format } from 'date-fns';

const adminProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Timezone is required'),
  image: z.string().url().optional().or(z.literal('')),
  adminSettings: z.object({
    siteName: z.string().min(1, 'Site name is required'),
    logoUrl: z.string().url().optional().or(z.literal('')),
    supportEmail: z.string().email().optional().or(z.literal('')),
    allowRegistration: z.boolean(),
    maintenanceMode: z.boolean(),
  }),
});

type AdminProfileForm = z.infer<typeof adminProfileSchema>;

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

function PasswordChangeSection() {
  const [isChanging, setIsChanging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
  });

  const onSubmit = async (data: PasswordChangeForm) => {
    try {
      setMessage(null);
      
      // Import supabase dynamically
      const { supabase } = await import('@/lib/supabase');
      
      if (!supabase) {
        throw new Error('Authentication service not available');
      }

      // Update password in Supabase
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      reset();
      setTimeout(() => setIsChanging(false), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  return (
    <div className="space-y-4">
      {!isChanging ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Update your password to keep your account secure
          </p>
          <Button onClick={() => setIsChanging(true)} variant="outline">
            <Key className="h-4 w-4 mr-2" />
            Change Password
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {message && (
            <div className={`p-3 rounded-md text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              {...register('currentPassword')}
              placeholder="Enter your current password"
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              {...register('newPassword')}
              placeholder="Enter new password (8+ characters)"
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              placeholder="Confirm your new password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsChanging(false);
                reset();
                setMessage(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Save className="w-4 w-4 mr-2 animate-spin" />}
              {!isSubmitting && <Key className="w-4 h-4 mr-2" />}
              Change Password
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function AdminProfile() {
  const { user, updateUser } = useAuth();
  const { siteSettings, updateSiteSettings } = useAdmin();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [mediaSettings, setMediaSettings] = useState<AdminMediaSettings>(getAdminMediaSettings());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminProfileForm>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      timezone: user?.timezone || 'Europe/London',
      image: user?.image || '',
      adminSettings: {
        siteName: siteSettings.siteName || 'Rembr',
        logoUrl: siteSettings.logoUrl || '',
        supportEmail: 'support@legacyscheduler.com',
        allowRegistration: true,
        maintenanceMode: false,
      },
    },
  });

  const watchedAdminSettings = watch('adminSettings');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setValue('image', url);
    }
  };

  const onSubmit = async (data: AdminProfileForm) => {
    try {
      const updatedUser = {
        ...user!,
        name: data.name,
        email: data.email,
        timezone: data.timezone,
        image: data.image,
      };
      
      updateUser?.(updatedUser);
      
      // Update site settings
      updateSiteSettings({
        siteName: data.adminSettings.siteName,
        logoUrl: data.adminSettings.logoUrl || '',
      });
      
      localStorage.setItem('legacyScheduler_user', JSON.stringify(updatedUser));
      localStorage.setItem('legacyScheduler_adminSettings', JSON.stringify(data.adminSettings));
      
      // Log the profile update
      addAuditLog(user!.id, user!.email, 'profile_update', 'success', 'Admin profile and site settings updated');
      
      setIsEditing(false);
      alert('✅ Profile and site settings updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      addAuditLog(user!.id, user!.email, 'profile_update', 'failure', `Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      alert('Failed to update profile');
    }
  };

  const timezoneOptions = [
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];

  // Update form when site settings change
  useEffect(() => {
    setValue('adminSettings.siteName', siteSettings.siteName || 'Rembr');
    setValue('adminSettings.logoUrl', siteSettings.logoUrl || '');
  }, [siteSettings, setValue]);

  // Load system statistics
  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const systemStats = await getSystemStats();
        setStats(systemStats);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!user || user.plan !== 'LEGACY') {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your administrator account and system settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            System Settings
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Security
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Administrator Profile
                  </CardTitle>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Profile Image */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={previewUrl || user.image} />
                      <AvatarFallback className="text-lg">
                        {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <div>
                        <Label htmlFor="admin-image-upload" className="cursor-pointer">
                          <div className="flex items-center space-x-2 px-3 py-2 border rounded-md hover:bg-gray-50">
                            <Camera className="h-4 w-4" />
                            <span>Change Photo</span>
                          </div>
                        </Label>
                        <input
                          id="admin-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-semibold">{user.name}</h3>
                      <Badge className="bg-purple-100 text-purple-800 mt-1">
                        <Shield className="h-3 w-3 mr-1" />
                        System Administrator
                      </Badge>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-name">Full Name</Label>
                        <Input
                          id="admin-name"
                          {...register('name')}
                          placeholder="Enter your full name"
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Email Address</Label>
                        <Input
                          id="admin-email"
                          type="email"
                          {...register('email')}
                          placeholder="Enter your email"
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="admin-timezone">Timezone</Label>
                        <select
                          id="admin-timezone"
                          {...register('timezone')}
                          className="w-full px-3 py-2 border border-input rounded-md text-sm"
                        >
                          {timezoneOptions.map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                        {errors.timezone && (
                          <p className="text-sm text-destructive">{errors.timezone.message}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-700">Email</span>
                        </div>
                        <p className="text-gray-600">{user.email}</p>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-700">Timezone</span>
                        </div>
                        <p className="text-gray-600">{user.timezone || 'Europe/London'}</p>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Shield className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-700">Role</span>
                        </div>
                        <p className="text-purple-600 font-medium">System Admin</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  System Configuration
                </CardTitle>
                <CardDescription>
                  Manage global system settings and configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      {...register('adminSettings.siteName')}
                      placeholder="Rembr"
                    />
                    {errors.adminSettings?.siteName && (
                      <p className="text-sm text-destructive">{errors.adminSettings.siteName.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This name will appear throughout the application
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      type="url"
                      {...register('adminSettings.logoUrl')}
                      placeholder="https://example.com/logo.png"
                    />
                    {errors.adminSettings?.logoUrl && (
                      <p className="text-sm text-destructive">{errors.adminSettings.logoUrl.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Logo image URL (optional)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <div className="relative">
                    <Input
                      id="supportEmail"
                      type="email"
                      {...register('adminSettings.supportEmail')}
                      placeholder="support@legacyscheduler.com"
                    />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>User Registration</Label>
                      <p className="text-sm text-muted-foreground">Allow new users to register</p>
                    </div>
                    <input
                      type="checkbox"
                      {...register('adminSettings.allowRegistration')}
                      className="rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Put the site in maintenance mode</p>
                    </div>
                    <input
                      type="checkbox"
                      {...register('adminSettings.maintenanceMode')}
                      className="rounded"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Real-time System Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart className="h-5 w-5 mr-2" />
                  System Statistics
                  </div>
                  {loadingStats && (
                    <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
                  )}
                </CardTitle>
                <CardDescription>
                  Real-time system metrics and analytics (auto-refreshes every 30s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats && !stats ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p>Loading statistics...</p>
                  </div>
                ) : stats ? (
                  <div className="space-y-6">
                    {/* Primary Metrics */}
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Users className="h-5 w-5 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatNumber(stats.totalUsers)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Users</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <Mail className="h-5 w-5 mx-auto mb-2 text-green-600 dark:text-green-400" />
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatNumber(stats.messagesSent)}
                        </div>
                        <div className="text-xs text-muted-foreground">Messages Sent</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                        <Shield className="h-5 w-5 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatNumber(stats.activeDMS)}
                        </div>
                        <div className="text-xs text-muted-foreground">Active DMS</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                        <TrendingUp className="h-5 w-5 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {stats.uptime}
                        </div>
                        <div className="text-xs text-muted-foreground">Uptime</div>
                      </div>
                    </div>

                    {/* Activity Metrics */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center text-gray-900 dark:text-white">
                        <Activity className="h-4 w-4 mr-2" />
                        User Activity
                      </h4>
                      <div className="grid md:grid-cols-4 gap-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <div className="text-xs text-muted-foreground">Online Now</div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400 flex items-center">
                              <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                              {formatNumber(stats.onlineUsers)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <div className="text-xs text-muted-foreground">Active (7 days)</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatNumber(stats.activeUsers)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <div className="text-xs text-muted-foreground">New This Week</div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatNumber(stats.newUsersThisWeek)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <div className="text-xs text-muted-foreground">Weekly Growth</div>
                            <div className={`text-lg font-bold flex items-center ${
                              stats.userGrowthPercent > 0 
                                ? 'text-green-600 dark:text-green-400' 
                                : stats.userGrowthPercent < 0 
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {stats.userGrowthPercent > 0 ? (
                                <ArrowUp className="h-4 w-4 mr-1" />
                              ) : stats.userGrowthPercent < 0 ? (
                                <ArrowDown className="h-4 w-4 mr-1" />
                              ) : null}
                              {stats.userGrowthPercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Media Metrics */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center text-gray-900 dark:text-white">
                        <Video className="h-4 w-4 mr-2" />
                        Media Library
                      </h4>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {formatBytes(stats.videoStorageUsed)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">Videos</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatNumber(stats.totalVideos)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Mic className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                              {formatBytes(stats.audioStorageUsed)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">Audio Files</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatNumber(stats.totalAudios)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <ImageIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                              {formatBytes(stats.imageStorageUsed)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">Images</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatNumber(stats.totalImages)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scheduled Deliveries Calendar */}
                    {stats.upcomingDeliveries.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center text-gray-900 dark:text-white">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Upcoming Scheduled Deliveries
                        </h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                          {stats.upcomingDeliveries.slice(0, 12).map((delivery, idx) => (
                            <div key={idx} className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-blue-900 dark:text-blue-200">
                                  {format(delivery.date, 'MMM d, yyyy')}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-blue-600 dark:bg-blue-700 text-white rounded-full">
                                  {delivery.count}
                                </span>
                              </div>
                              <div className="text-xs text-blue-700 dark:text-blue-300 truncate">
                                {delivery.messages[0]?.title || 'Scheduled message'}
                                {delivery.count > 1 && ` +${delivery.count - 1} more`}
                              </div>
                            </div>
                          ))}
                        </div>
                        {stats.upcomingDeliveries.length > 12 && (
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            Showing 12 of {stats.upcomingDeliveries.length} scheduled dates
                          </p>
                        )}
                      </div>
                    )}

                    {/* Message Metrics */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center text-gray-900 dark:text-white">
                        <Mail className="h-4 w-4 mr-2" />
                        Message Statistics
                      </h4>
                      <div className="grid md:grid-cols-4 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatNumber(stats.totalMessages)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-muted-foreground">Scheduled</div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {formatNumber(stats.scheduledMessages)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-muted-foreground">Drafts</div>
                          <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                            {formatNumber(stats.draftMessages)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-muted-foreground">Recipients</div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatNumber(stats.totalRecipients)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* System Health */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center text-gray-900 dark:text-white">
                        <Server className="h-4 w-4 mr-2" />
                        System Health
                      </h4>
                      <div className="grid md:grid-cols-4 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-muted-foreground">Login Success Rate</div>
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {stats.successRate}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-muted-foreground">Failed Logins (24h)</div>
                          <div className="text-lg font-bold text-red-600 dark:text-red-400">
                            {formatNumber(stats.failedLogins24h)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-muted-foreground flex items-center">
                            <HardDrive className="h-3 w-3 mr-1" />
                            Storage Used
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatBytes(stats.storageUsed)}
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Last Backup
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {stats.lastBackup ? format(stats.lastBackup, 'MMM d, HH:mm') : 'Never'}
                          </div>
                        </div>
                      </div>
                  </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Failed to load statistics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Password Change Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Password Management
                </CardTitle>
                <CardDescription>
                  Update your administrator password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordChangeSection />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage security settings and access controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium dark:text-white">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium dark:text-white">API Keys</h4>
                      <p className="text-sm text-muted-foreground">Manage system API keys</p>
                    </div>
                    <Button variant="outline">
                      <Key className="w-4 h-4 mr-2" />
                      Manage Keys
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium dark:text-white">Media Access Control</h4>
                      <p className="text-sm text-muted-foreground">Configure admin access to user media files</p>
                    </div>
                    <Button variant="outline" onClick={() => document.getElementById('media-access-settings')?.scrollIntoView({ behavior: 'smooth' })}>
                      <Shield className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium dark:text-white">Audit Logs</h4>
                      <p className="text-sm text-muted-foreground">View system activity logs</p>
                    </div>
                    <Button variant="outline" onClick={() => setShowAuditLogs(true)}>
                      View Logs
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium dark:text-white">System Backup</h4>
                      <p className="text-sm text-muted-foreground">
                        Create and download a backup of all system data
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setShowBackupDialog(true)}>
                      <Server className="w-4 h-4 mr-2" />
                      Backup Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media Access Control Settings */}
            <Card id="media-access-settings">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Media Access Control
                </CardTitle>
                <CardDescription>
                  Configure how admins can access user media files for support purposes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Permission Toggle for Current User */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quick Access: Grant Yourself Permission</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        To view your own media, you need to grant yourself permission first. 
                        This is a security feature that requires explicit consent.
                      </p>
                      <Button
                        onClick={async () => {
                          const { grantAdminMediaAccess } = await import('@/lib/admin-media-access');
                          const success = await grantAdminMediaAccess(48);
                          if (success) {
                            alert('✅ Permission granted! You can now view your media files for 48 hours.\n\nGo to Admin → Users → [Media] to view your files.');
                            window.location.reload();
                          } else {
                            alert('❌ Failed to grant permission. Please try again.');
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Grant Me Access (48 hours)
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Access Level */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Access Level</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Control what admins can see when accessing user media
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        mediaSettings.accessLevel === 'stats-only'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => {
                        const newSettings = { ...mediaSettings, accessLevel: 'stats-only' as const };
                        setMediaSettings(newSettings);
                        updateAdminMediaSettings(newSettings);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          mediaSettings.accessLevel === 'stats-only' 
                            ? 'border-primary' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {mediaSettings.accessLevel === 'stats-only' && (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold dark:text-white">Stats Only</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Admins can only see file counts and storage sizes. Cannot view actual media files.
                          </p>
                          <Badge className="mt-2 bg-green-600">Recommended</Badge>
                        </div>
                      </div>
                    </div>

                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        mediaSettings.accessLevel === 'full-access'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => {
                        const newSettings = { ...mediaSettings, accessLevel: 'full-access' as const };
                        setMediaSettings(newSettings);
                        updateAdminMediaSettings(newSettings);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          mediaSettings.accessLevel === 'full-access' 
                            ? 'border-primary' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {mediaSettings.accessLevel === 'full-access' && (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold dark:text-white">Full Access</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Admins can view and download user media files. Useful for troubleshooting media issues.
                          </p>
                          <Badge className="mt-2 bg-yellow-600">Requires User Permission</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="require-permission" className="text-base font-semibold cursor-pointer">
                        Require User Permission
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Users must explicitly grant access before admins can view their media (Full Access mode only)
                      </p>
                    </div>
                    <Switch
                      id="require-permission"
                      checked={mediaSettings.requireUserPermission}
                      disabled={mediaSettings.accessLevel === 'stats-only'}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...mediaSettings, requireUserPermission: checked };
                        setMediaSettings(newSettings);
                        updateAdminMediaSettings(newSettings);
                      }}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="log-access" className="text-base font-semibold cursor-pointer">
                        Log All Access
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Record all admin media access in audit logs for transparency
                      </p>
                    </div>
                    <Switch
                      id="log-access"
                      checked={mediaSettings.logAllAccess}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...mediaSettings, logAllAccess: checked };
                        setMediaSettings(newSettings);
                        updateAdminMediaSettings(newSettings);
                      }}
                    />
                  </div>
                </div>

                {/* Current Settings Summary */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-semibold dark:text-white">Current Configuration</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${mediaSettings.accessLevel === 'full-access' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                      {mediaSettings.accessLevel === 'stats-only' 
                        ? 'Admins can only see statistics (file counts, sizes)'
                        : 'Admins can view user media files'}
                    </li>
                    {mediaSettings.accessLevel === 'full-access' && (
                      <li className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${mediaSettings.requireUserPermission ? 'bg-green-500' : 'bg-red-500'}`} />
                        {mediaSettings.requireUserPermission 
                          ? 'Users must grant permission before access'
                          : 'Admins have unrestricted access (not recommended)'}
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${mediaSettings.logAllAccess ? 'bg-blue-500' : 'bg-gray-500'}`} />
                      {mediaSettings.logAllAccess 
                        ? 'All access is logged in audit trail'
                        : 'Access logging is disabled'}
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submit Buttons */}
        {isEditing && (
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                reset();
                setPreviewUrl('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Save className="w-4 h-4 mr-2 animate-spin" />}
              {!isSubmitting && <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        )}
      </form>

      {/* Dialogs */}
      <AuditLogViewer open={showAuditLogs} onOpenChange={setShowAuditLogs} />
      <SystemBackupDialog open={showBackupDialog} onOpenChange={setShowBackupDialog} />
    </div>
  );
}