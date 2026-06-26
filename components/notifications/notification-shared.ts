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
