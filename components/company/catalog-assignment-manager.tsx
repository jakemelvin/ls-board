'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { Lock, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { CatalogItemResponse } from '@/lib/company/types';
import {
  Badge,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';
import { useTranslation } from '@/lib/i18n';

interface RemovalConfirmationConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export interface CatalogAssignmentConfig {
  companyId: number;
  title: string;
  subtitle: string;
  itemLabel: string;
  icon: ElementType;
  getItemIcon?: (item: CatalogItemResponse) => ElementType;
  loadCatalog: (token: string) => Promise<CatalogItemResponse[]>;
  loadAssigned: (token: string, companyId: number) => Promise<CatalogItemResponse[]>;
  add: (token: string, companyId: number, id: number) => Promise<unknown>;
  remove: (token: string, companyId: number, id: number) => Promise<unknown>;
  getRemovalConfirmation?: (
    item: CatalogItemResponse,
  ) => RemovalConfirmationConfig | null;
}

export function CatalogAssignmentManager({
  companyId,
  title,
  subtitle,
  itemLabel,
  icon: Icon,
  getItemIcon,
  loadCatalog,
  loadAssigned,
  add,
  remove,
  getRemovalConfirmation,
}: CatalogAssignmentConfig) {
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('dashboard');
  const { toast, success, error: showError } = useToastSimple();

  const [catalog, setCatalog] = useState<CatalogItemResponse[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [confirmRemoveItem, setConfirmRemoveItem] =
    useState<CatalogItemResponse | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const [catalogItems, assignedItems] = await Promise.all([
        loadCatalog(token),
        loadAssigned(token, companyId),
      ]);

      setCatalog(catalogItems);
      setAssignedIds(new Set(assignedItems.map((item) => item.id)));
    } catch (error) {
      setLoadError(
        error instanceof ApiError ? error.message : 'Erreur lors du chargement',
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, loadAssigned, loadCatalog, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const runToggle = useCallback(
    async (item: CatalogItemResponse, next: boolean) => {
      if (!token || pending.has(item.id)) {
        return;
      }

      setPending((previous) => new Set(previous).add(item.id));
      setAssignedIds((previous) => {
        const copy = new Set(previous);
        if (next) {
          copy.add(item.id);
        } else {
          copy.delete(item.id);
        }
        return copy;
      });

      try {
        if (next) {
          await add(token, companyId, item.id);
        } else {
          await remove(token, companyId, item.id);
        }

        success(next ? `« ${item.name} » active` : `« ${item.name} » retire`);
      } catch (error) {
        setAssignedIds((previous) => {
          const copy = new Set(previous);
          if (next) {
            copy.delete(item.id);
          } else {
            copy.add(item.id);
          }
          return copy;
        });
        showError(error instanceof ApiError ? error.message : 'Action impossible');
      } finally {
        setPending((previous) => {
          const copy = new Set(previous);
          copy.delete(item.id);
          return copy;
        });
      }
    },
    [add, companyId, pending, remove, showError, success, token],
  );

  const toggle = useCallback(
    async (item: CatalogItemResponse, next: boolean) => {
      if (next) {
        await runToggle(item, true);
        return;
      }

      const confirmation = getRemovalConfirmation?.(item);
      if (confirmation) {
        setConfirmRemoveItem(item);
        return;
      }

      await runToggle(item, false);
    },
    [getRemovalConfirmation, runToggle],
  );

  const confirmRemove = useCallback(async () => {
    if (!confirmRemoveItem) {
      return;
    }

    const item = confirmRemoveItem;
    setConfirmRemoveItem(null);
    await runToggle(item, false);
  }, [confirmRemoveItem, runToggle]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query
      ? catalog.filter((item) => item.name.toLowerCase().includes(query))
      : catalog;

    return [...list].sort((left, right) => {
      const leftRank = assignedIds.has(left.id) ? 0 : 1;
      const rightRank = assignedIds.has(right.id) ? 0 : 1;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.name.localeCompare(right.name);
    });
  }, [assignedIds, catalog, search]);

  const removalConfirmation = confirmRemoveItem
    ? getRemovalConfirmation?.(confirmRemoveItem) ?? null
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <StatusState
        icon={Icon}
        tone="destructive"
        title={t('common.loadError')}
        description={loadError}
        action={
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <ToastBar toast={toast} />
      <ConfirmDialog
        open={!!confirmRemoveItem && !!removalConfirmation}
        title={removalConfirmation?.title ?? t('catalog.assignment.confirmDeactivate')}
        description={removalConfirmation?.description ?? ''}
        confirmLabel={removalConfirmation?.confirmLabel ?? t('common.confirm')}
        destructive={removalConfirmation?.destructive ?? false}
        loading={confirmRemoveItem ? pending.has(confirmRemoveItem.id) : false}
        onCancel={() => setConfirmRemoveItem(null)}
        onConfirm={() => {
          void confirmRemove();
        }}
      />

      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          <Badge className="self-start bg-primary/15 text-primary sm:self-auto">
            <Icon className="h-3.5 w-3.5" />
            {t('catalog.assignment.activeCount', {
              values: { assigned: assignedIds.size, total: catalog.length },
            })}
          </Badge>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('catalog.assignment.searchPlaceholder', { values: { itemLabel } })}
          className="bg-secondary pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <StatusState
          icon={Icon}
          title={catalog.length === 0 ? t('catalog.crud.emptyTitle') : t('common.noResults')}
          description={
            catalog.length === 0
              ? t('catalog.assignment.emptyDescription', { values: { itemLabel } })
              : t('common.tryAnotherSearch')
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const isOn = assignedIds.has(item.id);
            const isPending = pending.has(item.id);
            const ItemIcon = getItemIcon ? getItemIcon(item) : Icon;

            return (
              <Card
                key={item.id}
                className={cn(
                  'border-border bg-card transition-colors',
                  isOn && 'border-primary/40 bg-primary/5',
                )}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                      isOn ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <ItemIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    {item.systemDefined && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        {t('catalog.crud.system')}
                      </span>
                    )}
                  </div>

                  {isPending ? (
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Switch
                      checked={isOn}
                      onCheckedChange={(next) => {
                        void toggle(item, next);
                      }}
                      aria-label={`${isOn ? t('catalog.assignment.actions.remove') : t('catalog.assignment.actions.activate')} ${item.name}`}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
