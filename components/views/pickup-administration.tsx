'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, MessageSquarePlus, Pencil, RefreshCw, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataPagination } from '@/components/ui/data-pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import {
  createPickupNegotiationMessage,
  getPickupAdministrationConfiguration,
  getPickupAdministrationMessages,
  getPickupConfigurationHistory,
  setPickupNegotiationMessageActive,
  updatePickupAdministrationConfiguration,
  updatePickupNegotiationMessage,
} from '@/lib/pickups/api';
import type { PickupConfigurationHistoryResponse, PickupConfigurationResponse, PickupMessageLanguage, PickupNegotiationMessageRequest, PickupNegotiationMessageResponse, PickupNegotiationParty } from '@/lib/pickups/types';

const EMPTY_MESSAGE: PickupNegotiationMessageRequest = { intervenant: 'CLIENT', language: 'FR', text: '', active: true };

export function PickupAdministration() {
  const { t, locale } = useTranslation('pickups');
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);
  const [configuration, setConfiguration] = useState<PickupConfigurationResponse | null>(null);
  const [messages, setMessages] = useState<PickupNegotiationMessageResponse[]>([]);
  const [history, setHistory] = useState<PickupConfigurationHistoryResponse[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotalElements, setHistoryTotalElements] = useState(0);
  const [party, setParty] = useState<PickupNegotiationParty | 'ALL'>('ALL');
  const [language, setLanguage] = useState<PickupMessageLanguage | 'ALL'>('ALL');
  const [active, setActive] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configForm, setConfigForm] = useState({ maxCounterOffers: '', depositPercentage: '', reason: '' });
  const [editingMessage, setEditingMessage] = useState<PickupNegotiationMessageResponse | null | undefined>(undefined);
  const [messageForm, setMessageForm] = useState<PickupNegotiationMessageRequest>(EMPTY_MESSAGE);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [nextConfig, nextMessages, nextHistory] = await Promise.all([
        getPickupAdministrationConfiguration(token),
        getPickupAdministrationMessages(token, { intervenant: party === 'ALL' ? undefined : party, language: language === 'ALL' ? undefined : language, active: active === 'ALL' ? undefined : active === 'true' }),
        getPickupConfigurationHistory(token, historyPage),
      ]);
      setConfiguration(nextConfig);
      setConfigForm({ maxCounterOffers: String(nextConfig.maxCounterOffers), depositPercentage: String(nextConfig.depositPercentage), reason: '' });
      setMessages(nextMessages.content ?? []);
      setHistory(nextHistory.content ?? []);
      setHistoryTotalPages(nextHistory.totalPages ?? 0);
      setHistoryTotalElements(nextHistory.totalElements ?? 0);
    } catch (error) {
      toast({ title: t('administration.messages.loadError'), description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [active, historyPage, language, party, t, toast, token]);

  useEffect(() => { void load(); }, [load]);

  const saveConfiguration = async () => {
    if (!token || !configuration) return;
    const maxCounterOffers = Number(configForm.maxCounterOffers);
    const depositPercentage = Number(configForm.depositPercentage);
    if (!Number.isInteger(maxCounterOffers) || maxCounterOffers < 1 || maxCounterOffers > 100 || Number.isNaN(depositPercentage) || depositPercentage < 0 || depositPercentage > 100) {
      toast({ title: t('administration.messages.invalidConfiguration'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await updatePickupAdministrationConfiguration(token, { maxCounterOffers, depositPercentage, reason: configForm.reason.trim() || undefined });
      toast({ title: t('administration.messages.configurationSaved') });
      await load();
    } catch (error) { toast({ title: t('administration.messages.saveError'), description: error instanceof Error ? error.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const openMessage = (message: PickupNegotiationMessageResponse | null) => {
    setEditingMessage(message);
    setMessageForm(message ? { intervenant: message.intervenant, language: message.language, text: message.text, active: message.active } : EMPTY_MESSAGE);
  };
  const saveMessage = async () => {
    if (!token || !messageForm.text.trim()) return;
    setSaving(true);
    try {
      if (editingMessage) await updatePickupNegotiationMessage(token, editingMessage.id, { ...messageForm, text: messageForm.text.trim() });
      else await createPickupNegotiationMessage(token, { ...messageForm, text: messageForm.text.trim() });
      toast({ title: t('administration.messages.messageSaved') }); setEditingMessage(undefined); await load();
    } catch (error) { toast({ title: t('administration.messages.saveError'), description: error instanceof Error ? error.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const toggleMessage = async (message: PickupNegotiationMessageResponse) => {
    if (!token) return; setSaving(true);
    try { await setPickupNegotiationMessageActive(token, message.id, !message.active); toast({ title: t('administration.messages.messageUpdated') }); await load(); }
    catch (error) { toast({ title: t('administration.messages.saveError'), description: error instanceof Error ? error.message : undefined, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return <div className="min-w-0 space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold">{t('administration.title')}</h1><p className="text-sm text-muted-foreground">{t('administration.subtitle')}</p></div><Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading || saving}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('actions.refresh')}</Button></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />{t('administration.configuration.title')}</CardTitle><CardDescription>{t('administration.configuration.description')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label={t('administration.configuration.maxCounterOffers')}><Input type="number" min="1" max="100" value={configForm.maxCounterOffers} onChange={(event) => setConfigForm((current) => ({ ...current, maxCounterOffers: event.target.value }))} /></Field><Field label={t('administration.configuration.depositPercentage')}><Input type="number" min="0" max="100" step="0.01" value={configForm.depositPercentage} onChange={(event) => setConfigForm((current) => ({ ...current, depositPercentage: event.target.value }))} /></Field></div><Field label={t('administration.configuration.reason')}><Textarea value={configForm.reason} maxLength={500} onChange={(event) => setConfigForm((current) => ({ ...current, reason: event.target.value }))} /></Field><Button className="w-full sm:w-auto" onClick={() => void saveConfiguration()} disabled={loading || saving || !configuration}>{t('administration.configuration.save')}</Button></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />{t('administration.history.title')}</CardTitle><CardDescription>{t('administration.history.description')}</CardDescription></CardHeader><CardContent className="space-y-3">{history.length === 0 ? <Empty label={t('administration.history.empty')} /> : history.map((entry) => <article key={entry.id} className="rounded-lg border border-border bg-secondary/20 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{entry.changedByName ?? '—'}</span><span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt, locale)}</span></div><p className="mt-2 text-muted-foreground">{entry.previousMaxCounterOffers ?? '—'} → {entry.newMaxCounterOffers} · {entry.previousDepositPercentage ?? '—'}% → {entry.newDepositPercentage}%</p>{entry.reason && <p className="mt-1 break-words">{entry.reason}</p>}</article>)}{historyTotalElements > 0 && <DataPagination page={historyPage} pageSize={20} totalPages={historyTotalPages} totalElements={historyTotalElements} onPageChange={setHistoryPage} onPageSizeChange={() => setHistoryPage(0)} />}</CardContent></Card>
    </div>
    <Card><CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle className="flex items-center gap-2"><MessageSquarePlus className="h-5 w-5 text-primary" />{t('administration.catalog.title')}</CardTitle><CardDescription>{t('administration.catalog.description')}</CardDescription></div><Button className="gap-2" onClick={() => openMessage(null)}><MessageSquarePlus className="h-4 w-4" />{t('administration.catalog.create')}</Button></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Filter label={t('administration.catalog.party')} value={party} onChange={(value) => setParty(value as PickupNegotiationParty | 'ALL')} items={['ALL', 'CLIENT', 'COMPANY']} /><Filter label={t('administration.catalog.language')} value={language} onChange={(value) => setLanguage(value as PickupMessageLanguage | 'ALL')} items={['ALL', 'FR', 'EN']} /><Filter label={t('administration.catalog.status')} value={active} onChange={(value) => setActive(value as 'ALL' | 'true' | 'false')} items={['ALL', 'true', 'false']} /></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{messages.length === 0 ? <div className="md:col-span-2 xl:col-span-3"><Empty label={t('administration.catalog.empty')} /></div> : messages.map((message) => <article key={message.id} className="flex min-w-0 flex-col rounded-xl border border-border bg-secondary/20 p-4"><div className="flex items-start justify-between gap-2"><div className="flex flex-wrap gap-2"><Badge variant="outline">{message.intervenant}</Badge><Badge variant="outline">{message.language}</Badge></div><Badge variant={message.active ? 'default' : 'secondary'}>{message.active ? t('administration.catalog.active') : t('administration.catalog.inactive')}</Badge></div><p className="mt-4 flex-1 break-words text-sm">{message.text}</p><div className="mt-4 grid grid-cols-2 gap-2"><Button size="sm" variant="outline" className="gap-1" onClick={() => openMessage(message)}><Pencil className="h-3.5 w-3.5" />{t('actions.edit')}</Button><Button size="sm" variant="outline" disabled={saving} onClick={() => void toggleMessage(message)}>{message.active ? t('administration.catalog.deactivate') : t('administration.catalog.activate')}</Button></div></article>)}</div></CardContent></Card>
    <Dialog open={editingMessage !== undefined} onOpenChange={(open) => !open && setEditingMessage(undefined)}><DialogContent><DialogHeader><DialogTitle>{t(editingMessage ? 'administration.catalog.edit' : 'administration.catalog.create')}</DialogTitle><DialogDescription>{t('administration.catalog.dialogDescription')}</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label={t('administration.catalog.party')}><Filter value={messageForm.intervenant} onChange={(value) => setMessageForm((current) => ({ ...current, intervenant: value as PickupNegotiationParty }))} items={['CLIENT', 'COMPANY']} /></Field><Field label={t('administration.catalog.language')}><Filter value={messageForm.language} onChange={(value) => setMessageForm((current) => ({ ...current, language: value as PickupMessageLanguage }))} items={['FR', 'EN']} /></Field></div><Field label={t('administration.catalog.text')}><Textarea value={messageForm.text} maxLength={500} onChange={(event) => setMessageForm((current) => ({ ...current, text: event.target.value }))} /></Field><DialogFooter><Button variant="outline" onClick={() => setEditingMessage(undefined)}>{t('actions.cancel')}</Button><Button disabled={saving || !messageForm.text.trim()} onClick={() => void saveMessage()}>{t('actions.confirm')}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function Filter({ label, value, onChange, items }: { label?: string; value: string; onChange: (value: string) => void; items: string[] }) { const { t } = useTranslation('pickups'); return <div className="space-y-2">{label && <Label>{label}</Label>}<Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{items.map((item) => <SelectItem key={item} value={item}>{item === 'ALL' ? t('administration.catalog.all') : item === 'true' ? t('administration.catalog.active') : item === 'false' ? t('administration.catalog.inactive') : item}</SelectItem>)}</SelectContent></Select></div>; }
function Empty({ label }: { label: string }) { return <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{label}</div>; }
function formatDateTime(value: string, locale: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date); }