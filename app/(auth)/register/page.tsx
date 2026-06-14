'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  User,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerCompany, getCountries } from '@/lib/auth/api';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { CountryResponse, CreateCompanyRequest, Gender, PaymentCollectionMode } from '@/lib/auth/types';

// ─── Validation schemas ────────────────────────────────────────────────────

const phonePattern = /^[0-9+()\-\s]{6,25}$/;
const urlPattern = /^(https?:\/\/).+$/;
const usernamePattern = /^[a-zA-Z0-9._-]{3,20}$/;

type RegisterTranslate = ReturnType<typeof useTranslation>['t'];

function createCompanySchema(t: RegisterTranslate) {
  return z.object({
  name: z.string().min(1, t('validation.companyNameRequired')).max(50, t('validation.max50')),
  email: z
    .string()
    .max(100, t('validation.max100'))
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: t('validation.invalidEmail'),
    })
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(1, t('validation.phoneRequired'))
    .max(20, t('validation.max20'))
    .regex(phonePattern, t('validation.invalidPhoneWithExample')),
  companyUrl: z
    .string()
    .min(1, t('validation.websiteRequired'))
    .max(255, t('validation.max255'))
    .regex(urlPattern, t('validation.invalidWebsite')),
  countryId: z
    .number({ invalid_type_error: t('validation.countryRequired') })
    .int()
    .positive(t('validation.countryRequired')),
  city: z.string().min(1, t('validation.cityRequired')),
  address: z.string().optional(),
  paymentCollectionMode: z.enum(['PLATFORM', 'COLLECTION_POINT']).optional(),
  });
}

function createAdminSchema(t: RegisterTranslate) {
  return z
    .object({
    firstName: z.string().min(1, t('validation.firstNameRequired')).max(50, t('validation.max50')),
    lastName: z.string().min(1, t('validation.lastNameRequired')).max(50, t('validation.max50')),
    username: z
      .string()
      .min(3, t('validation.min3'))
      .max(20, t('validation.max20'))
      .regex(usernamePattern, t('validation.usernameFormat')),
    email: z
      .string()
      .max(100, t('validation.max100'))
      .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: t('validation.invalidEmail'),
      })
      .optional()
      .or(z.literal('')),
    phone: z
      .string()
      .min(1, t('validation.phoneRequired'))
      .max(20, t('validation.max20'))
      .regex(phonePattern, t('validation.invalidPhone')),
    password: z
      .string()
      .min(8, t('validation.min8'))
      .regex(/[A-Z]/, t('validation.passwordUppercase'))
      .regex(/[0-9]/, t('validation.passwordNumber')),
    confirmPassword: z.string().min(1, t('validation.confirmPasswordRequired')),
    language: z.string().min(1, t('validation.languageRequired')),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    idCardNumber: z.string().max(50, t('validation.max50')).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: t('validation.passwordMismatch'),
    path: ['confirmPassword'],
  });
}

type CompanyValues = z.infer<ReturnType<typeof createCompanySchema>>;
type AdminValues = z.infer<ReturnType<typeof createAdminSchema>>;

// ─── Step indicator ────────────────────────────────────────────────────────

const STEP_KEYS = ['company', 'admin', 'review'] as const;
const STEP_ICONS = [Building2, User, CheckCircle2] as const;

function StepIndicator({ current, t }: { current: number; t: RegisterTranslate }) {
  return (
    <div className="flex items-center gap-0 w-full max-w-xs mx-auto mb-8">
      {STEP_KEYS.map((stepKey, i) => {
        const Icon = STEP_ICONS[i];
        const done = i < current;
        const active = i === current;
        return (
          <div key={stepKey} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary bg-primary/10 text-primary',
                  !done && !active && 'border-border bg-muted text-muted-foreground',
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-wide',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {t(`steps.${stepKey}`)}
              </span>
            </div>
            {i < STEP_KEYS.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mx-2 mt-[-14px] transition-colors',
                  i < current ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Password strength ─────────────────────────────────────────────────────

function passwordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { score: 0, label: '', color: 'bg-muted' },
    { score: 1, label: 'passwordStrength.weak', color: 'bg-destructive' },
    { score: 2, label: 'passwordStrength.medium', color: 'bg-warning' },
    { score: 3, label: 'passwordStrength.good', color: 'bg-chart-2' },
    { score: 4, label: 'passwordStrength.strong', color: 'bg-success' },
  ];
  return levels[score] ?? levels[0];
}

// ─── Step 1: Company info ──────────────────────────────────────────────────

function CompanyStep({
  onNext,
  countries,
  countriesError,
  defaultValues,
  logo,
  onLogoChange,
  t,
}: {
  onNext: (data: CompanyValues) => void;
  countries: CountryResponse[];
  countriesError: boolean;
  defaultValues?: Partial<CompanyValues>;
  logo: File | null;
  onLogoChange: (f: File | null) => void;
  t: RegisterTranslate;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompanyValues>({
    resolver: zodResolver(createCompanySchema(t)),
    defaultValues: defaultValues ?? {},
  });

  const selectedCountryId = watch('countryId');

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Company name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">{t('fields.companyName')}</Label>
        <Input
          id="name"
          placeholder={t('placeholders.companyName')}
          {...register('name')}
          className={cn(errors.name && 'border-destructive')}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="comp-email">{t('fields.companyEmail')}</Label>
          <Input
            id="comp-email"
            type="email"
            placeholder={t('placeholders.companyEmail')}
            {...register('email')}
            className={cn(errors.email && 'border-destructive')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="comp-phone">{t('fields.phone')}</Label>
          <Input
            id="comp-phone"
            placeholder={t('placeholders.phone')}
            {...register('phone')}
            className={cn(errors.phone && 'border-destructive')}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      {/* Website */}
      <div className="space-y-1.5">
        <Label htmlFor="companyUrl">{t('fields.website')}</Label>
        <Input
          id="companyUrl"
          placeholder={t('placeholders.website')}
          {...register('companyUrl')}
          className={cn(errors.companyUrl && 'border-destructive')}
        />
        {errors.companyUrl && <p className="text-xs text-destructive">{errors.companyUrl.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Country */}
        <div className="space-y-1.5">
          <Label htmlFor="countryId">{t('fields.country')}</Label>
          <select
            id="countryId"
            value={selectedCountryId ?? ''}
            onChange={(e) =>
              setValue('countryId', Number(e.target.value), { shouldValidate: true })
            }
            className={cn(
              'flex h-10 w-full rounded-xl border border-input bg-input px-3 py-2 text-sm text-foreground ring-offset-background',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              errors.countryId && 'border-destructive',
            )}
          >
            <option value="">{t('options.select')}</option>
            {countries.map((c) => (
              <option key={c.countryId} value={c.countryId}>
                {c.countryName}
              </option>
            ))}
          </select>
          {countriesError && (
            <p className="text-xs text-destructive">
              {t('messages.countriesLoadFailed')} {' '}
              <button type="button" className="underline" onClick={() => window.location.reload()}>
                {t('actions.reloadPage')}
              </button>
              .
            </p>
          )}
          {!countriesError && errors.countryId && (
            <p className="text-xs text-destructive">{errors.countryId.message}</p>
          )}
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor="city">{t('fields.city')}</Label>
          <Input
            id="city"
            placeholder={t('placeholders.city')}
            {...register('city')}
            className={cn(errors.city && 'border-destructive')}
          />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">{t('fields.address')}</Label>
        <Input id="address" placeholder={t('placeholders.address')} {...register('address')} />
      </div>

      {/* Payment mode */}
      <div className="space-y-1.5">
        <Label>{t('fields.paymentCollectionMode')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: 'PLATFORM', label: t('paymentModes.platform') },
              { value: 'COLLECTION_POINT', label: t('paymentModes.collectionPoint') },
            ] as { value: PaymentCollectionMode; label: string }[]
          ).map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-colors',
                watch('paymentCollectionMode') === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50',
              )}
            >
              <input
                type="radio"
                value={opt.value}
                {...register('paymentCollectionMode')}
                className="hidden"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Logo upload */}
      <div className="space-y-1.5">
        <Label>{t('fields.companyLogo')}</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
        />
        {logo ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3">
            <img
              src={URL.createObjectURL(logo)}
              alt="Logo"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{logo.name}</p>
              <p className="text-xs text-muted-foreground">
                {(logo.size / 1024).toFixed(0)} Ko
              </p>
            </div>
            <button
              type="button"
              onClick={() => { onLogoChange(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Upload className="h-4 w-4" />
            {t('actions.uploadLogo')}
          </button>
        )}
      </div>

      <Button type="submit" className="w-full mt-2">
        {t('actions.next')}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </form>
  );
}

// ─── Step 2: Admin user ────────────────────────────────────────────────────

function AdminStep({
  onNext,
  onBack,
  defaultValues,
  t,
}: {
  onNext: (data: AdminValues) => void;
  onBack: () => void;
  defaultValues?: Partial<AdminValues>;
  t: RegisterTranslate;
}) {
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AdminValues>({
    resolver: zodResolver(createAdminSchema(t)),
    defaultValues: defaultValues ?? {},
  });

  const password = watch('password') ?? '';
  const strength = passwordStrength(password);

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">{t('fields.firstName')}</Label>
          <Input
            id="firstName"
            placeholder={t('placeholders.firstName')}
            {...register('firstName')}
            className={cn(errors.firstName && 'border-destructive')}
          />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">{t('fields.lastName')}</Label>
          <Input
            id="lastName"
            placeholder={t('placeholders.lastName')}
            {...register('lastName')}
            className={cn(errors.lastName && 'border-destructive')}
          />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="username">{t('fields.username')}</Label>
        <Input
          id="username"
          autoComplete="username"
          placeholder={t('placeholders.username')}
          {...register('username')}
          className={cn(errors.username && 'border-destructive')}
        />
        {errors.username ? (
          <p className="text-xs text-destructive">{errors.username.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t('help.username')}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="admin-email">{t('fields.personalEmail')}</Label>
          <Input
            id="admin-email"
            type="email"
            placeholder={t('placeholders.personalEmail')}
            {...register('email')}
            className={cn(errors.email && 'border-destructive')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-phone">{t('fields.phone')}</Label>
          <Input
            id="admin-phone"
            placeholder={t('placeholders.phone')}
            {...register('phone')}
            className={cn(errors.phone && 'border-destructive')}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password">{t('fields.password')}</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPass ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('placeholders.password')}
            {...register('password')}
            className={cn('pr-10', errors.password && 'border-destructive')}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i <= strength.score ? strength.color : 'bg-muted',
                  )}
                />
              ))}
            </div>
            {strength.label && (
              <p className="text-xs text-muted-foreground">
                {t('passwordStrength.label')} <span className="font-medium text-foreground">{t(strength.label)}</span>
              </p>
            )}
          </div>
        )}
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t('fields.confirmPassword')}</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('placeholders.password')}
            {...register('confirmPassword')}
            className={cn('pr-10', errors.confirmPassword && 'border-destructive')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Language */}
        <div className="space-y-1.5">
          <Label htmlFor="language">{t('fields.language')}</Label>
          <select
            id="language"
            {...register('language')}
            className={cn(
              'flex h-10 w-full rounded-xl border border-input bg-input px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              errors.language && 'border-destructive',
            )}
          >
            <option value="">{t('options.choose')}</option>
            <option value="fr">{t('options.french')}</option>
            <option value="en">{t('options.english')}</option>
          </select>
          {errors.language && <p className="text-xs text-destructive">{errors.language.message}</p>}
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label htmlFor="gender">{t('fields.gender')}</Label>
          <select
            id="gender"
            {...register('gender')}
            className="flex h-10 w-full rounded-xl border border-input bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('options.unspecified')}</option>
            <option value="MALE">{t('options.male')}</option>
            <option value="FEMALE">{t('options.female')}</option>
            <option value="OTHER">{t('options.other')}</option>
          </select>
        </div>
      </div>

      {/* ID card */}
      <div className="space-y-1.5">
        <Label htmlFor="idCardNumber">{t('fields.idCardNumber')}</Label>
        <Input
          id="idCardNumber"
          placeholder={t('placeholders.idCardNumber')}
          {...register('idCardNumber')}
          className={cn(errors.idCardNumber && 'border-destructive')}
        />
      </div>

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('actions.back')}
        </Button>
        <Button type="submit" className="flex-1">
          {t('actions.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// ─── Step 3: Review ────────────────────────────────────────────────────────

function ReviewStep({
  company,
  admin,
  logo,
  countries,
  onBack,
  onSubmit,
  isSubmitting,
  serverError,
  t,
}: {
  company: CompanyValues;
  admin: AdminValues;
  logo: File | null;
  countries: CountryResponse[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  serverError: string | null;
  t: RegisterTranslate;
}) {
  const countryName =
    countries.find((c) => c.countryId === company.countryId)?.countryName ?? t('common.notAvailable');

  const Row = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="flex justify-between gap-4 py-2 text-sm">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className="text-foreground font-medium text-right">{value}</span>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {serverError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      {/* Company section */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t('sections.company')}</h3>
        </div>
        {logo && (
          <div className="flex items-center gap-3 pb-2 mb-2 border-b border-border">
            <img
              src={URL.createObjectURL(logo)}
              alt="Logo"
              className="h-10 w-10 rounded-lg object-cover"
            />
            <span className="text-sm text-muted-foreground">{logo.name}</span>
          </div>
        )}
        <div className="divide-y divide-border">
          <Row label={t('review.name')} value={company.name} />
          <Row label={t('review.email')} value={company.email || undefined} />
          <Row label={t('review.phone')} value={company.phone} />
          <Row label={t('review.website')} value={company.companyUrl} />
          <Row label={t('review.country')} value={countryName} />
          <Row label={t('review.city')} value={company.city} />
          <Row label={t('review.address')} value={company.address} />
          <Row
            label={t('review.payments')}
            value={
              company.paymentCollectionMode === 'PLATFORM'
                ? t('paymentModes.platform')
                : company.paymentCollectionMode === 'COLLECTION_POINT'
                ? t('paymentModes.collectionPoint')
                : undefined
            }
          />
        </div>
      </div>

      {/* Admin section */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t('sections.admin')}</h3>
        </div>
        <div className="divide-y divide-border">
          <Row label={t('review.fullName')} value={`${admin.firstName} ${admin.lastName}`} />
          <Row label={t('review.username')} value={admin.username} />
          <Row label={t('review.email')} value={admin.email || undefined} />
          <Row label={t('review.phone')} value={admin.phone} />
          <Row label={t('review.language')} value={admin.language === 'fr' ? t('options.french') : t('options.english')} />
          <Row
            label={t('review.gender')}
            value={
              admin.gender === 'MALE'
                ? t('options.male')
                : admin.gender === 'FEMALE'
                ? t('options.female')
                : admin.gender === 'OTHER'
                ? t('options.other')
                : undefined
            }
          />
          <Row label={t('review.idCardNumber')} value={admin.idCardNumber} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        {t('messages.reviewConsent')}
      </p>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={isSubmitting}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t('actions.back')}
        </Button>
        <Button className="flex-1" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('actions.submitting')}</span>
          ) : (
            t('actions.submitRequest')
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation('register');
  const [step, setStep] = useState(0);
  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [companyData, setCompanyData] = useState<CompanyValues | null>(null);
  const [adminData, setAdminData] = useState<AdminValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [countriesError, setCountriesError] = useState(false);

  useEffect(() => {
    getCountries()
      .then(setCountries)
      .catch((err) => {
        console.error('[Register] Failed to load countries:', err);
        setCountriesError(true);
      });
  }, []);

  const handleCompanyNext = (data: CompanyValues) => {
    setCompanyData(data);
    setStep(1);
  };

  const handleAdminNext = (data: AdminValues) => {
    setAdminData(data);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!companyData || !adminData) return;
    setIsSubmitting(true);
    setServerError(null);

    const payload: CreateCompanyRequest = {
      name: companyData.name,
      email: companyData.email || undefined,
      phone: companyData.phone,
      companyUrl: companyData.companyUrl,
      address: companyData.address || undefined,
      countryId: companyData.countryId,
      city: companyData.city,
      paymentCollectionMode: companyData.paymentCollectionMode,
      adminUser: {
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        username: adminData.username,
        email: adminData.email || undefined,
        phone: adminData.phone,
        password: adminData.password,
        country: companyData.countryId,
        language: adminData.language,
        city: companyData.city,
        address: companyData.address || undefined,
        gender: adminData.gender as Gender | undefined,
        idCardNumber: adminData.idCardNumber || undefined,
        role: 'ADMIN_COMPANY',
      },
    };

    try {
      await registerCompany(payload, logo ?? undefined);
      router.replace('/pending');
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError(t('messages.unexpectedError'));
      }
      setIsSubmitting(false);
    }
  };

  const titles = [
    t('titles.company'),
    t('titles.admin'),
    t('titles.review'),
  ];

  return (
    <div className="w-full max-w-lg space-y-2">
      {/* Header */}
      <div className="space-y-1 mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{titles[step]}</h2>
        <p className="text-sm text-muted-foreground">
          {step === 0 && t('subtitles.company')}
          {step === 1 && t('subtitles.admin')}
          {step === 2 && t('subtitles.review')}
        </p>
      </div>

      <StepIndicator current={step} t={t} />

      {step === 0 && (
        <CompanyStep
          onNext={handleCompanyNext}
          countries={countries}
          countriesError={countriesError}
          defaultValues={companyData ?? undefined}
          logo={logo}
          onLogoChange={setLogo}
          t={t}
        />
      )}
      {step === 1 && (
        <AdminStep
          onNext={handleAdminNext}
          onBack={() => setStep(0)}
          defaultValues={adminData ?? undefined}
          t={t}
        />
      )}
      {step === 2 && companyData && adminData && (
        <ReviewStep
          company={companyData}
          admin={adminData}
          logo={logo}
          countries={countries}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          serverError={serverError}
          t={t}
        />
      )}

      <p className="text-center text-sm text-muted-foreground pt-4">
        {t('login.prompt')}{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('login.link')}
        </Link>
      </p>
    </div>
  );
}
