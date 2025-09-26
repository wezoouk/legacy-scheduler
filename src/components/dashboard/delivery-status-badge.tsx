import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle, Mail, Eye } from "lucide-react";

interface DeliveryStatusBadgeProps {
  status: 'PENDING' | 'DELIVERED' | 'BOUNCED' | 'OPENED' | 'FAILED';
  timestamp?: Date;
  bounceReason?: string;
}

export function DeliveryStatusBadge({ status, timestamp, bounceReason }: DeliveryStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          icon: Clock,
          label: 'Sending',
          className: 'bg-blue-100 text-blue-800',
        };
      case 'DELIVERED':
        return {
          icon: CheckCircle,
          label: 'Delivered',
          className: 'bg-green-100 text-green-800',
        };
      case 'BOUNCED':
        return {
          icon: AlertTriangle,
          label: 'Bounced',
          className: 'bg-red-100 text-red-800',
        };
      case 'OPENED':
        return {
          icon: Eye,
          label: 'Opened',
          className: 'bg-purple-100 text-purple-800',
        };
      case 'FAILED':
        return {
          icon: AlertTriangle,
          label: 'Failed',
          className: 'bg-red-100 text-red-800',
        };
      default:
        return {
          icon: Mail,
          label: 'Unknown',
          className: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-1">
      <Badge className={`${config.className} text-xs px-2 py-1`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      {timestamp && (
        <span className="text-xs text-muted-foreground">
          {timestamp.toLocaleDateString()}
        </span>
      )}
      {bounceReason && (
        <span className="text-xs text-red-600" title={bounceReason}>
          ⚠️
        </span>
      )}
    </div>
  );
}