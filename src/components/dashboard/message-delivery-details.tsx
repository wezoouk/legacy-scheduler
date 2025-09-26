import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeliveryStatusBadge } from "./delivery-status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRecipients } from "@/lib/use-recipients";
import { TrendingUp, Users, Mail, Eye, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface MessageDeliveryDetailsProps {
  message: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessageDeliveryDetails({ message, open, onOpenChange }: MessageDeliveryDetailsProps) {
  const { recipients } = useRecipients();
  const [refreshing, setRefreshing] = useState(false);

  if (!message || !message.deliveryStatus) {
    return null;
  }

  const getRecipientName = (recipientId: string) => {
    const recipient = recipients.find(r => r.id === recipientId);
    return recipient?.name || 'Unknown Recipient';
  };

  const getRecipientEmail = (recipientId: string) => {
    const recipient = recipients.find(r => r.id === recipientId);
    return recipient?.email || 'unknown@email.com';
  };

  const deliveryEntries = Object.entries(message.deliveryStatus || {});
  
  const statusCounts = deliveryEntries.reduce((acc, [_, status]: [string, any]) => {
    acc[status.status] = (acc[status.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const refreshDeliveryStatus = async () => {
    setRefreshing(true);
    // In a real implementation, this would fetch latest status from your backend
    // For now, just simulate a refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Delivery Status: {message.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-lg font-semibold">{statusCounts.PENDING || 0}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-lg font-semibold">{statusCounts.DELIVERED || 0}</div>
                    <div className="text-xs text-muted-foreground">Delivered</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-purple-500" />
                  <div>
                    <div className="text-lg font-semibold">{statusCounts.OPENED || 0}</div>
                    <div className="text-xs text-muted-foreground">Opened</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-lg font-semibold">{(statusCounts.BOUNCED || 0) + (statusCounts.FAILED || 0)}</div>
                    <div className="text-xs text-muted-foreground">Issues</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg">
                  <Users className="w-5 h-5 mr-2" />
                  Recipient Status ({deliveryEntries.length})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={refreshDeliveryStatus} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deliveryEntries.map(([recipientId, status]: [string, any]) => (
                  <div key={recipientId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{getRecipientName(recipientId)}</div>
                      <div className="text-sm text-muted-foreground">{getRecipientEmail(recipientId)}</div>
                      {status.bounceReason && (
                        <div className="text-xs text-red-600 mt-1">
                          Bounce reason: {status.bounceReason}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <DeliveryStatusBadge 
                        status={status.status}
                        timestamp={status.deliveredAt ? new Date(status.deliveredAt) : 
                                  status.bouncedAt ? new Date(status.bouncedAt) :
                                  status.openedAt ? new Date(status.openedAt) : undefined}
                        bounceReason={status.bounceReason}
                      />
                      {status.deliveredAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(status.deliveredAt), 'MMM d, HH:mm')}
                        </div>
                      )}
                      {status.openedAt && status.status === 'OPENED' && (
                        <div className="text-xs text-purple-600 mt-1">
                          Opened: {format(new Date(status.openedAt), 'MMM d, HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Timeline</CardTitle>
              <CardDescription>
                Chronological view of email delivery events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-sm">Message Created</div>
                    <div className="text-xs text-muted-foreground">
                      {format(message.createdAt, 'PPP p')}
                    </div>
                  </div>
                </div>

                {message.scheduledFor && (
                  <div className="flex items-center space-x-3 p-2 bg-yellow-50 rounded">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="font-medium text-sm">Scheduled For</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(message.scheduledFor), 'PPP p')}
                      </div>
                    </div>
                  </div>
                )}

                {message.sentAt && (
                  <div className="flex items-center space-x-3 p-2 bg-green-50 rounded">
                    <Mail className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium text-sm">Sent to Recipients</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(message.sentAt), 'PPP p')}
                      </div>
                    </div>
                  </div>
                )}

                {deliveryEntries.filter(([_, status]: [string, any]) => status.deliveredAt).map(([recipientId, status]: [string, any]) => (
                  <div key={`delivered-${recipientId}`} className="flex items-center space-x-3 p-2 bg-green-50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium text-sm">Delivered to {getRecipientName(recipientId)}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(status.deliveredAt), 'PPP p')}
                      </div>
                    </div>
                  </div>
                ))}

                {deliveryEntries.filter(([_, status]: [string, any]) => status.openedAt).map(([recipientId, status]: [string, any]) => (
                  <div key={`opened-${recipientId}`} className="flex items-center space-x-3 p-2 bg-purple-50 rounded">
                    <Eye className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-medium text-sm">Opened by {getRecipientName(recipientId)}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(status.openedAt), 'PPP p')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}