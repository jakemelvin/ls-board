'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CreditCard,
  Crown,
  Infinity,
  PackageCheck,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
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
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/mock-data';
import {
  formatSubscriptionQuota,
  getRecommendedUpgradePlan,
  getSubscriptionQuotaSummaries,
  isUpgradePlan,
  type SubscriptionQuotaSummary,
} from '@/lib/subscription';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { SUPPORTED_CURRENCIES, useCurrency, type Currency } from '@/lib/currency';

const statusLabels: Record<SubscriptionStatus, string> = {
  TRIALING: 'Essai gratuit',
  ACTIVE: 'Actif',
  PAST_DUE: 'Paiement en attente',
  CANCELED: 'Annule',
};

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function QuotaUsageCard({ quota }: { quota: SubscriptionQuotaSummary }) {
  const isUnlimited = quota.status === 'unlimited';
  const isNotIncluded = quota.status === 'not_included';
  const isWarning = quota.status === 'warning';
  const isExhausted = quota.status === 'exhausted';

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-secondary/20 p-4',
        isWarning && 'border-warning/50 bg-warning/10',
        isExhausted && 'border-destructive/50 bg-destructive/10'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{quota.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isUnlimited
              ? 'Aucune limite sur le cycle en cours.'
              : isNotIncluded
                ? "Ce type d'envoi n'est pas inclus dans le plan actuel."
                : `${quota.remaining?.toLocaleString('fr-FR')} restant(s) sur ce cycle.`}
          </p>
        </div>
        {isUnlimited ? (
          <Infinity className="h-5 w-5 text-success" />
        ) : isExhausted ? (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        ) : (
          <PackageCheck className="h-5 w-5 text-primary" />
        )}
      </div>

      <div className="mt-4">
        {isUnlimited ? (
          <p className="text-2xl font-bold text-foreground">Illimite</p>
        ) : isNotIncluded ? (
          <p className="text-2xl font-bold text-muted-foreground">Non inclus</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <p className="text-2xl font-bold text-foreground">
                {quota.used.toLocaleString('fr-FR')} / {quota.limit?.toLocaleString('fr-FR')}
              </p>
              <p className="text-sm font-medium text-muted-foreground">{quota.percentUsed}%</p>
            </div>
            <Progress
              value={quota.percentUsed ?? 0}
              className={cn(
                'mt-3',
                isWarning && '[&_[data-slot=progress-indicator]]:bg-warning',
                isExhausted && '[&_[data-slot=progress-indicator]]:bg-destructive'
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PlanLimitLine({ label, limit }: { label: string; limit: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{formatSubscriptionQuota(limit)}</span>
    </div>
  );
}

export function BillingSubscriptionView() {
  const { formatMoney } = useCurrency();
  const {
    subscriptionPlans,
    companySubscription,
    subscriptionUsage,
    changeSubscriptionPlan,
  } = useStore();
  const [pendingPlan, setPendingPlan] = useState<SubscriptionPlan | null>(null);
  const formatPlanPrice = (plan: Pick<SubscriptionPlan, 'monthlyPrice' | 'currency'>) =>
    formatMoney(plan.monthlyPrice, {
      sourceCurrency: SUPPORTED_CURRENCIES.includes(plan.currency as Currency)
        ? plan.currency as Currency
        : 'XAF',
    });

  const currentPlan = useMemo(
    () =>
      subscriptionPlans.find((plan) => plan.id === companySubscription.planId) ??
      subscriptionPlans[0],
    [companySubscription.planId, subscriptionPlans]
  );

  const sortedPlans = useMemo(
    () => [...subscriptionPlans].sort((left, right) => left.upgradeRank - right.upgradeRank),
    [subscriptionPlans]
  );

  const quotaSummaries = useMemo(
    () => getSubscriptionQuotaSummaries(currentPlan, subscriptionUsage),
    [currentPlan, subscriptionUsage]
  );
  const exhaustedQuota = quotaSummaries.find((quota) => quota.status === 'exhausted');
  const warningQuota = quotaSummaries.find((quota) => quota.status === 'warning');
  const recommendedUpgrade = getRecommendedUpgradePlan(
    subscriptionPlans,
    currentPlan,
    exhaustedQuota?.kind ?? warningQuota?.kind
  );

  const handleConfirmPlanChange = () => {
    if (!pendingPlan) {
      return;
    }

    changeSubscriptionPlan(pendingPlan.id);
    setPendingPlan(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Facturation & abonnement</h2>
          <p className="text-muted-foreground">
            Gere le plan de l'entreprise, les quotas mensuels et les upgrades.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/20 text-primary">{statusLabels[companySubscription.status]}</Badge>
          <Badge variant="outline">
            Cycle: {formatDate(companySubscription.currentPeriodStart)} -{' '}
            {formatDate(companySubscription.currentPeriodEnd)}
          </Badge>
        </div>
      </div>

      {exhaustedQuota && recommendedUpgrade && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            Limite {exhaustedQuota.kind === 'national' ? 'nationale' : 'internationale'} atteinte
          </AlertTitle>
          <AlertDescription>
            <p>
              Le quota {exhaustedQuota.label.toLowerCase()} du plan actuel est termine. Passez au
              plan {recommendedUpgrade.name} pour continuer sans blocage.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3 gap-2"
              onClick={() => setPendingPlan(recommendedUpgrade)}
            >
              <ArrowUpRight className="h-4 w-4" />
              Upgrader
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!exhaustedQuota && warningQuota && recommendedUpgrade && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>Quota bientot termine</AlertTitle>
          <AlertDescription>
            Il reste {warningQuota.remaining?.toLocaleString('fr-FR')} envoi(s) sur{' '}
            {warningQuota.label.toLowerCase()}. Le plan {recommendedUpgrade.name} est pret si le
            volume augmente.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <Card className="border-primary/40 bg-card">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Crown className="h-5 w-5 text-primary" />
                  Plan actuel: {currentPlan.name}
                </CardTitle>
                <CardDescription>{currentPlan.description}</CardDescription>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-3xl font-bold text-foreground">
                  {formatPlanPrice(currentPlan)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentPlan.monthlyPrice === 0 ? 'pendant la periode essai' : 'par mois'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Renouvellement</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {formatDate(companySubscription.currentPeriodEnd)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Auto-renew</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {companySubscription.autoRenew ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Mis a jour</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {formatDate(companySubscription.updatedAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {quotaSummaries.map((quota) => (
                <QuotaUsageCard key={quota.kind} quota={quota} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              Resume abonnement
            </CardTitle>
            <CardDescription>Etat du cycle mensuel courant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Cycle mensuel</p>
                  <p className="text-xs text-muted-foreground">
                    Reinitialisation le {formatDate(subscriptionUsage.periodEnd)}.
                  </p>
                </div>
              </div>
            </div>
            {recommendedUpgrade && (
              <Button className="w-full gap-2" onClick={() => setPendingPlan(recommendedUpgrade)}>
                <ArrowUpRight className="h-4 w-4" />
                Upgrade recommande: {recommendedUpgrade.name}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Plans disponibles</h3>
          <p className="text-sm text-muted-foreground">
            Choisissez un plan selon les volumes nationaux et internationaux de l'entreprise.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-5">
          {sortedPlans.map((plan) => {
            const isCurrent = plan.id === currentPlan.id;
            const canUpgrade = isUpgradePlan(plan, currentPlan);

            return (
              <Card
                key={plan.id}
                className={cn(
                  'border-border bg-card',
                  isCurrent && 'border-primary ring-2 ring-primary/20',
                  plan.isRecommended && !isCurrent && 'border-success/50'
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base text-foreground">{plan.name}</CardTitle>
                      <CardDescription className="mt-1">{plan.description}</CardDescription>
                    </div>
                    {plan.isRecommended && <Sparkles className="h-5 w-5 text-success" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isCurrent && <Badge className="bg-primary/20 text-primary">Plan actuel</Badge>}
                    {plan.isRecommended && (
                      <Badge className="bg-success/20 text-success">Recommande</Badge>
                    )}
                    {canUpgrade && <Badge variant="outline">Upgrade</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatPlanPrice(plan)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {plan.monthlyPrice === 0 ? `${plan.trialDays} jours` : 'par mois'}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-border bg-secondary/20 p-3">
                    <PlanLimitLine label="National" limit={plan.nationalShipmentLimit} />
                    <PlanLimitLine label="International" limit={plan.internationalShipmentLimit} />
                  </div>

                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 text-success" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full gap-2"
                    variant={isCurrent ? 'outline' : canUpgrade ? 'default' : 'secondary'}
                    disabled={isCurrent}
                    onClick={() => setPendingPlan(plan)}
                  >
                    {isCurrent ? (
                      'Plan actif'
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Choisir ce plan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={Boolean(pendingPlan)} onOpenChange={(open) => !open && setPendingPlan(null)}>
        <DialogContent className="border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmer le changement de plan</DialogTitle>
            <DialogDescription>
              Cette action simule un changement d'abonnement. Aucun paiement reel n'est declenche.
            </DialogDescription>
          </DialogHeader>
          {pendingPlan && (
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-sm text-muted-foreground">Nouveau plan</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{pendingPlan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPlanPrice(pendingPlan)} / mois
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingPlan(null)}>
              Annuler
            </Button>
            <Button className="gap-2" onClick={handleConfirmPlanChange}>
              <CreditCard className="h-4 w-4" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
