'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Coins, RefreshCw, ShieldAlert, WalletCards, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataPagination } from '@/components/ui/data-pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { acceptMyCommissionPaymentBatch, getMyCommissionPaymentBatches, getMyCommissions, getMyCommissionSummary, refuseMyCommissionPaymentBatch } from '@/lib/commissions/api';
import { COMMISSION_BATCH_STATUS_CLASS_NAMES, COMMISSION_BATCH_STATUS_KEYS, COMMISSION_STATUS_CLASS_NAMES, COMMISSION_STATUS_KEYS } from '@/lib/commissions/presentation';
import type { CommissionPaymentBatchResponse, CommissionResponse, CommissionStatus, CommissionSummaryResponse } from '@/lib/commissions/types';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Decision = { type: 'accept' | 'refuse'; batch: CommissionPaymentBatchResponse } | null;

export function MyCommissions() {
  const { t, locale } = useTranslation('commissions');
  const { formatMoney } = useCurrency();
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);
  const [summary, setSummary] = useState<CommissionSummaryResponse | null>(null);
  const [commissions, setCommissions] = useState<CommissionResponse[]>([]);
  const [batches, setBatches] = useState<CommissionPaymentBatchResponse[]>([]);
  const [status, setStatus] = useState<CommissionStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [batchPage, setBatchPage] = useState(0);
  const [batchTotalPages, setBatchTotalPages] = useState(0);
  const [batchTotalElements, setBatchTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const [summaryResponse, commissionPage, batchPageResponse] = await Promise.all([
        getMyCommissionSummary(token),
        getMyCommissions(token, { status: status === 'ALL' ? undefined : status, page, size: pageSize }),
        getMyCommissionPaymentBatches(token, { page: batchPage, size: pageSize }),
      ]);
      setSummary(summaryResponse); setCommissions(commissionPage.content ?? []); setTotalPages(commissionPage.totalPages ?? 0); setTotalElements(commissionPage.totalElements ?? 0); setBatches(batchPageResponse.content ?? []); setBatchTotalPages(batchPageResponse.totalPages ?? 0); setBatchTotalElements(batchPageResponse.totalElements ?? 0);
    } catch (err) { setError(err instanceof Error ? err.message : t('messages.loadError')); }
    finally { setLoading(false); }
  }, [batchPage, page, pageSize, status, t, token]);

  useEffect(() => void load(), [load]);

  const submitDecision = async () => {
    if (!token || !decision || (decision.type === 'refuse' && !note.trim())) return;
    setSubmitting(true);
    try {
      if (decision.type === 'accept') await acceptMyCommissionPaymentBatch(token, decision.batch.id, { note: note.trim() || undefined });
      else await refuseMyCommissionPaymentBatch(token, decision.batch.id, { note: note.trim() });
      toast({ title: t(decision.type === 'accept' ? 'messages.batchAccepted' : 'messages.batchRefused') });
      setDecision(null); setNote(''); await load();
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      toast({ title: conflict ? t('messages.stateReloaded') : t('messages.actionError'), description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
      if (conflict) { setDecision(null); await load(); }
    } finally { setSubmitting(false); }
  };

  return <div className="min-w-0 space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold text-foreground">{t('myTitle')}</h1><p className="text-sm text-muted-foreground">{t('mySubtitle')}</p></div><Button variant="outline" className="gap-2" onClick={() => void load()} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />{t('actions.refresh')}</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><SummaryCard icon={Coins} label={t('summary.generated')} value={formatMoney(summary?.generatedAmount ?? 0)} detail={t('summary.configuredRate', { values: { rate: summary?.configuredPercentage ?? 0 } })} tone="primary" /><SummaryCard icon={WalletCards} label={t('summary.toPay')} value={formatMoney(summary?.pendingAmount ?? 0)} detail={t('summary.shipments')} tone="warning" /><SummaryCard icon={Clock3} label={t('summary.awaiting')} value={formatMoney(summary?.awaitingConfirmationAmount ?? 0)} detail={t('summary.count', { values: { count: batches.filter((batch) => batch.status === 'AWAITING_BENEFICIARY_CONFIRMATION').length } })} tone="chart" /><SummaryCard icon={CheckCircle2} label={t('summary.paid')} value={formatMoney(summary?.paidAmount ?? 0)} detail={t('summary.count', { values: { count: summary?.commissionedShipmentCount ?? 0 } })} tone="success" /></div>
    {(summary?.disputedAmount ?? 0) > 0 && <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><ShieldAlert className="mt-0.5 h-4 w-4" /><div><p className="font-medium">{t('summary.disputed')}</p><p>{formatMoney(summary?.disputedAmount ?? 0)}</p></div></div>}
    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4" />{error}</div>}
    <Tabs defaultValue="entries" className="gap-4"><TabsList className="h-auto w-full justify-start bg-secondary p-1 sm:w-fit"><TabsTrigger value="entries" className="min-h-10 px-4">{t('tabs.entries')}</TabsTrigger><TabsTrigger value="batches" className="min-h-10 px-4">{t('tabs.toConfirm')}</TabsTrigger></TabsList>
      <TabsContent value="entries"><Card className="overflow-hidden border-border bg-card"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>{t('tabs.entries')}</CardTitle><CardDescription>{t('mySubtitle')}</CardDescription></div><Select value={status} onValueChange={(value: CommissionStatus | 'ALL') => { setStatus(value); setPage(0); }}><SelectTrigger aria-label={t('filters.allStatuses')} className="w-48 bg-secondary"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">{t('filters.allStatuses')}</SelectItem>{(['ACCRUED','PAYMENT_PROPOSED','PAYMENT_DISPUTED','PAID','CANCELLED'] as CommissionStatus[]).map((item) => <SelectItem key={item} value={item}>{t(COMMISSION_STATUS_KEYS[item])}</SelectItem>)}</SelectContent></Select></CardHeader><CardContent className="p-0">
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{t('table.shipment')}</TableHead><TableHead>{t('details.base')}</TableHead><TableHead>{t('details.rate')}</TableHead><TableHead>{t('table.amount')}</TableHead><TableHead>{t('table.status')}</TableHead><TableHead>{t('table.date')}</TableHead></TableRow></TableHeader><TableBody>{commissions.map((item) => <TableRow key={item.id}><TableCell><p className="font-mono text-sm">{item.shipmentReference}</p><p className="text-xs text-muted-foreground">{item.sourceLabel ?? '—'}</p></TableCell><TableCell>{formatMoney(item.baseAmount)}</TableCell><TableCell>{item.percentageSnapshot}%</TableCell><TableCell className="font-semibold">{formatMoney(item.amount)}</TableCell><TableCell><Badge className={cn('border-0', COMMISSION_STATUS_CLASS_NAMES[item.status])}>{t(COMMISSION_STATUS_KEYS[item.status])}</Badge></TableCell><TableCell className="text-muted-foreground">{formatDate(item.accruedAt, locale)}</TableCell></TableRow>)}</TableBody></Table></div>
        <div className="grid gap-3 p-3 md:hidden">{commissions.map((item) => <article key={item.id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-mono text-sm font-semibold">{item.shipmentReference}</p><p className="text-xs text-muted-foreground">{formatDate(item.accruedAt, locale)}</p></div><Badge className={cn('border-0', COMMISSION_STATUS_CLASS_NAMES[item.status])}>{t(COMMISSION_STATUS_KEYS[item.status])}</Badge></div><div className="mt-4 grid grid-cols-3 gap-2 text-sm"><Info label={t('details.base')} value={formatMoney(item.baseAmount)} /><Info label={t('details.rate')} value={`${item.percentageSnapshot}%`} /><Info label={t('table.amount')} value={formatMoney(item.amount)} /></div></article>)}</div>
        {loading ? <Loading /> : commissions.length === 0 && <Empty label={t('empty.entries')} />}{!loading && totalElements > 0 && <DataPagination page={page} pageSize={pageSize} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); setBatchPage(0); }} className="m-4" />}
      </CardContent></Card></TabsContent>
      <TabsContent value="batches"><Card className="border-border bg-card"><CardHeader><CardTitle>{t('tabs.toConfirm')}</CardTitle><CardDescription>{t('dialogs.acceptDescription')}</CardDescription></CardHeader><CardContent className="space-y-3">{loading ? <Loading /> : batches.length === 0 ? <Empty label={t('empty.batches')} /> : batches.map((batch) => <article key={batch.id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-sm font-semibold">{batch.reference}</p><p className="text-sm text-muted-foreground">{batch.companyName}</p></div><Badge className={cn('w-fit border-0', COMMISSION_BATCH_STATUS_CLASS_NAMES[batch.status])}>{t(COMMISSION_BATCH_STATUS_KEYS[batch.status])}</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label={t('table.amount')} value={formatMoney(batch.totalAmount)} /><Info label={t('table.shipment')} value={String(batch.commissions?.length ?? 0)} /><Info label={t('table.date')} value={formatDate(batch.createdAt, locale)} /></div>{batch.note && <p className="mt-3 rounded-lg bg-secondary p-3 text-sm text-muted-foreground">{batch.note}</p>}{batch.responseNote && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{batch.responseNote}</p>}{batch.status === 'AWAITING_BENEFICIARY_CONFIRMATION' && <div className="mt-4 grid gap-2 sm:flex"><Button className="gap-2" onClick={() => setDecision({ type: 'accept', batch })}><CheckCircle2 className="h-4 w-4" />{t('actions.accept')}</Button><Button variant="outline" className="gap-2" onClick={() => setDecision({ type: 'refuse', batch })}><XCircle className="h-4 w-4" />{t('actions.refuse')}</Button></div>}</article>)}{!loading && batchTotalElements > 0 && <DataPagination page={batchPage} pageSize={pageSize} totalPages={batchTotalPages} totalElements={batchTotalElements} onPageChange={setBatchPage} onPageSizeChange={(size) => { setPageSize(size); setBatchPage(0); setPage(0); }} />}</CardContent></Card></TabsContent>
    </Tabs>
    <Dialog open={Boolean(decision)} onOpenChange={(open) => { if (!open) { setDecision(null); setNote(''); } }}><DialogContent><DialogHeader><DialogTitle>{t(decision?.type === 'refuse' ? 'dialogs.refuseTitle' : 'dialogs.acceptTitle')}</DialogTitle><DialogDescription>{t(decision?.type === 'refuse' ? 'dialogs.refuseDescription' : 'dialogs.acceptDescription')}</DialogDescription></DialogHeader>{decision && <div className="space-y-4"><div className="rounded-xl border border-border bg-secondary/20 p-4"><p className="font-mono text-sm">{decision.batch.reference}</p><p className="mt-1 text-2xl font-bold">{formatMoney(decision.batch.totalAmount)}</p></div><label className="grid gap-2 text-sm font-medium">{t('dialogs.note')}<Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} required={decision.type === 'refuse'} placeholder={decision.type === 'refuse' ? t('dialogs.refusePlaceholder') : t('dialogs.batchNotePlaceholder')} /></label></div>}<DialogFooter><Button variant="outline" onClick={() => setDecision(null)} disabled={submitting}>{t('actions.cancel')}</Button><Button variant={decision?.type === 'refuse' ? 'destructive' : 'default'} onClick={() => void submitDecision()} disabled={submitting || (decision?.type === 'refuse' && !note.trim())}>{submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : t(decision?.type === 'refuse' ? 'actions.refuse' : 'actions.accept')}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: React.ElementType; label: string; value: string; detail: string; tone: 'primary'|'warning'|'chart'|'success' }) { const colors = { primary: 'bg-primary/15 text-primary', warning: 'bg-warning/15 text-warning', chart: 'bg-chart-2/15 text-chart-2', success: 'bg-success/15 text-success' }[tone]; return <Card className="border-border bg-card"><CardContent className="p-4"><div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg', colors)}><Icon className="h-4 w-4" /></div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></CardContent></Card>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="break-words font-medium text-foreground">{value}</p></div>; }
function Loading() { return <div className="flex min-h-32 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>; }
function Empty({ label }: { label: string }) { return <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground"><Coins className="h-8 w-8" /><p className="text-sm">{label}</p></div>; }
function formatDate(value: string, locale: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date); }
