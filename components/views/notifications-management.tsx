'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Send,
  Smartphone,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { getUsers } from '@/lib/admin/api';
import { ApiError } from '@/lib/api-client';
import type { ApiRole, UserResponse, UserStatus } from '@/lib/auth/types';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import {
  archiveNotification,
  deleteNotification,
  getMyNotificationDevices,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  notifyByCriteria,
  notifyUsers,
  revokeNotificationDevice,
} from '@/lib/notifications/api';
import type {
  CreateNotificationRequest,
  NotificationChannel,
  NotificationPriority,
  NotificationResponse,
  NotificationStatus,
  NotificationType,
  UserDeviceResponse,
} from '@/lib/notifications/types';
import { cn } from '@/lib/utils';
import {
  formatNotificationDate,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
  priorityClassName,
} from '@/components/notifications/notification-shared';

const API_ROLES: ApiRole[] = [
  'CLIENT',
  'COLLECTOR',
  'TRANSPORTER',
  'ADMIN_COMPANY',
  'EMPLOYEE_COMPANY',
  'SUPER_ADMIN',
];

const USER_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED'];
const CHANNELS: NotificationChannel[] = ['IN_APP', 'PUSH', 'EMAIL'];

type TargetMode = 'users' | 'criteria';

interface ComposerForm {
  targetMode: TargetMode;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  channels: NotificationChannel[];
  role: ApiRole | 'ALL';
  userStatus: UserStatus | 'ALL';
  city: string;
  companyId: string;
  includeAllUsers: boolean;
  relatedEntityType: string;
  relatedEntityId: string;
  deduplicationKey: string;
  expiresAt: string;
}

function emptyComposerForm(): ComposerForm {
  return {
    targetMode: 'users',
    type: 'SYSTEM',
    priority: 'NORMAL',
    title: '',
    message: '',
    channels: ['IN_APP'],
    role: 'ALL',
    userStatus: 'ACTIVE',
    city: '',
    companyId: '',
    includeAllUsers: false,
    relatedEntityType: '',
    relatedEntityId: '',
    deduplicationKey: '',
    expiresAt: '',
  };
}

function parsePositiveInteger(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toDatetimeLocalValue(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function canSendNotifications(role: ApiRole | undefined) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN_COMPANY';
}

function roleLabelKey(role: ApiRole) {
  switch (role) {
    case 'CLIENT':
      return 'superAdmin.roles.client';
    case 'ADMIN_COMPANY':
      return 'roles.adminCompany';
    case 'EMPLOYEE_COMPANY':
      return 'roles.employee';
    case 'COLLECTOR':
      return 'roles.collector';
    case 'TRANSPORTER':
      return 'roles.transporter';
    case 'SUPER_ADMIN':
      return 'roles.superAdmin';
  }
}

function NotificationCard({
  notification,
  locale,
  actionId,
  onMarkRead,
  onArchive,
  onDelete,
}: {
  notification: NotificationResponse;
  locale: string;
  actionId: number | null;
  onMarkRead: (notification: NotificationResponse) => void;
  onArchive: (notification: NotificationResponse) => void;
  onDelete: (notification: NotificationResponse) => void;
}) {
  const { t } = useTranslation('dashboard');
  const busy = actionId === notification.id;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
        !notification.read && !notification.archived && 'border-primary/30 bg-primary/5',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {!notification.read && !notification.archived && (
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            )}
            <h3 className="break-words font-semibold text-foreground">{notification.title}</h3>
            <Badge
              variant="outline"
              className={cn('rounded-full border', priorityClassName[notification.priority])}
            >
              {t(`notifications.priority.${notification.priority}`)}
            </Badge>
          </div>
          <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
            {notification.message}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{t(`notifications.types.${notification.type}`)}</Badge>
            {notification.archived && (
              <Badge variant="outline">{t('notifications.status.ARCHIVED')}</Badge>
            )}
            {notification.createdAt && (
              <span className="inline-flex items-center px-1">
                {formatNotificationDate(notification.createdAt, locale)}
              </span>
            )}
            {notification.relatedEntityType && (
              <span className="inline-flex items-center px-1">
                {notification.relatedEntityType}
                {notification.relatedEntityId ? ` #${notification.relatedEntityId}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-1">
          {!notification.read && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title={t('notifications.actions.markRead')}
              onClick={() => onMarkRead(notification)}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            </Button>
          )}
          {!notification.archived && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title={t('notifications.actions.archive')}
              onClick={() => onArchive(notification)}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            title={t('common.delete')}
            onClick={() => onDelete(notification)}
            disabled={busy}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InboxTab({ token }: { token: string }) {
  const { locale, t } = useTranslation('dashboard');
  const [status, setStatus] = useState<NotificationStatus>('ALL');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{
    content: NotificationResponse[];
    totalElements: number;
    totalPages: number;
    number: number;
    last: boolean;
    first: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyNotifications(token, { status, page, size: 12 });
      setData(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('notifications.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [page, status, t, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchNotification = (updated: NotificationResponse) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            content: prev.content
              .map((item) => (item.id === updated.id ? updated : item))
              .filter((item) => {
                if (status === 'UNREAD') return !item.read && !item.archived;
                if (status === 'READ') return item.read && !item.archived;
                if (status === 'ARCHIVED') return item.archived;
                return true;
              }),
          }
        : prev,
    );
  };

  const runNotificationAction = async (
    notification: NotificationResponse,
    action: () => Promise<NotificationResponse | void>,
    successKey?: string,
  ) => {
    setActionId(notification.id);
    try {
      const updated = await action();
      if (updated) {
        patchNotification(updated);
      } else {
        setData((prev) =>
          prev
            ? { ...prev, content: prev.content.filter((item) => item.id !== notification.id) }
            : prev,
        );
      }
      if (successKey) toast({ title: t(successKey) });
    } catch (err) {
      toast({
        title: t('notifications.errors.action'),
        description: err instanceof ApiError ? err.message : t('common.genericError'),
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleReadAll = async () => {
    setLoading(true);
    try {
      await markAllNotificationsAsRead(token);
      await load();
      toast({ title: t('notifications.messages.readAll') });
    } catch (err) {
      toast({
        title: t('notifications.errors.action'),
        description: err instanceof ApiError ? err.message : t('common.genericError'),
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={status}
          onValueChange={(value) => {
            setStatus(value as NotificationStatus);
            setPage(0);
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-4 sm:w-fit">
            {NOTIFICATION_STATUSES.map((item) => (
              <TabsTrigger key={item} value={item} className="px-2 text-xs sm:text-sm">
                {t(`notifications.status.${item}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
          <Button type="button" size="sm" onClick={handleReadAll} disabled={loading}>
            <CheckCheck className="h-4 w-4" />
            {t('notifications.actions.markAllRead')}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('notifications.loading')}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={load}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!loading && !error && data?.content.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-5 py-16 text-center">
          <Bell className="mx-auto h-9 w-9 text-muted-foreground/60" />
          <p className="mt-3 font-medium text-foreground">{t('notifications.empty.title')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('notifications.empty.description')}</p>
        </div>
      )}

      {!loading && !error && data && data.content.length > 0 && (
        <div className="space-y-3">
          {data.content.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              locale={locale}
              actionId={actionId}
              onMarkRead={(item) =>
                runNotificationAction(item, () => markNotificationAsRead(token, item.id))
              }
              onArchive={(item) =>
                runNotificationAction(
                  item,
                  () => archiveNotification(token, item.id),
                  'notifications.messages.archived',
                )
              }
              onDelete={(item) =>
                runNotificationAction(
                  item,
                  () => deleteNotification(token, item.id).then(() => undefined),
                  'notifications.messages.deleted',
                )
              }
            />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t('notifications.pagination.total', { values: { count: data.totalElements } })}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={data.first}
              title={t('notifications.pagination.previous')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-medium text-foreground">
              {t('notifications.pagination.current', {
                values: { page: page + 1, total: data.totalPages },
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((value) => value + 1)}
              disabled={data.last}
              title={t('notifications.pagination.next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ComposerTab({ token }: { token: string }) {
  const { t } = useTranslation('dashboard');
  const [form, setForm] = useState<ComposerForm>(() => emptyComposerForm());
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (form.targetMode !== 'users') return;
    setUsersLoading(true);
    getUsers(token, { page: 0, size: 50 })
      .then((page) => setUsers(page.content ?? []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [form.targetMode, token]);

  const update = <K extends keyof ComposerForm>(key: K, value: ComposerForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleChannel = (channel: NotificationChannel, checked: boolean) => {
    setForm((prev) => {
      const channels = checked
        ? Array.from(new Set([...prev.channels, channel]))
        : prev.channels.filter((item) => item !== channel);
      return { ...prev, channels: channels.length ? channels : ['IN_APP'] };
    });
  };

  const toggleUser = (id: number, checked: boolean) => {
    setSelectedUserIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id),
    );
  };

  const payload = useMemo<CreateNotificationRequest>(() => ({
    type: form.type,
    title: form.title.trim(),
    message: form.message.trim(),
    priority: form.priority,
    channels: form.channels,
    relatedEntityType: form.relatedEntityType.trim() || undefined,
    relatedEntityId: form.relatedEntityId.trim() || undefined,
    deduplicationKey: form.deduplicationKey.trim() || undefined,
    expiresAt: toDatetimeLocalValue(form.expiresAt),
  }), [form]);

  const handleSubmit = async () => {
    if (!payload.title || !payload.message) {
      toast({ title: t('notifications.composer.validation.required'), variant: 'destructive' });
      return;
    }

    if (form.targetMode === 'users' && selectedUserIds.length === 0) {
      toast({ title: t('notifications.composer.validation.users'), variant: 'destructive' });
      return;
    }

    const companyId = parsePositiveInteger(form.companyId);
    if (form.companyId.trim() && !companyId) {
      toast({ title: t('notifications.composer.validation.companyId'), variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const result =
        form.targetMode === 'users'
          ? await notifyUsers(token, selectedUserIds, payload)
          : await notifyByCriteria(token, {
              notification: payload,
              criteria: {
                roles: form.role === 'ALL' ? undefined : [form.role],
                status: form.userStatus === 'ALL' ? undefined : form.userStatus,
                city: form.city.trim() || undefined,
                companyId,
                includeAllUsers: form.includeAllUsers,
              },
            });

      toast({
        title: t('notifications.composer.messages.sent'),
        description: t('notifications.composer.messages.sentDescription', {
          values: { count: result.length },
        }),
      });
      setForm(emptyComposerForm());
      setSelectedUserIds([]);
    } catch (err) {
      toast({
        title: t('notifications.composer.errors.send'),
        description: err instanceof ApiError ? err.message : t('common.genericError'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-semibold text-foreground">{t('notifications.composer.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('notifications.composer.subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('notifications.composer.fields.type')}</Label>
            <Select value={form.type} onValueChange={(value) => update('type', value as NotificationType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`notifications.types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('notifications.composer.fields.priority')}</Label>
            <Select
              value={form.priority}
              onValueChange={(value) => update('priority', value as NotificationPriority)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {t(`notifications.priority.${priority}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification-title">{t('notifications.composer.fields.title')}</Label>
          <Input
            id="notification-title"
            value={form.title}
            maxLength={160}
            onChange={(event) => update('title', event.target.value)}
            placeholder={t('notifications.composer.placeholders.title')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification-message">{t('notifications.composer.fields.message')}</Label>
          <Textarea
            id="notification-message"
            value={form.message}
            rows={5}
            onChange={(event) => update('message', event.target.value)}
            placeholder={t('notifications.composer.placeholders.message')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="notification-entity-type">
              {t('notifications.composer.fields.relatedEntityType')}
            </Label>
            <Input
              id="notification-entity-type"
              value={form.relatedEntityType}
              onChange={(event) => update('relatedEntityType', event.target.value)}
              placeholder={t('notifications.composer.placeholders.relatedEntityType')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notification-entity-id">
              {t('notifications.composer.fields.relatedEntityId')}
            </Label>
            <Input
              id="notification-entity-id"
              value={form.relatedEntityId}
              onChange={(event) => update('relatedEntityId', event.target.value)}
              placeholder={t('notifications.composer.placeholders.relatedEntityId')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notification-expires-at">
              {t('notifications.composer.fields.expiresAt')}
            </Label>
            <Input
              id="notification-expires-at"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => update('expiresAt', event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('notifications.composer.fields.channels')}</Label>
          <div className="flex flex-wrap gap-3">
            {CHANNELS.map((channel) => (
              <label
                key={channel}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={form.channels.includes(channel)}
                  onCheckedChange={(checked) => toggleChannel(channel, checked === true)}
                />
                {t(`notifications.channels.${channel}`)}
              </label>
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-semibold text-foreground">{t('notifications.composer.target.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('notifications.composer.target.subtitle')}</p>
        </div>

        <Tabs
          value={form.targetMode}
          onValueChange={(value) => update('targetMode', value as TargetMode)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">{t('notifications.composer.target.users')}</TabsTrigger>
            <TabsTrigger value="criteria">{t('notifications.composer.target.criteria')}</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3 pt-2">
            {usersLoading && (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('notifications.composer.target.loadingUsers')}
              </div>
            )}
            {!usersLoading && users.length === 0 && (
              <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                {t('notifications.composer.target.noUsers')}
              </p>
            )}
            {!usersLoading && users.length > 0 && (
              <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={(checked) => toggleUser(user.id, checked === true)}
                    />
                    <span className="min-w-0">
                      <span className="block break-words font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="block break-words text-xs text-muted-foreground">
                        @{user.username} - {t(roleLabelKey(user.role))}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('notifications.composer.target.selected', {
                values: { count: selectedUserIds.length },
              })}
            </p>
          </TabsContent>

          <TabsContent value="criteria" className="space-y-3 pt-2">
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <Checkbox
                checked={form.includeAllUsers}
                onCheckedChange={(checked) => update('includeAllUsers', checked === true)}
              />
              {t('notifications.composer.target.includeAllUsers')}
            </label>

            <div className="space-y-2">
              <Label>{t('notifications.composer.target.role')}</Label>
              <Select value={form.role} onValueChange={(value) => update('role', value as ApiRole | 'ALL')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('notifications.composer.target.allRoles')}</SelectItem>
                  {API_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {t(roleLabelKey(role))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('notifications.composer.target.status')}</Label>
              <Select
                value={form.userStatus}
                onValueChange={(value) => update('userStatus', value as UserStatus | 'ALL')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('notifications.composer.target.allStatuses')}</SelectItem>
                  {USER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`notifications.composer.userStatuses.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notification-company-id">
                  {t('notifications.composer.target.companyId')}
                </Label>
                <Input
                  id="notification-company-id"
                  inputMode="numeric"
                  value={form.companyId}
                  onChange={(event) => update('companyId', event.target.value)}
                  placeholder="12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notification-city">{t('notifications.composer.target.city')}</Label>
                <Input
                  id="notification-city"
                  value={form.city}
                  onChange={(event) => update('city', event.target.value)}
                  placeholder={t('notifications.composer.target.cityPlaceholder')}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="notification-dedup">
            {t('notifications.composer.fields.deduplicationKey')}
          </Label>
          <Input
            id="notification-dedup"
            value={form.deduplicationKey}
            onChange={(event) => update('deduplicationKey', event.target.value)}
            placeholder={t('notifications.composer.placeholders.deduplicationKey')}
          />
        </div>

        <Button type="button" className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('notifications.composer.actions.send')}
        </Button>
      </aside>
    </div>
  );
}

function DevicesTab({ token }: { token: string }) {
  const { locale, t } = useTranslation('dashboard');
  const [devices, setDevices] = useState<UserDeviceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyNotificationDevices(token);
      setDevices(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('notifications.devices.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevoke = async (device: UserDeviceResponse) => {
    setActionId(device.id);
    try {
      await revokeNotificationDevice(token, device.id);
      setDevices((items) => items.filter((item) => item.id !== device.id));
      toast({ title: t('notifications.devices.messages.revoked') });
    } catch (err) {
      toast({
        title: t('notifications.devices.errors.revoke'),
        description: err instanceof ApiError ? err.message : t('common.genericError'),
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-semibold text-foreground">{t('notifications.devices.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('notifications.devices.subtitle')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          {t('common.refresh')}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('notifications.loading')}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={load}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!loading && !error && devices.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-5 py-16 text-center">
          <Smartphone className="mx-auto h-9 w-9 text-muted-foreground/60" />
          <p className="mt-3 font-medium text-foreground">{t('notifications.devices.empty.title')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('notifications.devices.empty.description')}
          </p>
        </div>
      )}

      {!loading && !error && devices.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {devices.map((device) => (
            <div key={device.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <h3 className="break-words font-semibold text-foreground">
                      {device.deviceName || t('notifications.devices.unknownDevice')}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{device.platform}</p>
                </div>
                <Badge variant={device.enabled ? 'default' : 'secondary'}>
                  {device.enabled ? t('notifications.devices.enabled') : t('notifications.devices.disabled')}
                </Badge>
              </div>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                {device.deviceId && <p className="break-words">{device.deviceId}</p>}
                {device.appVersion && (
                  <p>{t('notifications.devices.appVersion', { values: { version: device.appVersion } })}</p>
                )}
                {device.lastSeenAt && (
                  <p>
                    {t('notifications.devices.lastSeen', {
                      values: { date: formatNotificationDate(device.lastSeenAt, locale) },
                    })}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleRevoke(device)}
                disabled={actionId === device.id}
              >
                {actionId === device.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t('notifications.devices.actions.revoke')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotificationsManagement() {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((s) => s.token);
  const authRole = useAuthStore((s) => s.role);
  const canCompose = canSendNotifications(authRole);

  if (!token) return null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('notifications.pageTitle')}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t('notifications.pageSubtitle')}</p>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className={cn('grid h-auto w-full', canCompose ? 'grid-cols-3' : 'grid-cols-2', 'sm:w-fit')}>
          <TabsTrigger value="inbox">
            <Bell className="h-4 w-4" />
            {t('notifications.tabs.inbox')}
          </TabsTrigger>
          {canCompose && (
            <TabsTrigger value="composer">
              <Send className="h-4 w-4" />
              {t('notifications.tabs.composer')}
            </TabsTrigger>
          )}
          <TabsTrigger value="devices">
            <Smartphone className="h-4 w-4" />
            {t('notifications.tabs.devices')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <InboxTab token={token} />
        </TabsContent>
        {canCompose && (
          <TabsContent value="composer">
            <ComposerTab token={token} />
          </TabsContent>
        )}
        <TabsContent value="devices">
          <DevicesTab token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
