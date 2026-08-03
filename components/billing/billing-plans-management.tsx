'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Globe2, LoaderCircle, Pencil, Plus, RefreshCw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  createBillingPlan,
  getBillingPlans,
  setBillingPlanStatus,
  updateBillingPlan,
} from '@/lib/billing/api';
import type {
  BillingFeature,
  BillingPlanRequest,
  BillingPlanResponse,
  BillingShipmentScope,
} from '@/lib/billing/types';
import { ApiError } from '@/lib/api-client';
import { getCountries } from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import type { CountryResponse } from '@/lib/auth/types';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type PlanForm = {
  id?: number;
  title: string;
  description: string;
  monthlyAmountXaf: string;
  annualAmountXaf: string;
  features: BillingFeature[];
  shipmentScope: BillingShipmentScope;
  monthlyShipmentLimit: string;
  unlimitedShipments: boolean;
  availableInAllCountries: boolean;
  countryIds: number[];
};

const EMPTY_FORM: PlanForm = {
  title: '',
  description: '',
  monthlyAmountXaf: '',
  annualAmountXaf: '',
  features: ['SHIPMENT_SENDING'],
  shipmentScope: 'NATIONAL',
  monthlyShipmentLimit: '',
  unlimitedShipments: false,
  availableInAllCountries: true,
  countryIds: [],
};

export function BillingPlansManagement() {
  const token = useAuthStore((state) => state.token);
  const { t, locale } = useTranslation('billing');
  const [plans, setPlans] = useState<BillingPlanResponse[]>([]);
  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [nextPlans, nextCountries] = await Promise.all([getBillingPlans(token), getCountries()]);
      setPlans(nextPlans);
      setCountries(nextCountries);
    } catch (cause) {
      setError(apiMessage(cause, t('admin.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = useMemo(() => plans.filter((plan) => plan.active).length, [plans]);

  function edit(plan: BillingPlanResponse) {
    setForm({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      monthlyAmountXaf: String(plan.monthlyAmountXaf),
      annualAmountXaf: String(plan.annualAmountXaf),
      features: plan.features,
      shipmentScope: plan.shipmentScope,
      monthlyShipmentLimit: plan.monthlyShipmentLimit == null ? '' : String(plan.monthlyShipmentLimit),
      unlimitedShipments: plan.unlimitedShipments,
      availableInAllCountries: plan.availableInAllCountries,
      countryIds: plan.eligibleCountries
        .map((country) => country.id ?? country.countryId)
        .filter((id): id is number => typeof id === 'number'),
    });
    window.requestAnimationFrame(() =>
      document.getElementById('billing-plan-form')?.scrollIntoView({ behavior: 'smooth' }),
    );
  }

  function toggleFeature(feature: BillingFeature) {
    setForm((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((item) => item !== feature)
        : [...current.features, feature],
    }));
  }

  function toggleCountry(countryId: number) {
    setForm((current) => ({
      ...current,
      countryIds: current.countryIds.includes(countryId)
        ? current.countryIds.filter((id) => id !== countryId)
        : [...current.countryIds, countryId],
    }));
  }

  async function save() {
    if (!token) return;
    setError(null);
    const monthly = Number(form.monthlyAmountXaf);
    const annual = Number(form.annualAmountXaf);
    const limit = Number(form.monthlyShipmentLimit);
    const invalid =
      form.title.trim().length === 0 ||
      form.description.trim().length === 0 ||
      form.features.length === 0 ||
      !Number.isFinite(monthly) ||
      monthly < 0 ||
      !Number.isFinite(annual) ||
      annual < 0 ||
      (!form.unlimitedShipments && (!Number.isInteger(limit) || limit < 1)) ||
      (!form.availableInAllCountries && form.countryIds.length === 0);
    if (invalid) {
      setError(t('admin.errors.validation'));
      return;
    }

    const payload: BillingPlanRequest = {
      title: form.title.trim(),
      description: form.description.trim(),
      monthlyAmountXaf: monthly,
      annualAmountXaf: annual,
      features: form.features,
      shipmentScope: form.shipmentScope,
      monthlyShipmentLimit: form.unlimitedShipments ? null : limit,
      unlimitedShipments: form.unlimitedShipments,
      availableInAllCountries: form.availableInAllCountries,
      countryIds: form.availableInAllCountries ? [] : form.countryIds,
    };

    setSaving(true);
    try {
      const saved = form.id
        ? await updateBillingPlan(token, form.id, payload)
        : await createBillingPlan(token, payload);
      setPlans((current) =>
        current.some((plan) => plan.id === saved.id)
          ? current.map((plan) => (plan.id === saved.id ? saved : plan))
          : [saved, ...current],
      );
      setForm(EMPTY_FORM);
    } catch (cause) {
      setError(apiMessage(cause, t('admin.errors.save')));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(plan: BillingPlanResponse) {
    if (!token) return;
    setChangingStatusId(plan.id);
    setError(null);
    try {
      const updated = await setBillingPlanStatus(token, plan.id, !plan.active);
      setPlans((current) => current.map((item) => (item.id === plan.id ? updated : item)));
    } catch (cause) {
      setError(apiMessage(cause, t('admin.errors.status')));
    } finally {
      setChangingStatusId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('admin.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('admin.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{activeCount} {t('admin.active').toLowerCase()}</Badge>
          <Button variant="outline" size="sm" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('actions.refresh')}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card id="billing-plan-form" className="scroll-mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {form.id ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {form.id ? t('admin.edit') : t('admin.new')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={t('admin.fields.title')}>
              <Input value={form.title} maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </Field>
            <Field label={t('admin.fields.description')}>
              <Textarea value={form.description} maxLength={5000} rows={4} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('admin.fields.monthly')}>
                <Input type="number" min="0" value={form.monthlyAmountXaf} onChange={(event) => setForm({ ...form, monthlyAmountXaf: event.target.value })} />
              </Field>
              <Field label={t('admin.fields.annual')}>
                <Input type="number" min="0" value={form.annualAmountXaf} onChange={(event) => setForm({ ...form, annualAmountXaf: event.target.value })} />
              </Field>
            </div>
            <Field label={t('admin.fields.scope')}>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.shipmentScope} onChange={(event) => setForm({ ...form, shipmentScope: event.target.value as BillingShipmentScope })}>
                {(['NATIONAL', 'INTERNATIONAL', 'BOTH'] as BillingShipmentScope[]).map((scope) => <option key={scope} value={scope}>{t(`scopes.${scope}`)}</option>)}
              </select>
            </Field>
            <Field label={t('admin.fields.features')}>
              <div className="space-y-2">
                {(['SHIPMENT_SENDING', 'PARCEL_PICKUP'] as BillingFeature[]).map((feature) => (
                  <label key={feature} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm">
                    <input type="checkbox" checked={form.features.includes(feature)} onChange={() => toggleFeature(feature)} className="h-4 w-4 accent-primary" />
                    {t(`features.${feature}`)}
                  </label>
                ))}
              </div>
            </Field>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              {t('admin.unlimited')}
              <Switch checked={form.unlimitedShipments} onCheckedChange={(checked) => setForm({ ...form, unlimitedShipments: checked, monthlyShipmentLimit: checked ? '' : form.monthlyShipmentLimit })} />
            </label>
            {!form.unlimitedShipments && (
              <Field label={t('admin.fields.limit')}>
                <Input type="number" min="1" step="1" value={form.monthlyShipmentLimit} onChange={(event) => setForm({ ...form, monthlyShipmentLimit: event.target.value })} />
              </Field>
            )}
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              {t('admin.allCountries')}
              <Switch checked={form.availableInAllCountries} onCheckedChange={(checked) => setForm({ ...form, availableInAllCountries: checked, countryIds: checked ? [] : form.countryIds })} />
            </label>
            {!form.availableInAllCountries && (
              <Field label={t('admin.selectedCountries')}>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {countries.map((country) => (
                    <label key={country.countryId} className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-muted">
                      <input type="checkbox" checked={form.countryIds.includes(country.countryId)} onChange={() => toggleCountry(country.countryId)} className="h-4 w-4 accent-primary" />
                      {country.countryName}
                    </label>
                  ))}
                </div>
              </Field>
            )}
            <div className="flex gap-2">
              {form.id && <Button variant="outline" className="flex-1" onClick={() => setForm(EMPTY_FORM)}>{t('actions.cancel')}</Button>}
              <Button className="flex-1 gap-2" onClick={() => void save()} disabled={saving}>
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('admin.save')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {plans.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">{t('admin.empty')}</CardContent></Card>
          ) : plans.map((plan) => (
            <Card key={plan.id} className={cn(!plan.active && 'opacity-75')}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{plan.title}</p>
                      <Badge className={plan.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}>{plan.active ? t('admin.active') : t('admin.inactive')}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => edit(plan)} className="gap-2"><Pencil className="h-4 w-4" />{t('admin.edit')}</Button>
                    <Button size="sm" variant={plan.active ? 'ghost' : 'default'} onClick={() => void toggleStatus(plan)} disabled={changingStatusId === plan.id}>
                      {plan.active ? t('admin.deactivate') : t('admin.activate')}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label={t('admin.fields.monthly')} value={formatXaf(plan.monthlyAmountXaf, locale)} />
                  <Metric label={t('admin.fields.annual')} value={formatXaf(plan.annualAmountXaf, locale)} />
                  <Metric label={t('admin.fields.scope')} value={t(`scopes.${plan.shipmentScope}`)} />
                  <Metric label={t('admin.fields.limit')} value={plan.unlimitedShipments ? t('usage.unlimited') : String(plan.monthlyShipmentLimit ?? '—')} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {plan.features.map((feature) => <Badge key={feature} variant="outline" className="gap-1"><Check className="h-3 w-3" />{t(`features.${feature}`)}</Badge>)}
                  <Badge variant="outline" className="gap-1"><Globe2 className="h-3 w-3" />{plan.availableInAllCountries ? t('admin.allCountries') : `${plan.eligibleCountries.length} ${t('admin.selectedCountries').toLowerCase()}`}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="block space-y-2"><span>{label}</span>{children}</Label>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function formatXaf(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(value);
}

function apiMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.message : fallback;
}
