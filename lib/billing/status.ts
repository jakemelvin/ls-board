'use client';

import { useCallback, useEffect, useState } from 'react';

import { getCompanyBillingDashboard } from '@/lib/billing/api';
import type { CompanyBillingDashboardResponse } from '@/lib/billing/types';
import { useAuthStore } from '@/lib/auth/store';

export const BILLING_STATUS_REFRESH_EVENT = 'sendam:billing-status-refresh';

export type CompanyPlanStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE';

export function getCompanyPlanStatus(
  dashboard: CompanyBillingDashboardResponse,
): CompanyPlanStatus {
  if (dashboard.operationalSubscriptionReady) return 'ACTIVE';

  const hasPendingPayment =
    dashboard.activeSubscription?.status === 'PENDING_PAYMENT' ||
    dashboard.recentInvoices?.some((invoice) => invoice.status === 'PENDING');

  return hasPendingPayment ? 'PENDING' : 'INACTIVE';
}

export function notifyBillingStatusChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BILLING_STATUS_REFRESH_EVENT));
  }
}

export function useCompanyBillingStatus({
  companyId,
  enabled,
}: {
  companyId: number | null;
  enabled: boolean;
}) {
  const token = useAuthStore((state) => state.token);
  const [dashboard, setDashboard] = useState<CompanyBillingDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled || !token || !companyId) {
      setDashboard(null);
      return;
    }

    setLoading(true);
    try {
      const response = await getCompanyBillingDashboard(token, companyId);
      setDashboard(isCompanyBillingDashboard(response) ? response : null);
    } catch {
      // Do not label a company as inactive when its billing status cannot be verified.
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, enabled, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    const handleRefresh = () => void refresh();
    window.addEventListener(BILLING_STATUS_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(BILLING_STATUS_REFRESH_EVENT, handleRefresh);
  }, [enabled, refresh]);

  return { dashboard, loading, refresh };
}

function isCompanyBillingDashboard(
  response: CompanyBillingDashboardResponse,
): response is CompanyBillingDashboardResponse {
  return (
    typeof response?.companyId === 'number' &&
    typeof response?.operationalSubscriptionReady === 'boolean' &&
    Array.isArray(response?.availablePlans) &&
    Array.isArray(response?.recentInvoices)
  );
}
