import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Mail, 
  Globe, 
  Shield, 
  Camera, 
  Save,
  Calendar,
  Clock,
  CheckCircle,
  Lock,
  Key,
  Crown,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  getUserPermissionStatus, 
  grantAdminMediaAccess, 
  revokeAdminMediaAccess,
  UserMediaPermission 
} from '@/lib/admin-media-access';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Timezone is required'),
  image: z.string().url().optional().or(z.literal('')),
});

type ProfileForm = z.infer<typeof profileSchema>;

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
  const { user } = useAuth();
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
      setIsChanging(false);
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
              {isSubmitting && <Save className="w-4 h-4 mr-2 animate-spin" />}
              {!isSubmitting && <Key className="w-4 h-4 mr-2" />}
              Change Password
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [stats, setStats] = useState({
    messagesCreated: 0,
    recipients: 0,
    messagesSent: 0,
  });
  const [mediaPermission, setMediaPermission] = useState<UserMediaPermission>({
    allowAdminMediaAccess: false
  });
  const [updatingPermission, setUpdatingPermission] = useState(false);

  // Check if user is a real admin (not just LEGACY plan)
  const adminEmails = ['davwez@gmail.com', 'davwez88@gmail.com'];
  const isRealAdmin = user?.plan === 'LEGACY' && user?.email ? 
    adminEmails.includes(user.email.toLowerCase()) : 
    false;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      timezone: user?.timezone || 'Europe/London',
      image: user?.image || '',
    },
  });

  // Load real user statistics from Supabase
  useEffect(() => {
    const loadStats = async () => {
      if (!user || !supabase) return;

      try {
        // Fetch messages from Supabase
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, status')
          .eq('userId', user.id);

        if (messagesError) {
          console.error('❌ Error fetching messages:', messagesError);
          console.error('❌ Message error details:', {
            message: messagesError.message,
            details: messagesError.details,
            hint: messagesError.hint,
            code: messagesError.code
          });
        }

        // Fetch recipients from Supabase
        const { data: recipients, error: recipientsError } = await supabase
          .from('recipients')
          .select('id')
          .eq('userId', user.id);

        if (recipientsError) {
          console.error('❌ Error fetching recipients:', recipientsError);
          console.error('❌ Recipient error details:', {
            message: recipientsError.message,
            details: recipientsError.details,
            hint: recipientsError.hint,
            code: recipientsError.code
          });
        }

        // Calculate stats
        const messagesCreated = messages?.length || 0;
        const recipientsCount = recipients?.length || 0;
        const messagesSent = messages?.filter(m => m.status === 'SENT').length || 0;

        setStats({
          messagesCreated,
          recipients: recipientsCount,
          messagesSent,
        });
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    };

    loadStats();
  }, [user]);

  // Load media permission status
  useEffect(() => {
    const loadPermission = async () => {
      const permission = await getUserPermissionStatus();
      setMediaPermission(permission);
    };
    
    loadPermission();
  }, [user]);

  const handleToggleAdminAccess = async (enabled: boolean) => {
    setUpdatingPermission(true);
    try {
      const success = enabled 
        ? await grantAdminMediaAccess(48) 
        : await revokeAdminMediaAccess();
      
      if (success) {
        const permission = await getUserPermissionStatus();
        setMediaPermission(permission);
        
        if (enabled) {
          alert('✅ Admin media access granted for 48 hours.\n\nAdmins can now view your media files to provide support.');
        } else {
          alert('✅ Admin media access revoked.\n\nAdmins can no longer view your media files.');
        }
      } else {
        alert('❌ Failed to update permission. Please try again.');
      }
    } catch (error) {
      console.error('Error toggling admin access:', error);
      alert('❌ Error updating permission.');
    } finally {
      setUpdatingPermission(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('📸 Image file selected:', file);
    if (file) {
      console.log('📸 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setValue('image', url);
      console.log('✅ Preview URL created:', url);
    } else {
      console.log('❌ No file selected');
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    if (!supabase) {
      alert('Supabase is not configured');
      return;
    }

    console.log('📝 Starting profile update...', data);

    try {
      let imageUrl = user?.image || data.image;

      // Upload image to Supabase Storage if a new file was selected
      if (imageFile && user) {
        console.log('📸 Uploading new profile image...');
        console.log('📸 ImageFile state:', imageFile);
        console.log('📸 User ID:', user.id);
        
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        console.log('📸 Upload path:', filePath);

        // Upload to Supabase Storage
        console.log('📸 Starting upload to Supabase Storage...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: true
          });

        console.log('📸 Upload result:', { data: uploadData, error: uploadError });

        if (uploadError) {
          console.error('❌ Error uploading image:', uploadError);
          console.error('❌ Error details:', JSON.stringify(uploadError, null, 2));
          alert('⚠️ Failed to upload image: ' + uploadError.message + '\n\nProfile will be updated without the image.');
          // Continue without image
        } else {
          console.log('✅ Image uploaded successfully');
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

          imageUrl = publicUrl;
          console.log('✅ Public URL generated:', publicUrl);
        }
      } else {
        console.log('ℹ️ No new image to upload (imageFile:', imageFile, ', user:', user?.id, ')');
      }

      console.log('🔄 Updating user metadata in Supabase...');
      
      // Check if email changed
      const emailChanged = data.email !== user?.email;
      
      // Update user in Supabase
      const updatePayload: any = {
        data: {
          name: data.name,
          timezone: data.timezone,
          image: imageUrl,
          plan: user?.plan // Preserve existing plan
        }
      };
      
      // Only include email if it changed (triggers verification)
      if (emailChanged) {
        console.log('⚠️ Email changed - this will require verification');
        updatePayload.email = data.email;
      }
      
      const { error: updateError } = await supabase.auth.updateUser(updatePayload);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
        alert('Failed to update profile: ' + updateError.message);
        return;
      }
      
      if (emailChanged) {
        alert('⚠️ Email changed! Please check your new email inbox to verify the change. Your profile name and timezone have been updated.');
      }

      console.log('✅ Profile updated in Supabase');

      // Update local state
      const updatedUser = {
        ...user!,
        name: data.name,
        email: data.email,
        timezone: data.timezone,
        image: imageUrl,
      };
      
      console.log('🔄 Updating local state...');
      updateUser?.(updatedUser);
      setIsEditing(false);
      setImageFile(null);
      setPreviewUrl('');
      
      console.log('✅ Profile update complete!');
      alert('✅ Profile updated successfully!');
      
      // Reload the page to ensure avatar displays the new image
      if (imageFile) {
        console.log('🔄 Reloading page to display new avatar...');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      console.error('❌ Failed to update profile:', err);
      console.error('Error details:', err);
      alert('Failed to update profile: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE': return 'bg-gray-100 text-gray-800';
      case 'PLUS': return 'bg-blue-100 text-blue-800';
      case 'LEGACY': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpgradeToLegacy = async () => {
    if (!user || !supabase) return;
    
    // Security check: Only allowed admin emails can upgrade to LEGACY
    const adminEmails = ['davwez@gmail.com', 'davwez88@gmail.com'];
    if (!adminEmails.includes(user.email.toLowerCase())) {
      alert('⛔ Admin access denied.\n\nOnly authorized administrator emails can access the admin panel.\n\nContact support if you believe this is an error.');
      return;
    }
    
    setIsUpgrading(true);
    try {
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: { plan: 'LEGACY' }
      });

      if (error) {
        console.error('Error upgrading to LEGACY:', error);
        alert('Failed to upgrade. Error: ' + error.message);
        return;
      }

      // Update local auth context
      const updatedUser = { ...user, plan: 'LEGACY' as const };
      updateUser(updatedUser);

      alert('✅ Successfully upgraded to LEGACY (Admin) plan! Refreshing page...');
      
      // Refresh the page to reload everything with new permissions
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Failed to upgrade: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsUpgrading(false);
    }
  };

  const timezoneOptions = [
    { value: 'Europe/London', label: '🇬🇧 Europe/London (UK)', flag: '🇬🇧' },
    { value: 'America/New_York', label: '🇺🇸 America/New_York (EST)', flag: '🇺🇸' },
    { value: 'America/Los_Angeles', label: '🇺🇸 America/Los_Angeles (PST)', flag: '🇺🇸' },
    { value: 'America/Chicago', label: '🇺🇸 America/Chicago (CST)', flag: '🇺🇸' },
    { value: 'Europe/Paris', label: '🇫🇷 Europe/Paris (France)', flag: '🇫🇷' },
    { value: 'Europe/Berlin', label: '🇩🇪 Europe/Berlin (Germany)', flag: '🇩🇪' },
    { value: 'Asia/Tokyo', label: '🇯🇵 Asia/Tokyo (Japan)', flag: '🇯🇵' },
    { value: 'Asia/Shanghai', label: '🇨🇳 Asia/Shanghai (China)', flag: '🇨🇳' },
    { value: 'Australia/Sydney', label: '🇦🇺 Australia/Sydney', flag: '🇦🇺' },
    { value: 'Pacific/Auckland', label: '🇳🇿 Pacific/Auckland (NZ)', flag: '🇳🇿' },
  ];

  const getTimezoneDisplay = (tz: string) => {
    const option = timezoneOptions.find(opt => opt.value === tz);
    return option ? option.label : tz;
  };

  const getTimezoneFlag = (tz: string) => {
    const option = timezoneOptions.find(opt => opt.value === tz);
    return option?.flag || '🌍';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isEditing ? (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{user.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getPlanColor(user.plan)}>
                        {user.plan} Plan
                      </Badge>
                      {isRealAdmin && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin Access
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Timezone</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="mr-2">{getTimezoneFlag(user.timezone || 'Europe/London')}</span>
                      {user.timezone || 'Europe/London'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Member Since</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">{user?.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'}</p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Account Status</span>
                    </div>
                    <p className="text-green-600 font-medium">Active</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Image */}
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={previewUrl || user.image} />
                    <AvatarFallback>
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex items-center space-x-2 px-3 py-2 border dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Camera className="h-4 w-4" />
                        <span>Change Photo</span>
                      </div>
                    </Label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="Enter your email"
                      disabled
                      className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Email cannot be changed for security reasons
                    </p>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    {...register('timezone')}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  {errors.timezone && (
                    <p className="text-sm text-destructive">{errors.timezone.message}</p>
                  )}
                </div>

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
              </form>
            )}
          </CardContent>
        </Card>

        {/* Account Statistics */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Messages Created</p>
                  <div className="text-2xl font-bold">{stats.messagesCreated}</div>
                </div>
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recipients</p>
                  <div className="text-2xl font-bold">{stats.recipients}</div>
                </div>
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Messages Sent</p>
                  <div className="text-2xl font-bold">{stats.messagesSent}</div>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Change your password and manage security preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeSection />
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="h-5 w-5 mr-2" />
              Privacy & Media Access
            </CardTitle>
            <CardDescription>
              Control who can view your media files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="admin-access" className="font-semibold text-base cursor-pointer">
                    Allow Admin Media Access
                  </Label>
                  {mediaPermission.allowAdminMediaAccess && (
                    <Badge className="bg-green-600">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable this temporarily if you need admin help with your media files. 
                  Access will automatically expire after 48 hours.
                </p>
                {mediaPermission.allowAdminMediaAccess && mediaPermission.adminAccessExpiresAt && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-yellow-600 dark:text-yellow-400">
                      Expires: {format(new Date(mediaPermission.adminAccessExpiresAt), 'PPp')}
                    </span>
                  </div>
                )}
              </div>
              <Switch
                id="admin-access"
                checked={mediaPermission.allowAdminMediaAccess}
                onCheckedChange={handleToggleAdminAccess}
                disabled={updatingPermission}
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-primary mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">What admins can see:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Your uploaded videos, audio, and images</li>
                    <li>File names and upload dates</li>
                    <li>Media used in your messages</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <EyeOff className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">What admins cannot see:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                    <li>Your media when access is disabled</li>
                    <li>Your message content or recipients</li>
                    <li>Your account password</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Plan & Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold">Current Plan</h4>
                  <p className="text-muted-foreground">You're on the {user.plan} plan</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getPlanColor(user.plan)} variant="outline">
                    {user.plan}
                  </Badge>
                  {user.plan !== 'LEGACY' && (
                    <Button
                      onClick={handleUpgradeToLegacy}
                      disabled={isUpgrading}
                      size="sm"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isUpgrading ? (
                        <>
                          <Save className="h-3 w-3 mr-2 animate-spin" />
                          Upgrading...
                        </>
                      ) : (
                        <>
                          <Crown className="h-3 w-3 mr-2" />
                          Make Me Admin
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Plan Features:</h4>
                <ul className="space-y-2 text-sm">
                  {user.plan === 'FREE' && (
                    <>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Up to 5 messages per month</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Basic message scheduling</span>
                      </li>
                    </>
                  )}
                  {user.plan === 'PLUS' && (
                    <>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Unlimited messages</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Advanced scheduling</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Priority support</span>
                      </li>
                    </>
                  )}
                  {user.plan === 'LEGACY' && (
                    <>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Everything in Plus</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Dead Man's Switch</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Admin panel access</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Site customization</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}