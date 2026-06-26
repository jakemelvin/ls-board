import type { ApiRole, UserStatus } from '@/lib/auth/types';
import type { Page } from '@/lib/admin/types';

export type NotificationType =
  | 'SYSTEM'
  | 'ACCOUNT'
  | 'PROMOTION'
  | 'COMPANY_ANNOUNCEMENT'
  | 'COMPANY_REVIEW'
  | 'SHIPMENT_CREATED'
  | 'SHIPMENT_IN_TRANSIT'
  | 'SHIPMENT_TRANSIT_NOTE'
  | 'SHIPMENT_READY_FOR_PICKUP'
  | 'SHIPMENT_DELIVERED'
  | 'SHIPMENT_CANCELLED'
  | 'PAYMENT_STATUS_UPDATED';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL';
export type NotificationStatus = 'ALL' | 'UNREAD' | 'READ' | 'ARCHIVED';
export type NotificationDevicePlatform = 'ANDROID' | 'IOS' | 'WEB' | 'UNKNOWN';

export interface NotificationResponse {
  id: number;
  recipientId: number;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  data?: Record<string, string>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  read: boolean;
  archived: boolean;
  readAt?: string;
  archivedAt?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type NotificationPage = Page<NotificationResponse>;

export interface NotificationCountResponse {
  unreadCount: number;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  data?: Record<string, string>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  deduplicationKey?: string;
  expiresAt?: string;
}

export interface NotificationCriteriaRequest {
  userIds?: number[];
  excludeUserIds?: number[];
  roles?: ApiRole[];
  companyId?: number;
  countryId?: number;
  city?: string;
  status?: UserStatus;
  includeAllUsers?: boolean;
}

export interface NotificationBulkRequest {
  notification: CreateNotificationRequest;
  criteria: NotificationCriteriaRequest;
}

export interface DeviceRegistrationRequest {
  fcmToken: string;
  platform?: NotificationDevicePlatform;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
}

export interface UserDeviceResponse {
  id: number;
  platform: NotificationDevicePlatform;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  enabled: boolean;
  lastSeenAt?: string;
  revokedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
