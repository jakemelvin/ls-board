'use client';

import { useEffect, useState } from 'react';
import { Eye, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getCountries } from '@/lib/auth/api';
import { createCompanySubAccount } from '@/lib/company/api';
import type { CountryResponse, ApiRole, Gender } from '@/lib/auth/types';
import type { UserResponse } from '@/lib/admin/types';

/** Roles a company admin is allowed to provision through sub-accounts. */
export const MEMBER_ROLES: { value: ApiRole; label: string }[] = [
  { value: 'EMPLOYEE_COMPANY', label: 'Employé' },
  { value: 'COLLECTOR', label: 'Collecteur' },
  { value: 'TRANSPORTER', label: 'Transporteur' },
];

const COMMISSION_ROLES: ApiRole[] = ['COLLECTOR', 'TRANSPORTER'];

interface MemberForm {
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

const emptyForm = (): MemberForm => ({
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

interface MemberErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  password?: string;
  role?: string;
  countryId?: string;
  city?: string;
}

function validate(f: MemberForm): MemberErrors {
  const e: MemberErrors = {};
  if (!f.firstName.trim()) e.firstName = 'Requis';
  if (!f.lastName.trim()) e.lastName = 'Requis';
  if (!/^[a-zA-Z0-9._-]{3,20}$/.test(f.username)) e.username = 'Lettres, chiffres, . _ - (3-20 car.)';
  if (!f.phone.trim()) e.phone = 'Requis';
  if (!f.password || f.password.length < 8) e.password = '8 caractères minimum';
  if (!f.role) e.role = 'Requis';
  if (!f.countryId) e.countryId = 'Requis';
  if (!f.city.trim()) e.city = 'Requis';
  return e;
}

export function CreateMemberDialog({
  open,
  token,
  companyId,
  onCreated,
  onClose,
}: {
  open: boolean;
  token: string;
  companyId: number;
  onCreated: (user: UserResponse) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<MemberForm>(emptyForm());
  const [errors, setErrors] = useState<MemberErrors>({});
  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
    setServerError(null);
    setShowPassword(false);
    if (countries.length > 0) return;
    setCountriesLoading(true);
    getCountries()
      .then(setCountries)
      .catch(() => {/* non-blocking */})
      .finally(() => setCountriesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set =
    (field: keyof MemberForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setServerError(null);
    setSubmitting(true);
    try {
      const commission = parseFloat(form.commissionPercentage);
      const created = await createCompanySubAccount(token, companyId, {
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
        commissionPercentage:
          COMMISSION_ROLES.includes(form.role as ApiRole) && !isNaN(commission)
            ? commission
            : undefined,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Ajouter un membre</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {serverError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

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
              <Label>Email</Label>
              <input type="email" className={inputCls()} placeholder="jean@email.com" value={form.email} onChange={set('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone *</Label>
              <input className={inputCls(errors.phone)} placeholder="+221 77 000 00 00" value={form.phone} onChange={set('phone')} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rôle *</Label>
              <select className={selectCls(errors.role)} value={form.role} onChange={set('role')}>
                <option value="">Choisir…</option>
                {MEMBER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Langue</Label>
              <select className={selectCls()} value={form.language} onChange={set('language')}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {showCommission && (
            <div className="space-y-1.5">
              <Label>Commission (%)</Label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={inputCls()}
                placeholder="Ex : 12"
                value={form.commissionPercentage}
                onChange={set('commissionPercentage')}
              />
              <p className="text-xs text-muted-foreground">Laissez vide si aucune commission spécifique.</p>
            </div>
          )}

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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Genre</Label>
              <select className={selectCls()} value={form.gender} onChange={set('gender')}>
                <option value="">Non précisé</option>
                <option value="MALE">Homme</option>
                <option value="FEMALE">Femme</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>N° pièce d'identité</Label>
              <input className={inputCls()} placeholder="AB123456789" value={form.idCardNumber} onChange={set('idCardNumber')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Adresse</Label>
            <input className={inputCls()} placeholder="12 Rue de la Paix, Plateau" value={form.address} onChange={set('address')} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Création…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Créer le membre
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
