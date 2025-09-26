import { useState } from 'react';
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
  Lock
} from 'lucide-react';
import { format } from 'date-fns';

const adminProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Timezone is required'),
  image: z.string().url().optional().or(z.literal('')),
  adminSettings: z.object({
    siteName: z.string().min(1, 'Site name is required'),
    supportEmail: z.string().email().optional().or(z.literal('')),
    allowRegistration: z.boolean().default(true),
    maintenanceMode: z.boolean().default(false),
  }),
});

type AdminProfileForm = z.infer<typeof adminProfileSchema>;

export function AdminProfile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

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
        siteName: 'Legacy Scheduler',
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
      localStorage.setItem('legacyScheduler_user', JSON.stringify(updatedUser));
      localStorage.setItem('legacyScheduler_adminSettings', JSON.stringify(data.adminSettings));
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
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
        <h1 className="text-3xl font-bold text-gray-900">Admin Profile</h1>
        <p className="text-gray-600 mt-2">
          Manage your administrator account and system settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                      placeholder="Legacy Scheduler"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      {...register('adminSettings.supportEmail')}
                      placeholder="support@legacyscheduler.com"
                    />
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  System Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">1,247</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">5,842</div>
                    <div className="text-sm text-muted-foreground">Messages Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">326</div>
                    <div className="text-sm text-muted-foreground">Active DMS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                </div>
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
                  <Lock className="h-5 w-5 mr-2" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your administrator password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button className="w-full">
                    <Key className="w-4 h-4 mr-2" />
                    Update Password
                  </Button>
                </div>
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
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">API Keys</h4>
                      <p className="text-sm text-muted-foreground">Manage system API keys</p>
                    </div>
                    <Button variant="outline">
                      <Key className="w-4 h-4 mr-2" />
                      Manage Keys
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Audit Logs</h4>
                      <p className="text-sm text-muted-foreground">View system activity logs</p>
                    </div>
                    <Button variant="outline">View Logs</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">System Backup</h4>
                      <p className="text-sm text-muted-foreground">Last backup: {format(new Date(), 'PPP')}</p>
                    </div>
                    <Button variant="outline">
                      <Server className="w-4 h-4 mr-2" />
                      Backup Now
                    </Button>
                  </div>
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
    </div>
  );
}