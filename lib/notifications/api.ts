import { apiClient } from '@/lib/api-client';
import type {
  CreateNotificationRequest,
  DeviceRegistrationRequest,
  NotificationBulkRequest,
  NotificationCountResponse,
  NotificationPage,
  NotificationResponse,
  NotificationStatus,
  UserDeviceResponse,
} from './types';

interface NotificationPageParams {
  page?: number;
  size?: number;
  sort?: string[];
  status?: NotificationStatus;
}

function buildNotificationQuery(params: NotificationPageParams = {}) {
  const search = new URLSearchParams();
  search.set('status', params.status ?? 'ALL');
  search.set('page', String(params.page ?? 0));
  search.set('size', String(params.size ?? 10));
  (params.sort ?? ['createdAt,desc']).forEach((sort) => search.append('sort', sort));
  return search.toString();
}

export function getMyNotifications(
  token: string,
  params: NotificationPageParams = {},
): Promise<NotificationPage> {
  return apiClient.get<NotificationPage>(
    `/api/delivery/notifications?${buildNotificationQuery(params)}`,
    token,
  );
}

export function getUnreadNotificationCount(
  token: string,
): Promise<NotificationCountResponse> {
  return apiClient.get<NotificationCountResponse>(
    '/api/delivery/notifications/unread-count',
    token,
  );
}

export function markNotificationAsRead(
  token: string,
  notificationId: number,
): Promise<NotificationResponse> {
  return apiClient.patch<NotificationResponse>(
    `/api/delivery/notifications/${notificationId}/read`,
    undefined,
    token,
  );
}

export function archiveNotification(
  token: string,
  notificationId: number,
): Promise<NotificationResponse> {
  return apiClient.patch<NotificationResponse>(
    `/api/delivery/notifications/${notificationId}/archive`,
    undefined,
    token,
  );
}

export function markAllNotificationsAsRead(token: string): Promise<{ message?: string }> {
  return apiClient.patch<{ message?: string }>(
    '/api/delivery/notifications/read-all',
    undefined,
    token,
  );
}

export function deleteNotification(
  token: string,
  notificationId: number,
): Promise<{ message?: string }> {
  return apiClient.delete<{ message?: string }>(
    `/api/delivery/notifications/${notificationId}`,
    token,
  );
}

export function notifyUser(
  token: string,
  userId: number,
  payload: CreateNotificationRequest,
): Promise<NotificationResponse> {
  return apiClient.post<NotificationResponse>(
    `/api/delivery/notifications/users/${userId}`,
    payload,
    token,
  );
}

export function notifyUsers(
  token: string,
  userIds: number[],
  payload: CreateNotificationRequest,
): Promise<NotificationResponse[]> {
  const search = new URLSearchParams();
  userIds.forEach((id) => search.append('userIds', String(id)));
  return apiClient.post<NotificationResponse[]>(
    `/api/delivery/notifications/users?${search.toString()}`,
    payload,
    token,
  );
}

export function notifyByCriteria(
  token: string,
  payload: NotificationBulkRequest,
): Promise<NotificationResponse[]> {
  return apiClient.post<NotificationResponse[]>(
    '/api/delivery/notifications/bulk',
    payload,
    token,
  );
}

export function getMyNotificationDevices(token: string): Promise<UserDeviceResponse[]> {
  return apiClient.get<UserDeviceResponse[]>('/api/delivery/notification-devices/me', token);
}

export function registerNotificationDevice(
  token: string,
  payload: DeviceRegistrationRequest,
): Promise<UserDeviceResponse> {
  return apiClient.post<UserDeviceResponse>(
    '/api/delivery/notification-devices',
    payload,
    token,
  );
}

export function revokeNotificationDevice(
  token: string,
  deviceId: number,
): Promise<{ message?: string }> {
  return apiClient.delete<{ message?: string }>(
    `/api/delivery/notification-devices/${deviceId}`,
    token,
  );
}

export function revokeCurrentNotificationDevice(
  token: string,
  params: { fcmToken?: string; deviceId?: string },
): Promise<{ message?: string }> {
  const search = new URLSearchParams();
  if (params.fcmToken) search.set('fcmToken', params.fcmToken);
  if (params.deviceId) search.set('deviceId', params.deviceId);
  const query = search.toString();
  return apiClient.delete<{ message?: string }>(
    `/api/delivery/notification-devices/current${query ? `?${query}` : ''}`,
    token,
  );
}
