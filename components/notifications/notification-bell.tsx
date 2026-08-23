'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  CheckCheck,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useFirebasePushNotifications } from '@/hooks/use-firebase-push-notifications';
import { ApiError } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import {
  archiveNotification,
  deleteNotification,
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/lib/notifications/api';
import type {
  NotificationResponse,
  NotificationStatus,
} from '@/lib/notifications/types';
import { cn } from '@/lib/utils';
import {
  formatNotificationDate,
  getNotificationTypeMeta,
  NOTIFICATION_STATUSES,
  priorityClassName,
} from './notification-shared';

interface NotificationBellProps {
  token: string;
}

export function NotificationBell({ token }: NotificationBellProps) {
  const { locale, t } = useTranslation('dashboard');
  const push = useFirebasePushNotifications(token);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NotificationStatus>('ALL');
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | 'all' | null>(null);

  const loadCount = useCallback(async () => {
    setCountLoading(true);
    try {
      const response = await getUnreadNotificationCount(token);
      setUnreadCount(response.unreadCount ?? 0);
    } catch {
      setUnreadCount(0);
    } finally {
      setCountLoading(false);
    }
  }, [token]);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await getMyNotifications(token, { status, size: 10 });
      setNotifications(page.content ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('notifications.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [status, t, token]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadCount();
      }
    };

    refreshWhenVisible();
    const intervalId = window.setInterval(() => {
      refreshWhenVisible();
    }, 60000);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadCount]);

  useEffect(() => {
    if (open) {
      void loadNotifications();
    }
  }, [loadNotifications, open]);

  const badgeLabel = useMemo(() => {
    if (unreadCount > 99) return '99+';
    return String(unreadCount);
  }, [unreadCount]);

  const patchNotification = (updated: NotificationResponse) => {
    setNotifications((items) =>
      items
        .map((item) => (item.id === updated.id ? updated : item))
        .filter((item) => {
          if (status === 'UNREAD') return !item.read && !item.archived;
          if (status === 'READ') return item.read && !item.archived;
          if (status === 'ARCHIVED') return item.archived;
          return true;
        }),
    );
  };

  const handleMarkRead = async (notification: NotificationResponse) => {
    if (notification.read) return;
    setActionId(notification.id);
    try {
      const updated = await markNotificationAsRead(token, notification.id);
      patchNotification(updated);
      await loadCount();
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

  const handleArchive = async (notification: NotificationResponse) => {
    setActionId(notification.id);
    try {
      const updated = await archiveNotification(token, notification.id);
      patchNotification(updated);
      await loadCount();
      toast({ title: t('notifications.messages.archived') });
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

  const handleDelete = async (notification: NotificationResponse) => {
    setActionId(notification.id);
    try {
      await deleteNotification(token, notification.id);
      setNotifications((items) => items.filter((item) => item.id !== notification.id));
      await loadCount();
      toast({ title: t('notifications.messages.deleted') });
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

  const handleMarkAllRead = async () => {
    setActionId('all');
    try {
      await markAllNotificationsAsRead(token);
      await Promise.all([loadNotifications(), loadCount()]);
      toast({ title: t('notifications.messages.readAll') });
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t('notifications.title')}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {countLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
              {badgeLabel}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[calc(100vw-1.5rem)] max-w-[26rem] p-0">
        <div className="border-b border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t('notifications.title')}</h2>
              <p className="text-xs text-muted-foreground">
                {t('notifications.unreadCount', { values: { count: unreadCount } })}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {push.state !== 'registered' && push.state !== 'unsupported' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={push.registerDevice}
                  disabled={push.isRegistering || push.state === 'denied'}
                >
                  {push.isRegistering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {push.state === 'denied'
                    ? t('notifications.push.denied')
                    : t('notifications.push.enable')}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={t('common.refresh')}
                onClick={() => {
                  void loadNotifications();
                  void loadCount();
                }}
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={t('notifications.actions.markAllRead')}
                onClick={handleMarkAllRead}
                disabled={actionId === 'all' || unreadCount === 0}
              >
                {actionId === 'all' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Tabs value={status} onValueChange={(value) => setStatus(value as NotificationStatus)} className="mt-3">
            <TabsList className="grid h-auto w-full grid-cols-4">
              {NOTIFICATION_STATUSES.map((item) => (
                <TabsTrigger key={item} value={item} className="px-1 text-xs">
                  {t(`notifications.status.${item}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-[min(28rem,70dvh)]">
          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('notifications.loading')}
            </div>
          )}

          {!loading && error && (
            <div className="space-y-3 p-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={loadNotifications}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium text-foreground">
                {t('notifications.empty.title')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('notifications.empty.description')}
              </p>
            </div>
          )}

          {!loading && !error && notifications.length > 0 && (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const busy = actionId === notification.id;
                const typeMeta = getNotificationTypeMeta(notification.type);
                const TypeIcon = typeMeta.icon;

                return (
                  <article
                    key={notification.id}
                    className={cn(
                      'group p-4 transition-colors hover:bg-muted/40',
                      !notification.read && !notification.archived && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                          typeMeta.className,
                          notification.read && 'opacity-70',
                        )}
                      >
                        <TypeIcon className="h-4 w-4" aria-hidden="true" />
                        {!notification.read && !notification.archived && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">
                            {notification.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              'rounded-full border text-[0.65rem]',
                              priorityClassName[notification.priority],
                            )}
                          >
                            {t(`notifications.priority.${notification.priority}`)}
                          </Badge>
                        </div>
                        <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{t(`notifications.types.${notification.type}`)}</span>
                          {notification.createdAt && (
                            <>
                              <span aria-hidden="true">.</span>
                              <span>{formatNotificationDate(notification.createdAt, locale)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-1">
                      {!notification.read && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkRead(notification)}
                          disabled={busy}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                          {t('notifications.actions.markRead')}
                        </Button>
                      )}
                      {!notification.archived && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title={t('notifications.actions.archive')}
                          onClick={() => handleArchive(notification)}
                          disabled={busy}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title={t('common.delete')}
                        onClick={() => handleDelete(notification)}
                        disabled={busy}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
