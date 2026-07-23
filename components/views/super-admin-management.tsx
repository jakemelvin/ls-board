'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Gauge,
  Globe2,
  Users,
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldOff,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Lock,
  Package,
  Percent,
  RefreshCw,
  AlertTriangle,
  Info,
  ExternalLink,
  UserPlus,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { DataPagination } from '@/components/ui/data-pagination';
import { OperationalReadinessDialog } from '@/components/company/operational-readiness';
import { SuperAdminDashboard } from '@/components/views/super-admin-dashboard';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  getUsers,
  getCompanies,
  activateUser,
  suspendUser,
  deleteUser,
  updateUserPhone,
  changeUserPassword,
  updateUserCommission,
  createUser,
  getCompany,
  getCompanyEmployees,
  approveCompany,
  deleteCompany,
  getCompanyOperationalReadiness,
} from '@/lib/admin/api';
import { getCompanyDashboard } from '@/lib/dashboard/api';
import { getCountries, registerCompany } from '@/lib/auth/api';
import { resolveRemoteAssetUrl } from '@/lib/asset-url';
import { useCurrency } from '@/lib/currency';
import {
  formatDashboardDateParam,
  getDefaultDashboardPeriod,
} from '@/lib/dashboard-period';
import { useTranslation } from '@/lib/i18n';
import type {
  Page,
  CompanyOperationalReadiness,
  UserResponse,
  CompanyResponse,
} from '@/lib/admin/types';
import type { CompanyDashboardResponse } from '@/lib/dashboard/types';
import type { CountryResponse, ApiRole, Gender, PaymentCollectionMode, CreateCompanyRequest } from '@/lib/auth/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

const ROLE_LABEL_KEYS: Record<string, string> = {
  CLIENT: 'superAdmin.roles.client',
  COLLECTOR: 'roles.collector',
  TRANSPORTER: 'roles.transporter',
  ADMIN_COMPANY: 'roles.adminCompany',
  EMPLOYEE_COMPANY: 'roles.employee',
  SUPER_ADMIN: 'roles.superAdmin',
};

const STATUS_CONFIG: Record<string, { labelKey: string; color: string }> = {
  ACTIVE: { labelKey: 'superAdmin.status.active', color: 'bg-success/20 text-success' },
  INACTIVE: { labelKey: 'superAdmin.status.inactive', color: 'bg-muted text-muted-foreground' },
  SUSPENDED: { labelKey: 'superAdmin.status.suspended', color: 'bg-destructive/20 text-destructive' },
  DELETED: { labelKey: 'superAdmin.status.deleted', color: 'bg-muted text-muted-foreground' },
};

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── Confirm dialog ────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation('dashboard');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
            {t('common.cancel')}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {confirmLabel ?? t('common.confirm')}
              </span>
            ) : (
              confirmLabel ?? t('common.confirm')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Field dialog (single input) ───────────────────────────────────────────

interface FieldDialogProps {
  open: boolean;
  title: string;
  label: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  loading?: boolean;
  error?: string | null;
  onSave: (value: string) => void;
  onClose: () => void;
  children?: React.ReactNode;
}

function FieldDialog({
  open,
  title,
  label,
  defaultValue = '',
  type = 'text',
  placeholder,
  loading = false,
  error,
  onSave,
  onClose,
  children,
}: FieldDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {children ?? (
          <div className="space-y-1.5">
            <Label htmlFor="field-input">{label}</Label>
            <Input
              id="field-input"
              type={type}
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && onSave(value)}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={() => onSave(value)} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enregistrement…
              </span>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Password dialog ───────────────────────────────────────────────────────

function PasswordDialog({
  open,
  loading,
  error,
  onSave,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  onSave: (old: string, next: string) => void;
  onClose: () => void;
}) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  useEffect(() => {
    if (open) { setOldPw(''); setNewPw(''); setConfirmPw(''); }
  }, [open]);

  const mismatch = newPw && confirmPw && newPw !== confirmPw;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
        <h3 className="font-semibold text-foreground">Changer le mot de passe</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Ancien mot de passe</Label>
            <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmer</Label>
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={cn(mismatch && 'border-destructive')}
            />
            {mismatch && <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button
            onClick={() => onSave(oldPw, newPw)}
            disabled={loading || !oldPw || !newPw || newPw !== confirmPw}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enregistrement…
              </span>
            ) : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast helper ──────────────────────────────────────────────────────────

function useToastSimple() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return {
    toast,
    success: (msg: string) => setToast({ msg, type: 'success' }),
    error: (msg: string) => setToast({ msg, type: 'error' }),
  };
}

function ToastBar({ toast }: { toast: { msg: string; type: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-60 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2',
        toast.type === 'success'
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {toast.msg}
    </div>
  );
}

// ─── Pagination bar ────────────────────────────────────────────────────────

// ─── Create company dialog ─────────────────────────────────────────────────

type CompanyTab = 'company' | 'admin';

interface CreateCompanyForm {
  // Company
  name: string;
  email: string;
  phone: string;
  companyUrl: string;
  countryId: string;
  city: string;
  address: string;
  paymentCollectionMode: PaymentCollectionMode | '';
  // Admin user
  firstName: string;
  lastName: string;
  username: string;
  adminEmail: string;
  adminPhone: string;
  password: string;
  language: string;
  gender: Gender | '';
  idCardNumber: string;
  adminCountryId: string;
  adminCity: string;
  adminAddress: string;
}

const emptyCompanyForm = (): CreateCompanyForm => ({
  name: '', email: '', phone: '', companyUrl: '', countryId: '', city: '', address: '',
  paymentCollectionMode: '',
  firstName: '', lastName: '', username: '', adminEmail: '', adminPhone: '',
  password: '', language: 'fr', gender: '', idCardNumber: '',
  adminCountryId: '', adminCity: '', adminAddress: '',
});

interface CreateCompanyErrors {
  name?: string; phone?: string; companyUrl?: string; countryId?: string; city?: string;
  firstName?: string; lastName?: string; username?: string; adminPhone?: string; password?: string;
  adminCountryId?: string; adminCity?: string;
}

function validateCompanyForm(f: CreateCompanyForm): { errors: CreateCompanyErrors; tab: CompanyTab | null } {
  const errors: CreateCompanyErrors = {};
  if (!f.name.trim()) errors.name = 'Requis';
  if (!f.phone.trim()) errors.phone = 'Requis';
  if (!f.companyUrl.trim() || !/^https?:\/\/.+$/.test(f.companyUrl)) errors.companyUrl = 'URL valide requise (http/https)';
  if (!f.countryId) errors.countryId = 'Requis';
  if (!f.city.trim()) errors.city = 'Requis';
  if (!f.firstName.trim()) errors.firstName = 'Requis';
  if (!f.lastName.trim()) errors.lastName = 'Requis';
  if (!f.username.trim() || !/^[a-zA-Z0-9._-]{3,20}$/.test(f.username)) errors.username = 'Lettres, chiffres, . _ - (3-20 car.)';
  if (!f.adminPhone.trim()) errors.adminPhone = 'Requis';
  if (!f.password || f.password.length < 8) errors.password = '8 caractères minimum';
  if (!f.adminCountryId) errors.adminCountryId = 'Requis';
  if (!f.adminCity.trim()) errors.adminCity = 'Requis';

  const companyFields: (keyof CreateCompanyErrors)[] = ['name', 'phone', 'companyUrl', 'countryId', 'city'];
  const hasCompanyErr = companyFields.some((k) => errors[k]);
  const tab = hasCompanyErr ? 'company' : Object.keys(errors).length > 0 ? 'admin' : null;
  return { errors, tab };
}

function CreateCompanyDialog({
  open,
  token,
  onCreated,
  onClose,
}: {
  open: boolean;
  token: string;
  onCreated: (company: CompanyResponse) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const [tab, setTab] = useState<CompanyTab>('company');
  const [form, setForm] = useState<CreateCompanyForm>(emptyCompanyForm());
  const [errors, setErrors] = useState<CreateCompanyErrors>({});
  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyCompanyForm());
    setErrors({});
    setServerError(null);
    setLogo(null);
    setTab('company');
    if (countries.length > 0) return;
    setCountriesLoading(true);
    getCountries()
      .then(setCountries)
      .catch(() => {})
      .finally(() => setCountriesLoading(false));
  }, [open]);

  const set = (field: keyof CreateCompanyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    const filled: CreateCompanyForm = {
      ...form,
      adminCountryId: form.adminCountryId || form.countryId,
      adminCity: form.adminCity || form.city,
      adminAddress: form.adminAddress || form.address,
    };
    if (filled !== form) setForm(filled);
    const { errors: errs, tab: errTab } = validateCompanyForm(filled);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errTab) setTab(errTab);
      return;
    }
    setErrors({});
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: CreateCompanyRequest = {
        name: filled.name.trim(),
        email: filled.email.trim() || undefined,
        phone: filled.phone.trim(),
        companyUrl: filled.companyUrl.trim(),
        address: filled.address.trim() || undefined,
        countryId: Number(filled.countryId),
        city: filled.city.trim(),
        paymentCollectionMode: (filled.paymentCollectionMode as PaymentCollectionMode) || undefined,
        adminUser: {
          firstName: filled.firstName.trim(),
          lastName: filled.lastName.trim(),
          username: filled.username.trim(),
          email: filled.adminEmail.trim() || undefined,
          phone: filled.adminPhone.trim(),
          password: filled.password,
          country: Number(filled.adminCountryId),
          language: filled.language,
          city: filled.adminCity.trim(),
          address: filled.adminAddress.trim() || undefined,
          idCardNumber: filled.idCardNumber.trim() || undefined,
          gender: (filled.gender as Gender) || undefined,
          role: 'ADMIN_COMPANY',
        },
      };
      const created = await registerCompany(payload, logo ?? undefined, token);
      onCreated(created);
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const inputCls = (err?: string) => cn(
    'flex h-9 w-full rounded-xl border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary',
    err ? 'border-destructive focus:ring-destructive' : 'border-border',
  );
  const selectCls = (err?: string) => cn(
    'flex h-9 w-full appearance-none rounded-xl border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
    err ? 'border-destructive focus:ring-destructive' : 'border-border',
  );

  const companyTabHasError = ['name', 'phone', 'companyUrl', 'countryId', 'city'].some(
    (k) => errors[k as keyof CreateCompanyErrors],
  );
  const adminTabHasError = ['firstName', 'lastName', 'username', 'adminPhone', 'password', 'adminCountryId', 'adminCity'].some(
    (k) => errors[k as keyof CreateCompanyErrors],
  );

  const goToAdminTab = () => {
    setForm((prev) => ({
      ...prev,
      adminCountryId: prev.adminCountryId || prev.countryId,
      adminCity: prev.adminCity || prev.city,
      adminAddress: prev.adminAddress || prev.address,
    }));
    setTab('admin');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-8 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-foreground">{t('superAdmin.createCompany.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border px-6 pt-3">
          {([
            { id: 'company' as CompanyTab, labelKey: 'superAdmin.createCompany.tabs.company', hasError: companyTabHasError },
            { id: 'admin' as CompanyTab, labelKey: 'superAdmin.createCompany.tabs.admin', hasError: adminTabHasError },
          ] as const).map(({ id, labelKey, hasError }) => (
            <button
              key={id}
              onClick={() => (id === 'admin' ? goToAdminTab() : setTab(id))}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 pb-2.5 text-sm font-medium transition-colors',
                tab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t(labelKey)}
              {hasError && (
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {serverError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {/* ── Company tab ── */}
          {tab === 'company' && (
            <>
              <div className="space-y-1.5">
                <Label>Nom de l'entreprise *</Label>
                <input className={inputCls(errors.name)} placeholder="Sendam Express SARL" value={form.name} onChange={set('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Email entreprise</Label>
                  <input type="email" className={inputCls()} placeholder="contact@sendam.com" value={form.email} onChange={set('email')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone *</Label>
                  <input className={inputCls(errors.phone)} placeholder="+221 77 000 00 00" value={form.phone} onChange={set('phone')} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Site web *</Label>
                <input className={inputCls(errors.companyUrl)} placeholder="https://www.sendam.com" value={form.companyUrl} onChange={set('companyUrl')} />
                {errors.companyUrl && <p className="text-xs text-destructive">{errors.companyUrl}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Pays *</Label>
                  <select className={selectCls(errors.countryId)} value={form.countryId} onChange={set('countryId')} disabled={countriesLoading}>
                    <option value="">{countriesLoading ? 'Chargement…' : 'Sélectionner…'}</option>
                    {countries.map((c) => (
                      <option key={c.countryId} value={c.countryId}>{c.countryName}</option>
                    ))}
                  </select>
                  {errors.countryId && <p className="text-xs text-destructive">{errors.countryId}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Ville *</Label>
                  <input className={inputCls(errors.city)} placeholder="Dakar" value={form.city} onChange={set('city')} />
                  {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <input className={inputCls()} placeholder="12 Rue de la Paix, Plateau" value={form.address} onChange={set('address')} />
              </div>

              <div className="space-y-1.5">
                <Label>Mode de collecte des paiements</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {([
                    { value: 'PLATFORM', label: 'Via la plateforme' },
                    { value: 'COLLECTION_POINT', label: 'Aux points de collecte' },
                  ] as { value: PaymentCollectionMode; label: string }[]).map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
                        form.paymentCollectionMode === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50',
                      )}
                    >
                      <input
                        type="radio"
                        name="paymentMode"
                        value={opt.value}
                        checked={form.paymentCollectionMode === opt.value}
                        onChange={set('paymentCollectionMode')}
                        className="hidden"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-1.5">
                <Label>Logo <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
                {logo ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2.5">
                    <img src={URL.createObjectURL(logo)} alt="Logo" className="h-9 w-9 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{logo.name}</p>
                      <p className="text-xs text-muted-foreground">{(logo.size / 1024).toFixed(0)} Ko</p>
                    </div>
                    <button type="button" onClick={() => { setLogo(null); if (fileRef.current) fileRef.current.value = ''; }}
                      className="text-muted-foreground hover:text-destructive transition-colors text-lg leading-none">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    <UserPlus className="h-4 w-4" />
                    Importer un logo
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── Admin tab ── */}
          {tab === 'admin' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Prénom *</Label>
                  <input className={inputCls(errors.firstName)} placeholder="Jean" value={form.firstName} onChange={set('firstName')} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Nom *</Label>
                  <input className={inputCls(errors.lastName)} placeholder="Dupont" value={form.lastName} onChange={set('lastName')} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Nom d'utilisateur *</Label>
                <input className={inputCls(errors.username)} placeholder="jean.dupont" value={form.username} onChange={set('username')} />
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Email personnel</Label>
                  <input type="email" className={inputCls()} placeholder="jean@email.com" value={form.adminEmail} onChange={set('adminEmail')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone *</Label>
                  <input className={inputCls(errors.adminPhone)} placeholder="+221 77 000 00 00" value={form.adminPhone} onChange={set('adminPhone')} />
                  {errors.adminPhone && <p className="text-xs text-destructive">{errors.adminPhone}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Mot de passe *</Label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={cn(inputCls(errors.password), 'pr-10')}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Langue</Label>
                  <select className={selectCls()} value={form.language} onChange={set('language')}>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Genre</Label>
                  <select className={selectCls()} value={form.gender} onChange={set('gender')}>
                    <option value="">Non précisé</option>
                    <option value="MALE">Homme</option>
                    <option value="FEMALE">Femme</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>N° pièce d'identité</Label>
                <input className={inputCls()} placeholder="AB123456789" value={form.idCardNumber} onChange={set('idCardNumber')} />
              </div>

              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Lieu de résidence de l'administrateur — pré-rempli depuis l'entreprise, modifiable s'il réside ailleurs.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Pays *</Label>
                    <select className={selectCls(errors.adminCountryId)} value={form.adminCountryId} onChange={set('adminCountryId')} disabled={countriesLoading}>
                      <option value="">{countriesLoading ? 'Chargement…' : 'Sélectionner…'}</option>
                      {countries.map((c) => (
                        <option key={c.countryId} value={c.countryId}>{c.countryName}</option>
                      ))}
                    </select>
                    {errors.adminCountryId && <p className="text-xs text-destructive">{errors.adminCountryId}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ville *</Label>
                    <input className={inputCls(errors.adminCity)} placeholder="Dakar" value={form.adminCity} onChange={set('adminCity')} />
                    {errors.adminCity && <p className="text-xs text-destructive">{errors.adminCity}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Adresse</Label>
                  <input className={inputCls()} placeholder="12 Rue de la Paix, Plateau" value={form.adminAddress} onChange={set('adminAddress')} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('company')}
              disabled={tab === 'company'}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              ← Entreprise
            </button>
            <button
              onClick={() => setTab('admin')}
              disabled={tab === 'admin'}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              Administrateur →
            </button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={submitting}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('superAdmin.createCompany.creating')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t('superAdmin.createCompany.submit')}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Companies tab ─────────────────────────────────────────────────────────

interface CompanyDetailSnapshot {
  company: CompanyResponse;
  employees: UserResponse[];
  readiness: CompanyOperationalReadiness | null;
  dashboard: CompanyDashboardResponse | null;
  partialErrors: string[];
}

function numberValue(value?: number | string | null) {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatInteger(value?: number | null) {
  return new Intl.NumberFormat('fr-FR').format(numberValue(value));
}

function formatPercent(value?: number | null) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(numberValue(value))}%`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function DetailMetric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/20 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-1 break-words text-sm font-medium text-foreground">{value || '—'}</div>
      </div>
    </div>
  );
}

function ReadinessLine({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/20 p-3">
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          ok ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
        )}
      >
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function CompanyDetailLogo({ company }: { company: CompanyResponse }) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = resolveRemoteAssetUrl(company.logoUrl);
  const initials = company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'CO';

  useEffect(() => {
    setImageFailed(false);
  }, [logoUrl]);

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      {logoUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain p-2"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-primary/10 text-lg font-black text-primary">
          {initials}
        </span>
      )}
    </div>
  );
}

function CompanyDetailsView({
  token,
  companyId,
  seedCompany,
  onBack,
  onOpenReadiness,
}: {
  token: string;
  companyId: number;
  seedCompany?: CompanyResponse;
  onBack: () => void;
  onOpenReadiness: (readiness: CompanyOperationalReadiness) => void;
}) {
  const { t } = useTranslation('dashboard');
  const { formatMoney } = useCurrency();
  const [snapshot, setSnapshot] = useState<CompanyDetailSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    const range = getDefaultDashboardPeriod();
    const dashboardParams = {
      startDate: formatDashboardDateParam(range.from),
      endDate: formatDashboardDateParam(range.to),
    };

    const [companyResult, employeesResult, readinessResult, dashboardResult] =
      await Promise.allSettled([
        getCompany(token, companyId),
        getCompanyEmployees(token, companyId),
        getCompanyOperationalReadiness(token, companyId),
        getCompanyDashboard(token, companyId, dashboardParams),
      ]);

    const company =
      companyResult.status === 'fulfilled' ? companyResult.value : seedCompany;

    if (!company) {
      setSnapshot(null);
      setError(t('superAdmin.companies.detail.errors.load'));
      setLoading(false);
      return;
    }

    const partialErrors: string[] = [];
    if (companyResult.status === 'rejected') partialErrors.push(t('superAdmin.companies.detail.partial.identity'));
    if (employeesResult.status === 'rejected') partialErrors.push(t('superAdmin.companies.detail.partial.team'));
    if (readinessResult.status === 'rejected') partialErrors.push(t('superAdmin.companies.detail.partial.readiness'));
    if (dashboardResult.status === 'rejected') partialErrors.push(t('superAdmin.companies.detail.partial.dashboard'));

    setSnapshot({
      company,
      employees: employeesResult.status === 'fulfilled' ? employeesResult.value : [],
      readiness: readinessResult.status === 'fulfilled' ? readinessResult.value : null,
      dashboard: dashboardResult.status === 'fulfilled' ? dashboardResult.value : null,
      partialErrors,
    });
    setLoading(false);
  }, [companyId, seedCompany, t, token]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('superAdmin.companies.detail.back')}
        </Button>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error ?? t('common.genericError')}
        </div>
      </div>
    );
  }

  const { company, employees, readiness, dashboard, partialErrors } = snapshot;
  const activeEmployees = employees.filter((employee) => employee.status === 'ACTIVE').length;
  const adminEmployees = employees.filter((employee) => employee.role === 'ADMIN_COMPANY').length;
  const operationsEmployees = employees.filter((employee) =>
    ['EMPLOYEE_COMPANY', 'COLLECTOR', 'TRANSPORTER'].includes(employee.role),
  ).length;
  const missingItems = readiness?.missingItems ?? [];
  const collectionPoints = dashboard?.collectionPoints ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Button variant="outline" size="sm" onClick={onBack} className="w-fit gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('superAdmin.companies.detail.back')}
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t('superAdmin.companies.detail.eyebrow')}
            </p>
            <h2 className="mt-1 break-words text-2xl font-bold text-foreground">{company.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('superAdmin.companies.detail.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={company.approved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
            {company.approved ? (
              <><CheckCircle2 className="h-3 w-3" />{t('superAdmin.companies.status.approved')}</>
            ) : (
              <><Info className="h-3 w-3" />{t('superAdmin.companies.status.pending')}</>
            )}
          </Badge>
          <Badge className={company.exploitable ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}>
            <Shield className="h-3 w-3" />
            {company.exploitable
              ? t('superAdmin.companies.status.exploitable')
              : t('superAdmin.companies.status.notExploitable')}
          </Badge>
          {readiness && (
            <Button size="sm" variant="outline" onClick={() => onOpenReadiness(readiness)} className="gap-2">
              <Activity className="h-4 w-4" />
              {t('superAdmin.companies.actions.readiness')}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={loadDetail} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {partialErrors.length > 0 && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          {t('superAdmin.companies.detail.partial.title', {
            values: { sections: partialErrors.join(', ') },
          })}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DetailMetric
          icon={Package}
          label={t('superAdmin.companies.detail.metrics.shipments')}
          value={formatInteger(dashboard?.shipmentCount)}
          hint={t('superAdmin.companies.detail.metrics.delivered', {
            values: { count: formatInteger(dashboard?.deliveredShipmentCount) },
          })}
        />
        <DetailMetric
          icon={BarChart3}
          label={t('superAdmin.companies.detail.metrics.revenue')}
          value={formatMoney(numberValue(dashboard?.estimatedRevenue))}
          hint={t('superAdmin.companies.detail.metrics.period')}
        />
        <DetailMetric
          icon={Gauge}
          label={t('superAdmin.companies.detail.metrics.deliveryRate')}
          value={formatPercent(dashboard?.deliveryRatePercent)}
          hint={t('superAdmin.companies.detail.metrics.saturation', {
            values: { rate: formatPercent(dashboard?.collectionPointSaturationPercent) },
          })}
        />
        <DetailMetric
          icon={Users}
          label={t('superAdmin.companies.detail.metrics.team')}
          value={formatInteger(employees.length)}
          hint={t('superAdmin.companies.detail.metrics.activeTeam', {
            values: { count: formatInteger(activeEmployees) },
          })}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.72fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <CompanyDetailLogo company={company} />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-foreground">
                  {t('superAdmin.companies.detail.identity.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('superAdmin.companies.detail.identity.description')}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailRow icon={Phone} label={t('superAdmin.companies.detail.identity.phone')} value={company.phone} />
              <DetailRow icon={Mail} label={t('superAdmin.companies.detail.identity.email')} value={company.email} />
              <DetailRow
                icon={Globe2}
                label={t('superAdmin.companies.detail.identity.website')}
                value={
                  company.companyUrl ? (
                    <a href={company.companyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {company.companyUrl.replace(/^https?:\/\//, '')}
                    </a>
                  ) : null
                }
              />
              <DetailRow
                icon={MapPin}
                label={t('superAdmin.companies.detail.identity.location')}
                value={`${company.country?.countryName ?? '—'} · ${company.city || '—'}`}
              />
              <DetailRow
                icon={CreditCard}
                label={t('superAdmin.companies.detail.identity.paymentMode')}
                value={company.paymentCollectionMode ? t(`superAdminShipments.collectionModes.${company.paymentCollectionMode}`) : '—'}
              />
              <DetailRow
                icon={CalendarDays}
                label={t('superAdmin.companies.detail.identity.readinessCheckedAt')}
                value={formatDateTime(company.operationalCheckAt ?? readiness?.checkedAt)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t('superAdmin.companies.detail.readiness.title')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {readiness?.summary ?? t('superAdmin.companies.detail.readiness.unavailable')}
                </p>
              </div>
              {readiness && (
                <Badge className={readiness.exploitable ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
                  {readiness.exploitable
                    ? t('superAdmin.companies.detail.readiness.ready')
                    : t('superAdmin.companies.detail.readiness.incomplete')}
                </Badge>
              )}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ReadinessLine
                ok={Boolean(readiness?.parcelTypesConfigured)}
                label={t('superAdmin.companies.detail.readiness.parcelTypes')}
                detail={t('superAdmin.companies.detail.readiness.count', {
                  values: { count: formatInteger(readiness?.parcelTypeCount) },
                })}
              />
              <ReadinessLine
                ok={Boolean(readiness?.transportModesConfigured)}
                label={t('superAdmin.companies.detail.readiness.transportModes')}
                detail={t('superAdmin.companies.detail.readiness.count', {
                  values: { count: formatInteger(readiness?.transportModeCount) },
                })}
              />
              <ReadinessLine
                ok={Boolean(readiness?.pricingConfigured)}
                label={t('superAdmin.companies.detail.readiness.pricing')}
                detail={t('superAdmin.companies.detail.readiness.count', {
                  values: { count: formatInteger(readiness?.pricingCount) },
                })}
              />
              <ReadinessLine
                ok={Boolean(readiness?.collectionPointsConfigured)}
                label={t('superAdmin.companies.detail.readiness.collectionPoints')}
                detail={t('superAdmin.companies.detail.readiness.count', {
                  values: { count: formatInteger(readiness?.collectionPointCount) },
                })}
              />
            </div>
            {missingItems.length > 0 && (
              <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
                <p className="text-sm font-semibold text-warning">
                  {t('superAdmin.companies.detail.readiness.missing')}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-warning">
                  {missingItems.slice(0, 5).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">
              {t('superAdmin.companies.detail.team.title')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('superAdmin.companies.detail.team.summary', {
                values: {
                  admins: formatInteger(adminEmployees),
                  operations: formatInteger(operationsEmployees),
                },
              })}
            </p>
            <div className="mt-4 space-y-2">
              {employees.length === 0 && (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  {t('superAdmin.companies.detail.team.empty')}
                </p>
              )}
              {employees.slice(0, 6).map((employee) => {
                const statusCfg = STATUS_CONFIG[employee.status] ?? STATUS_CONFIG.INACTIVE;
                return (
                  <div key={employee.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-secondary/20 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">@{employee.username}</p>
                      <Badge className="mt-2 bg-secondary text-secondary-foreground">
                        {t(ROLE_LABEL_KEYS[employee.role] ?? employee.role)}
                      </Badge>
                    </div>
                    <Badge className={statusCfg.color}>{t(statusCfg.labelKey)}</Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">
              {t('superAdmin.companies.detail.collectionPoints.title')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('superAdmin.companies.detail.collectionPoints.description')}
            </p>
            <div className="mt-4 space-y-2">
              {collectionPoints.length === 0 && (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  {t('superAdmin.companies.detail.collectionPoints.empty')}
                </p>
              )}
              {collectionPoints.slice(0, 5).map((point) => (
                <div key={point.collectionPointId} className="rounded-xl border border-border bg-secondary/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {point.collectionPointName ?? `#${point.collectionPointId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {point.active ? t('superAdmin.companies.detail.collectionPoints.active') : t('superAdmin.companies.detail.collectionPoints.inactive')}
                      </p>
                    </div>
                    <Badge className="bg-primary/20 text-primary">
                      {formatPercent(point.saturationPercent)}
                    </Badge>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(Math.max(numberValue(point.saturationPercent), 0), 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompaniesTab({ token }: { token: string }) {
  const { t } = useTranslation('dashboard');
  const { success, error: showError, toast } = useToastSimple();
  const [data, setData] = useState<Page<CompanyResponse> | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [readiness, setReadiness] = useState<CompanyOperationalReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState<number | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<CompanyResponse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCompanies(token, { page, size: pageSize });
      setData(result);
    } catch {
      showError('Impossible de charger les entreprises');
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setActionLoading(confirmApprove.id);
    try {
      const updated = await approveCompany(token, confirmApprove.id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              content: prev.content.map((c) => (c.id === updated.id ? updated : c)),
            }
          : prev,
      );
      success(`${confirmApprove.name} approuvée`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur lors de l\'approbation');
    } finally {
      setActionLoading(null);
      setConfirmApprove(null);
    }
  };

  const handleReadiness = async (company: CompanyResponse) => {
    setReadinessLoading(company.id);
    try {
      const result = await getCompanyOperationalReadiness(token, company.id);
      setReadiness(result);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur lors de la vérification');
    } finally {
      setReadinessLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(confirmDelete.id);
    try {
      await deleteCompany(token, confirmDelete.id);
      setData((prev) =>
        prev
          ? { ...prev, content: prev.content.filter((c) => c.id !== confirmDelete.id), totalElements: prev.totalElements - 1 }
          : prev,
      );
      success(`${confirmDelete.name} supprimée`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const handleCompanyCreated = (company: CompanyResponse) => {
    setData((prev) =>
      prev
        ? { ...prev, content: [company, ...prev.content], totalElements: prev.totalElements + 1 }
        : prev,
    );
    success(`${company.name} créée avec succès`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (selectedCompany) {
    return (
      <>
        <ToastBar toast={toast} />
        <OperationalReadinessDialog data={readiness} onClose={() => setReadiness(null)} />
        <CompanyDetailsView
          token={token}
          companyId={selectedCompany.id}
          seedCompany={selectedCompany}
          onBack={() => setSelectedCompany(null)}
          onOpenReadiness={setReadiness}
        />
      </>
    );
  }

  return (
    <>
      <CreateCompanyDialog
        open={createOpen}
        token={token}
        onCreated={handleCompanyCreated}
        onClose={() => setCreateOpen(false)}
      />
      <ToastBar toast={toast} />
      <OperationalReadinessDialog data={readiness} onClose={() => setReadiness(null)} />
      <ConfirmDialog
        open={!!confirmApprove}
        title="Approuver l'entreprise"
        description={`Confirmer l'approbation de "${confirmApprove?.name}" ? L'entreprise pourra ensuite exploiter la plateforme selon sa configuration.`}
        confirmLabel="Approuver"
        loading={actionLoading === confirmApprove?.id}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(null)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer l'entreprise"
        description={`Êtes-vous sûr de vouloir supprimer "${confirmDelete?.name}" ? Cette action est irréversible.`}
        confirmLabel={t('common.delete')}
        destructive
        loading={actionLoading === confirmDelete?.id}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.totalElements ?? 0} entreprise{(data?.totalElements ?? 0) !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Building2 className="mr-2 h-4 w-4" />
          Créer une entreprise
        </Button>
      </div>

      <div className="space-y-3 md:hidden">
        {data?.content.length === 0 && (
          <div className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground">
            Aucune entreprise trouvée
          </div>
        )}
        {data?.content.map((company) => (
          <div key={company.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="break-words font-semibold text-foreground">{company.name}</p>
                {company.companyUrl && (
                  <a
                    href={company.companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{company.companyUrl.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge
                  className={
                    company.approved
                      ? 'bg-success/20 text-success'
                      : 'bg-warning/20 text-warning'
                  }
                >
                  {company.approved ? (
                    <><CheckCircle2 className="h-3 w-3" />Approuvée</>
                  ) : (
                    <><Info className="h-3 w-3" />En attente</>
                  )}
                </Badge>
                {company.exploitable && (
                  <Badge className="bg-primary/20 text-primary">
                    <Shield className="h-3 w-3" />Opérationnelle
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('superAdmin.users.columns.contact')}</p>
                <p className="break-words text-foreground">{company.phone || '—'}</p>
                {company.email && <p className="break-words text-xs text-muted-foreground">{company.email}</p>}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Localisation</p>
                <p className="text-foreground">{company.country?.countryName ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{company.city}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
                <p className="text-foreground">{company.adminUsername ?? '—'}</p>
                {company.adminId && <p className="text-xs text-muted-foreground">ID #{company.adminId}</p>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setSelectedCompany(company)}
                className="col-span-3 gap-2"
              >
                <Eye className="h-4 w-4" />
                {t('superAdmin.companies.actions.viewDetails')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleReadiness(company)}
                disabled={readinessLoading === company.id}
                title="Vérifier opérationnalité"
                className="px-2"
              >
                {readinessLoading === company.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
              </Button>
              {!company.approved ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setConfirmApprove(company)}
                  disabled={actionLoading === company.id}
                  title="Approuver"
                  className="px-2"
                >
                  {actionLoading === company.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled className="px-2">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(company)}
                title="Supprimer"
                className="px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">{t('superAdmin.users.columns.contact')}</th>
              <th className="px-4 py-3">Pays · Ville</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">{t('superAdmin.users.columns.status')}</th>
              <th className="px-4 py-3 text-right">{t('superAdmin.users.columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.content.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  Aucune entreprise trouvée
                </td>
              </tr>
            )}
            {data?.content.map((company) => (
              <tr key={company.id} className="group hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{company.name}</p>
                    {company.companyUrl && (
                      <a
                        href={company.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {company.companyUrl.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{company.phone}</p>
                  {company.email && <p className="text-xs text-muted-foreground">{company.email}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{company.country?.countryName ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{company.city}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-foreground">{company.adminUsername ?? '—'}</p>
                  {company.adminId && (
                    <p className="text-xs text-muted-foreground">ID #{company.adminId}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Badge
                      className={
                        company.approved
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }
                    >
                      {company.approved ? (
                        <><CheckCircle2 className="h-3 w-3" />Approuvée</>
                      ) : (
                        <><Info className="h-3 w-3" />En attente</>
                      )}
                    </Badge>
                    {company.exploitable && (
                      <Badge className="bg-primary/20 text-primary">
                        <Shield className="h-3 w-3" />Opérationnelle
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Open details */}
                    <button
                      onClick={() => setSelectedCompany(company)}
                      title={t('superAdmin.companies.actions.viewDetails')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>

                    {/* Check readiness */}
                    <button
                      onClick={() => handleReadiness(company)}
                      disabled={readinessLoading === company.id}
                      title="Vérifier opérationnalité"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      {readinessLoading === company.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Approve */}
                    {!company.approved && (
                      <button
                        onClick={() => setConfirmApprove(company)}
                        disabled={actionLoading === company.id}
                        title="Approuver"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-success transition-colors hover:bg-success/10 disabled:opacity-40"
                      >
                        {actionLoading === company.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDelete(company)}
                      title="Supprimer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <DataPagination
          page={page}
          pageSize={pageSize}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={loading}
        />
      )}
    </>
  );
}

// ─── Create user dialog ────────────────────────────────────────────────────

const CREATABLE_ROLES: { value: ApiRole; label: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN_COMPANY', label: 'Admin Entreprise' },
  { value: 'EMPLOYEE_COMPANY', label: 'Employé Entreprise' },
  { value: 'COLLECTOR', label: 'Collecteur' },
  { value: 'TRANSPORTER', label: 'Transporteur' },
  { value: 'CLIENT', label: 'Client' },
];

const COMMISSION_ROLES: ApiRole[] = ['COLLECTOR', 'TRANSPORTER', 'ADMIN_COMPANY'];

interface CreateUserForm {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: ApiRole | '';
  language: string;
  countryId: string;
  city: string;
  address: string;
  idCardNumber: string;
  commissionPercentage: string;
  gender: Gender | '';
}

const emptyCreateForm = (): CreateUserForm => ({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  role: '',
  language: 'fr',
  countryId: '',
  city: '',
  address: '',
  idCardNumber: '',
  commissionPercentage: '',
  gender: '',
});

interface CreateUserErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  password?: string;
  role?: string;
  language?: string;
  countryId?: string;
  city?: string;
}

function validateCreateUser(f: CreateUserForm): CreateUserErrors {
  const e: CreateUserErrors = {};
  if (!f.firstName.trim()) e.firstName = 'Requis';
  if (!f.lastName.trim()) e.lastName = 'Requis';
  if (!f.username.trim() || f.username.length < 3) e.username = '3 caractères minimum';
  if (!/^[a-zA-Z0-9._-]{3,20}$/.test(f.username)) e.username = 'Lettres, chiffres, . _ - (3-20 car.)';
  if (!f.phone.trim()) e.phone = 'Requis';
  if (!f.password || f.password.length < 8) e.password = '8 caractères minimum';
  if (!f.role) e.role = 'Requis';
  if (!f.language) e.language = 'Requis';
  if (!f.countryId) e.countryId = 'Requis';
  if (!f.city.trim()) e.city = 'Requis';
  return e;
}

function CreateUserDialog({
  open,
  token,
  onCreated,
  onClose,
}: {
  open: boolean;
  token: string;
  onCreated: (user: UserResponse) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const [form, setForm] = useState<CreateUserForm>(emptyCreateForm());
  const [errors, setErrors] = useState<CreateUserErrors>({});
  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(emptyCreateForm());
    setErrors({});
    setServerError(null);
    if (countries.length > 0) return;
    setCountriesLoading(true);
    getCountries()
      .then(setCountries)
      .catch(() => {/* non-blocking */})
      .finally(() => setCountriesLoading(false));
  }, [open]);

  const set = (field: keyof CreateUserForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    const errs = validateCreateUser(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setServerError(null);
    setSubmitting(true);
    try {
      const commission = parseFloat(form.commissionPercentage);
      const created = await createUser(token, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        password: form.password,
        role: form.role as ApiRole,
        language: form.language,
        country: Number(form.countryId),
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        idCardNumber: form.idCardNumber.trim() || undefined,
        commissionPercentage: !isNaN(commission) ? commission : undefined,
        gender: (form.gender as Gender) || undefined,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const showCommission = COMMISSION_ROLES.includes(form.role as ApiRole);

  const inputCls = (err?: string) =>
    cn(
      'flex h-9 w-full rounded-xl border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary',
      err ? 'border-destructive focus:ring-destructive' : 'border-border',
    );

  const selectCls = (err?: string) =>
    cn(
      'flex h-9 w-full appearance-none rounded-xl border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
      err ? 'border-destructive focus:ring-destructive' : 'border-border',
    );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-8 px-4">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-foreground">{t('superAdmin.createUser.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {serverError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {/* Name */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Prénom *</Label>
              <input className={inputCls(errors.firstName)} placeholder="Jean" value={form.firstName} onChange={set('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <input className={inputCls(errors.lastName)} placeholder="Dupont" value={form.lastName} onChange={set('lastName')} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label>Nom d'utilisateur *</Label>
            <input className={inputCls(errors.username)} placeholder="jean.dupont" value={form.username} onChange={set('username')} />
            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <input type="email" className={inputCls()} placeholder="jean@email.com" value={form.email} onChange={set('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <input className={inputCls(errors.phone)} placeholder="+221 77 000 00 00" value={form.phone} onChange={set('phone')} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label>Mot de passe *</Label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={cn(inputCls(errors.password), 'pr-10')}
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          {/* Role + Language */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rôle *</Label>
              <select className={selectCls(errors.role)} value={form.role} onChange={set('role')}>
                <option value="">Choisir…</option>
                {CREATABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Langue *</Label>
              <select className={selectCls(errors.language)} value={form.language} onChange={set('language')}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Country + City */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Pays *</Label>
              <select className={selectCls(errors.countryId)} value={form.countryId} onChange={set('countryId')} disabled={countriesLoading}>
                <option value="">{countriesLoading ? 'Chargement…' : 'Sélectionner…'}</option>
                {countries.map((c) => (
                  <option key={c.countryId} value={c.countryId}>{c.countryName}</option>
                ))}
              </select>
              {errors.countryId && <p className="text-xs text-destructive">{errors.countryId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Ville *</Label>
              <input className={inputCls(errors.city)} placeholder="Dakar" value={form.city} onChange={set('city')} />
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>
          </div>

          {/* Address + ID card */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <input className={inputCls()} placeholder="12 Rue de la Paix" value={form.address} onChange={set('address')} />
            </div>
            <div className="space-y-1.5">
              <Label>N° pièce d'identité</Label>
              <input className={inputCls()} placeholder="AB123456" value={form.idCardNumber} onChange={set('idCardNumber')} />
            </div>
          </div>

          {/* Commission + Gender */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {showCommission && (
              <div className="space-y-1.5">
                <Label>Commission (%)</Label>
                <input type="number" min="0" max="100" step="0.1" className={inputCls()} placeholder="10.5" value={form.commissionPercentage} onChange={set('commissionPercentage')} />
              </div>
            )}
            <div className={cn('space-y-1.5', !showCommission && 'sm:col-span-2')}>
              <Label>Genre</Label>
              <select className={selectCls()} value={form.gender} onChange={set('gender')}>
                <option value="">Non précisé</option>
                <option value="MALE">Homme</option>
                <option value="FEMALE">Femme</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t('superAdmin.createUser.creating')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {t('superAdmin.createUser.submit')}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Users tab ─────────────────────────────────────────────────────────────

type UserAction = 'phone' | 'password' | 'commission' | 'delete' | null;

function UsersTab({ token }: { token: string }) {
  const { t } = useTranslation('dashboard');
  const { success, error: showError, toast } = useToastSimple();
  const [data, setData] = useState<Page<UserResponse> | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [action, setAction] = useState<UserAction>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsers(token, { page, size: pageSize });
      setData(result);
    } catch {
      showError('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const openAction = (user: UserResponse, act: UserAction) => {
    setSelectedUser(user);
    setAction(act);
    setFieldError(null);
  };

  const closeAction = () => {
    setSelectedUser(null);
    setAction(null);
    setFieldError(null);
  };

  const patchUser = (updated: UserResponse) => {
    setData((prev) =>
      prev
        ? { ...prev, content: prev.content.map((u) => (u.id === updated.id ? updated : u)) }
        : prev,
    );
  };

  const removeUser = (id: number) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            content: prev.content.filter((u) => u.id !== id),
            totalElements: prev.totalElements - 1,
          }
        : prev,
    );
  };

  const handleActivate = async (user: UserResponse) => {
    setActionLoading(user.id);
    try {
      await activateUser(token, user.id);
      patchUser({ ...user, status: 'ACTIVE' });
      success(`${user.username} activé`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (user: UserResponse) => {
    setActionLoading(user.id);
    try {
      await suspendUser(token, user.id);
      patchUser({ ...user, status: 'SUSPENDED' });
      success(`${user.username} suspendu`);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePhoneSave = async (phone: string) => {
    if (!selectedUser) return;
    setFieldError(null);
    setActionLoading(selectedUser.id);
    try {
      await updateUserPhone(token, selectedUser.id, phone);
      patchUser({ ...selectedUser, phone });
      success('Téléphone mis à jour');
      closeAction();
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordSave = async (oldPw: string, newPw: string) => {
    if (!selectedUser) return;
    setFieldError(null);
    setActionLoading(selectedUser.id);
    try {
      await changeUserPassword(token, selectedUser.id, { oldPassword: oldPw, newPassword: newPw });
      success('Mot de passe modifié');
      closeAction();
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCommissionSave = async (value: string) => {
    if (!selectedUser) return;
    const pct = parseFloat(value);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setFieldError('Valeur entre 0 et 100');
      return;
    }
    setFieldError(null);
    setActionLoading(selectedUser.id);
    try {
      const updated = await updateUserCommission(token, selectedUser.id, { commissionPercentage: pct });
      patchUser(updated);
      success('Commission mise à jour');
      closeAction();
    } catch (err) {
      setFieldError(err instanceof ApiError ? err.message : 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      await deleteUser(token, selectedUser.id);
      removeUser(selectedUser.id);
      success(`${selectedUser.username} supprimé`);
      closeAction();
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Erreur lors de la suppression');
      closeAction();
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserCreated = (user: UserResponse) => {
    setData((prev) =>
      prev
        ? { ...prev, content: [user, ...prev.content], totalElements: prev.totalElements + 1 }
        : prev,
    );
    success(`${user.username} créé avec succès`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const isLoading = (id: number) => actionLoading === id;

  return (
    <>
      <CreateUserDialog
        open={createOpen}
        token={token}
        onCreated={handleUserCreated}
        onClose={() => setCreateOpen(false)}
      />
      <ToastBar toast={toast} />

      {/* Phone dialog */}
      <FieldDialog
        open={action === 'phone'}
        title={`Téléphone — ${selectedUser?.username}`}
        label="Nouveau téléphone"
        defaultValue={selectedUser?.phone}
        placeholder="+237 6 12 34 56 78"
        loading={actionLoading === selectedUser?.id}
        error={fieldError}
        onSave={handlePhoneSave}
        onClose={closeAction}
      />

      {/* Password dialog */}
      <PasswordDialog
        open={action === 'password'}
        loading={actionLoading === selectedUser?.id}
        error={fieldError}
        onSave={handlePasswordSave}
        onClose={closeAction}
      />

      {/* Commission dialog */}
      <FieldDialog
        open={action === 'commission'}
        title={`Commission — ${selectedUser?.username}`}
        label="Pourcentage de commission (0–100)"
        defaultValue={String(selectedUser?.commissionPercentage ?? '')}
        type="number"
        placeholder="12.5"
        loading={actionLoading === selectedUser?.id}
        error={fieldError}
        onSave={handleCommissionSave}
        onClose={closeAction}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={action === 'delete'}
        title={t('superAdmin.users.deleteTitle')}
        description={t('superAdmin.users.deleteDescription', {
          values: { username: selectedUser?.username ?? '' },
        })}
        confirmLabel={t('common.delete')}
        destructive
        loading={actionLoading === selectedUser?.id}
        onConfirm={handleDelete}
        onCancel={closeAction}
      />

      <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t('superAdmin.users.count', { values: { count: data?.totalElements ?? 0 } })}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          {t('superAdmin.users.createButton')}
        </Button>
      </div>

      <div className="space-y-3 md:hidden">
        {data?.content.length === 0 && (
          <div className="rounded-xl border border-border py-10 text-center text-sm text-muted-foreground">
            {t('superAdmin.users.empty')}
          </div>
        )}
        {data?.content.map((user) => {
          const statusCfg = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.INACTIVE;
          return (
            <div key={user.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">@{user.username}</p>
                  {user.email && <p className="break-words text-xs text-muted-foreground">{user.email}</p>}
                </div>
                <Badge className={statusCfg.color}>{t(statusCfg.labelKey)}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('superAdmin.users.columns.role')}</p>
                  <Badge className="bg-secondary text-secondary-foreground">
                    {t(ROLE_LABEL_KEYS[user.role] ?? user.role)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('superAdmin.users.columns.contact')}</p>
                  <p className="break-words text-foreground">{user.phone}</p>
                  {user.city && <p className="text-xs text-muted-foreground">{user.city}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('superAdmin.users.columns.commission')}</p>
                  {user.commissionPercentage != null ? (
                    <p className="font-medium text-foreground">{user.commissionPercentage}%</p>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">
                {user.status !== 'ACTIVE' ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleActivate(user)}
                    disabled={isLoading(user.id)}
                    title="Activer"
                    className="px-2"
                  >
                    {isLoading(user.id) ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuspend(user)}
                    disabled={isLoading(user.id)}
                    title="Suspendre"
                    className="px-2 text-warning hover:bg-warning/10 hover:text-warning"
                  >
                    {isLoading(user.id) ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldOff className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => openAction(user, 'phone')} title="Modifier téléphone" className="px-2">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openAction(user, 'password')} title="Changer mot de passe" className="px-2">
                  <Lock className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openAction(user, 'commission')} title="Modifier commission" className="px-2">
                  <Percent className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openAction(user, 'delete')}
                  title="Supprimer"
                  className="px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">{t('superAdmin.users.columns.user')}</th>
              <th className="px-4 py-3">{t('superAdmin.users.columns.role')}</th>
              <th className="px-4 py-3">{t('superAdmin.users.columns.contact')}</th>
              <th className="px-4 py-3">{t('superAdmin.users.columns.commission')}</th>
              <th className="px-4 py-3">{t('superAdmin.users.columns.status')}</th>
              <th className="px-4 py-3 text-right">{t('superAdmin.users.columns.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.content.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  {t('superAdmin.users.empty')}
                </td>
              </tr>
            )}
            {data?.content.map((user) => {
              const statusCfg = STATUS_CONFIG[user.status] ?? STATUS_CONFIG.INACTIVE;
              return (
                <tr key={user.id} className="group hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="bg-secondary text-secondary-foreground">
                      {t(ROLE_LABEL_KEYS[user.role] ?? user.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{user.phone}</p>
                    {user.city && <p className="text-xs text-muted-foreground">{user.city}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {user.commissionPercentage != null ? (
                      <span className="font-medium text-foreground">
                        {user.commissionPercentage}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusCfg.color}>{t(statusCfg.labelKey)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Activate */}
                      {user.status !== 'ACTIVE' && (
                        <button
                          onClick={() => handleActivate(user)}
                          disabled={isLoading(user.id)}
                          title="Activer"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-success transition-colors hover:bg-success/10 disabled:opacity-40"
                        >
                          {isLoading(user.id) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Shield className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Suspend */}
                      {user.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleSuspend(user)}
                          disabled={isLoading(user.id)}
                          title="Suspendre"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-warning transition-colors hover:bg-warning/10 disabled:opacity-40"
                        >
                          {isLoading(user.id) ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldOff className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Phone */}
                      <button
                        onClick={() => openAction(user, 'phone')}
                        title="Modifier téléphone"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </button>

                      {/* Password */}
                      <button
                        onClick={() => openAction(user, 'password')}
                        title="Changer mot de passe"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </button>

                      {/* Commission */}
                      <button
                        onClick={() => openAction(user, 'commission')}
                        title="Modifier commission"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Percent className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => openAction(user, 'delete')}
                        title="Supprimer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && (
        <DataPagination
          page={page}
          pageSize={pageSize}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          loading={loading}
        />
      )}
    </>
  );
}

// ─── Main view ─────────────────────────────────────────────────────────────

type TabId = 'overview' | 'companies' | 'users';

const TABS: { id: TabId; labelKey: string; icon: React.ElementType }[] = [
  { id: 'overview', labelKey: 'superAdmin.tabs.overview', icon: LayoutDashboard },
  { id: 'companies', labelKey: 'superAdmin.tabs.companies', icon: Building2 },
  { id: 'users', labelKey: 'superAdmin.tabs.users', icon: Users },
];

export function SuperAdminManagement() {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Shield className="h-8 w-8" />
        </div>
        <p className="text-lg font-semibold text-foreground">{t('superAdmin.restricted.title')}</p>
        <p className="text-sm text-muted-foreground">
          {t('superAdmin.restricted.description')}
        </p>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('superAdmin.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('superAdmin.subtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="w-full shrink-0 sm:w-auto"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:flex sm:w-fit">
        {TABS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4',
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

      {/* Content */}
      <div key={`${activeTab}-${refreshKey}`}>
        {activeTab === 'overview' && <SuperAdminDashboard />}
        {activeTab === 'companies' && <CompaniesTab token={token} />}
        {activeTab === 'users' && <UsersTab token={token} />}
      </div>
    </div>
  );
}
