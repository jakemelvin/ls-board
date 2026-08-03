'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, LoaderCircle, RefreshCw } from 'lucide-react';
import { BillingSubscriptionView } from '@/components/views/billing-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCompanies } from '@/lib/admin/api';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import type { CompanyResponse } from '@/lib/auth/types';
import { useTranslation } from '@/lib/i18n';

export function SuperAdminCompanyBilling() {
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('billing');
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getCompanies(token, { page: 0, size: 100 });
      const nextCompanies = response.content ?? [];
      setCompanies(nextCompanies);
      setSelectedCompanyId((current) =>
        current && nextCompanies.some((company) => company.id === current)
          ? current
          : (nextCompanies[0]?.id ?? null),
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('adminCompany.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="flex justify-center py-20"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('actions.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (companies.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          {t('adminCompany.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3 sm:flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t('adminCompany.title')}</p>
              <p className="text-xs text-muted-foreground">{t('adminCompany.description')}</p>
            </div>
          </div>
          <select
            value={selectedCompanyId ?? ''}
            onChange={(event) => setSelectedCompanyId(Number(event.target.value))}
            className="h-10 min-w-64 rounded-md border border-input bg-background px-3 text-sm"
            aria-label={t('adminCompany.select')}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedCompanyId && <BillingSubscriptionView key={selectedCompanyId} companyIdOverride={selectedCompanyId} />}
    </div>
  );
}
