import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Megaphone,
  MessageSquareText,
  PackageCheck,
  PackagePlus,
  Star,
  Truck,
  UserRound,
  XCircle,
} from 'lucide-react';

import type {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from '@/lib/notifications/types';

export const NOTIFICATION_STATUSES: NotificationStatus[] = [
  'ALL',
  'UNREAD',
  'READ',
  'ARCHIVED',
];

export const NOTIFICATION_TYPES: NotificationType[] = [
  'SYSTEM',
  'ACCOUNT',
  'PROMOTION',
  'COMPANY_ANNOUNCEMENT',
  'COMPANY_REVIEW',
  'SHIPMENT_CREATED',
  'SHIPMENT_IN_TRANSIT',
  'SHIPMENT_TRANSIT_NOTE',
  'SHIPMENT_READY_FOR_PICKUP',
  'SHIPMENT_DELIVERED',
  'SHIPMENT_CANCELLED',
  'PAYMENT_STATUS_UPDATED',
  'COMMISSION_STATUS_UPDATED',
  'PARCEL_PICKUP_UPDATED',
];

export const NOTIFICATION_PRIORITIES: NotificationPriority[] = [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
];

export const priorityClassName: Record<NotificationPriority, string> = {
  LOW: 'border-muted bg-muted/50 text-muted-foreground',
  NORMAL: 'border-primary/20 bg-primary/10 text-primary',
  HIGH: 'border-warning/30 bg-warning/10 text-warning',
  URGENT: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export const notificationTypeMeta: Record<
  NotificationType,
  {
    icon: LucideIcon;
    className: string;
  }
> = {
  SYSTEM: {
    icon: Bell,
    className: 'border-primary/20 bg-primary/10 text-primary',
  },
  ACCOUNT: {
    icon: UserRound,
    className: 'border-chart-3/20 bg-chart-3/10 text-chart-3',
  },
  PROMOTION: {
    icon: Megaphone,
    className: 'border-warning/30 bg-warning/10 text-warning',
  },
  COMPANY_ANNOUNCEMENT: {
    icon: Building2,
    className: 'border-chart-4/20 bg-chart-4/10 text-chart-4',
  },
  COMPANY_REVIEW: {
    icon: Star,
    className: 'border-warning/30 bg-warning/10 text-warning',
  },
  SHIPMENT_CREATED: {
    icon: PackagePlus,
    className: 'border-primary/20 bg-primary/10 text-primary',
  },
  SHIPMENT_IN_TRANSIT: {
    icon: Truck,
    className: 'border-chart-2/20 bg-chart-2/10 text-chart-2',
  },
  SHIPMENT_TRANSIT_NOTE: {
    icon: MessageSquareText,
    className: 'border-chart-5/20 bg-chart-5/10 text-chart-5',
  },
  SHIPMENT_READY_FOR_PICKUP: {
    icon: PackageCheck,
    className: 'border-success/30 bg-success/10 text-success',
  },
  SHIPMENT_DELIVERED: {
    icon: CheckCircle2,
    className: 'border-success/30 bg-success/10 text-success',
  },
  SHIPMENT_CANCELLED: {
    icon: XCircle,
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
  PAYMENT_STATUS_UPDATED: {
    icon: CreditCard,
    className: 'border-chart-1/20 bg-chart-1/10 text-chart-1',
  },
  COMMISSION_STATUS_UPDATED: {
    icon: CreditCard,
    className: 'border-chart-1/20 bg-chart-1/10 text-chart-1',
  },
  PARCEL_PICKUP_UPDATED: {
    icon: PackageCheck,
    className: 'border-chart-5/20 bg-chart-5/10 text-chart-5',
  },
};

/**
 * The API can introduce a notification type before the frontend is deployed.
 * Render it with the generic system treatment instead of breaking the inbox.
 */
export function getNotificationTypeMeta(type: string | undefined) {
  return notificationTypeMeta[type as NotificationType] ?? notificationTypeMeta.SYSTEM;
}

export function formatNotificationDate(value: string | undefined, locale: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
