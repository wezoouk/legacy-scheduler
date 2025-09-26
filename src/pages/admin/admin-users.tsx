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
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '../../../hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  plan: 'FREE' | 'PLUS' | 'LEGACY';
  createdAt: Date;
  lastLogin?: Date;
  totalMessages: number;
  totalRecipients: number;
}

export function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', timezone: '' });
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

  // Get real user data from localStorage
  const getRealUserData = (): User[] => {
    try {
      const usersData = localStorage.getItem('legacyScheduler_users');
      const storedUsers = usersData ? JSON.parse(usersData) : [];
      
      return storedUsers.map((user: any) => {
        // Get messages for this user
        const userMessagesData = localStorage.getItem(`messages_${user.id}`);
        const userMessages = userMessagesData ? JSON.parse(userMessagesData) : [];
        
        // Get recipients for this user
        const userRecipientsData = localStorage.getItem(`recipients_${user.id}`);
        const userRecipients = userRecipientsData ? JSON.parse(userRecipientsData) : [];
        
        return {
          id: user.id,
          name: user.name || 'Unknown User',
          email: user.email,
          plan: user.plan || 'FREE',
          createdAt: new Date(user.createdAt || '2024-01-01'),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
          totalMessages: userMessages.length,
          totalRecipients: userRecipients.length,
        };
      });
    } catch (error) {
      console.error('Error loading real user data:', error);
      return [];
    }
  };
  const [users, setUsers] = useState<User[]>([]);

  // Load users on component mount
  useEffect(() => {
    const realUsers = getRealUserData();
    setUsers(realUsers);
  }, []);

  // Save user function
  const saveUser = (userData: User) => {
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
      const refreshedUsers = getRealUserData();
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

  // Load real user data on component mount and when messages/recipients change
  useEffect(() => {
    const realUsers = getRealUserData();
    console.log('Loading real user data:', realUsers);
    setUsers(realUsers);
  }, [currentUser, messages, recipients]);

  const changePlan = (userId: string, newPlan: 'FREE' | 'PLUS' | 'LEGACY') => {
    // Update in localStorage
    try {
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (usersData) {
        const storedUsers = JSON.parse(usersData);
        const updatedUsers = storedUsers.map((user: any) => 
          user.id === userId ? { ...user, plan: newPlan } : user
        );
        localStorage.setItem('legacyScheduler_users', JSON.stringify(updatedUsers));
      }
    } catch (error) {
      console.error('Error updating user plan in localStorage:', error);
    }
    
    // Update in component state
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, plan: newPlan } : user
    ));
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      timezone: user.timezone || 'Europe/London',
    });
  };

  const saveUserChanges = () => {
    if (!editingUser) return;

    try {
      // Update in localStorage users database
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (usersData) {
        const storedUsers = JSON.parse(usersData);
        const updatedUsers = storedUsers.map((user: any) => 
          user.id === editingUser.id ? { 
            ...user, 
            name: editForm.name,
            email: editForm.email,
            timezone: editForm.timezone,
            updatedAt: new Date().toISOString()
          } : user
        );
        localStorage.setItem('legacyScheduler_users', JSON.stringify(updatedUsers));
      }
      
      // Update in component state
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id ? { 
          ...user, 
          name: editForm.name,
          email: editForm.email,
          timezone: editForm.timezone
        } : user
      ));
      
      // Update current user session if editing self
      if (editingUser.id === currentUser?.id) {
        const updatedCurrentUser = {
          ...currentUser,
          name: editForm.name,
          email: editForm.email,
          timezone: editForm.timezone,
        };
        localStorage.setItem('legacyScheduler_user', JSON.stringify(updatedCurrentUser));
      }
      
      setEditingUser(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const deleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }
    if (confirm('Are you sure you want to delete this user?')) {
      // Remove from localStorage
      try {
        const usersData = localStorage.getItem('legacyScheduler_users');
        if (usersData) {
          const storedUsers = JSON.parse(usersData);
          const updatedUsers = storedUsers.filter((user: any) => user.id !== userId);
          localStorage.setItem('legacyScheduler_users', JSON.stringify(updatedUsers));
        }
        
        // Also remove user's messages and recipients
        localStorage.removeItem(`messages_${userId}`);
        localStorage.removeItem(`recipients_${userId}`);
      } catch (error) {
        console.error('Error deleting user from localStorage:', error);
      }
      
      // Update component state
      setUsers(prev => prev.filter(user => user.id !== userId));
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
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
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
            totalRecipients: 0
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
          <CardTitle>Platform Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <Badge className={getPlanColor(user.plan)}>
                        {user.plan}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-400">
                      <span>Joined {format(user.createdAt, 'MMM d, yyyy')}</span>
                      {user.lastLogin && (
                        <span>Last login {format(user.lastLogin, 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{user.totalMessages}</div>
                    <div className="text-xs text-gray-500">Messages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{user.totalRecipients}</div>
                    <div className="text-xs text-gray-500">Recipients</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {user.id === currentUser?.id ? 'Edit (You)' : 'Edit'}
                    </Button>
                    <select
                      value={user.plan}
                      onChange={(e) => changePlan(user.id, e.target.value as any)}
                      className="px-2 py-1 text-xs border rounded"
                    >
                      <option value="FREE">FREE</option>
                      <option value="PLUS">PLUS</option>
                      <option value="LEGACY">LEGACY</option>
                    </select>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteUser(user.id)}
                      disabled={user.id === currentUser?.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your criteria</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <Card className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit User</h3>
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
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
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
              
              <div className="flex items-center justify-between pt-2">
                <Badge className={getPlanColor(editingUser.plan)}>
                  {editingUser.plan} Plan
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Use the dropdown above to change plan
                </span>
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

      {/* Debug Info */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Users in State:</strong> {users.length}
            </div>
            <div>
              <strong>Users in localStorage:</strong> {
                (() => {
                  try {
                    const stored = localStorage.getItem('legacyScheduler_users');
                    return stored ? JSON.parse(stored).length : 0;
                  } catch {
                    return 0;
                  }
                })()
              }
            </div>
            <div>
              <strong>Editing User ID:</strong> {editingUser?.id || 'None'}
            </div>
            <div>
              <strong>Form Data:</strong> {editForm.name ? `${editForm.name} (${editForm.email})` : 'Empty'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              </div>
              <div>
                <div className="text-lg font-semibold">{statusCounts.draft}</div>
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
                <div className="text-lg font-semibold">{statusCounts.scheduled}</div>
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
                <div className="text-lg font-semibold">{statusCounts.sent}</div>
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
                <div className="text-lg font-semibold">{statusCounts.failed}</div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}