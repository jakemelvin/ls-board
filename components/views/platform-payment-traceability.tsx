'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, ReceiptText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { getAdminPayments, getAdminTransactions } from '@/lib/platform-finance/api';
import type {
  AdminPaymentAttemptResponse,
  AdminTransactionPaymentResponse,
  PaymentAttemptStatus,
  PaymentProvider,
} from '@/lib/platform-finance/types';
import {
  getShipmentTransactionStatusClassName,
  SHIPMENT_TRANSACTION_STATUS_LABELS,
} from '@/lib/shipments/presentation';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;
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

export function PlatformPaymentTraceability() {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const token = useAuthStore((state) => state.token);
  const [view, setView] = useState<'transactions' | 'attempts'>('transactions');
  const [transactions, setTransactions] = useState<AdminTransactionPaymentResponse[]>([]);
  const [attempts, setAttempts] = useState<AdminPaymentAttemptResponse[]>([]);
  const [provider, setProvider] = useState<PaymentProvider | ''>('');
  const [status, setStatus] = useState<PaymentAttemptStatus | ''>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (view === 'transactions') {
        const response = await getAdminTransactions(token, { page: 0, size: PAGE_SIZE });
        setTransactions(response.content ?? []);
      } else {
        const response = await getAdminPayments(token, {
          provider: provider || undefined,
          status: status || undefined,
          page: 0,
          size: PAGE_SIZE,
        });
        setAttempts(response.content ?? []);
      }
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : t('platformFinance.trace.errors.load'),
      );
    } finally {
      setLoading(false);
    }
  }, [provider, status, t, token, view]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{t('platformFinance.trace.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('platformFinance.trace.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'transactions' ? 'default' : 'outline'}
            onClick={() => setView('transactions')}
          >
            {t('platformFinance.trace.transactions')}
          </Button>
          <Button
            variant={view === 'attempts' ? 'default' : 'outline'}
            onClick={() => setView('attempts')}
          >
            {t('platformFinance.trace.attempts')}
          </Button>
        </div>
      </div>

      {view === 'transactions' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <TraceMetric label={t('platformFinance.trace.cashReceived')} value={formatMoney(transactionMetrics.cash)} />
          <TraceMetric label={t('platformFinance.trace.promoCoverage')} value={formatMoney(transactionMetrics.promo)} />
          <TraceMetric label={t('platformFinance.trace.failedAttempts')} value={String(transactionMetrics.failed)} />
        </div>
      )}

      {view === 'attempts' && (
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as PaymentProvider | '')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            aria-label={t('platformFinance.trace.filterProvider')}
          >
            <option value="">{t('platformFinance.trace.allProviders')}</option>
            {PROVIDERS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as PaymentAttemptStatus | '')}
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
        <CardContent className="overflow-x-auto">
          {view === 'transactions' ? (
            <TransactionsTable
              items={transactions}
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
        </CardContent>
      </Card>
    </div>
  );
}

function TraceMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <ReceiptText className="h-5 w-5 text-primary" />
        <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold text-foreground">{value}</p></div>
      </CardContent>
    </Card>
  );
}

function TransactionsTable({
  items,
  expandedId,
  onToggle,
}: {
  items: AdminTransactionPaymentResponse[];
  expandedId: number | null;
  onToggle: (id: number) => void;
}) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>{t('platformFinance.trace.reference')}</TableHead>
        <TableHead>{t('platformFinance.trace.shipment')}</TableHead>
        <TableHead>{t('platformFinance.trace.company')}</TableHead>
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
              <TableCell>{transaction.companyName ?? '--'}</TableCell>
              <TableCell><Badge className={cn('border-0', getShipmentTransactionStatusClassName(transaction.status))}>{SHIPMENT_TRANSACTION_STATUS_LABELS[transaction.status]}</Badge></TableCell>
              <TableCell>{formatMoney(transaction.netAmount ?? transaction.grossAmount)}</TableCell>
              <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => onToggle(transaction.id)}>{expandedId === transaction.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></TableCell>
            </TableRow>,
            expandedId === transaction.id ? (
              <TableRow key={`payments-${transaction.id}`} className="bg-muted/20">
                <TableCell colSpan={6}>
                  <PaymentLines payments={lines} />
                </TableCell>
              </TableRow>
            ) : null,
          ];
        })}
      </TableBody>
    </Table>
  );
}

function AttemptsTable({ items }: { items: AdminPaymentAttemptResponse[] }) {
  const { t } = useTranslation('dashboard');
  return (
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
  );
}

function PaymentLines({ payments }: { payments: AdminPaymentAttemptResponse[] }) {
  const { t } = useTranslation('dashboard');
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">{t('platformFinance.trace.noPaymentLine')}</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t('platformFinance.trace.succeededRule')}</p>
      <Table><TableBody>{payments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}</TableBody></Table>
    </div>
  );
}

function PaymentRow({ payment }: { payment: AdminPaymentAttemptResponse }) {
  const { formatMoney } = useCurrency();
  const payer = payment.payerMsisdn || payment.initiatedByPhone || payment.initiatedByEmail || payment.maskedPayerMsisdn || '--';
  const sourceCurrency = SUPPORTED_CURRENCIES.includes(payment.currency as Currency)
    ? payment.currency as Currency
    : 'XAF';
  return (
    <TableRow>
      <TableCell><p className="font-mono text-xs">{payment.reference}</p><p className="text-xs text-muted-foreground">{formatDate(payment.createdAt)}</p></TableCell>
      <TableCell>{payment.provider}</TableCell>
      <TableCell><Badge className={cn('border-0', paymentStatusClassName(payment.status))}>{payment.status}</Badge></TableCell>
      <TableCell>{formatMoney(payment.amount, { sourceCurrency })}</TableCell>
      <TableCell className="max-w-48 break-words">{payer}</TableCell>
      <TableCell className="max-w-64 text-xs text-destructive">
        {payment.failureReason ? <span className="inline-flex items-start gap-1"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{payment.failureCode ? `${payment.failureCode}: ` : ''}{payment.failureReason}</span> : '--'}
      </TableCell>
    </TableRow>
  );
}
