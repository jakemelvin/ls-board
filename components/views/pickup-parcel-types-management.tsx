'use client';

import { useCallback, useEffect, useState } from 'react';
import { Boxes, Pencil, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/auth/store';
import { createPickupParcelType, getPickupParcelTypes, setPickupParcelTypeActive, updatePickupParcelType } from '@/lib/pickups/api';
import type { PickupParcelTypeResponse } from '@/lib/pickups/types';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function PickupParcelTypesManagement() {
  const { t } = useTranslation('pickups');
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);
  const [items, setItems] = useState<PickupParcelTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PickupParcelTypeResponse | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try { setItems(await getPickupParcelTypes(token, true)); }
    catch (err) { toast({ title: t('messages.loadError'), description: err instanceof Error ? err.message : undefined, variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [t, toast, token]);
  useEffect(() => void load(), [load]);

  const openEditor = (item: PickupParcelTypeResponse | null) => { setEditing(item); setName(item?.name ?? ''); setDescription(item?.description ?? ''); };
  const save = async () => {
    if (!token || !name.trim()) return;
    setSaving(true);
    try {
      if (editing) await updatePickupParcelType(token, editing.id, { name: name.trim(), description: description.trim() || undefined });
      else await createPickupParcelType(token, { name: name.trim(), description: description.trim() || undefined });
      toast({ title: t('catalog.saved') }); setEditing(undefined); await load();
    } catch (err) { toast({ title: t('messages.actionError'), description: err instanceof Error ? err.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const toggle = async (item: PickupParcelTypeResponse, active: boolean) => {
    if (!token) return;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, active } : entry));
    try { await setPickupParcelTypeActive(token, item.id, active); toast({ title: t('catalog.statusUpdated') }); }
    catch (err) { setItems((current) => current.map((entry) => entry.id === item.id ? item : entry)); toast({ title: t('messages.actionError'), description: err instanceof Error ? err.message : undefined, variant: 'destructive' }); }
  };

  return <>
    <Card className="border-border bg-card"><CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="flex items-center gap-2"><Boxes className="h-5 w-5 text-primary" />{t('catalog.title')}</CardTitle><CardDescription>{t('catalog.subtitle')}</CardDescription></div><Button className="gap-2" onClick={() => openEditor(null)}><Plus className="h-4 w-4" />{t('catalog.create')}</Button></CardHeader><CardContent>
      {loading ? <div className="flex min-h-36 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div> : items.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{t('catalog.empty')}</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-foreground">{item.name}</p><p className="mt-1 text-sm text-muted-foreground">{item.description || '—'}</p></div><Badge className={cn('border-0', item.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>{t(item.active ? 'catalog.active' : 'catalog.inactive')}</Badge></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={item.active} onCheckedChange={(checked) => void toggle(item, checked)} />{t('catalog.active')}</label><Button variant="ghost" size="sm" className="gap-2" onClick={() => openEditor(item)}><Pencil className="h-4 w-4" />{t('actions.edit')}</Button></div></article>)}</div>}
    </CardContent></Card>
    <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}><DialogContent><DialogHeader><DialogTitle>{t(editing ? 'catalog.edit' : 'catalog.create')}</DialogTitle><DialogDescription>{t('catalog.subtitle')}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="pickup-type-name">{t('catalog.name')}</Label><Input id="pickup-type-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></div><div className="space-y-2"><Label htmlFor="pickup-type-description">{t('catalog.description')}</Label><Textarea id="pickup-type-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></div></div><DialogFooter><Button variant="outline" onClick={() => setEditing(undefined)} disabled={saving}>{t('actions.cancel')}</Button><Button onClick={() => void save()} disabled={saving || !name.trim()}>{saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('actions.confirm')}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
