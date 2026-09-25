'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

import { Badge, ConfirmDialog, StatusState, ToastBar, useToastSimple } from '@/components/company/company-shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import { createSupportContact, deleteSupportContact, getSupportContactsForAdministration, setSupportContactActive, updateSupportContact } from '@/lib/support/api';
import type { SupportContactRequest, SupportContactResponse, SupportContactType } from '@/lib/support/types';
import { cn } from '@/lib/utils';

const CONTACT_TYPES: SupportContactType[] = ['EMAIL', 'PHONE', 'WHATSAPP', 'LIVE_CHAT', 'WEBSITE', 'FAQ', 'OTHER'];

type ContactForm = Required<Pick<SupportContactRequest, 'type' | 'title' | 'value' | 'displayOrder' | 'active'>> & Pick<SupportContactRequest, 'description' | 'actionUri'>;

function toForm(contact?: SupportContactResponse): ContactForm {
  return {
    type: contact?.type ?? 'EMAIL', title: contact?.title ?? '', value: contact?.value ?? '',
    description: contact?.description ?? '', actionUri: contact?.actionUri ?? '',
    displayOrder: contact?.displayOrder ?? 0, active: contact?.active !== false,
  };
}

function ContactDialog({ contact, open, loading, error, onClose, onSave }: { contact: SupportContactResponse | null; open: boolean; loading: boolean; error: string | null; onClose: () => void; onSave: (form: ContactForm) => void }) {
  const { t } = useTranslation('dashboard');
  const [form, setForm] = useState<ContactForm>(toForm(contact ?? undefined));
  useEffect(() => { if (open) setForm(toForm(contact ?? undefined)); }, [contact, open]);
  const set = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.title.trim() && form.value.trim();

  return <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>{contact ? t('supportManagement.dialog.editTitle') : t('supportManagement.dialog.createTitle')}</DialogTitle><DialogDescription>{t('supportManagement.dialog.description')}</DialogDescription></DialogHeader>
      <div className="grid gap-4 py-2 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="support-type">{t('supportManagement.dialog.type')}</Label><select id="support-type" value={form.type} onChange={(event) => set('type', event.target.value as SupportContactType)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{CONTACT_TYPES.map((type) => <option key={type} value={type}>{t(`supportManagement.types.${type}`)}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="support-order">{t('supportManagement.dialog.displayOrder')}</Label><Input id="support-order" type="number" min="0" value={form.displayOrder} onChange={(event) => set('displayOrder', Math.max(0, Number(event.target.value) || 0))} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="support-title">{t('supportManagement.dialog.title')}</Label><Input id="support-title" value={form.title} onChange={(event) => set('title', event.target.value)} placeholder={t('supportManagement.dialog.titlePlaceholder')} maxLength={120} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="support-value">{t('supportManagement.dialog.value')}</Label><Input id="support-value" value={form.value} onChange={(event) => set('value', event.target.value)} placeholder={t('supportManagement.dialog.valuePlaceholder')} maxLength={500} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="support-uri">{t('supportManagement.dialog.actionUri')}</Label><Input id="support-uri" value={form.actionUri ?? ''} onChange={(event) => set('actionUri', event.target.value)} placeholder={t('supportManagement.dialog.actionUriPlaceholder')} maxLength={1000} /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="support-description">{t('supportManagement.dialog.descriptionLabel')}</Label><Textarea id="support-description" value={form.description ?? ''} onChange={(event) => set('description', event.target.value)} placeholder={t('supportManagement.dialog.descriptionPlaceholder')} maxLength={500} /></div>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2"><span className="text-sm font-medium">{t('supportManagement.dialog.active')}</span><Switch checked={form.active} onCheckedChange={(value) => set('active', value)} /></label>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" onClick={onClose} disabled={loading}>{t('common.cancel')}</Button><Button onClick={() => onSave(form)} disabled={loading || !valid}>{loading ? t('common.saving') : t('supportManagement.dialog.save')}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function SupportContactsManagement() {
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('dashboard');
  const { toast, success, error: showError } = useToastSimple();
  const [contacts, setContacts] = useState<SupportContactResponse[]>([]);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(''); const [editor, setEditor] = useState<SupportContactResponse | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<SupportContactResponse | null>(null); const [submitting, setSubmitting] = useState(false); const [dialogError, setDialogError] = useState<string | null>(null);
  const refresh = useCallback(async () => { if (!token) return; setLoading(true); setLoadError(null); try { setContacts(await getSupportContactsForAdministration(token)); } catch (error) { setLoadError(error instanceof ApiError ? error.message : t('supportManagement.errors.load')); } finally { setLoading(false); } }, [t, token]);
  useEffect(() => { void refresh(); }, [refresh]);
  const filtered = useMemo(() => { const needle = query.trim().toLowerCase(); return [...contacts].filter((contact) => !needle || [contact.title, contact.value, contact.description].filter(Boolean).join(' ').toLowerCase().includes(needle)).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.title.localeCompare(b.title)); }, [contacts, query]);
  const save = async (form: ContactForm) => { if (!token) return; setSubmitting(true); setDialogError(null); const payload: SupportContactRequest = { ...form, title: form.title.trim(), value: form.value.trim(), description: form.description?.trim() || undefined, actionUri: form.actionUri?.trim() || undefined }; try { const updated = editor ? await updateSupportContact(token, editor.id, payload) : await createSupportContact(token, payload); setContacts((current) => editor ? current.map((contact) => contact.id === updated.id ? updated : contact) : [...current, updated]); success(t(editor ? 'supportManagement.messages.updated' : 'supportManagement.messages.created')); setEditor(undefined); } catch (error) { setDialogError(error instanceof ApiError ? error.message : t('supportManagement.errors.save')); } finally { setSubmitting(false); } };
  const toggle = async (contact: SupportContactResponse) => { if (!token) return; try { const updated = await setSupportContactActive(token, contact.id, contact.active === false); setContacts((current) => current.map((item) => item.id === updated.id ? updated : item)); success(t('supportManagement.messages.statusUpdated')); } catch (error) { showError(error instanceof ApiError ? error.message : t('supportManagement.errors.updateStatus')); } };
  const remove = async () => { if (!token || !deleteTarget) return; setSubmitting(true); try { await deleteSupportContact(token, deleteTarget.id); setContacts((current) => current.filter((contact) => contact.id !== deleteTarget.id)); success(t('supportManagement.messages.deleted')); setDeleteTarget(null); } catch (error) { showError(error instanceof ApiError ? error.message : t('supportManagement.errors.delete')); } finally { setSubmitting(false); } };

  return <div className="space-y-5 pb-20 md:pb-0"><ToastBar toast={toast} /><ContactDialog contact={editor ?? null} open={editor !== undefined} loading={submitting} error={dialogError} onClose={() => { setEditor(undefined); setDialogError(null); }} onSave={save} /><ConfirmDialog open={Boolean(deleteTarget)} title={t('supportManagement.deleteTitle')} description={t('supportManagement.deleteDescription')} confirmLabel={t('supportManagement.delete')} destructive loading={submitting} onConfirm={remove} onCancel={() => setDeleteTarget(null)} />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('supportManagement.title')}</h1><p className="mt-1 text-sm text-muted-foreground">{t('supportManagement.subtitle')}</p></div><Button className="gap-2" onClick={() => { setDialogError(null); setEditor(null); }}><Plus className="h-4 w-4" />{t('supportManagement.add')}</Button></div>
    <div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('supportManagement.search')} className="pl-9" /></div>
    {loading ? <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-primary" /></div> : loadError ? <StatusState icon={MessageCircle} tone="destructive" title={t('common.loadError')} description={loadError} action={<Button variant="outline" onClick={refresh} className="gap-2"><RefreshCw className="h-4 w-4" />{t('common.retry')}</Button>} /> : filtered.length === 0 ? <StatusState icon={MessageCircle} title={contacts.length ? t('common.noResults') : t('supportManagement.emptyTitle')} description={contacts.length ? t('common.tryAnotherSearch') : t('supportManagement.emptyDescription')} /> : <div className="grid gap-3 lg:grid-cols-2">{filtered.map((contact) => <Card key={contact.id} className={cn(contact.active === false && 'opacity-70')}><CardContent className="flex gap-3 p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Mail className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-foreground">{contact.title}</p><Badge className={contact.active === false ? 'bg-muted text-muted-foreground' : 'bg-success/15 text-success'}>{contact.active === false ? t('supportManagement.inactive') : t('supportManagement.active')}</Badge></div><p className="break-words text-sm text-muted-foreground">{contact.value}</p>{contact.description && <p className="mt-1 text-xs text-muted-foreground">{contact.description}</p>}<p className="mt-2 text-xs text-muted-foreground">{t(`supportManagement.types.${contact.type}`)} · {t('supportManagement.order', { values: { order: contact.displayOrder ?? 0 } })}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => toggle(contact)}>{contact.active === false ? t('supportManagement.activate') : t('supportManagement.deactivate')}</Button><Button size="sm" variant="outline" className="gap-1" onClick={() => { setDialogError(null); setEditor(contact); }}><Pencil className="h-3.5 w-3.5" />{t('supportManagement.edit')}</Button><Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(contact)}><Trash2 className="h-3.5 w-3.5" />{t('supportManagement.delete')}</Button></div></div></CardContent></Card>)}</div>}
  </div>;
}
