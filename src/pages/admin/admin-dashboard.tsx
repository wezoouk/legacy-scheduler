import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdmin } from '@/lib/use-admin';
import { useMessages } from '@/lib/use-messages';
import { useRecipients } from '@/lib/use-recipients';
import { ScheduledProcessor } from '@/components/admin/scheduled-processor';
import { 
  Users, 
  Mail, 
  Calendar, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';

export function AdminDashboard() {
  const { getAdminStats, siteSettings } = useAdmin();
  const { messages } = useMessages();
  const { recipients } = useRecipients();
  
  const stats = getAdminStats();
  
  const recentMessages = messages
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentRecipients = recipients
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statusCounts = {
    draft: messages.filter(m => m.status === 'DRAFT').length,
    scheduled: messages.filter(m => m.status === 'SCHEDULED').length,
    sent: messages.filter(m => m.status === 'SENT').length,
    failed: messages.filter(m => m.status === 'FAILED').length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor and manage the {siteSettings.siteName} platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active platform users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              All time messages created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecipients}</div>
            <p className="text-xs text-muted-foreground">
              Registered recipients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Messages</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeScheduled}</div>
            <p className="text-xs text-muted-foreground">
              Pending delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Message Status Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Message Status Overview</CardTitle>
            <CardDescription>Breakdown of message statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Draft</span>
                </div>
                <span className="font-semibold">{statusCounts.draft}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-sm">Scheduled</span>
                </div>
                <span className="font-semibold">{statusCounts.scheduled}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm">Sent</span>
                </div>
                <span className="font-semibold">{statusCounts.sent}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-sm">Failed</span>
                </div>
                <span className="font-semibold">{statusCounts.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMessages.map((message, index) => (
                <div key={message.id} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    message.status === 'SENT' ? 'bg-green-400' :
                    message.status === 'SCHEDULED' ? 'bg-blue-400' :
                    message.status === 'FAILED' ? 'bg-red-400' :
                    'bg-gray-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {message.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(message.createdAt, 'MMM d, HH:mm')}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                    {message.status.toLowerCase()}
                  </span>
                </div>
              ))}
              {recentMessages.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent messages
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Recipients */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Recipients</CardTitle>
          <CardDescription>Recently added platform recipients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentRecipients.map((recipient) => (
              <div key={recipient.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{recipient.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{recipient.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {recipient.verified ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {format(recipient.createdAt, 'MMM d')}
                  </span>
                </div>
              </div>
            ))}
            {recentRecipients.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No recipients yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Message Processor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScheduledProcessor />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system health and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Scheduled Messages</span>
                <span className="text-sm font-medium">{statusCounts.scheduled} pending</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Failed Messages</span>
                <span className="text-sm font-medium">{statusCounts.failed} failed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Recipients</span>
                <span className="text-sm font-medium">{recipients.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}