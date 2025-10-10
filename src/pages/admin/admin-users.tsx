import { useState } from 'react';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useMessages } from '@/lib/use-messages';
import { useRecipients } from '@/lib/use-recipients';
import { supabase } from '@/lib/supabase';
import { AdminMediaViewer } from '@/components/admin/admin-media-viewer';
import { getUserMediaStats, formatBytes } from '@/lib/admin-media-access';
import { 
  Users, 
  Search, 
  Mail, 
  Calendar, 
  Shield, 
  Edit,
  Trash2,
  Plus,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  Video,
  Mic,
  FileText,
  HardDrive,
  Activity,
  TrendingUp,
  Database,
  Eye,
  Image,
  FolderArchive
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '../../../hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  plan: 'FREE' | 'PLUS' | 'LEGACY';
  image?: string;
  timezone?: string;
  createdAt: Date;
  lastLogin?: Date;
  totalMessages: number;
  totalRecipients: number;
  // Detailed statistics
  videoMessages: number;
  audioMessages: number;
  imageFiles: number;
  otherFiles: number;
  dmsMessages: number;
  emailMessages: number;
  fileAttachments: number;
  scheduledMessages: number;
  sentMessages: number;
  draftMessages: number;
  failedMessages: number;
  totalStorageUsed: number; // in bytes
  lastActivity?: Date;
}

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', timezone: '' });
  const [viewingMediaUser, setViewingMediaUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();
  const { messages } = useMessages();
  const { recipients } = useRecipients();

  // Calculate status counts from messages
  const statusCounts = {
    draft: messages.filter(msg => msg.status === 'DRAFT').length,
    scheduled: messages.filter(msg => msg.status === 'SCHEDULED').length,
    sent: messages.filter(msg => msg.status === 'SENT').length,
    failed: messages.filter(msg => msg.status === 'FAILED').length,
  };

  // Get real user data from Supabase with detailed statistics
  const getRealUserData = async (): Promise<User[]> => {
    console.log('🚀 Starting getRealUserData...');
    const startTime = Date.now();
    
    try {
      let allUsers: any[] = [];
      
      // Try to fetch ALL users from Supabase auth admin API first
      console.log('🔍 Attempting to fetch all users from admin API...');
      try {
        const { data: adminData, error: adminError } = await supabase.auth.admin.listUsers();
        
        if (!adminError && adminData?.users && adminData.users.length > 0) {
          console.log('✅ Admin API worked! Found', adminData.users.length, 'users');
          allUsers = adminData.users;
        } else {
          console.log('⚠️ Admin API not available or no users found:', adminError);
        }
      } catch (adminApiError) {
        console.log('⚠️ Admin API call failed (expected on client-side):', adminApiError);
      }
      
      // Fallback: Try to query profiles table for all users
      if (allUsers.length === 0) {
        console.log('📋 Falling back to profiles table...');
        
        try {
          // Query the profiles table (if it exists)
          console.log('🔍 Querying profiles table...');
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          
          console.log('📊 Profiles query result:', { 
            data: profilesData, 
            error: profilesError,
            dataLength: profilesData?.length 
          });
          
          if (profilesError) {
            console.error('❌ Profiles query error:', profilesError);
            console.error('Error code:', profilesError.code);
            console.error('Error message:', profilesError.message);
            console.error('Error details:', profilesError.details);
          }
          
          if (!profilesError && profilesData && profilesData.length > 0) {
            console.log(`✅ Found ${profilesData.length} users from profiles table`);
            
            // Convert profiles to user format
            // Note: We can only get image for the current user (admin API requires service_role key)
            const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
            
            allUsers = profilesData.map((profile: any) => {
              let userImage = undefined;
              
              // If this is the current user, try to get their image from auth metadata
              if (profile.id === currentAuthUser?.id && currentAuthUser?.user_metadata?.image) {
                userImage = currentAuthUser.user_metadata.image;
                console.log(`  📸 Image for ${profile.email} (current user):`, userImage);
              } else {
                console.log(`  📸 Image for ${profile.email}: none (not current user, admin API required)`);
              }
              
              return {
                id: profile.id,
                email: profile.email,
                created_at: profile.created_at,
                last_sign_in_at: profile.last_login,
                user_metadata: {
                  name: profile.name,
                  plan: profile.plan,
                  timezone: profile.timezone,
                  image: userImage
                }
              };
            });
          } else {
            console.log('⚠️ Profiles table not found or empty, falling back to current user');
            
            // Last resort: show current user only
            const { data: { user: currentAuthUser }, error: currentUserError } = await supabase.auth.getUser();
            
            if (currentUserError || !currentAuthUser) {
              console.log('❌ No current user found');
              return [];
            }
            
            allUsers = [currentAuthUser];
            console.log('ℹ️ Showing current user only (profiles table not set up)');
          }
        } catch (queryError) {
          console.error('❌ Error querying profiles:', queryError);
          
          // Last resort: show current user only
          const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
          if (currentAuthUser) {
            allUsers = [currentAuthUser];
          }
        }
      }
      
      // Process all users
      console.log('👥 Processing', allUsers.length, 'users...');
      
      const processedUsers = [];
      
      for (const authUser of allUsers) {
        console.log(`📧 Fetching data for user: ${authUser.email} (${authUser.id})`);
        
        // Fetch messages for THIS user
        const { data: dbMessages, error: msgsError } = await supabase
          .from('messages')
          .select('*')
          .eq('userId', authUser.id);
        
        console.log(`  📨 Messages: ${dbMessages?.length || 0}`, msgsError ? `Error: ${msgsError.message}` : '');
        
        // Fetch recipients for THIS user
        const { data: dbRecipients, error: recsError } = await supabase
          .from('recipients')
          .select('*')
          .eq('userId', authUser.id);
        
        console.log(`  👥 Recipients: ${dbRecipients?.length || 0}`, recsError ? `Error: ${recsError.message}` : '');
        
        const userMessages = dbMessages || [];
        const userRecipients = dbRecipients || [];
        
        console.log(`  ✅ Final counts - Messages: ${userMessages.length}, Recipients: ${userRecipients.length}`);
        
        // Fetch storage for THIS user AND count media files
        let userStorageUsed = 0;
        let videoFileCount = 0;
        let audioFileCount = 0;
        let imageFileCount = 0;
        let otherFileCount = 0;
        
        const folders = ['uploads', 'audio', 'recordings', 'voice'];
        const videoExtensions = /\.(mp4|mov|m4v|avi|mkv)$/i;
        const audioExtensions = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i;
        
        try {
          for (const folder of folders) {
            const { data: files } = await supabase.storage
              .from('media')
              .list(`${folder}/${authUser.id}`, { limit: 1000 });
          
          if (files) {
            for (const file of files) {
              const size = (file.metadata as any)?.size || 0;
              userStorageUsed += size;
              
              // Get mime type from metadata
              const mimeType = (file.metadata as any)?.mimetype || '';
              
              // Smart detection for .webm files (can be video OR audio)
              if (file.name.toLowerCase().endsWith('.webm')) {
                // Check mime type first
                if (mimeType.startsWith('audio/')) {
                  audioFileCount++;
                } else if (mimeType.startsWith('video/')) {
                  videoFileCount++;
                } else {
                  // Fallback: Check folder name
                  if (folder === 'audio' || folder === 'voice') {
                    audioFileCount++;
                  } else {
                    videoFileCount++;
                  }
                }
              }
              // Regular file type detection
              else if (videoExtensions.test(file.name)) {
                videoFileCount++;
              } else if (audioExtensions.test(file.name)) {
                audioFileCount++;
              } else if (imageExtensions.test(file.name)) {
                imageFileCount++;
              } else {
                // Everything else (PDFs, documents, etc.)
                otherFileCount++;
              }
            }
          }
          }
        } catch (storageError) {
          console.warn('⚠️ Error fetching storage for user:', authUser.email, storageError);
          // Continue with 0 counts if storage fails
        }
        
        console.log(`  🎬 Media files - Videos: ${videoFileCount}, Audio: ${audioFileCount}, Images: ${imageFileCount}, Other: ${otherFileCount}`);
        
        // Calculate stats for THIS user
        const userVideoMessages = videoFileCount; // Use actual file count instead of message count
        const userAudioMessages = audioFileCount; // Use actual file count instead of message count
        
        const dmsMessages = userMessages.filter((msg: any) => 
          msg.scope === 'DMS'
        ).length;
        
        const emailMessages = userMessages.filter((msg: any) => 
          (msg.types && msg.types.includes('EMAIL')) || msg.type === 'EMAIL' || (!msg.types && !msg.type)
        ).length;
        
        const fileAttachments = userMessages.reduce((total: number, msg: any) => {
          if (msg.attachments && Array.isArray(msg.attachments)) {
            return total + msg.attachments.length;
          }
          return total;
        }, 0);
        
        const scheduledMessages = userMessages.filter((msg: any) => 
          msg.status === 'SCHEDULED'
        ).length;
        
        // Prefer persistent total from user_stats if available
        let sentMessages = 0;
        try {
          const { data: statsRow } = await supabase
            .from('user_stats')
            .select('total_sent_emails')
            .eq('user_id', authUser.id)
            .maybeSingle();
          if (statsRow && typeof statsRow.total_sent_emails === 'number') {
            sentMessages = statsRow.total_sent_emails;
          } else {
            sentMessages = userMessages.filter((msg: any) => msg.status === 'SENT').length;
          }
        } catch (e) {
          sentMessages = userMessages.filter((msg: any) => msg.status === 'SENT').length;
        }
        
        const draftMessages = userMessages.filter((msg: any) => 
          msg.status === 'DRAFT'
        ).length;
        
        const failedMessages = userMessages.filter((msg: any) => 
          msg.status === 'FAILED'
        ).length;
        
        // Find last activity (most recent message update)
        const lastActivity = userMessages.length > 0 
          ? new Date(Math.max(...userMessages.map((msg: any) => 
              new Date(msg.updatedAt || msg.createdAt || 0).getTime()
            )))
          : undefined;
        
        // For current user, try to get image from auth context if not in user_metadata
        let userImage = authUser.user_metadata?.image;
        if (!userImage && authUser.id === currentUser?.id && currentUser?.image) {
          userImage = currentUser.image;
          console.log(`  📸 Using image from auth context for ${authUser.email}:`, userImage);
        } else {
          console.log(`  📸 Profile image for ${authUser.email}:`, userImage || '(none)');
        }
        
        processedUsers.push({
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Unknown User',
          email: authUser.email || 'No email',
          plan: (authUser.user_metadata?.plan || 'FREE') as 'FREE' | 'PLUS' | 'LEGACY',
          image: userImage,
          timezone: authUser.user_metadata?.timezone || 'Europe/London',
          createdAt: new Date(authUser.created_at || '2024-01-01'),
          lastLogin: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at) : undefined,
          totalMessages: userMessages.length,
          totalRecipients: userRecipients.length,
          videoMessages: userVideoMessages,
          audioMessages: userAudioMessages,
          imageFiles: imageFileCount,
          otherFiles: otherFileCount,
          dmsMessages,
          emailMessages,
          fileAttachments,
          scheduledMessages,
          sentMessages,
          draftMessages,
          failedMessages,
          totalStorageUsed: userStorageUsed,
          lastActivity,
        });
        
        console.log('👤 Processed user:', authUser.email, 'messages:', userMessages.length);
      }
      
      console.log('✅ All users processed:', processedUsers);
      console.log(`⏱️ getRealUserData completed in ${Date.now() - startTime}ms`);
      return processedUsers;
    } catch (error) {
      console.error('❌ Error loading real user data:', error);
      console.error('Error details:', error);
      console.log(`⏱️ getRealUserData failed after ${Date.now() - startTime}ms`);
      return [];
    }
  };
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        console.log('📥 Loading users...');
        const realUsers = await getRealUserData();
        console.log('✅ Users loaded:', realUsers.length);
    setUsers(realUsers);
      } catch (error) {
        console.error('❌ Failed to load users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
        console.log('✅ Loading complete');
      }
    };
    loadUsers();
  }, []);

  // Save user function
  const saveUser = async (userData: User) => {
    try {
      console.log('Saving user:', userData);
      const usersData = localStorage.getItem('legacyScheduler_users');
      const storedUsers = usersData ? JSON.parse(usersData) : [];
      console.log('Current stored users:', storedUsers.length);
      
      if (userData.id === '') {
        // Create new user
        const newUser = {
          id: Date.now().toString(),
          name: userData.name,
          email: userData.email,
          plan: userData.plan,
          createdAt: new Date().toISOString(),
          timezone: 'Europe/London'
        };
        console.log('Creating new user:', newUser);
        storedUsers.push(newUser);
        console.log('Users after adding new user:', storedUsers.length);
      } else {
        // Update existing user
        const userIndex = storedUsers.findIndex((u: any) => u.id === userData.id);
        if (userIndex !== -1) {
          storedUsers[userIndex] = {
            ...storedUsers[userIndex],
            name: userData.name,
            email: userData.email,
            plan: userData.plan
          };
        }
      }
      
      localStorage.setItem('legacyScheduler_users', JSON.stringify(storedUsers));
      console.log('Saved to localStorage, refreshing user list...');
      const refreshedUsers = await getRealUserData();
      console.log('Refreshed users:', refreshedUsers.length);
      setUsers(refreshedUsers);
      setEditingUser(null);
      setEditForm({ name: '', email: '', timezone: '' });
      console.log('User saved successfully!');
      
      // Show success toast
      toast({
        title: userData.id === '' ? 'User Created' : 'User Updated',
        description: userData.id === '' 
          ? `Successfully created user ${userData.name}` 
          : `Successfully updated user ${userData.name}`,
      });
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user');
    }
  };

  // Refresh users when messages/recipients change (debounced)
  useEffect(() => {
    // Skip if still loading initial data
    if (loading) return;
    
    const loadUsers = async () => {
      try {
        console.log('🔄 Refreshing users due to messages/recipients change...');
        const realUsers = await getRealUserData();
        console.log('✅ Users refreshed:', realUsers.length);
        setUsers(realUsers);
    } catch (error) {
        console.error('❌ Failed to refresh users:', error);
      }
    };
    loadUsers();
  }, [messages, recipients]);

  const changePlan = async (userId: string, newPlan: 'FREE' | 'PLUS' | 'LEGACY') => {
    try {
      // Update in Supabase user metadata
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { plan: newPlan }
      });
      
      if (error) {
        console.error('Error updating user plan in Supabase:', error);
        alert('Failed to update user plan');
        return;
    }
    
    // Update in component state
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, plan: newPlan } : user
    ));
      
      toast({
        title: 'Plan Updated',
        description: `User plan changed to ${newPlan}`,
      });
    } catch (error) {
      console.error('Error updating user plan:', error);
      alert('Failed to update user plan');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      timezone: user.timezone || 'Europe/London',
    });
  };

  const saveUserChanges = async () => {
    if (!editingUser) return;

    try {
      // Check if editing self
      const isEditingSelf = editingUser.id === currentUser?.id;
      
      if (isEditingSelf) {
        // Use client-side updateUser for self (works without admin API)
        const { error } = await supabase.auth.updateUser({
            email: editForm.email,
          data: {
            name: editForm.name,
            timezone: editForm.timezone,
            plan: editingUser.plan,
          }
        });
        
        if (error) {
          console.error('Error updating user in Supabase:', error);
          alert('Failed to update user: ' + error.message);
          return;
        }
      } else {
        // For other users, requires admin API (not yet implemented)
        alert('Editing other users requires backend admin API setup. See USER_MANAGEMENT_SETUP.md');
        return;
      }
      
      // Update in component state
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id ? { 
          ...user, 
          name: editForm.name,
          email: editForm.email,
          plan: editingUser.plan,
        } : user
      ));
      
      setEditingUser(null);
      
      const planChanged = currentUser?.plan !== editingUser.plan;
      
      toast({
        title: 'User Updated',
        description: `Successfully updated ${editForm.name}${editingUser.plan === 'LEGACY' ? ' (Now Admin)' : ''}`,
      });
      
      // If editing self and changed plan, reload
      if (isEditingSelf && planChanged) {
        setTimeout(() => {
          alert(`✅ Plan changed to ${editingUser.plan}! Reloading page to apply new permissions...`);
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        // Delete from Supabase
        const { error } = await supabase.auth.admin.deleteUser(userId);
        
        if (error) {
          console.error('Error deleting user from Supabase:', error);
          alert('Failed to delete user');
          return;
        }
        
        // Also remove user's messages and recipients from localStorage
        localStorage.removeItem(`messages_${userId}`);
        localStorage.removeItem(`recipients_${userId}`);
      
      // Update component state
      setUsers(prev => prev.filter(user => user.id !== userId));
        
        toast({
          title: 'User Deleted',
          description: 'User account has been permanently deleted',
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || user.plan === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE': return 'bg-gray-100 text-gray-800';
      case 'PLUS': return 'bg-blue-100 text-blue-800';
      case 'LEGACY': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage platform users and their access levels
          </p>
        </div>
        <Button onClick={() => {
          setEditingUser({ 
            id: '', 
            name: '', 
            email: '', 
            plan: 'FREE', 
            createdAt: new Date(),
            totalMessages: 0,
            totalRecipients: 0,
            videoMessages: 0,
            audioMessages: 0,
            imageFiles: 0,
            otherFiles: 0,
            dmsMessages: 0,
            emailMessages: 0,
            fileAttachments: 0,
            scheduledMessages: 0,
            sentMessages: 0,
            draftMessages: 0,
            failedMessages: 0,
            totalStorageUsed: 0
          });
          setEditForm({ name: '', email: '', timezone: 'Europe/London' });
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="px-3 py-2 border border-input rounded-md text-sm"
              >
                <option value="all">All Plans</option>
                <option value="FREE">Free</option>
                <option value="PLUS">Plus</option>
                <option value="LEGACY">Legacy</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
          <CardTitle>Platform Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
            </div>
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-3 w-3 mr-1" />
              Backend Setup Required
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading users from Supabase...</p>
            </div>
          ) : (
          <div className="space-y-4">
              {filteredUsers.map((user) => {
                // Debug: Log user image in render
                if (user.email === 'davwez@gmail.com') {
                  console.log('🖼️ Rendering user davwez with image:', user.image);
                }
                
                return (
              <div key={user.id} className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center space-x-4">
                  {user.image ? (
                    <img 
                      src={user.image} 
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        console.error('❌ Image failed to load for', user.name, '- URL:', user.image);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                      user.image ? 'hidden' : ''
                    }`}
                    style={{
                      backgroundColor: `hsl(${
                        (user.name.charCodeAt(0) + user.name.charCodeAt(user.name.length - 1)) % 360
                      }, 65%, 50%)`
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}{user.name.split(' ')[1]?.charAt(0).toUpperCase() || user.name.charAt(1)?.toUpperCase() || ''}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                      <Badge className={getPlanColor(user.plan)}>
                        {user.plan}
                      </Badge>
                      {user.plan === 'LEGACY' && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                      <span>Joined {format(user.createdAt, 'MMM d, yyyy')}</span>
                      {user.lastLogin && (
                        <span>Last login {format(user.lastLogin, 'MMM d, yyyy')}</span>
                      )}
                      {user.lastActivity && (
                        <span>Last activity {format(user.lastActivity, 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.totalMessages}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Messages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.totalRecipients}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Recipients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.videoMessages}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Videos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.audioMessages}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Audio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.imageFiles}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Images</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.otherFiles}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Other</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.dmsMessages}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">DMS</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{user.sentMessages}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {(user.totalStorageUsed / (1024 * 1024)).toFixed(1)}MB
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Storage</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setViewingMediaUser(user)}
                      title="View user media"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Media
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {user.id === currentUser?.id ? 'Edit (You)' : 'Edit'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => deleteUser(user.id)}
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
                );
              })}
            
            {filteredUsers.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your criteria</p>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <Card className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Edit User</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingUser(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-timezone">Timezone</Label>
                <select
                  id="edit-timezone"
                  value={editForm.timezone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background dark:bg-gray-800"
                >
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="America/Chicago">America/Chicago</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Europe/Berlin">Europe/Berlin</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                  <option value="Asia/Shanghai">Asia/Shanghai</option>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                  <option value="Pacific/Auckland">Pacific/Auckland</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="edit-plan">Plan</Label>
                <select
                  id="edit-plan"
                  value={editingUser.plan}
                  onChange={(e) => setEditingUser({ ...editingUser, plan: e.target.value as 'FREE' | 'PLUS' | 'LEGACY' })}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background dark:bg-gray-800"
                >
                  <option value="FREE">FREE</option>
                  <option value="PLUS">PLUS</option>
                  <option value="LEGACY">LEGACY (Admin)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  LEGACY plan grants full admin access
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button onClick={saveUserChanges}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add/Edit User Form */}
      {editingUser && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingUser.id === '' ? 'Add New User' : 'Edit User'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Enter user name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Enter user email"
                />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
                <select
                  id="plan"
                  value={editingUser.plan}
                  onChange={(e) => setEditingUser({ ...editingUser, plan: e.target.value as 'FREE' | 'PLUS' | 'LEGACY' })}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="FREE">Free</option>
                  <option value="PLUS">Plus</option>
                  <option value="LEGACY">Legacy</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => saveUser({ ...editingUser, name: editForm.name, email: editForm.email })}
                  disabled={!editForm.name || !editForm.email}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingUser.id === '' ? 'Add User' : 'Save Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingUser(null);
                    setEditForm({ name: '', email: '', timezone: '' });
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Notice */}
      <Card className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 mr-2" />
            {currentUser?.plan !== 'LEGACY' ? 'Admin Access Required' : 'Backend Setup Required'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 dark:text-amber-300">
          {currentUser?.plan !== 'LEGACY' ? (
            <>
              <p className="mb-3">
                You're currently on the <strong>{currentUser?.plan}</strong> plan. To access full user management features, upgrade to LEGACY (Admin) plan.
              </p>
              <div className="bg-amber-100 dark:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg p-3 mb-3">
                <p className="font-semibold mb-2">👑 Quick Upgrade:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Go to <strong>Dashboard → Profile</strong></li>
                  <li>Scroll to <strong>"Plan & Features"</strong> section</li>
                  <li>Click the purple <strong>"Make Me Admin"</strong> button</li>
                  <li>Page will refresh with admin access</li>
                </ol>
            </div>
            </>
          ) : (
            <>
              <p className="mb-2">
                Currently showing <strong>your own account</strong> only. To manage all platform users, you need to set up the backend admin API.
              </p>
              <p className="mb-3">
                The Supabase <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded text-xs">auth.admin</code> API requires server-side authentication with the service_role key.
              </p>
              <p className="font-semibold">
                📄 See <code>USER_MANAGEMENT_SETUP.md</code> for complete setup instructions
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detailed Statistics Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">{users.length}</div>
                <div className="text-xs text-gray-500">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Video className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.videoMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">Video Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Mic className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.audioMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">Audio Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                <Image className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.imageFiles, 0)}
                </div>
                <div className="text-xs text-gray-500">Images</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <FolderArchive className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.otherFiles, 0)}
                </div>
                <div className="text-xs text-gray-500">Other Files</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.dmsMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">DMS Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <Mail className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.emailMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">Email Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.fileAttachments, 0)}
                </div>
                <div className="text-xs text-gray-500">File Attachments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.scheduledMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">Scheduled</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {(users.reduce((sum, user) => sum + user.totalStorageUsed, 0) / (1024 * 1024 * 1024)).toFixed(2)}GB
                </div>
                <div className="text-xs text-gray-500">Total Storage</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Status Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.draftMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">Draft Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.scheduledMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">Scheduled</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.sentMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {users.reduce((sum, user) => sum + user.failedMessages, 0)}
                </div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Media Viewer Dialog */}
      {viewingMediaUser && currentUser && (
        <AdminMediaViewer
          userId={viewingMediaUser.id}
          userName={viewingMediaUser.name}
          userEmail={viewingMediaUser.email}
          isOpen={!!viewingMediaUser}
          onClose={() => setViewingMediaUser(null)}
          isAdmin={currentUser.plan === 'LEGACY'}
        />
      )}
    </div>
  );
}