'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { Lock, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

import {
  Badge,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import type { CatalogItemResponse } from '@/lib/company/types';
import { useTranslation } from '@/lib/i18n';

export interface CatalogCrudConfig {
  title: string;
  subtitle: string;
  itemLabel: string;
  icon: ElementType;
  getItemIcon?: (item: CatalogItemResponse) => ElementType;
  load: (token: string) => Promise<CatalogItemResponse[]>;
  create: (token: string, name: string) => Promise<CatalogItemResponse>;
  update: (token: string, id: number, name: string) => Promise<CatalogItemResponse>;
  remove: (token: string, id: number) => Promise<unknown>;
}

function NameDialog({
  open,
  title,
  defaultValue,
  loading,
  error,
  onSave,
  onClose,
}: {
  open: boolean;
  title: string;
  defaultValue: string;
  loading: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const [name, setName] = useState(defaultValue);

  useEffect(() => {
    if (open) {
      setName(defaultValue);
    }
  }, [open, defaultValue]);

  if (!open) return null;

  const trimmed = name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="space-y-1.5">
          <Label>{t('catalog.crud.fields.name')}</Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && trimmed && !loading && onSave(trimmed)}
            placeholder={t('catalog.crud.placeholders.name')}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => onSave(trimmed)} disabled={loading || !trimmed}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CatalogCrudManager({
  title,
  subtitle,
  itemLabel,
  icon: Icon,
  getItemIcon,
  load,
  create,
  update,
  remove,
}: CatalogCrudConfig) {
  const token = useAuthStore((s) => s.token);
  const { t } = useTranslation('dashboard');
  const { toast, success, error: showError } = useToastSimple();

  const [items, setItems] = useState<CatalogItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CatalogItemResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItemResponse | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await load(token));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('catalog.crud.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [load, t, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (name: string) => {
    if (!token) return;
    setDialogLoading(true);
    setDialogError(null);
    try {
      const created = await create(token, name);
      setItems((prev) => [created, ...prev]);
      success(t('catalog.crud.messages.created', { values: { name: created.name } }));
      setCreateOpen(false);
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : t('catalog.crud.errors.create'));
    } finally {
      setDialogLoading(false);
    }
  };

  const handleUpdate = async (name: string) => {
    if (!token || !editTarget) return;
    setDialogLoading(true);
    setDialogError(null);
    try {
      const updated = await update(token, editTarget.id, name);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      success(t('catalog.crud.messages.updated', { values: { name: updated.name } }));
      setEditTarget(null);
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : t('catalog.crud.errors.update'));
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setDialogLoading(true);
    try {
      await remove(token, deleteTarget.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      success(t('catalog.crud.messages.deleted', { values: { name: deleteTarget.name } }));
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : t('catalog.crud.errors.delete'));
    } finally {
      setDialogLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = query ? items.filter((item) => item.name.toLowerCase().includes(query)) : items;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  const systemCount = items.filter((item) => item.systemDefined).length;

  return (
    <div className="space-y-5">
      <ToastBar toast={toast} />
      <NameDialog
        open={createOpen}
        title={t('catalog.crud.dialogs.createTitle', { values: { itemLabel } })}
        defaultValue=""
        loading={dialogLoading}
        error={dialogError}
        onSave={handleCreate}
        onClose={() => {
          setCreateOpen(false);
          setDialogError(null);
        }}
      />
      <NameDialog
        open={Boolean(editTarget)}
        title={t('catalog.crud.dialogs.renameTitle', { values: { itemLabel } })}
        defaultValue={editTarget?.name ?? ''}
        loading={dialogLoading}
        error={dialogError}
        onSave={handleUpdate}
        onClose={() => {
          setEditTarget(null);
          setDialogError(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('catalog.crud.dialogs.deleteTitle', { values: { itemLabel } })}
        description={t('catalog.crud.dialogs.deleteDescription', {
          values: { name: deleteTarget?.name ?? '' },
        })}
        confirmLabel={t('common.delete')}
        destructive
        loading={dialogLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button className="gap-2 self-start sm:self-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('common.add')}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('catalog.crud.searchPlaceholder', { values: { itemLabel } })}
            className="bg-secondary pl-9"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Badge className="bg-primary/15 text-primary">
            <Icon className="h-3.5 w-3.5" />
            {t('catalog.crud.totalCount', { values: { count: items.length } })}
          </Badge>
          {systemCount > 0 && (
            <Badge className="bg-muted text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {t('catalog.crud.systemCount', { values: { count: systemCount } })}
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      ) : loadError ? (
        <StatusState
          icon={Icon}
          tone="destructive"
          title={t('common.loadError')}
          description={loadError}
          action={
            <Button variant="outline" className="gap-2" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              {t('common.retry')}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <StatusState
          icon={Icon}
          title={items.length === 0 ? t('catalog.crud.emptyTitle') : t('common.noResults')}
          description={
            items.length === 0
              ? t('catalog.crud.emptyDescription', { values: { itemLabel } })
              : t('common.tryAnotherSearch')
          }
          action={
            items.length === 0 ? (
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('common.add')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const ItemIcon = getItemIcon ? getItemIcon(item) : Icon;
            return (
              <Card key={item.id} className="border-border bg-card">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setDialogError(null);
                        setEditTarget(item);
                      }}
                      title={t('catalog.crud.actions.rename')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      disabled={item.systemDefined}
                      title={item.systemDefined ? t('catalog.crud.actions.systemEntry') : t('common.delete')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
