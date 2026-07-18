'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type RefObject,
} from 'react';
import {
  BadgePercent,
  CreditCard,
  Globe2,
  HandCoins,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlatformPaymentTraceability } from '@/components/views/platform-payment-traceability';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Badge,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';
import { getCountries } from '@/lib/auth/api';
import type { CountryResponse } from '@/lib/auth/types';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import {
  createPaymentMode,
  createPromoCode,
  createShipmentFee,
  deletePaymentMode,
  deletePromoCode,
  deleteShipmentFee,
  getPaymentModes,
  getPromoCodes,
  getShipmentFees,
  updatePaymentMode,
  updatePromoCode,
  updateShipmentFee,
} from '@/lib/platform-finance/api';
import type {
  PaymentModeResponse,
  PromoCodeDiscountType,
  PromoCodeResponse,
  ShipmentFeeResponse,
} from '@/lib/platform-finance/types';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

type TabId = 'fees' | 'promos' | 'payments' | 'traceability';
type DeleteTarget =
  | { kind: 'fee'; item: ShipmentFeeResponse }
  | { kind: 'promo'; item: PromoCodeResponse }
  | { kind: 'payment'; item: PaymentModeResponse };

type FeeForm = {
  id?: number;
  originCountryId: string;
  amount: string;
  active: boolean;
};

type PromoForm = {
  id?: number;
  code: string;
  description: string;
  discountType: PromoCodeDiscountType;
  discountValue: string;
  maxDiscountAmount: string;
  multiUse: boolean;
  multiUser: boolean;
  active: boolean;
  expiresAt: string;
};

type PaymentModeForm = {
  id?: number;
  name: string;
  active: boolean;
};

const TABS: { id: TabId; labelKey: string; icon: ElementType }[] = [
  { id: 'fees', labelKey: 'platformFinance.tabs.fees', icon: HandCoins },
  { id: 'promos', labelKey: 'platformFinance.tabs.promos', icon: BadgePercent },
  { id: 'payments', labelKey: 'platformFinance.tabs.payments', icon: CreditCard },
  { id: 'traceability', labelKey: 'platformFinance.tabs.traceability', icon: ListChecks },
];

const EMPTY_FEE: FeeForm = { originCountryId: '', amount: '', active: true };
const EMPTY_PROMO: PromoForm = {
  code: '',
  description: '',
  discountType: 'FIXED_AMOUNT',
  discountValue: '',
  maxDiscountAmount: '',
  multiUse: true,
  multiUser: true,
  active: true,
  expiresAt: '',
};
const EMPTY_PAYMENT: PaymentModeForm = { name: '', active: true };

function formatDate(value?: string | null) {
  if (!value) return 'Non defini';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function parsePositiveNumber(value: string, label: string, allowZero = true) {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number) || number < 0 || (!allowZero && number === 0)) {
    return { error: `${label} doit etre un nombre positif.` };
  }
  return { value: number };
}

function StatusBadge({ active }: { active?: boolean }) {
  const { t } = useTranslation('dashboard');
  return active ? (
    <Badge className="bg-success/15 text-success">{t('platformFinance.status.active')}</Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground">{t('platformFinance.status.inactive')}</Badge>
  );
}

function ActiveToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {label ?? t('platformFinance.status.active')}
    </label>
  );
}

function ActionButtons({
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <div className="flex justify-end gap-1.5">
      <Button type="button" size="icon" variant="ghost" onClick={onEdit} title={t('common.edit')}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteDisabled ? t('platformFinance.payments.systemNotDeletable') : t('common.delete')}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PlatformFinanceSettings() {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const { toast, success, error: showError } = useToastSimple();
  const [activeTab, setActiveTab] = useState<TabId>('fees');
  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [fees, setFees] = useState<ShipmentFeeResponse[]>([]);
  const [promos, setPromos] = useState<PromoCodeResponse[]>([]);
  const [payments, setPayments] = useState<PaymentModeResponse[]>([]);
  const [feeForm, setFeeForm] = useState<FeeForm>(EMPTY_FEE);
  const [promoForm, setPromoForm] = useState<PromoForm>(EMPTY_PROMO);
  const [paymentForm, setPaymentForm] = useState<PaymentModeForm>(EMPTY_PAYMENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TabId | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const formAnchorRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [countriesResponse, feesResponse, promosResponse, paymentsResponse] =
        await Promise.all([
          getCountries(),
          getShipmentFees(token),
          getPromoCodes(token),
          getPaymentModes(token),
        ]);

      setCountries(countriesResponse);
      setFees(feesResponse);
      setPromos(promosResponse);
      setPayments(paymentsResponse);
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeFees = useMemo(() => fees.filter((item) => item.active !== false), [fees]);
  const activePromos = useMemo(() => promos.filter((item) => item.active !== false), [promos]);
  const activePayments = useMemo(() => payments.filter((item) => item.active !== false), [payments]);

  const scrollToForm = useCallback(() => {
    window.requestAnimationFrame(() => {
      formAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const editFeeForm = useCallback(
    (nextForm: FeeForm) => {
      setFeeForm(nextForm);
      scrollToForm();
    },
    [scrollToForm],
  );

  const editPromoForm = useCallback(
    (nextForm: PromoForm) => {
      setPromoForm(nextForm);
      scrollToForm();
    },
    [scrollToForm],
  );

  const editPaymentForm = useCallback(
    (nextForm: PaymentModeForm) => {
      setPaymentForm(nextForm);
      scrollToForm();
    },
    [scrollToForm],
  );

  if (role !== 'SUPER_ADMIN') {
    return (
      <StatusState
        icon={Shield}
        tone="warning"
        title={t('superAdmin.restricted.title')}
        description={t('platformFinance.restrictedDescription')}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <StatusState
        icon={CreditCard}
        tone="destructive"
        title="Erreur de chargement"
        description={loadError}
        action={
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const handleSaveFee = async () => {
    if (!token) return;
    setFormError(null);
    const amount = parsePositiveNumber(feeForm.amount, 'Le montant');
    if (!feeForm.originCountryId || amount.error) {
      setFormError(amount.error ?? 'Selectionnez un pays origine.');
      return;
    }

    setSaving('fees');
    try {
      const payload = {
        originCountryId: Number(feeForm.originCountryId),
        amount: amount.value ?? 0,
        active: feeForm.active,
      };
      const saved = feeForm.id
        ? await updateShipmentFee(token, feeForm.id, payload)
        : await createShipmentFee(token, payload);
      setFees((current) =>
        current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setFeeForm(EMPTY_FEE);
      success('Frais shipment enregistre');
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : 'Enregistrement impossible.');
    } finally {
      setSaving(null);
    }
  };

  const handleSavePromo = async () => {
    if (!token) return;
    setFormError(null);
    const discount = parsePositiveNumber(promoForm.discountValue, 'La remise', false);
    const maxDiscount: { value?: number; error?: string } = promoForm.maxDiscountAmount.trim()
      ? parsePositiveNumber(promoForm.maxDiscountAmount, 'Le plafond')
      : { value: undefined };

    if (!promoForm.code.trim() || discount.error || maxDiscount.error) {
      setFormError(discount.error ?? maxDiscount.error ?? 'Le code promo est requis.');
      return;
    }

    setSaving('promos');
    try {
      const payload = {
        code: promoForm.code.trim().toUpperCase(),
        description: promoForm.description.trim() || undefined,
        discountType: promoForm.discountType,
        discountValue: discount.value ?? 0,
        maxDiscountAmount: maxDiscount.value,
        multiUse: promoForm.multiUse,
        multiUser: promoForm.multiUser,
        active: promoForm.active,
        expiresAt: fromDateTimeLocal(promoForm.expiresAt),
      };
      const saved = promoForm.id
        ? await updatePromoCode(token, promoForm.id, payload)
        : await createPromoCode(token, payload);
      setPromos((current) =>
        current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setPromoForm(EMPTY_PROMO);
      success('Code promo enregistre');
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : 'Enregistrement impossible.');
    } finally {
      setSaving(null);
    }
  };

  const handleSavePayment = async () => {
    if (!token) return;
    setFormError(null);
    if (!paymentForm.name.trim()) {
      setFormError('Le nom du mode de paiement est requis.');
      return;
    }

    setSaving('payments');
    try {
      const payload = {
        name: paymentForm.name.trim().toUpperCase(),
        active: paymentForm.active,
      };
      const saved = paymentForm.id
        ? await updatePaymentMode(token, paymentForm.id, payload)
        : await createPaymentMode(token, payload);
      setPayments((current) =>
        current.some((item) => item.id === saved.id)
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setPaymentForm(EMPTY_PAYMENT);
      success('Mode de paiement enregistre');
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : 'Enregistrement impossible.');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setSaving(activeTab);
    try {
      if (deleteTarget.kind === 'fee') {
        await deleteShipmentFee(token, deleteTarget.item.id);
        setFees((current) => current.filter((item) => item.id !== deleteTarget.item.id));
      }
      if (deleteTarget.kind === 'promo') {
        await deletePromoCode(token, deleteTarget.item.id);
        setPromos((current) => current.filter((item) => item.id !== deleteTarget.item.id));
      }
      if (deleteTarget.kind === 'payment') {
        await deletePaymentMode(token, deleteTarget.item.id);
        setPayments((current) => current.filter((item) => item.id !== deleteTarget.item.id));
      }
      setDeleteTarget(null);
      success('Element supprime');
    } catch (cause) {
      showError(cause instanceof ApiError ? cause.message : 'Suppression impossible.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <ToastBar toast={toast} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('platformFinance.delete.title')}
        description={t('platformFinance.delete.description')}
        confirmLabel={t('common.delete')}
        destructive
        loading={saving !== null}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <SectionHeader
        title={t('platformFinance.title')}
        subtitle={t('platformFinance.subtitle')}
        action={
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Globe2} label={t('platformFinance.metrics.countries')} value={activeFees.length} />
        <Metric icon={BadgePercent} label={t('platformFinance.metrics.promos')} value={activePromos.length} />
        <Metric icon={CreditCard} label={t('platformFinance.metrics.payments')} value={activePayments.length} />
      </div>

      <div className="grid gap-1 rounded-xl bg-muted p-1 sm:inline-grid sm:grid-cols-4">
        {TABS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveTab(id);
              setFormError(null);
            }}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {formError && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}

      {activeTab === 'fees' && (
        <FeesPanel
          form={feeForm}
          fees={fees}
          countries={countries}
          saving={saving === 'fees'}
          formRef={formAnchorRef}
          onFormChange={setFeeForm}
          onEditForm={editFeeForm}
          onSave={() => void handleSaveFee()}
          onDelete={(item) => setDeleteTarget({ kind: 'fee', item })}
        />
      )}

      {activeTab === 'promos' && (
        <PromosPanel
          form={promoForm}
          promos={promos}
          saving={saving === 'promos'}
          formRef={formAnchorRef}
          onFormChange={setPromoForm}
          onEditForm={editPromoForm}
          onSave={() => void handleSavePromo()}
          onDelete={(item) => setDeleteTarget({ kind: 'promo', item })}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsPanel
          form={paymentForm}
          payments={payments}
          saving={saving === 'payments'}
          formRef={formAnchorRef}
          onFormChange={setPaymentForm}
          onEditForm={editPaymentForm}
          onSave={() => void handleSavePayment()}
          onDelete={(item) => setDeleteTarget({ kind: 'payment', item })}
        />
      )}

      {activeTab === 'traceability' && <PlatformPaymentTraceability />}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: number;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FeesPanel({
  form,
  fees,
  countries,
  saving,
  formRef,
  onFormChange,
  onEditForm,
  onSave,
  onDelete,
}: {
  form: FeeForm;
  fees: ShipmentFeeResponse[];
  countries: CountryResponse[];
  saving: boolean;
  formRef: RefObject<HTMLDivElement | null>;
  onFormChange: (form: FeeForm) => void;
  onEditForm: (form: FeeForm) => void;
  onSave: () => void;
  onDelete: (item: ShipmentFeeResponse) => void;
}) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Card ref={formRef} className="scroll-mt-4 border-border bg-card md:scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {form.id ? t('platformFinance.fees.form.editTitle') : t('platformFinance.fees.form.createTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('platformFinance.fees.form.country')}</Label>
            <select
              value={form.originCountryId}
              onChange={(event) => onFormChange({ ...form, originCountryId: event.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t('platformFinance.fees.form.selectCountry')}</option>
              {countries.map((country) => (
                <option key={country.countryId} value={country.countryId}>
                  {country.countryName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>{t('platformFinance.fees.form.amount')}</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.amount}
              onChange={(event) => onFormChange({ ...form, amount: event.target.value })}
              placeholder="500"
            />
          </div>
          <ActiveToggle
            checked={form.active}
            onChange={(active) => onFormChange({ ...form, active })}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onSave} disabled={saving} className="gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('common.save')}
            </Button>
            <Button variant="outline" onClick={() => onFormChange(EMPTY_FEE)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('common.new')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">{t('platformFinance.fees.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fees.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              {t('platformFinance.fees.empty')}
            </p>
          ) : (
            fees.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {item.originCountryName ?? `Pays #${item.originCountryId}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(item.amount)} - cree par {item.createdBy ?? 'systeme'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <StatusBadge active={item.active} />
                    <ActionButtons
                      onEdit={() =>
                        onEditForm({
                          id: item.id,
                          originCountryId: String(item.originCountryId),
                          amount: String(item.amount),
                          active: item.active !== false,
                        })
                      }
                      onDelete={() => onDelete(item)}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PromosPanel({
  form,
  promos,
  saving,
  formRef,
  onFormChange,
  onEditForm,
  onSave,
  onDelete,
}: {
  form: PromoForm;
  promos: PromoCodeResponse[];
  saving: boolean;
  formRef: RefObject<HTMLDivElement | null>;
  onFormChange: (form: PromoForm) => void;
  onEditForm: (form: PromoForm) => void;
  onSave: () => void;
  onDelete: (item: PromoCodeResponse) => void;
}) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card ref={formRef} className="scroll-mt-4 border-border bg-card md:scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {form.id ? t('platformFinance.promos.form.editTitle') : t('platformFinance.promos.form.createTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t('platformFinance.promos.form.code')}
              value={form.code}
              onChange={(code) => onFormChange({ ...form, code })}
              placeholder="FREE5000"
            />
            <div className="space-y-2">
              <Label>{t('platformFinance.promos.form.type')}</Label>
              <select
                value={form.discountType}
                onChange={(event) =>
                  onFormChange({ ...form, discountType: event.target.value as PromoCodeDiscountType })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="FIXED_AMOUNT">{t('platformFinance.promos.discountTypes.fixed')}</option>
                <option value="PERCENTAGE">{t('platformFinance.promos.discountTypes.percentage')}</option>
              </select>
            </div>
          </div>
          <Field
            label={t('platformFinance.promos.form.description')}
            value={form.description}
            onChange={(description) => onFormChange({ ...form, description })}
            placeholder="Remise campagne"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t('platformFinance.promos.form.value')}
              type="number"
              value={form.discountValue}
              onChange={(discountValue) => onFormChange({ ...form, discountValue })}
              placeholder="5000"
            />
            <Field
              label={t('platformFinance.promos.form.maxDiscount')}
              type="number"
              value={form.maxDiscountAmount}
              onChange={(maxDiscountAmount) => onFormChange({ ...form, maxDiscountAmount })}
              placeholder="Optionnel"
            />
          </div>
          <Field
            label={t('platformFinance.promos.form.expiration')}
            type="datetime-local"
            value={form.expiresAt}
            onChange={(expiresAt) => onFormChange({ ...form, expiresAt })}
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <ActiveToggle
              checked={form.active}
              onChange={(active) => onFormChange({ ...form, active })}
            />
            <ActiveToggle
              checked={form.multiUse}
              onChange={(multiUse) => onFormChange({ ...form, multiUse })}
              label={t('platformFinance.promos.form.multiUse')}
            />
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.multiUser}
                onChange={(event) => onFormChange({ ...form, multiUser: event.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              {t('platformFinance.promos.form.multiUser')}
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onSave} disabled={saving} className="gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('common.save')}
            </Button>
            <Button variant="outline" onClick={() => onFormChange(EMPTY_PROMO)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('common.new')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">{t('platformFinance.promos.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-2">
          {promos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground lg:col-span-2">
              {t('platformFinance.promos.empty')}
            </p>
          ) : (
            promos.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-foreground">{item.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.discountType === 'PERCENTAGE'
                        ? `${item.discountValue}%`
                        : formatMoney(item.discountValue)}
                      {item.maxDiscountAmount ? ` - plafond ${formatMoney(item.maxDiscountAmount)}` : ''}
                    </p>
                  </div>
                  <StatusBadge active={item.active} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {item.description || 'Sans description'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Expire: {formatDate(item.expiresAt)}</span>
                  <span>Usages: {item.totalUsageCount ?? 0}</span>
                </div>
                <div className="mt-3">
                  <ActionButtons
                    onEdit={() =>
                      onEditForm({
                        id: item.id,
                        code: item.code,
                        description: item.description ?? '',
                        discountType: item.discountType,
                        discountValue: String(item.discountValue),
                        maxDiscountAmount: item.maxDiscountAmount != null ? String(item.maxDiscountAmount) : '',
                        multiUse: item.multiUse !== false,
                        multiUser: item.multiUser !== false,
                        active: item.active !== false,
                        expiresAt: toDateTimeLocal(item.expiresAt),
                      })
                    }
                    onDelete={() => onDelete(item)}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsPanel({
  form,
  payments,
  saving,
  formRef,
  onFormChange,
  onEditForm,
  onSave,
  onDelete,
}: {
  form: PaymentModeForm;
  payments: PaymentModeResponse[];
  saving: boolean;
  formRef: RefObject<HTMLDivElement | null>;
  onFormChange: (form: PaymentModeForm) => void;
  onEditForm: (form: PaymentModeForm) => void;
  onSave: () => void;
  onDelete: (item: PaymentModeResponse) => void;
}) {
  const { t } = useTranslation('dashboard');
  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <Card ref={formRef} className="scroll-mt-4 border-border bg-card md:scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {form.id ? t('platformFinance.payments.form.editTitle') : t('platformFinance.payments.form.createTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label={t('platformFinance.payments.form.name')}
            value={form.name}
            onChange={(name) => onFormChange({ ...form, name })}
            placeholder="MOBILE MONEY"
          />
          <ActiveToggle
            checked={form.active}
            onChange={(active) => onFormChange({ ...form, active })}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onSave} disabled={saving} className="gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('common.save')}
            </Button>
            <Button variant="outline" onClick={() => onFormChange(EMPTY_PAYMENT)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('common.new')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">{t('platformFinance.payments.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {payments.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.systemDefined ? 'Mode systeme' : `Cree par ${item.createdBy ?? 'admin'}`}
                  </p>
                </div>
                <StatusBadge active={item.active} />
              </div>
              <div className="mt-3">
                <ActionButtons
                  deleteDisabled={item.systemDefined}
                  onEdit={() =>
                    onEditForm({
                      id: item.id,
                      name: item.name,
                      active: item.active !== false,
                    })
                  }
                  onDelete={() => onDelete(item)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
