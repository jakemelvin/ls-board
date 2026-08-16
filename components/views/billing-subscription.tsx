'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CreditCard,
  Crown,
  Infinity,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { SubscriptionPaymentDialog } from '@/components/billing/subscription-payment-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  cancelBillingSubscription,
  createCompanySubscription,
  getBillingSubscription,
  getCompanyBillingDashboard,
  setSubscriptionAutoRenew,
} from '@/lib/billing/api';
import {
  deferBillingCheckout,
  getBillingCheckout,
  saveBillingCheckout,
} from '@/lib/billing/checkout-storage';
import { notifyBillingStatusChanged } from '@/lib/billing/status';
import type {
  BillingCycle,
  BillingDisplayCurrency,
  BillingFeature,
  BillingInvoiceResponse,
  BillingPlanResponse,
  CompanyBillingDashboardResponse,
  CompanySubscriptionResponse,
} from '@/lib/billing/types';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useCompanyContext } from '@/lib/company/use-company';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const DISPLAY_CURRENCIES: BillingDisplayCurrency[] = ['XAF', 'EUR', 'USD'];
const BILLING_FEATURES: BillingFeature[] = ['SHIPMENT_SENDING', 'PARCEL_PICKUP'];

interface CheckoutSelection {
  invoice: BillingInvoiceResponse;
  subscription: CompanySubscriptionResponse;
}

interface BillingSubscriptionViewProps {
  companyIdOverride?: number;
  readOnly?: boolean;
}

export function BillingSubscriptionView({
  companyIdOverride,
  readOnly = false,
}: BillingSubscriptionViewProps = {}) {
  const token = useAuthStore((state) => state.token);
  const companyContext = useCompanyContext({ enabled: companyIdOverride === undefined });
  const companyId = companyIdOverride ?? companyContext.companyId;
  const companyStatus = companyIdOverride !== undefined ? 'resolved' : companyContext.status;
  const retryCompany = companyContext.retry;
  const { t, locale } = useTranslation('billing');
  const [dashboard, setDashboard] = useState<CompanyBillingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<BillingDisplayCurrency>('XAF');
  const [displayCycle, setDisplayCycle] = useState<BillingCycle>('MONTHLY');
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanResponse | null>(null);
  const [autoRenew, setAutoRenew] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeCheckout, setActiveCheckout] = useState<CheckoutSelection | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(
    async (background = false) => {
      if (!token || !companyId) return;
      background ? setRefreshing(true) : setLoading(true);
      setLoadError(null);
      try {
        setDashboard(await getCompanyBillingDashboard(token, companyId));
      } catch (cause) {
        setLoadError(apiMessage(cause, t('errors.load')));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, t, token],
  );

  useEffect(() => {
    if (companyStatus === 'resolved') void load();
    if (companyStatus !== 'loading' && companyStatus !== 'resolved') setLoading(false);
  }, [companyStatus, load]);

  useEffect(() => {
    if (!dashboard || !token || activeCheckout || readOnly) return;
    const saved = getBillingCheckout(dashboard.companyId);
    if (!saved || saved.autoResume === false) return;
    const invoice = dashboard.recentInvoices.find(
      (item) => item.id === saved.invoiceId && item.status === 'PENDING',
    );
    if (!invoice) return;
    getBillingSubscription(token, saved.subscriptionId)
      .then((subscription) => setActiveCheckout({ invoice, subscription }))
      .catch(() => undefined);
  }, [activeCheckout, dashboard, readOnly, token]);

  const activeSubscription = dashboard?.activeSubscription ?? null;
  const usage = dashboard?.currentUsage ?? activeSubscription?.usage ?? null;
  const sortedPlans = useMemo(
    () =>
      [...(dashboard?.availablePlans ?? [])].sort((left, right) => {
        const leftPrice = left.monthlyAmountXaf;
        const rightPrice = right.monthlyAmountXaf;
        return leftPrice - rightPrice;
      }),
    [dashboard?.availablePlans],
  );
  const pickupEnabled = Boolean(
    dashboard?.operationalSubscriptionReady &&
      (usage?.parcelPickupEnabled || activeSubscription?.features.includes('PARCEL_PICKUP')),
  );
  const hasPickupPlan = sortedPlans.some((plan) => plan.features.includes('PARCEL_PICKUP'));

  async function createSubscription() {
    if (!token || !companyId || !selectedPlan) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const checkout = await createCompanySubscription(token, companyId, {
        planId: selectedPlan.id,
        billingCycle: displayCycle,
        autoRenew,
      });
      if (!checkout.paymentRequired) {
        setSelectedPlan(null);
        await load(true);
        notifyBillingStatusChanged();
        return;
      }
      saveBillingCheckout(companyId, checkout.subscription.id, checkout.invoice.id);
      setSelectedPlan(null);
      setActiveCheckout({ invoice: checkout.invoice, subscription: checkout.subscription });
      notifyBillingStatusChanged();
    } catch (cause) {
      setActionError(apiMessage(cause, t('errors.checkout')));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAutoRenew(enabled: boolean) {
    if (!token || !activeSubscription) return;
    setActionError(null);
    try {
      const updated = await setSubscriptionAutoRenew(token, activeSubscription.id, enabled);
      setDashboard((current) =>
        current ? { ...current, activeSubscription: updated } : current,
      );
    } catch (cause) {
      setActionError(apiMessage(cause, t('errors.autoRenew')));
    }
  }

  async function cancelSubscription() {
    if (!token || !activeSubscription) return;
    setCancelling(true);
    setActionError(null);
    try {
      await cancelBillingSubscription(token, activeSubscription.id);
      setCancelOpen(false);
      await load(true);
      notifyBillingStatusChanged();
    } catch (cause) {
      setActionError(apiMessage(cause, t('errors.cancel')));
    } finally {
      setCancelling(false);
    }
  }

  async function resumeInvoice(invoice: BillingInvoiceResponse) {
    if (!token) return;
    setActionError(null);
    try {
      const subscription = await getBillingSubscription(token, invoice.subscriptionId);
      saveBillingCheckout(invoice.companyId, subscription.id, invoice.id);
      setActiveCheckout({ invoice, subscription });
    } catch (cause) {
      setActionError(apiMessage(cause, t('errors.invoice')));
    }
  }

  if (companyStatus === 'loading' || loading) {
    return <LoadingState label={t('loading')} />;
  }

  if (companyStatus !== 'resolved' || !companyId) {
    return (
      <EmptyState
        title={t('companyUnavailable.title')}
        description={t('companyUnavailable.description')}
        action={<Button onClick={retryCompany}>{t('actions.retry')}</Button>}
      />
    );
  }

  if (loadError || !dashboard) {
    return (
      <EmptyState
        title={t('errors.title')}
        description={loadError ?? t('errors.load')}
        action={<Button onClick={() => void load()}>{t('actions.retry')}</Button>}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('title')}</h2>
          <p className="text-muted-foreground">
            {t('subtitle', { values: { company: dashboard.companyName } })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border border-border bg-card p-1">
            {DISPLAY_CURRENCIES.map((currency) => (
              <button
                key={currency}
                type="button"
                onClick={() => setDisplayCurrency(currency)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold',
                  displayCurrency === currency
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {currency}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => void load(true)} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            {t('actions.refresh')}
          </Button>
        </div>
      </div>

      {(dashboard.alertTitle || dashboard.alertMessage) && (
        <Alert variant={dashboard.quotaBlocked ? 'destructive' : 'default'}>
          <AlertTriangle />
          <AlertTitle>{dashboard.alertTitle ?? t('alerts.attention')}</AlertTitle>
          <AlertDescription>{dashboard.alertMessage}</AlertDescription>
        </Alert>
      )}

      {actionError && (
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>{t('errors.title')}</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {activeSubscription && !pickupEnabled && hasPickupPlan && (
        <Alert className="border-warning/40 bg-warning/10" data-testid="pickup-upgrade-alert">
          <AlertTriangle />
          <AlertTitle>{t('plans.pickupUpgradeTitle')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{t('plans.pickupUpgradeDescription')}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() =>
                document.getElementById('pickup-compatible-plans')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }
            >
              {t('plans.pickupUpgradeAction')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <CurrentPlanCard
          subscription={activeSubscription}
          operationalReady={dashboard.operationalSubscriptionReady}
          canManage={!readOnly}
          locale={locale}
          onCancel={() => setCancelOpen(true)}
          onAutoRenewChange={(enabled) => void toggleAutoRenew(enabled)}
        />
        <UsageCard
          usage={usage}
          quotaBlocked={dashboard.quotaBlocked}
          locale={locale}
          pickupEnabled={pickupEnabled}
        />
      </div>

      <section id="pickup-compatible-plans" className="scroll-mt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('plans.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('plans.description')}</p>
          </div>
          <div className="flex rounded-lg border border-border bg-card p-1">
            {(['MONTHLY', 'ANNUAL'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setDisplayCycle(cycle)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold',
                  displayCycle === cycle
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {t(`cycles.${cycle}`)}
              </button>
            ))}
          </div>
        </div>

        {sortedPlans.length === 0 ? (
          <EmptyState title={t('plans.emptyTitle')} description={t('plans.emptyDescription')} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {sortedPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={displayCycle}
                currency={displayCurrency}
                current={activeSubscription?.planId === plan.id}
                locale={locale}
                canManage={!readOnly}
                onSelect={() => {
                  setAutoRenew(true);
                  setSelectedPlan(plan);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <InvoicesSection
        invoices={dashboard.recentInvoices}
        locale={locale}
        canManage={!readOnly}
        onPay={(invoice) => void resumeInvoice(invoice)}
      />

      <Dialog open={Boolean(selectedPlan)} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('checkout.title')}</DialogTitle>
            <DialogDescription>
              {t('checkout.description', { values: { plan: selectedPlan?.title ?? '' } })}
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="font-semibold">{selectedPlan.title}</p>
                <p className="mt-1 text-2xl font-bold">
                  {formatPlanPrice(selectedPlan, displayCycle, displayCurrency, locale)}
                </p>
                <p className="text-sm text-muted-foreground">{t(`cycles.${displayCycle}`)}</p>
              </div>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <span>
                  <span className="block text-sm font-medium">{t('checkout.autoRenew')}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t('checkout.autoRenewHint')}
                  </span>
                </span>
                <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPlan(null)} disabled={submitting}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={() => void createSubscription()} disabled={submitting} className="gap-2">
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {t('checkout.continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cancel.title')}</DialogTitle>
            <DialogDescription>{t('cancel.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              {t('actions.keep')}
            </Button>
            <Button variant="destructive" onClick={() => void cancelSubscription()} disabled={cancelling}>
              {t('cancel.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeCheckout && (
        <SubscriptionPaymentDialog
          open
          invoice={activeCheckout.invoice}
          subscription={activeCheckout.subscription}
          onOpenChange={(open) => {
            if (open) return;
            deferBillingCheckout(activeCheckout.invoice.id);
            setActiveCheckout(null);
            void load(true);
          }}
          onPaymentSucceeded={async () => {
            setActiveCheckout(null);
            await load(true);
            notifyBillingStatusChanged();
          }}
        />
      )}
    </div>
  );
}

function CurrentPlanCard({
  subscription,
  operationalReady,
  canManage,
  locale,
  onAutoRenewChange,
  onCancel,
}: {
  subscription: CompanySubscriptionResponse | null;
  operationalReady: boolean;
  canManage: boolean;
  locale: string;
  onAutoRenewChange: (enabled: boolean) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('billing');
  if (!subscription) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <Crown className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">{t('current.noneTitle')}</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t(canManage ? 'current.noneDescription' : 'readOnly.noneDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-primary/30', !operationalReady && 'border-warning/50')}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              {subscription.planTitle}
            </CardTitle>
            <CardDescription>{t('current.description')}</CardDescription>
          </div>
          <Badge className={statusClassName(subscription.status)}>
            {t(`subscriptionStatuses.${subscription.status}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile
            label={t('current.cycle')}
            value={t(`cycles.${subscription.billingCycle}`)}
          />
          <InfoTile
            label={t('current.startsAt')}
            value={formatDate(subscription.startsAt, locale)}
          />
          <InfoTile label={t('current.endsAt')} value={formatDate(subscription.endsAt, locale)} />
        </div>
        <div className="rounded-xl border border-border p-4" data-testid="current-plan-features">
          <p className="mb-3 text-sm font-medium">{t('current.featuresTitle')}</p>
          <div className="space-y-2">
            {BILLING_FEATURES.map((feature) => (
              <FeatureAccessRow
                key={feature}
                feature={feature}
                included={subscription.features.includes(feature)}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{t('current.autoRenew')}</p>
            <p className="text-xs text-muted-foreground">{t('current.autoRenewHint')}</p>
          </div>
          {canManage ? (
            <div className="flex items-center gap-3">
              <Switch checked={subscription.autoRenew} onCheckedChange={onAutoRenewChange} />
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onCancel}>
                {t('current.cancel')}
              </Button>
            </div>
          ) : (
            <Badge variant="secondary">
              {t(subscription.autoRenew ? 'readOnly.enabled' : 'readOnly.disabled')}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UsageCard({
  usage,
  quotaBlocked,
  locale,
  pickupEnabled,
}: {
  usage: CompanyBillingDashboardResponse['currentUsage'];
  quotaBlocked: boolean;
  locale: string;
  pickupEnabled: boolean;
}) {
  const { t } = useTranslation('billing');
  return (
    <Card className={cn(quotaBlocked && 'border-destructive/50')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageCheck className="h-5 w-5 text-primary" />
          {t('usage.title')}
        </CardTitle>
        <CardDescription>
          {usage?.cycleStart && usage?.cycleEnd
            ? t('usage.period', {
                values: {
                  start: formatDate(usage.cycleStart, locale),
                  end: formatDate(usage.cycleEnd, locale),
                },
              })
            : t('usage.unavailable')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!usage ? (
          <p className="text-sm text-muted-foreground">{t('usage.unavailable')}</p>
        ) : usage.unlimitedShipments || usage.usagePercentage === null ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <div className="flex items-center gap-2 text-success">
              <Infinity className="h-5 w-5" />
              <span className="text-lg font-semibold">{t('usage.unlimited')}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('usage.used', { values: { count: usage.usedShipments } })}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-end justify-between gap-3">
              <p className="text-2xl font-bold">
                {usage.usedShipments.toLocaleString(locale)} /{' '}
                {usage.monthlyShipmentLimit?.toLocaleString(locale)}
              </p>
              <span className="text-sm text-muted-foreground">{usage.usagePercentage}%</span>
            </div>
            <Progress value={usage.usagePercentage} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('usage.remaining', { values: { count: usage.remainingShipments ?? 0 } })}
            </p>
          </div>
        )}
        {usage && (
          <div className="grid grid-cols-2 gap-3">
            <InfoTile
              label={t('usage.national')}
              value={usage.nationalShipments.toLocaleString(locale)}
            />
            <InfoTile
              label={t('usage.international')}
              value={usage.internationalShipments.toLocaleString(locale)}
            />
          </div>
        )}
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl border p-3',
            pickupEnabled
              ? 'border-success/30 bg-success/10'
              : 'border-border bg-muted/40',
          )}
          data-testid="pickup-access-status"
        >
          <div className="flex items-center gap-2">
            {pickupEnabled ? (
              <Check className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{t('usage.pickup')}</span>
          </div>
          <Badge variant={pickupEnabled ? 'default' : 'secondary'}>
            {t(pickupEnabled ? 'usage.pickupEnabled' : 'usage.pickupDisabled')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({
  plan,
  cycle,
  currency,
  current,
  locale,
  canManage,
  onSelect,
}: {
  plan: BillingPlanResponse;
  cycle: BillingCycle;
  currency: BillingDisplayCurrency;
  current: boolean;
  locale: string;
  canManage: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation('billing');
  return (
    <Card
      className={cn(current && 'border-primary ring-2 ring-primary/15')}
      data-testid={`billing-plan-${plan.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{plan.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-3">{plan.description}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {current ? <Badge>{t('plans.current')}</Badge> : <Sparkles className="h-5 w-5 text-primary" />}
            {plan.features.includes('PARCEL_PICKUP') && (
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                {t('plans.pickupReady')}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold">{formatPlanPrice(plan, cycle, currency, locale)}</p>
          <p className="text-sm text-muted-foreground">{t(`plans.priceSuffix.${cycle}`)}</p>
        </div>
        <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <PlanLine label={t('plans.scope')} value={t(`scopes.${plan.shipmentScope}`)} />
          <PlanLine
            label={t('plans.quota')}
            value={
              plan.unlimitedShipments
                ? t('usage.unlimited')
                : t('plans.shipmentsPerMonth', {
                    values: { count: plan.monthlyShipmentLimit ?? 0 },
                  })
            }
          />
        </div>
        <div className="space-y-2">
          {BILLING_FEATURES.map((feature) => (
            <FeatureAccessRow
              key={feature}
              feature={feature}
              included={plan.features.includes(feature)}
            />
          ))}
        </div>
        {canManage ? (
          <Button className="w-full" variant={current ? 'outline' : 'default'} disabled={current} onClick={onSelect}>
            {current ? t('plans.active') : t('plans.choose')}
          </Button>
        ) : (
          <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            {t('readOnly.adminOnly')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FeatureAccessRow({ feature, included }: { feature: BillingFeature; included: boolean }) {
  const { t } = useTranslation('billing');
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 text-sm',
        included ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span className="flex min-w-0 items-start gap-2">
        {included ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>{t(`features.${feature}`)}</span>
      </span>
      <span className="shrink-0 text-xs font-medium">
        {t(included ? 'plans.featureIncluded' : 'plans.featureNotIncluded')}
      </span>
    </div>
  );
}

function InvoicesSection({
  invoices,
  locale,
  canManage,
  onPay,
}: {
  invoices: BillingInvoiceResponse[];
  locale: string;
  canManage: boolean;
  onPay: (invoice: BillingInvoiceResponse) => void;
}) {
  const { t } = useTranslation('billing');
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t('invoices.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('invoices.description')}</p>
      </div>
      {invoices.length === 0 ? (
        <EmptyState title={t('invoices.emptyTitle')} description={t('invoices.emptyDescription')} />
      ) : (
        <Card>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoices.reference')}</TableHead>
                  <TableHead>{t('invoices.plan')}</TableHead>
                  <TableHead>{t('invoices.date')}</TableHead>
                  <TableHead>{t('invoices.amount')}</TableHead>
                  <TableHead>{t('invoices.status')}</TableHead>
                  <TableHead className="text-right">{t('invoices.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="max-w-52 break-all font-mono text-xs">{invoice.reference}</TableCell>
                    <TableCell>{invoice.planTitle}</TableCell>
                    <TableCell>{formatDate(invoice.createdAt, locale)}</TableCell>
                    <TableCell>{formatAmount(invoice.netAmount, invoice.currency, locale)}</TableCell>
                    <TableCell><InvoiceBadge status={invoice.status} /></TableCell>
                    <TableCell className="text-right">
                      {canManage && invoice.status === 'PENDING' && (
                        <Button size="sm" onClick={() => onPay(invoice)}>{t('invoices.pay')}</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <CardContent className="space-y-3 p-4 md:hidden">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{invoice.planTitle}</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{invoice.reference}</p>
                  </div>
                  <InvoiceBadge status={invoice.status} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <InfoTile label={t('invoices.date')} value={formatDate(invoice.createdAt, locale)} />
                  <InfoTile label={t('invoices.amount')} value={formatAmount(invoice.netAmount, invoice.currency, locale)} />
                </div>
                {canManage && invoice.status === 'PENDING' && (
                  <Button className="mt-4 w-full" onClick={() => onPay(invoice)}>{t('invoices.pay')}</Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function InvoiceBadge({ status }: { status: BillingInvoiceResponse['status'] }) {
  const { t } = useTranslation('billing');
  return <Badge className={invoiceStatusClassName(status)}>{t(`invoiceStatuses.${status}`)}</Badge>;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  );
}

function PlanLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <CreditCard className="h-9 w-9 text-muted-foreground" />
        <h3 className="mt-3 font-semibold">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-3">
      <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function formatPlanPrice(
  plan: BillingPlanResponse,
  cycle: BillingCycle,
  currency: BillingDisplayCurrency,
  locale: string,
) {
  const prices = cycle === 'MONTHLY' ? plan.monthlyPrices : plan.annualPrices;
  const fallback = cycle === 'MONTHLY' ? plan.monthlyAmountXaf : plan.annualAmountXaf;
  const price = prices?.[currency] ?? (currency === 'XAF' ? fallback : undefined);
  return price === undefined ? '—' : formatAmount(price, currency, locale);
}

function formatAmount(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'XAF',
    maximumFractionDigits: currency === 'XAF' ? 0 : 2,
  }).format(amount);
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function statusClassName(status: CompanySubscriptionResponse['status']) {
  if (status === 'ACTIVE') return 'bg-success/15 text-success';
  if (status === 'PENDING_PAYMENT') return 'bg-warning/15 text-warning';
  return 'bg-muted text-muted-foreground';
}

function invoiceStatusClassName(status: BillingInvoiceResponse['status']) {
  if (status === 'PAID') return 'bg-success/15 text-success';
  if (status === 'PENDING') return 'bg-warning/15 text-warning';
  if (status === 'FAILED') return 'bg-destructive/15 text-destructive';
  return 'bg-muted text-muted-foreground';
}

function apiMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.message : fallback;
}
