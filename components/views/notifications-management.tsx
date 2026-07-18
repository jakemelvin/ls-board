'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  RefreshCw,
  Send,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useLatestRequest } from '@/hooks/use-latest-request';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { getCompanies, getUsers } from '@/lib/admin/api';
import { ApiError } from '@/lib/api-client';
import { getCountries } from '@/lib/auth/api';
import type { ApiRole, CompanyResponse, CountryResponse, UserResponse, UserStatus } from '@/lib/auth/types';
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
  revokeNotificationDevice,
} from '@/lib/notifications/api';
import type {
  CreateNotificationRequest,
  NotificationCriteriaRequest,
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
  notificationTypeMeta,
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
type ComposerErrorKey =
  | 'title'
  | 'message'
  | 'selectedUsers'
  | 'criteriaUserIds'
  | 'excludeUserIds'
  | 'companyId'
  | 'countryId'
  | 'criteria';

type ComposerErrors = Partial<Record<ComposerErrorKey, string>>;

interface ComposerForm {
  targetMode: TargetMode;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  channels: NotificationChannel[];
  roles: ApiRole[];
  userStatus: UserStatus | 'ALL';
  city: string;
  companyId: string;
  countryId: string;
  criteriaUserIds: string;
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
    roles: [],
    userStatus: 'ALL',
    city: '',
    companyId: '',
    countryId: '',
    criteriaUserIds: '',
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

function parsePositiveIntegerList(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { values: undefined, invalid: false };

  const parts = trimmed
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const values = parts.map((part) => Number(part));
  const invalid = values.some((item) => !Number.isInteger(item) || item <= 0);

  return {
    values: invalid ? undefined : Array.from(new Set(values)),
    invalid,
  };
}

function toDatetimeLocalValue(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function canSendNotifications(role: ApiRole | undefined) {
  return role === 'SUPER_ADMIN';
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

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

function userDisplayName(user: UserResponse) {
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return fullName || user.username || `#${user.id}`;
}

function UserMultiSelect({
  id,
  users,
  selectedIds,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  selectedLabel,
  disabled,
}: {
  id: string;
  users: UserResponse[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  selectedLabel: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation('dashboard');
  const selectedUsers = users.filter((user) => selectedIds.includes(user.id));

  const toggleSelection = (idToToggle: number) => {
    onChange(
      selectedIds.includes(idToToggle)
        ? selectedIds.filter((item) => item !== idToToggle)
        : Array.from(new Set([...selectedIds, idToToggle])),
    );
  };

  const removeSelection = (idToRemove: number) => {
    onChange(selectedIds.filter((item) => item !== idToRemove));
  };

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="min-h-10 w-full justify-between gap-2 px-3 text-left font-normal"
          >
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {selectedIds.length > 0 ? selectedLabel : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              <CommandGroup>
                {users.map((user) => {
                  const selected = selectedIds.includes(user.id);

                  return (
                    <CommandItem
                      key={user.id}
                      value={`${userDisplayName(user)} ${user.username} ${user.id}`}
                      onSelect={() => toggleSelection(user.id)}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          selected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{userDisplayName(user)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{user.username} - {t(roleLabelKey(user.role))}
                        </span>
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="gap-1 rounded-full pr-1">
              <span className="max-w-40 truncate">{userDisplayName(user)}</span>
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                onClick={() => removeSelection(user.id)}
                aria-label={userDisplayName(user)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
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
  const typeMeta = notificationTypeMeta[notification.type];
  const TypeIcon = typeMeta.icon;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
        !notification.read && !notification.archived && 'border-primary/30 bg-primary/5',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            className={cn(
              'relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              typeMeta.className,
              notification.read && 'opacity-75',
            )}
          >
            <TypeIcon className="h-5 w-5" aria-hidden="true" />
            {!notification.read && !notification.archived && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
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
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const load = useCallback(async () => {
    const requestId = beginRequest();
    setLoading(true);
    setError(null);
    try {
      const response = await getMyNotifications(token, { status, page, size: 12 });
      if (isLatestRequest(requestId)) setData(response);
    } catch (err) {
      if (isLatestRequest(requestId)) {
        setError(err instanceof ApiError ? err.message : t('notifications.errors.load'));
      }
    } finally {
      if (isLatestRequest(requestId)) setLoading(false);
    }
  }, [beginRequest, isLatestRequest, page, status, t, token]);

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
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [excludedUserIds, setExcludedUserIds] = useState<number[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ComposerErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [usersNextPage, setUsersNextPage] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [companiesNextPage, setCompaniesNextPage] = useState(0);
  const [companiesHasMore, setCompaniesHasMore] = useState(true);

  useEffect(() => {
    if (users.length > 0) return;
    let cancelled = false;

    async function loadUsers() {
      const response = await getUsers(token, { page: 0, size: 100 });

      if (!cancelled) {
        setUsers(response.content ?? []);
        setUsersNextPage(1);
        setUsersHasMore(!response.last);
      }
    }

    setUsersLoading(true);
    loadUsers()
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, users.length]);

  const loadMoreUsers = async () => {
    if (usersLoading || !usersHasMore) return;
    setUsersLoading(true);
    try {
      const response = await getUsers(token, { page: usersNextPage, size: 100 });
      setUsers((current) => mergeById(current, response.content ?? []));
      setUsersNextPage((current) => current + 1);
      setUsersHasMore(!response.last);
    } catch (err) {
      toast({
        title: t('notifications.errors.load'),
        description: err instanceof ApiError ? err.message : t('common.genericError'),
        variant: 'destructive',
      });
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (form.targetMode !== 'criteria' || countries.length > 0) return;
    setCountriesLoading(true);
    getCountries()
      .then(setCountries)
      .catch(() => setCountries([]))
      .finally(() => setCountriesLoading(false));
  }, [countries.length, form.targetMode]);

  useEffect(() => {
    if (form.targetMode !== 'criteria' || companies.length > 0) return;
    let cancelled = false;

    async function loadCompanies() {
      const response = await getCompanies(token, { page: 0, size: 100 });

      if (!cancelled) {
        setCompanies(response.content ?? []);
        setCompaniesNextPage(1);
        setCompaniesHasMore(!response.last);
      }
    }

    setCompaniesLoading(true);
    loadCompanies()
      .catch(() => {
        if (!cancelled) setCompanies([]);
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companies.length, form.targetMode, token]);

  const loadMoreCompanies = async () => {
    if (companiesLoading || !companiesHasMore) return;
    setCompaniesLoading(true);
    try {
      const response = await getCompanies(token, { page: companiesNextPage, size: 100 });
      setCompanies((current) => mergeById(current, response.content ?? []));
      setCompaniesNextPage((current) => current + 1);
      setCompaniesHasMore(!response.last);
    } catch (err) {
      toast({
        title: t('notifications.errors.load'),
        description: err instanceof ApiError ? err.message : t('common.genericError'),
        variant: 'destructive',
      });
    } finally {
      setCompaniesLoading(false);
    }
  };

  const clearErrors = (...keys: ComposerErrorKey[]) => {
    setFieldErrors((prev) => {
      if (keys.every((key) => !prev[key])) return prev;
      const next = { ...prev };
      keys.forEach((key) => {
        delete next[key];
      });
      return next;
    });
    setSubmitError(null);
  };

  const update = <K extends keyof ComposerForm>(key: K, value: ComposerForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));

    if (key === 'title') clearErrors('title');
    if (key === 'message') clearErrors('message');
    if (key === 'criteriaUserIds') clearErrors('criteriaUserIds', 'criteria');
    if (key === 'companyId') clearErrors('companyId', 'criteria');
    if (key === 'countryId') clearErrors('countryId', 'criteria');
    if (key === 'city' || key === 'userStatus' || key === 'includeAllUsers') clearErrors('criteria');
    if (key === 'targetMode') clearErrors('selectedUsers', 'criteria', 'criteriaUserIds', 'excludeUserIds');
  };

  const toggleChannel = (channel: NotificationChannel, checked: boolean) => {
    setSubmitError(null);
    setForm((prev) => {
      const channels = checked
        ? Array.from(new Set([...prev.channels, channel]))
        : prev.channels.filter((item) => item !== channel);
      return { ...prev, channels: channels.length ? channels : ['IN_APP'] };
    });
  };

  const toggleUser = (id: number, checked: boolean) => {
    clearErrors('selectedUsers', 'criteria');
    setSelectedUserIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id),
    );
  };

  const updateExcludedUsers = (ids: number[]) => {
    clearErrors('excludeUserIds');
    setExcludedUserIds(ids);
  };

  const toggleRole = (role: ApiRole, checked: boolean) => {
    clearErrors('criteria');
    setForm((prev) => ({
      ...prev,
      roles: checked
        ? Array.from(new Set([...prev.roles, role]))
        : prev.roles.filter((item) => item !== role),
    }));
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

  const focusFirstError = (errors: ComposerErrors) => {
    const focusOrder: Array<[ComposerErrorKey, string]> = [
      ['title', 'notification-title'],
      ['message', 'notification-message'],
      ['selectedUsers', 'notification-users-panel'],
      ['criteriaUserIds', form.targetMode === 'users' ? 'notification-users-exclude' : 'notification-user-ids'],
      ['excludeUserIds', form.targetMode === 'users' ? 'notification-users-exclude' : 'notification-exclude-user-ids'],
      ['companyId', 'notification-company-id'],
      ['countryId', 'notification-country-id'],
      ['criteria', 'notification-target-panel'],
    ];
    const target = focusOrder.find(([key]) => errors[key]);
    if (!target || typeof document === 'undefined') return;
    document.getElementById(target[1])?.focus({ preventScroll: false });
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const nextErrors: ComposerErrors = {};

    if (!payload.title || !payload.message) {
      if (!payload.title) nextErrors.title = t('notifications.composer.validation.titleRequired');
      if (!payload.message) nextErrors.message = t('notifications.composer.validation.messageRequired');
    }

    const manualUserIds = parsePositiveIntegerList(form.criteriaUserIds);
    if (manualUserIds.invalid) {
      nextErrors.criteriaUserIds = t('notifications.composer.validation.userIds');
    }

    const userIds =
      form.targetMode === 'users'
        ? selectedUserIds
        : manualUserIds.values;

    if (form.targetMode === 'users' && selectedUserIds.length === 0) {
      nextErrors.selectedUsers = t('notifications.composer.validation.users');
    }

    const companyId = parsePositiveInteger(form.companyId);
    if (form.companyId.trim() && !companyId) {
      nextErrors.companyId = t('notifications.composer.validation.companyId');
    }

    const countryId = parsePositiveInteger(form.countryId);
    if (form.countryId.trim() && !countryId) {
      nextErrors.countryId = t('notifications.composer.validation.countryId');
    }

    const criteria: NotificationCriteriaRequest =
      form.targetMode === 'users'
        ? {
            userIds,
            excludeUserIds: excludedUserIds.length > 0 ? excludedUserIds : undefined,
            includeAllUsers: false,
          }
        : {
            userIds,
            excludeUserIds: excludedUserIds.length > 0 ? excludedUserIds : undefined,
            roles: form.roles.length > 0 ? form.roles : undefined,
            status: form.userStatus === 'ALL' ? undefined : form.userStatus,
            city: form.city.trim() || undefined,
            companyId,
            countryId,
            includeAllUsers: form.includeAllUsers,
          };

    const hasRecipientTarget =
      Boolean(criteria.includeAllUsers) ||
      Boolean(criteria.userIds?.length) ||
      Boolean(criteria.roles?.length) ||
      criteria.status !== undefined ||
      criteria.city !== undefined ||
      criteria.companyId !== undefined ||
      criteria.countryId !== undefined;

    if (!hasRecipientTarget) {
      nextErrors.criteria = t('notifications.composer.validation.criteria');
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      focusFirstError(nextErrors);
      toast({
        title: t('notifications.composer.validation.title'),
        description: t('notifications.composer.validation.summary'),
        variant: 'destructive',
      });
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await notifyByCriteria(token, {
        notification: payload,
        criteria,
      });

      toast({
        title: t('notifications.composer.messages.sent'),
        description: t('notifications.composer.messages.sentDescription', {
          values: { count: result.length },
        }),
      });
      setForm(emptyComposerForm());
      setSelectedUserIds([]);
      setExcludedUserIds([]);
      setSubmitError(null);
    } catch (err) {
      const description = err instanceof ApiError ? err.message : t('common.genericError');
      setSubmitError(description);
      toast({
        title: t('notifications.composer.errors.send'),
        description,
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
          <Label htmlFor="notification-title">
            {t('notifications.composer.fields.title')} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="notification-title"
            value={form.title}
            maxLength={160}
            onChange={(event) => update('title', event.target.value)}
            placeholder={t('notifications.composer.placeholders.title')}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'notification-title-error' : undefined}
            className={cn(fieldErrors.title && 'border-destructive focus-visible:ring-destructive/30')}
          />
          <FieldError id="notification-title-error" message={fieldErrors.title} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notification-message">
            {t('notifications.composer.fields.message')} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="notification-message"
            value={form.message}
            rows={5}
            onChange={(event) => update('message', event.target.value)}
            placeholder={t('notifications.composer.placeholders.message')}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={fieldErrors.message ? 'notification-message-error' : undefined}
            className={cn(fieldErrors.message && 'border-destructive focus-visible:ring-destructive/30')}
          />
          <FieldError id="notification-message-error" message={fieldErrors.message} />
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

          <TabsContent
            id="notification-users-panel"
            value="users"
            className="space-y-3 pt-2"
            tabIndex={-1}
          >
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
            {usersHasMore && (
              <Button type="button" variant="outline" className="w-full" onClick={loadMoreUsers} disabled={usersLoading}>
                {usersLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('notifications.composer.target.loadMoreUsers')}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {t('notifications.composer.target.selected', {
                values: { count: selectedUserIds.length },
              })}
            </p>
            <FieldError id="notification-users-error" message={fieldErrors.selectedUsers} />
            <div className="space-y-2">
              <Label htmlFor="notification-users-exclude">
                {t('notifications.composer.target.excludeUserIds')}
              </Label>
              <UserMultiSelect
                id="notification-users-exclude"
                users={users}
                selectedIds={excludedUserIds}
                onChange={updateExcludedUsers}
                placeholder={
                  usersLoading
                    ? t('notifications.composer.target.loadingUsers')
                    : t('notifications.composer.target.excludeUsersPlaceholder')
                }
                searchPlaceholder={t('notifications.composer.target.searchUsers')}
                emptyLabel={t('notifications.composer.target.noUsers')}
                selectedLabel={t('notifications.composer.target.selected', {
                  values: { count: excludedUserIds.length },
                })}
                disabled={usersLoading || users.length === 0}
              />
              <FieldError id="notification-users-exclude-error" message={fieldErrors.excludeUserIds} />
            </div>
          </TabsContent>

          <TabsContent
            id="notification-target-panel"
            value="criteria"
            className="space-y-3 pt-2"
            tabIndex={-1}
          >
            {fieldErrors.criteria && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {fieldErrors.criteria}
              </div>
            )}
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <Checkbox
                checked={form.includeAllUsers}
                onCheckedChange={(checked) => update('includeAllUsers', checked === true)}
              />
              {t('notifications.composer.target.includeAllUsers')}
            </label>

            <div className="space-y-2">
              <Label>{t('notifications.composer.target.roles')}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {API_ROLES.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={form.roles.includes(role)}
                      onCheckedChange={(checked) => toggleRole(role, checked === true)}
                    />
                    <span className="min-w-0 truncate">
                      {t(roleLabelKey(role))}
                    </span>
                  </label>
                ))}
              </div>
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
                <Label htmlFor="notification-user-ids">
                  {t('notifications.composer.target.userIds')}
                </Label>
                <Input
                  id="notification-user-ids"
                  value={form.criteriaUserIds}
                  onChange={(event) => update('criteriaUserIds', event.target.value)}
                  placeholder={t('notifications.composer.target.userIdsPlaceholder')}
                  aria-invalid={Boolean(fieldErrors.criteriaUserIds)}
                  aria-describedby={fieldErrors.criteriaUserIds ? 'notification-user-ids-error' : undefined}
                  className={cn(fieldErrors.criteriaUserIds && 'border-destructive focus-visible:ring-destructive/30')}
                />
                <FieldError id="notification-user-ids-error" message={fieldErrors.criteriaUserIds} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notification-exclude-user-ids">
                  {t('notifications.composer.target.excludeUserIds')}
                </Label>
                <UserMultiSelect
                  id="notification-exclude-user-ids"
                  users={users}
                  selectedIds={excludedUserIds}
                  onChange={updateExcludedUsers}
                  placeholder={
                    usersLoading
                      ? t('notifications.composer.target.loadingUsers')
                      : t('notifications.composer.target.excludeUsersPlaceholder')
                  }
                  searchPlaceholder={t('notifications.composer.target.searchUsers')}
                  emptyLabel={t('notifications.composer.target.noUsers')}
                  selectedLabel={t('notifications.composer.target.selected', {
                    values: { count: excludedUserIds.length },
                  })}
                  disabled={usersLoading || users.length === 0}
                />
                <FieldError id="notification-exclude-user-ids-error" message={fieldErrors.excludeUserIds} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notification-company-id">
                  {t('notifications.composer.target.companyId')}
                </Label>
                <Select
                  value={form.companyId || 'ALL'}
                  onValueChange={(value) => update('companyId', value === 'ALL' ? '' : value)}
                  disabled={companiesLoading}
                >
                  <SelectTrigger
                    id="notification-company-id"
                    className={cn('w-full', fieldErrors.companyId && 'border-destructive ring-destructive/30')}
                    aria-invalid={Boolean(fieldErrors.companyId)}
                    aria-describedby={fieldErrors.companyId ? 'notification-company-id-error' : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      {companiesLoading
                        ? t('notifications.composer.target.loadingCompanies')
                        : t('notifications.composer.target.allCompanies')}
                    </SelectItem>
                    {!companiesLoading && companies.length === 0 && (
                      <SelectItem value="NO_COMPANIES" disabled>
                        {t('notifications.composer.target.noCompanies')}
                      </SelectItem>
                    )}
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={String(company.id)}>
                        {company.name}
                        {company.city ? ` - ${company.city}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id="notification-company-id-error" message={fieldErrors.companyId} />
                {companiesHasMore && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={loadMoreCompanies}
                    disabled={companiesLoading}
                  >
                    {companiesLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('notifications.composer.target.loadMoreCompanies')}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notification-country-id">
                  {t('notifications.composer.target.countryId')}
                </Label>
                <Select
                  value={form.countryId || 'ALL'}
                  onValueChange={(value) => update('countryId', value === 'ALL' ? '' : value)}
                  disabled={countriesLoading}
                >
                  <SelectTrigger
                    id="notification-country-id"
                    className={cn('w-full', fieldErrors.countryId && 'border-destructive ring-destructive/30')}
                    aria-invalid={Boolean(fieldErrors.countryId)}
                    aria-describedby={fieldErrors.countryId ? 'notification-country-id-error' : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      {countriesLoading
                        ? t('notifications.composer.target.loadingCountries')
                        : t('notifications.composer.target.allCountries')}
                    </SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.countryId} value={String(country.countryId)}>
                        {country.countryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id="notification-country-id-error" message={fieldErrors.countryId} />
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

        {(Object.keys(fieldErrors).length > 0 || submitError) && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">
              {submitError
                ? t('notifications.composer.validation.submitBlocked')
                : t('notifications.composer.validation.fixBeforeSend')}
            </p>
            {submitError ? (
              <p className="mt-1 break-words">{submitError}</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {Object.entries(fieldErrors).map(([key, message]) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Button type="button" className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('notifications.composer.actions.send')}
        </Button>
      </aside>
    </div>
  );
}

function mergeById<T extends { id: number }>(current: T[], incoming: T[]) {
  const items = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => items.set(item.id, item));
  return Array.from(items.values());
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
