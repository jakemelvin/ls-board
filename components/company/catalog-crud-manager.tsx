'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { Lock, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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

export interface CatalogCrudConfig {
  title: string;
  subtitle: string;
  /** Singular noun, e.g. "type de colis". */
  itemLabel: string;
  icon: ElementType;
  /** Optional per-item icon override (e.g. derived from item name). Falls back to `icon`. */
  getItemIcon?: (item: CatalogItemResponse) => ElementType;
  load: (token: string) => Promise<CatalogItemResponse[]>;
  create: (token: string, name: string) => Promise<CatalogItemResponse>;
  update: (token: string, id: number, name: string) => Promise<CatalogItemResponse>;
  remove: (token: string, id: number) => Promise<unknown>;
}

// ─── Name dialog (create / rename) ────────────────────────────────────────────

function NameDialog({
  open, title, defaultValue, loading, error, onSave, onClose,
}: {
  open: boolean;
  title: string;
  defaultValue: string;
  loading: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultValue);
  useEffect(() => { if (open) setName(defaultValue); }, [open, defaultValue]);
  if (!open) return null;
  const trimmed = name.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && trimmed && !loading && onSave(trimmed)}
            placeholder="Ex : Express"
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button onClick={() => onSave(trimmed)} disabled={loading || !trimmed}>
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Manager ───────────────────────────────────────────────────────────────

export function CatalogCrudManager({
  title, subtitle, itemLabel, icon: Icon, getItemIcon, load, create, update, remove,
}: CatalogCrudConfig) {
  const token = useAuthStore((s) => s.token);
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
      setLoadError(err instanceof ApiError ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [token, load]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (name: string) => {
    setDialogLoading(true);
    setDialogError(null);
    try {
      const created = await create(token, name);
      setItems((prev) => [created, ...prev]);
      success(`« ${created.name} » créé`);
      setCreateOpen(false);
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : 'Création impossible');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleUpdate = async (name: string) => {
    if (!editTarget) return;
    setDialogLoading(true);
    setDialogError(null);
    try {
      const updated = await update(token, editTarget.id, name);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      success(`« ${updated.name} » mis à jour`);
      setEditTarget(null);
    } catch (err) {
      setDialogError(err instanceof ApiError ? err.message : 'Mise à jour impossible');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDialogLoading(true);
    try {
      await remove(token, deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      success(`« ${deleteTarget.name} » supprimé`);
      setDeleteTarget(null);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Suppression impossible');
    } finally {
      setDialogLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, search]);

  const systemCount = items.filter((i) => i.systemDefined).length;

  return (
    <div className="space-y-5">
      <ToastBar toast={toast} />
      <NameDialog
        open={createOpen}
        title={`Nouveau ${itemLabel}`}
        defaultValue=""
        loading={dialogLoading}
        error={dialogError}
        onSave={handleCreate}
        onClose={() => { setCreateOpen(false); setDialogError(null); }}
      />
      <NameDialog
        open={!!editTarget}
        title={`Renommer le ${itemLabel}`}
        defaultValue={editTarget?.name ?? ''}
        loading={dialogLoading}
        error={dialogError}
        onSave={handleUpdate}
        onClose={() => { setEditTarget(null); setDialogError(null); }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Supprimer le ${itemLabel}`}
        description={`Êtes-vous sûr de vouloir supprimer « ${deleteTarget?.name} » ? Les entreprises qui l'utilisent le perdront.`}
        confirmLabel="Supprimer"
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
            Ajouter
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Rechercher un ${itemLabel}…`}
            className="bg-secondary pl-9"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <Badge className="bg-primary/15 text-primary">
            <Icon className="h-3.5 w-3.5" />
            {items.length} au total
          </Badge>
          {systemCount > 0 && (
            <Badge className="bg-muted text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              {systemCount} système
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
          title="Erreur de chargement"
          description={loadError}
          action={<Button variant="outline" className="gap-2" onClick={refresh}><RefreshCw className="h-4 w-4" />Réessayer</Button>}
        />
      ) : filtered.length === 0 ? (
        <StatusState
          icon={Icon}
          title={items.length === 0 ? 'Catalogue vide' : 'Aucun résultat'}
          description={
            items.length === 0
              ? `Créez votre premier ${itemLabel}.`
              : 'Essayez un autre terme de recherche.'
          }
          action={items.length === 0 ? (
            <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Ajouter</Button>
          ) : undefined}
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
                      Système
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setDialogError(null); setEditTarget(item); }}
                    title="Renommer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    disabled={item.systemDefined}
                    title={item.systemDefined ? 'Entrée système — non supprimable' : 'Supprimer'}
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
