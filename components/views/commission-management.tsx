'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Coins, Eye, HandCoins, RefreshCw, Search, UserCheck, XCircle } from 'lucide-react';
import { DashboardPeriodFilter } from '@/components/dashboard-period-filter';
import { CompanyGuard } from '@/components/company/company-shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataPagination } from '@/components/ui/data-pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { cancelCommissionPaymentBatch, createCommissionPaymentBatch, getCompanyCommission, getCompanyCommissionDashboard, getCompanyCommissionPaymentBatches, getCompanyCommissions } from '@/lib/commissions/api';
import { COMMISSION_BATCH_STATUS_CLASS_NAMES, COMMISSION_BATCH_STATUS_KEYS, COMMISSION_ROLE_KEYS, COMMISSION_STATUS_CLASS_NAMES, COMMISSION_STATUS_KEYS, COMMISSION_HISTORY_ACTION_KEYS } from '@/lib/commissions/presentation';
import type { CommissionBeneficiaryType, CommissionPaymentBatchResponse, CommissionResponse, CommissionStatus, CompanyCommissionDashboardResponse } from '@/lib/commissions/types';
import { useCurrency } from '@/lib/currency';
import { getDashboardPeriodRange, type DashboardPeriodPreset, type DateRange } from '@/lib/dashboard-period';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type StatusFilter = CommissionStatus | 'ALL';
type RoleFilter = CommissionBeneficiaryType | 'ALL';

export function CommissionManagement() {
  return <CompanyGuard>{({ companyId }) => <CompanyCommissionContent companyId={companyId} />}</CompanyGuard>;
}

function CompanyCommissionContent({ companyId }: { companyId: number }) {
  const { t, locale } = useTranslation('commissions');
  const { formatMoney } = useCurrency();
  const { toast } = useToast();
  const token = useAuthStore((state) => state.token);
  const referenceDate = useMemo(() => new Date(), []);
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('CURRENT_MONTH');
  const [periodRange, setPeriodRange] = useState<DateRange>(() => getDashboardPeriodRange('CURRENT_MONTH', referenceDate));
  const [commissions, setCommissions] = useState<CommissionResponse[]>([]);
  const [dashboard, setDashboard] = useState<CompanyCommissionDashboardResponse | null>(null);
  const [batches, setBatches] = useState<CommissionPaymentBatchResponse[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [batchPage, setBatchPage] = useState(0);
  const [batchTotalPages, setBatchTotalPages] = useState(0);
  const [batchTotalElements, setBatchTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [role, setRole] = useState<RoleFilter>('ALL');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<CommissionResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [batchToCancel, setBatchToCancel] = useState<CommissionPaymentBatchResponse | null>(null);
  const dateParams = useMemo(() => ({ from: toApiDate(periodRange.from), to: toApiDate(periodRange.to) }), [periodRange]);

  const loadCommissions = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const [pageResponse, dashboardResponse] = await Promise.all([
        getCompanyCommissions(token, companyId, { ...dateParams, status: status === 'ALL' ? undefined : status, beneficiaryType: role === 'ALL' ? undefined : role, search: search.trim() || undefined, page, size: pageSize }),
        getCompanyCommissionDashboard(token, companyId, dateParams),
      ]);
      setCommissions(pageResponse.content ?? []); setTotalPages(pageResponse.totalPages ?? 0); setTotalElements(pageResponse.totalElements ?? 0); setDashboard(dashboardResponse); setSelectedIds([]);
    } catch (err) {
      setCommissions([]); setDashboard(null); setError(err instanceof Error ? err.message : t('messages.loadError'));
    } finally { setLoading(false); }
  }, [companyId, dateParams, page, pageSize, role, search, status, t, token]);

  const loadBatches = useCallback(async () => {
    if (!token) return;
    setBatchesLoading(true);
    try {
      const response = await getCompanyCommissionPaymentBatches(token, companyId, { page: batchPage, size: pageSize });
      setBatches(response.content ?? []); setBatchTotalPages(response.totalPages ?? 0); setBatchTotalElements(response.totalElements ?? 0);
    } catch (err) {
      toast({ title: t('messages.loadError'), description: err instanceof Error ? err.message : t('messages.actionError'), variant: 'destructive' });
    } finally { setBatchesLoading(false); }
  }, [batchPage, companyId, pageSize, t, toast, token]);

  useEffect(() => void loadCommissions(), [loadCommissions]);
  useEffect(() => void loadBatches(), [loadBatches]);
  const selected = commissions.filter((item) => selectedIds.includes(item.id));
  const selectedBeneficiaryId = selected[0]?.beneficiaryId;
  const selectable = (commission: CommissionResponse) => (commission.status === 'ACCRUED' || commission.status === 'PAYMENT_DISPUTED') && (selectedBeneficiaryId === undefined || commission.beneficiaryId === selectedBeneficiaryId);
  const toggleSelection = (commission: CommissionResponse) => setSelectedIds((current) => current.includes(commission.id) ? current.filter((id) => id !== commission.id) : [...current, commission.id]);

  const performMutation = async (action: () => Promise<unknown>, successMessage: string) => {
    setSubmitting(true);
    try { await action(); toast({ title: successMessage }); await Promise.all([loadCommissions(), loadBatches()]); return true; }
    catch (err) { const conflict = err instanceof ApiError && err.status === 409; toast({ title: conflict ? t('messages.stateReloaded') : t('messages.actionError'), description: err instanceof Error ? err.message : undefined, variant: 'destructive' }); if (conflict) await Promise.all([loadCommissions(), loadBatches()]); return false; }
    finally { setSubmitting(false); }
  };
  const createBatch = async () => { if (!token || selectedIds.length === 0) return; const ok = await performMutation(() => createCommissionPaymentBatch(token, companyId, { commissionIds: selectedIds, note: note.trim() || undefined }), t('messages.batchCreated')); if (ok) { setBatchDialogOpen(false); setNote(''); } };
  const cancelBatch = async () => { if (!token || !batchToCancel) return; const ok = await performMutation(() => cancelCommissionPaymentBatch(token, companyId, batchToCancel.id), t('messages.batchCancelled')); if (ok) setBatchToCancel(null); };
  const openDetail = async (commission: CommissionResponse) => { if (!token) return; setDetail(commission); setDetailLoading(true); try { setDetail(await getCompanyCommission(token, companyId, commission.id)); } catch { /* retain list payload */ } finally { setDetailLoading(false); } };

  return <div className="min-w-0 space-y-5">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h1 className="text-2xl font-bold text-foreground">{t('title')}</h1><p className="text-sm text-muted-foreground">{t('subtitle')}</p></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><DashboardPeriodFilter preset={periodPreset} range={periodRange} referenceDate={referenceDate} onChange={(nextPreset, nextRange) => { setPeriodPreset(nextPreset); setPeriodRange(nextRange); setPage(0); }} /><Button variant="outline" className="gap-2" onClick={() => void loadCommissions()} disabled={loading}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />{t('actions.refresh')}</Button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={HandCoins} label={t('summary.toPay')} value={formatMoney(dashboard?.toPayAmount ?? 0)} detail={t('summary.count', { values: { count: dashboard?.toPayCount ?? 0 } })} tone="warning" />
      <Metric icon={Clock3} label={t('summary.awaiting')} value={formatMoney(dashboard?.awaitingConfirmationAmount ?? 0)} detail={t('summary.count', { values: { count: dashboard?.awaitingConfirmationCount ?? 0 } })} tone="primary" />
      <Metric icon={CheckCircle2} label={t('summary.paid')} value={formatMoney(dashboard?.paidAmount ?? 0)} detail={t('summary.count', { values: { count: dashboard?.paidCount ?? 0 } })} tone="success" />
      <Metric icon={UserCheck} label={t('summary.collectors')} value={formatMoney(dashboard?.collectorAmount ?? 0)} detail={t('summary.count', { values: { count: dashboard?.collectorCount ?? 0 } })} tone="chart" />
      <Metric icon={Coins} label={t('summary.transporters')} value={formatMoney(dashboard?.transporterAmount ?? 0)} detail={t('summary.count', { values: { count: dashboard?.transporterCount ?? 0 } })} tone="chart" />
    </div>
    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
    <Tabs defaultValue="entries" className="gap-4"><TabsList className="h-auto w-full justify-start overflow-x-auto bg-secondary p-1 sm:w-fit"><TabsTrigger value="entries" className="min-h-10 px-4">{t('tabs.entries')}</TabsTrigger><TabsTrigger value="batches" className="min-h-10 px-4">{t('tabs.batches')}</TabsTrigger></TabsList>
      <TabsContent value="entries" className="space-y-4"><Card className="overflow-hidden border-border bg-card"><CardHeader className="gap-4"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_190px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={t('filters.search')} value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder={t('filters.search')} className="bg-secondary pl-9" /></div><Select value={status} onValueChange={(value: StatusFilter) => { setStatus(value); setPage(0); }}><SelectTrigger aria-label={t('filters.allStatuses')} className="bg-secondary"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">{t('filters.allStatuses')}</SelectItem>{(['ACCRUED', 'PAYMENT_PROPOSED', 'PAYMENT_DISPUTED', 'PAID', 'CANCELLED'] as CommissionStatus[]).map((item) => <SelectItem key={item} value={item}>{t(COMMISSION_STATUS_KEYS[item])}</SelectItem>)}</SelectContent></Select><Select value={role} onValueChange={(value: RoleFilter) => { setRole(value); setPage(0); }}><SelectTrigger aria-label={t('filters.allRoles')} className="bg-secondary"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">{t('filters.allRoles')}</SelectItem>{(['COLLECTOR', 'TRANSPORTER'] as CommissionBeneficiaryType[]).map((item) => <SelectItem key={item} value={item}>{t(COMMISSION_ROLE_KEYS[item])}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent className="p-0">
        {selectedIds.length > 0 && <div className="flex flex-col gap-3 border-y border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-foreground">{t('selection.count', { values: { count: selectedIds.length } })}</p><p className="text-xs text-muted-foreground">{t('selection.sameBeneficiary')}</p></div><Button className="gap-2" onClick={() => setBatchDialogOpen(true)}><HandCoins className="h-4 w-4" />{t('actions.createBatch')}</Button></div>}
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead className="w-12" /><TableHead>{t('table.beneficiary')}</TableHead><TableHead>{t('table.shipment')}</TableHead><TableHead>{t('table.calculation')}</TableHead><TableHead>{t('table.status')}</TableHead><TableHead>{t('table.date')}</TableHead><TableHead className="text-right">{t('table.actions')}</TableHead></TableRow></TableHeader><TableBody>{commissions.map((commission) => <TableRow key={commission.id}><TableCell><Checkbox aria-label={`${t('actions.createBatch')} ${commission.reference}`} checked={selectedIds.includes(commission.id)} disabled={!selectable(commission) && !selectedIds.includes(commission.id)} onCheckedChange={() => toggleSelection(commission)} /></TableCell><TableCell><p className="font-medium text-foreground">{commission.beneficiaryFullName}</p><p className="text-xs text-muted-foreground">{t(COMMISSION_ROLE_KEYS[commission.beneficiaryType])}</p></TableCell><TableCell><p className="font-mono text-sm">{commission.shipmentReference}</p><p className="text-xs text-muted-foreground">{commission.sourceLabel ?? '—'}</p></TableCell><TableCell><p className="font-semibold">{formatMoney(commission.amount)}</p><p className="text-xs text-muted-foreground">{commission.percentageSnapshot}% · {formatMoney(commission.baseAmount)}</p></TableCell><TableCell><CommissionStatusBadge commission={commission} t={t} /></TableCell><TableCell className="text-sm text-muted-foreground">{formatDate(commission.accruedAt, locale)}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" className="gap-2" onClick={() => void openDetail(commission)}><Eye className="h-4 w-4" />{t('actions.details')}</Button></TableCell></TableRow>)}</TableBody></Table></div>
        <div className="grid gap-3 p-3 md:hidden">{commissions.map((commission) => <article key={commission.id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex items-start gap-3"><Checkbox className="mt-1 h-5 w-5" aria-label={`${t('actions.createBatch')} ${commission.reference}`} checked={selectedIds.includes(commission.id)} disabled={!selectable(commission) && !selectedIds.includes(commission.id)} onCheckedChange={() => toggleSelection(commission)} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-foreground">{commission.beneficiaryFullName}</p><p className="font-mono text-xs text-muted-foreground">{commission.shipmentReference}</p></div><CommissionStatusBadge commission={commission} t={t} /></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><Info label={t('table.calculation')} value={formatMoney(commission.amount)} /><Info label={t('table.date')} value={formatDate(commission.accruedAt, locale)} /></div><p className="mt-1 text-xs text-muted-foreground">{commission.percentageSnapshot}% · {formatMoney(commission.baseAmount)}</p><Button variant="outline" className="mt-4 w-full gap-2" onClick={() => void openDetail(commission)}><Eye className="h-4 w-4" />{t('actions.details')}</Button></div></div></article>)}</div>
        {!loading && commissions.length === 0 && <EmptyState label={t('empty.entries')} />}{loading && <LoadingState />}{!loading && totalElements > 0 && <DataPagination page={page} pageSize={pageSize} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); setBatchPage(0); }} className="m-4" />}
      </CardContent></Card></TabsContent>
      <TabsContent value="batches"><Card className="border-border bg-card"><CardHeader><CardTitle>{t('tabs.batches')}</CardTitle><CardDescription>{t('dialogs.batchDescription')}</CardDescription></CardHeader><CardContent className="space-y-3">{batchesLoading ? <LoadingState /> : batches.length === 0 ? <EmptyState label={t('empty.batches')} /> : batches.map((batch) => <article key={batch.id} className="rounded-xl border border-border bg-secondary/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-sm font-semibold text-foreground">{batch.reference}</p><p className="text-sm text-muted-foreground">{batch.beneficiaryFullName}</p></div><BatchStatusBadge batch={batch} t={t} /></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><Info label={t('table.amount')} value={formatMoney(batch.totalAmount)} /><Info label={t('table.date')} value={formatDate(batch.createdAt, locale)} /><Info label={t('table.shipment')} value={String(batch.commissions?.length ?? 0)} /></div>{batch.responseNote && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{batch.responseNote}</p>}{batch.status === 'AWAITING_BENEFICIARY_CONFIRMATION' && <Button variant="outline" className="mt-4 w-full gap-2 sm:w-auto" onClick={() => setBatchToCancel(batch)}><XCircle className="h-4 w-4" />{t('actions.cancelBatch')}</Button>}</article>)}{!batchesLoading && batchTotalElements > 0 && <DataPagination page={batchPage} pageSize={pageSize} totalPages={batchTotalPages} totalElements={batchTotalElements} onPageChange={setBatchPage} onPageSizeChange={(size) => { setPageSize(size); setBatchPage(0); setPage(0); }} />}</CardContent></Card></TabsContent>
    </Tabs>
    <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}><DialogContent><DialogHeader><DialogTitle>{t('dialogs.batchTitle')}</DialogTitle><DialogDescription>{t('dialogs.batchDescription')}</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-xl border border-border bg-secondary/30 p-4"><p className="text-sm text-muted-foreground">{t('selection.count', { values: { count: selectedIds.length } })}</p><p className="mt-1 text-2xl font-bold">{formatMoney(selected.reduce((sum, item) => sum + item.amount, 0))}</p><p className="text-sm text-muted-foreground">{selected[0]?.beneficiaryFullName}</p></div><label className="grid gap-2 text-sm font-medium">{t('dialogs.note')}<Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder={t('dialogs.batchNotePlaceholder')} /></label></div><DialogFooter><Button variant="outline" onClick={() => setBatchDialogOpen(false)} disabled={submitting}>{t('actions.cancel')}</Button><Button onClick={() => void createBatch()} disabled={submitting}>{submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('actions.createBatch')}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{t('dialogs.detailTitle')}</DialogTitle><DialogDescription>{detail?.reference}</DialogDescription></DialogHeader>{detail && <div className="space-y-4"><div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-secondary/20 p-4"><Info label={t('details.base')} value={formatMoney(detail.baseAmount)} /><Info label={t('details.rate')} value={`${detail.percentageSnapshot}%`} /><Info label={t('table.amount')} value={formatMoney(detail.amount)} /><Info label={t('details.batch')} value={detail.paymentBatchReference ?? '—'} /></div><div><h3 className="mb-3 font-semibold">{t('dialogs.history')}</h3>{detailLoading ? <LoadingState /> : (detail.history?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">{t('empty.history')}</p> : <div>{detail.history?.map((item, index) => <div key={`${item.createdAt}-${index}`} className="relative border-l border-border pb-5 pl-5 last:pb-0"><span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-card bg-primary" /><p className="text-sm font-medium">{t(COMMISSION_HISTORY_ACTION_KEYS[item.action])}</p><p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt, locale)}{item.actorUsername ? ` · ${t('details.actor', { values: { actor: item.actorUsername } })}` : ''}</p>{item.note && <p className="mt-2 rounded-lg bg-secondary p-2 text-sm">{item.note}</p>}</div>)}</div>}</div></div>}</DialogContent></Dialog>
    <Dialog open={Boolean(batchToCancel)} onOpenChange={(open) => !open && setBatchToCancel(null)}><DialogContent><DialogHeader><DialogTitle>{t('dialogs.cancelTitle')}</DialogTitle><DialogDescription>{t('dialogs.cancelDescription')}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setBatchToCancel(null)} disabled={submitting}>{t('actions.cancel')}</Button><Button variant="destructive" onClick={() => void cancelBatch()} disabled={submitting}>{t('actions.cancelBatch')}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function CommissionStatusBadge({ commission, t }: { commission: CommissionResponse; t: (key: string) => string }) { return <Badge className={cn('border-0', COMMISSION_STATUS_CLASS_NAMES[commission.status])}>{t(COMMISSION_STATUS_KEYS[commission.status])}</Badge>; }
function BatchStatusBadge({ batch, t }: { batch: CommissionPaymentBatchResponse; t: (key: string) => string }) { return <Badge className={cn('w-fit border-0', COMMISSION_BATCH_STATUS_CLASS_NAMES[batch.status])}>{t(COMMISSION_BATCH_STATUS_KEYS[batch.status])}</Badge>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="break-words font-medium text-foreground">{value}</p></div>; }
function LoadingState() { return <div className="flex min-h-28 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>; }
function EmptyState({ label }: { label: string }) { return <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground"><Coins className="h-8 w-8" /><p className="text-sm">{label}</p></div>; }
function Metric({ icon: Icon, label, value, detail, tone }: { icon: React.ElementType; label: string; value: string; detail: string; tone: 'warning' | 'primary' | 'success' | 'chart' }) { const toneClass = { warning: 'bg-warning/15 text-warning', primary: 'bg-primary/15 text-primary', success: 'bg-success/15 text-success', chart: 'bg-chart-2/15 text-chart-2' }[tone]; return <Card className="overflow-hidden border-border bg-card"><CardContent className="relative p-4"><div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-lg', toneClass)}><Icon className="h-4 w-4" /></div><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{detail}</p><span className={cn('absolute inset-y-0 left-0 w-1', toneClass.split(' ')[0])} /></CardContent></Card>; }
function toApiDate(value: Date) { const year = value.getFullYear(); const month = String(value.getMonth() + 1).padStart(2, '0'); const day = String(value.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function formatDate(value: string, locale: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date); }
function formatDateTime(value: string, locale: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date); }
