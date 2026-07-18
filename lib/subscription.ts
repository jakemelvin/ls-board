import type { SubscriptionPlan, SubscriptionUsage } from '@/lib/mock-data';

export type SubscriptionQuotaKind = 'national' | 'international';
export type SubscriptionQuotaStatus = 'unlimited' | 'not_included' | 'available' | 'warning' | 'exhausted';

export interface SubscriptionQuotaSummary {
  kind: SubscriptionQuotaKind;
  label: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  percentUsed: number | null;
  status: SubscriptionQuotaStatus;
}

export function formatSubscriptionQuota(limit: number | null) {
  if (limit === null) {
    return 'Illimite';
  }

  if (limit === 0) {
    return 'Non inclus';
  }

  return `${limit.toLocaleString('fr-FR')} / mois`;
}

export function getSubscriptionQuotaSummary(
  plan: SubscriptionPlan,
  usage: SubscriptionUsage,
  kind: SubscriptionQuotaKind
): SubscriptionQuotaSummary {
  const limit =
    kind === 'national' ? plan.nationalShipmentLimit : plan.internationalShipmentLimit;
  const used = kind === 'national' ? usage.nationalUsed : usage.internationalUsed;
  const label = kind === 'national' ? 'Envois nationaux' : 'Envois internationaux';

  if (limit === null) {
    return {
      kind,
      label,
      limit,
      used,
      remaining: null,
      percentUsed: null,
      status: 'unlimited',
    };
  }

  if (limit === 0) {
    return {
      kind,
      label,
      limit,
      used,
      remaining: 0,
      percentUsed: null,
      status: 'not_included',
    };
  }

  const remaining = Math.max(limit - used, 0);
  const percentUsed = Math.min(Math.round((used / limit) * 100), 100);
  const status =
    remaining === 0 ? 'exhausted' : remaining / limit <= 0.1 ? 'warning' : 'available';

  return {
    kind,
    label,
    limit,
    used,
    remaining,
    percentUsed,
    status,
  };
}

export function getSubscriptionQuotaSummaries(plan: SubscriptionPlan, usage: SubscriptionUsage) {
  return [
    getSubscriptionQuotaSummary(plan, usage, 'national'),
    getSubscriptionQuotaSummary(plan, usage, 'international'),
  ];
}

export function getRecommendedUpgradePlan(
  plans: SubscriptionPlan[],
  currentPlan: SubscriptionPlan,
  quotaKind?: SubscriptionQuotaKind
) {
  const sortedPlans = [...plans].sort((left, right) => left.upgradeRank - right.upgradeRank);

  if (quotaKind === 'international') {
    return (
      sortedPlans.find((plan) => plan.type === 'INTERNATIONAL_UNLIMITED') ??
      sortedPlans.find((plan) => plan.upgradeRank > currentPlan.upgradeRank) ??
      null
    );
  }

  if (quotaKind === 'national') {
    return (
      sortedPlans.find(
        (plan) =>
          plan.upgradeRank > currentPlan.upgradeRank &&
          (plan.nationalShipmentLimit === null ||
            (currentPlan.nationalShipmentLimit !== null &&
              plan.nationalShipmentLimit > currentPlan.nationalShipmentLimit))
      ) ??
      sortedPlans.find((plan) => plan.upgradeRank > currentPlan.upgradeRank) ??
      null
    );
  }

  return sortedPlans.find((plan) => plan.upgradeRank > currentPlan.upgradeRank) ?? null;
}

export function isUpgradePlan(plan: SubscriptionPlan, currentPlan: SubscriptionPlan) {
  return plan.upgradeRank > currentPlan.upgradeRank;
}
