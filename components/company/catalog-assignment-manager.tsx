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
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';

export interface CatalogAssignmentConfig {
  companyId: number;
  title: string;
  subtitle: string;
  /** Singular noun, e.g. "type de colis". */
  itemLabel: string;
  icon: ElementType;
  /** Optional per-item icon override (e.g. derived from item name). Falls back to `icon`. */
  getItemIcon?: (item: CatalogItemResponse) => ElementType;
  loadCatalog: (token: string) => Promise<CatalogItemResponse[]>;
  loadAssigned: (token: string, companyId: number) => Promise<CatalogItemResponse[]>;
  add: (token: string, companyId: number, id: number) => Promise<unknown>;
  remove: (token: string, companyId: number, id: number) => Promise<unknown>;
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
}: CatalogAssignmentConfig) {
  const token = useAuthStore((s) => s.token);
  const { toast, success, error: showError } = useToastSimple();

  const [catalog, setCatalog] = useState<CatalogItemResponse[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [catalogItems, assignedItems] = await Promise.all([
        loadCatalog(token),
        loadAssigned(token, companyId),
      ]);
      setCatalog(catalogItems);
      setAssignedIds(new Set(assignedItems.map((item) => item.id)));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [token, companyId, loadCatalog, loadAssigned]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(
    async (item: CatalogItemResponse, next: boolean) => {
      if (!token || pending.has(item.id)) return;

      setPending((prev) => new Set(prev).add(item.id));
      // Optimistic update.
      setAssignedIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(item.id);
        else copy.delete(item.id);
        return copy;
      });

      try {
        if (next) await add(token, companyId, item.id);
        else await remove(token, companyId, item.id);
        success(next ? `« ${item.name} » activé` : `« ${item.name} » retiré`);
      } catch (err) {
        // Rollback.
        setAssignedIds((prev) => {
          const copy = new Set(prev);
          if (next) copy.delete(item.id);
          else copy.add(item.id);
          return copy;
        });
        showError(err instanceof ApiError ? err.message : 'Action impossible');
      } finally {
        setPending((prev) => {
          const copy = new Set(prev);
          copy.delete(item.id);
          return copy;
        });
      }
    },
    [token, companyId, pending, add, remove, success, showError],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? catalog.filter((item) => item.name.toLowerCase().includes(q)) : catalog;
    // Assigned first, then alphabetical.
    return [...list].sort((a, b) => {
      const aOn = assignedIds.has(a.id) ? 0 : 1;
      const bOn = assignedIds.has(b.id) ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return a.name.localeCompare(b.name);
    });
  }, [catalog, assignedIds, search]);

  const assignedCount = assignedIds.size;

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
        title="Erreur de chargement"
        description={loadError}
        action={
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <ToastBar toast={toast} />

      <SectionHeader
        title={title}
        subtitle={subtitle}
        action={
          <Badge className="self-start bg-primary/15 text-primary sm:self-auto">
            <Icon className="h-3.5 w-3.5" />
            {assignedCount} / {catalog.length} activé{assignedCount > 1 ? 's' : ''}
          </Badge>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Rechercher un ${itemLabel}…`}
          className="bg-secondary pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <StatusState
          icon={Icon}
          title={catalog.length === 0 ? 'Catalogue vide' : 'Aucun résultat'}
          description={
            catalog.length === 0
              ? `Aucun ${itemLabel} n'est disponible dans le catalogue.`
              : 'Essayez un autre terme de recherche.'
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
                        Système
                      </span>
                    )}
                  </div>
                  {isPending ? (
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  ) : (
                    <Switch
                      checked={isOn}
                      onCheckedChange={(next) => toggle(item, next)}
                      aria-label={`${isOn ? 'Retirer' : 'Activer'} ${item.name}`}
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
