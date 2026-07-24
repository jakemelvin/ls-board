'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ReceiptText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataPagination } from '@/components/ui/data-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import { SUPPORTED_CURRENCIES, useCurrency, type Currency } from '@/lib/currency';
import { getAdminPayments, getAdminTransactions, getTransactions } from '@/lib/platform-finance/api';
import type {
  AdminPaymentAttemptResponse,
  AdminTransactionPaymentResponse,
  PaymentAttemptStatus,
  PaymentProvider,
} from '@/lib/platform-finance/types';
import type { ShipmentTransactionStatus } from '@/lib/shipments/types';
import {
  getShipmentTransactionStatusClassName,
} from '@/lib/shipments/presentation';
import { cn } from '@/lib/utils';

type SortDirection = 'desc' | 'asc';
const PAYMENT_STATUSES: PaymentAttemptStatus[] = [
  'CREATED',
  'PENDING',
  'REQUIRES_ACTION',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
];
const PROVIDERS: PaymentProvider[] = [
  'MTN',
  'ORANGE',
  'PAYPAL',
  'STRIPE',
  'PROMO_CODE',
  'COLLECTION_POINT',
];
const TRANSACTION_STATUSES: ShipmentTransactionStatus[] = [
  'INITIATED',
  'PLATFORM_FEE_PAID',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
];

function formatDate(value?: string) {
  if (!value) return '--';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function paymentStatusClassName(status: PaymentAttemptStatus) {
  if (status === 'SUCCEEDED') return 'bg-success/15 text-success';
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') {
    return 'bg-destructive/15 text-destructive';
  }
  if (status === 'PROCESSING' || status === 'REQUIRES_ACTION') {
    return 'bg-warning/15 text-warning';
  }
  return 'bg-muted text-muted-foreground';
}

interface FinanceTraceabilityProps {
  scope: 'platform' | 'company';
}

export function PlatformPaymentTraceability() {
  return <FinanceTraceability scope="platform" />;
}

export function CompanyPaymentTraceability() {
  return <FinanceTraceability scope="company" />;
}

function FinanceTraceability({ scope }: FinanceTraceabilityProps) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const token = useAuthStore((state) => state.token);
  const [view, setView] = useState<'transactions' | 'attempts'>('transactions');
  const [transactions, setTransactions] = useState<AdminTransactionPaymentResponse[]>([]);
  const [attempts, setAttempts] = useState<AdminPaymentAttemptResponse[]>([]);
  const [provider, setProvider] = useState<PaymentProvider | ''>('');
  const [status, setStatus] = useState<PaymentAttemptStatus | ''>('');
  const [transactionStatus, setTransactionStatus] = useState<ShipmentTransactionStatus | ''>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!token) return;
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    const applyPagination = (response: {
      number?: number;
      size?: number;
      totalPages?: number;
      totalElements?: number;
    }) => {
      const nextTotalPages = Math.max(response.totalPages ?? 0, 0);
      const lastPage = Math.max(nextTotalPages - 1, 0);
      const nextPage = Math.min(Math.max(response.number ?? page, 0), lastPage);
      const nextPageSize =
        typeof response.size === 'number' && response.size > 0
          ? response.size
          : pageSize;

      setTotalPages(nextTotalPages);
      setTotalElements(Math.max(response.totalElements ?? 0, 0));
      if (nextPage !== page) setPage(nextPage);
      if (nextPageSize !== pageSize) setPageSize(nextPageSize);
    };

    try {
      if (view === 'transactions') {
        const params = {
          status: transactionStatus || undefined,
          page,
          size: pageSize,
          sort: `createdAt,${sortDirection}`,
        };
        if (scope === 'platform') {
          const response = await getAdminTransactions(token, params);
          if (currentRequestId !== requestId.current) return;
          setTransactions(response.content ?? []);
          applyPagination(response);
        } else {
          const response = await getTransactions(token, params);
          if (currentRequestId !== requestId.current) return;
          setTransactions((response.content ?? []).map((transaction) => ({
            transaction,
            payments: transaction.payments ?? [],
          })));
          applyPagination(response);
        }
      } else {
        const response = await getAdminPayments(token, {
          provider: provider || undefined,
          status: status || undefined,
          page,
          size: pageSize,
          sort: `createdAt,${sortDirection}`,
        });
        if (currentRequestId !== requestId.current) return;
        setAttempts(response.content ?? []);
        applyPagination(response);
      }
    } catch (cause) {
      if (currentRequestId !== requestId.current) return;
      setError(
        cause instanceof ApiError
          ? cause.message
          : t('platformFinance.trace.errors.load'),
      );
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, provider, scope, sortDirection, status, t, token, transactionStatus, view]);

  useEffect(() => {
    void load();
  }, [load]);

  const transactionMetrics = useMemo(() => {
    const lines = transactions.flatMap((item) => item.payments ?? item.transaction.payments ?? []);
    const succeeded = lines.filter((payment) => payment.status === 'SUCCEEDED');
    return {
      cash: succeeded
        .filter((payment) => payment.provider !== 'PROMO_CODE')
        .reduce((sum, payment) => sum + payment.amount, 0),
      promo: succeeded
        .filter((payment) => payment.provider === 'PROMO_CODE')
        .reduce((sum, payment) => sum + payment.amount, 0),
      failed: lines.filter((payment) => payment.status === 'FAILED').length,
    };
  }, [transactions]);

  const changeView = (nextView: 'transactions' | 'attempts') => {
    setView(nextView);
    setPage(0);
    setExpandedId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">
            {t(scope === 'platform' ? 'platformFinance.trace.title' : 'platformFinance.trace.companyTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(scope === 'platform' ? 'platformFinance.trace.subtitle' : 'platformFinance.trace.companySubtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'transactions' ? 'default' : 'outline'}
            onClick={() => changeView('transactions')}
          >
            {t('platformFinance.trace.transactions')}
          </Button>
          {scope === 'platform' && (
            <Button
              variant={view === 'attempts' ? 'default' : 'outline'}
              onClick={() => changeView('attempts')}
            >
              {t('platformFinance.trace.attempts')}
            </Button>
          )}
        </div>
      </div>

      {view === 'transactions' && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <TraceMetric label={t('platformFinance.trace.totalTransactions')} value={String(totalElements)} />
          <TraceMetric label={t('platformFinance.trace.cashReceived')} value={formatMoney(transactionMetrics.cash)} />
          <TraceMetric label={t('platformFinance.trace.promoCoverage')} value={formatMoney(transactionMetrics.promo)} />
          <TraceMetric label={t('platformFinance.trace.failedAttempts')} value={String(transactionMetrics.failed)} />
        </div>
      )}

      {view === 'transactions' && (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <select
            value={transactionStatus}
            onChange={(event) => {
              setTransactionStatus(event.target.value as ShipmentTransactionStatus | '');
              setPage(0);
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs"
            aria-label={t('platformFinance.trace.filterTransactionStatus')}
          >
            <option value="">{t('platformFinance.trace.allTransactionStatuses')}</option>
            {TRANSACTION_STATUSES.map((item) => (
              <option key={item} value={item}>{t(`platformFinance.trace.transactionStatuses.${item}`)}</option>
            ))}
          </select>
          <label className="relative">
            <span className="sr-only">{t('common.sortOrder')}</span>
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sortDirection}
              onChange={(event) => {
                setSortDirection(event.target.value as SortDirection);
                setPage(0);
                setExpandedId(null);
              }}
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
              aria-label={t('common.sortOrder')}
            >
              <option value="desc">{t('common.newestFirst')}</option>
              <option value="asc">{t('common.oldestFirst')}</option>
            </select>
          </label>
        </div>
      )}

      {view === 'attempts' && (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <select
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value as PaymentProvider | '');
              setPage(0);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label={t('platformFinance.trace.filterProvider')}
          >
            <option value="">{t('platformFinance.trace.allProviders')}</option>
            {PROVIDERS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as PaymentAttemptStatus | '');
              setPage(0);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label={t('platformFinance.trace.filterStatus')}
          >
            <option value="">{t('platformFinance.trace.allStatuses')}</option>
            {PAYMENT_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">
            {view === 'transactions'
              ? t('platformFinance.trace.latestTransactions')
              : t('platformFinance.trace.latestAttempts')}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="overflow-hidden px-3 sm:px-6">
          {view === 'transactions' ? (
            <TransactionsTable
              items={transactions}
              showCompany={scope === 'platform'}
              expandedId={expandedId}
              onToggle={(id) => setExpandedId((current) => current === id ? null : id)}
            />
          ) : (
            <AttemptsTable items={attempts} />
          )}
          {!loading && (view === 'transactions' ? transactions.length === 0 : attempts.length === 0) && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t('platformFinance.trace.empty')}
            </p>
          )}
          {!loading && totalElements > 0 && (
            <DataPagination
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              loading={loading}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TraceMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex min-w-0 items-start gap-2.5 p-3 sm:items-center sm:gap-3 sm:p-4">
        <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
        <div className="min-w-0"><p className="text-xs leading-snug text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-semibold text-foreground sm:text-base">{value}</p></div>
      </CardContent>
    </Card>
  );
}

function TransactionsTable({
  items,
  showCompany,
  expandedId,
  onToggle,
}: {
  items: AdminTransactionPaymentResponse[];
  showCompany: boolean;
  expandedId: number | null;
  onToggle: (id: number) => void;
}) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map(({ transaction, payments }) => {
          const lines = payments ?? transaction.payments ?? [];
          const isExpanded = expandedId === transaction.id;
          return (
            <article key={transaction.id} className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
              <div className="space-y-3 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs font-semibold text-foreground">{transaction.reference}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                  </div>
                  <Badge className={cn('shrink-0 border-0 text-[10px]', getShipmentTransactionStatusClassName(transaction.status))}>
                    {t(`platformFinance.trace.transactionStatuses.${transaction.status}`)}
                  </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t('platformFinance.trace.shipment')}</dt>
                    <dd className="mt-0.5 truncate font-medium text-foreground">{transaction.shipmentReference ?? `#${transaction.shipmentId ?? '--'}`}</dd>
                  </div>
                  <div className="min-w-0 text-right">
                    <dt className="text-xs text-muted-foreground">{t('platformFinance.trace.amount')}</dt>
                    <dd className="mt-0.5 font-semibold text-foreground">{formatMoney(transaction.netAmount ?? transaction.grossAmount)}</dd>
                  </div>
                  {showCompany && (
                    <div className="col-span-2 min-w-0 border-t border-border/70 pt-2">
                      <dt className="text-xs text-muted-foreground">{t('platformFinance.trace.company')}</dt>
                      <dd className="mt-0.5 truncate font-medium text-foreground">{transaction.companyName ?? '--'}</dd>
                    </div>
                  )}
                </dl>

                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-between"
                  aria-expanded={isExpanded}
                  aria-label={t(isExpanded ? 'platformFinance.trace.hideDetails' : 'platformFinance.trace.showDetails', { values: { reference: transaction.reference } })}
                  onClick={() => onToggle(transaction.id)}
                >
                  {t('platformFinance.trace.details')}
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {isExpanded && (
                <div className="space-y-4 border-t border-border bg-muted/20 p-3.5">
                  <TransactionBreakdown transaction={transaction} />
                  <PaymentLines payments={lines} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t('platformFinance.trace.reference')}</TableHead>
            <TableHead>{t('platformFinance.trace.shipment')}</TableHead>
            {showCompany && <TableHead>{t('platformFinance.trace.company')}</TableHead>}
            <TableHead>{t('platformFinance.trace.status')}</TableHead>
            <TableHead>{t('platformFinance.trace.amount')}</TableHead>
            <TableHead className="text-right">{t('platformFinance.trace.details')}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map(({ transaction, payments }) => {
              const lines = payments ?? transaction.payments ?? [];
              return [
                <TableRow key={`transaction-${transaction.id}`}>
                  <TableCell><p className="font-mono text-xs">{transaction.reference}</p><p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt)}</p></TableCell>
                  <TableCell>{transaction.shipmentReference ?? `#${transaction.shipmentId ?? '--'}`}</TableCell>
                  {showCompany && <TableCell>{transaction.companyName ?? '--'}</TableCell>}
                  <TableCell><Badge className={cn('border-0', getShipmentTransactionStatusClassName(transaction.status))}>{t(`platformFinance.trace.transactionStatuses.${transaction.status}`)}</Badge></TableCell>
                  <TableCell>{formatMoney(transaction.netAmount ?? transaction.grossAmount)}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" aria-label={t(expandedId === transaction.id ? 'platformFinance.trace.hideDetails' : 'platformFinance.trace.showDetails', { values: { reference: transaction.reference } })} onClick={() => onToggle(transaction.id)}>{expandedId === transaction.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></TableCell>
                </TableRow>,
                expandedId === transaction.id ? (
                  <TableRow key={`payments-${transaction.id}`} className="bg-muted/20">
                    <TableCell colSpan={showCompany ? 6 : 5}>
                      <div className="space-y-4">
                        <TransactionBreakdown transaction={transaction} />
                        <PaymentLines payments={lines} />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null,
              ];
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function TransactionBreakdown({ transaction }: { transaction: AdminTransactionPaymentResponse['transaction'] }) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const values = [
    ['grossAmount', transaction.grossAmount],
    ['companyPrice', transaction.companyPrice],
    ['feeAmount', transaction.feeAmount],
    ['discountAmount', transaction.discountAmount],
    ['netAmount', transaction.netAmount],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
      {values.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">{t(`platformFinance.trace.breakdown.${key}`)}</p>
          <p className="mt-1 font-medium text-foreground">{formatMoney(value)}</p>
        </div>
      ))}
    </div>
  );
}

function AttemptsTable({ items }: { items: AdminPaymentAttemptResponse[] }) {
  const { t } = useTranslation('dashboard');
  return (
    <>
      <div className="space-y-3 md:hidden">
        {items.map((payment) => <PaymentMobileCard key={payment.id} payment={payment} />)}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t('platformFinance.trace.reference')}</TableHead>
            <TableHead>{t('platformFinance.trace.provider')}</TableHead>
            <TableHead>{t('platformFinance.trace.status')}</TableHead>
            <TableHead>{t('platformFinance.trace.amount')}</TableHead>
            <TableHead>{t('platformFinance.trace.payer')}</TableHead>
            <TableHead>{t('platformFinance.trace.providerError')}</TableHead>
          </TableRow></TableHeader>
          <TableBody>{items.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}</TableBody>
        </Table>
      </div>
    </>
  );
}

function PaymentLines({ payments }: { payments: AdminPaymentAttemptResponse[] }) {
  const { t } = useTranslation('dashboard');
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">{t('platformFinance.trace.noPaymentLine')}</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t('platformFinance.trace.succeededRule')}</p>
      <div className="space-y-2 md:hidden">
        {payments.map((payment) => <PaymentMobileCard key={payment.id} payment={payment} compact />)}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <Table><TableBody>{payments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}</TableBody></Table>
      </div>
    </div>
  );
}

function PaymentMobileCard({
  payment,
  compact = false,
}: {
  payment: AdminPaymentAttemptResponse;
  compact?: boolean;
}) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const payer = getPaymentPayer(payment);
  const sourceCurrency = getPaymentCurrency(payment);

  return (
    <article className={cn('rounded-xl border border-border bg-background', compact ? 'p-3' : 'p-3.5 shadow-sm')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all font-mono text-xs font-semibold text-foreground">{payment.reference}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(payment.createdAt)}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">{payment.provider}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-y border-border/70 py-2.5">
        <Badge className={cn('border-0 text-[10px]', paymentStatusClassName(payment.status))}>
          {t(`platformFinance.trace.paymentStatuses.${payment.status}`)}
        </Badge>
        <p className="text-sm font-semibold text-foreground">{formatMoney(payment.amount, { sourceCurrency })}</p>
      </div>

      <dl className="mt-3 text-sm">
        <dt className="text-xs text-muted-foreground">{t('platformFinance.trace.payer')}</dt>
        <dd className="mt-0.5 break-all font-medium text-foreground">{payer}</dd>
      </dl>

      {payment.failureReason && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="break-words">{payment.failureCode ? `${payment.failureCode}: ` : ''}{payment.failureReason}</p>
        </div>
      )}
    </article>
  );
}

function getPaymentPayer(payment: AdminPaymentAttemptResponse) {
  return payment.payerMsisdn || payment.initiatedByPhone || payment.initiatedByEmail || payment.payerMsisdnMasked || '--';
}

function getPaymentCurrency(payment: AdminPaymentAttemptResponse): Currency {
  return SUPPORTED_CURRENCIES.includes(payment.currency as Currency)
    ? payment.currency as Currency
    : 'XAF';
}

function PaymentRow({ payment }: { payment: AdminPaymentAttemptResponse }) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const payer = getPaymentPayer(payment);
  const sourceCurrency = getPaymentCurrency(payment);
  return (
    <TableRow>
      <TableCell><p className="font-mono text-xs">{payment.reference}</p><p className="text-xs text-muted-foreground">{formatDate(payment.createdAt)}</p></TableCell>
      <TableCell>{payment.provider}</TableCell>
      <TableCell><Badge className={cn('border-0', paymentStatusClassName(payment.status))}>{t(`platformFinance.trace.paymentStatuses.${payment.status}`)}</Badge></TableCell>
      <TableCell>{formatMoney(payment.amount, { sourceCurrency })}</TableCell>
      <TableCell className="max-w-48 break-words">{payer}</TableCell>
      <TableCell className="max-w-64 text-xs text-destructive">
        {payment.failureReason ? <span className="inline-flex items-start gap-1"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{payment.failureCode ? `${payment.failureCode}: ` : ''}{payment.failureReason}</span> : '--'}
      </TableCell>
    </TableRow>
  );
}
