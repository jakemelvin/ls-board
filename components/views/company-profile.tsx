'use client';

import { useEffect, useRef, useState, type ElementType, type FormEvent, type ReactNode } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Building2,
  CreditCard,
  Globe2,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { SectionHeader, StatusState, ToastBar, useToastSimple } from '@/components/company/company-shared';
import { updateCompanyProfile } from '@/lib/company/api';
import type { CompanyResolutionStatus } from '@/lib/company/use-company';
import { useAuthStore } from '@/lib/auth/store';
import type { CompanyResponse, PaymentCollectionMode } from '@/lib/auth/types';
import { useTranslation } from '@/lib/i18n';
import { resolveRemoteAssetUrl } from '@/lib/asset-url';

interface CompanyProfileForm {
  name: string;
  email: string;
  phone: string;
  companyUrl: string;
  address: string;
  city: string;
  paymentCollectionMode: PaymentCollectionMode;
}

interface CompanyProfileViewProps {
  company: CompanyResponse | null;
  status: CompanyResolutionStatus;
  error?: string | null;
  onRetry: () => void;
  onCompanyUpdated: () => void;
}

function createFormState(company: CompanyResponse | null): CompanyProfileForm {
  return {
    name: company?.name ?? '',
    email: company?.email ?? '',
    phone: company?.phone ?? '',
    companyUrl: company?.companyUrl ?? '',
    address: '',
    city: company?.city ?? '',
    paymentCollectionMode: company?.paymentCollectionMode ?? 'PLATFORM',
  };
}

function normalizeOptionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase()).join('');
  return initials || 'SH';
}

function FieldShell({
  icon: Icon,
  label,
  children,
}: {
  icon: ElementType;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      {children}
    </div>
  );
}

export function CompanyProfileView({
  company,
  status,
  error,
  onRetry,
  onCompanyUpdated,
}: CompanyProfileViewProps) {
  const { t } = useTranslation('dashboard');
  const token = useAuthStore((s) => s.token);
  const [savedCompany, setSavedCompany] = useState<CompanyResponse | null>(null);
  const activeCompany = savedCompany ?? company;
  const [form, setForm] = useState<CompanyProfileForm>(() => createFormState(activeCompany));
  const [logo, setLogo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToastSimple();

  useEffect(() => {
    setSavedCompany(null);
    setLogo(null);
    setForm(createFormState(company));
  }, [company]);

  useEffect(() => {
    if (!logo) {
      setPreviewUrl(resolveRemoteAssetUrl(activeCompany?.logoUrl));
      return;
    }

    const objectUrl = URL.createObjectURL(logo);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [activeCompany?.logoUrl, logo]);

  const countryId = activeCompany?.country?.countryId ?? 0;
  const countryName = activeCompany?.country?.countryName ?? t('companyProfile.form.countryUnknown');
  const canSave =
    Boolean(token) &&
    Boolean(activeCompany?.id) &&
    countryId > 0 &&
    form.name.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    form.companyUrl.trim().length > 0 &&
    form.city.trim().length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !activeCompany?.id || !canSave) {
      toast.error(t('companyProfile.messages.invalid'));
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateCompanyProfile(
        token,
        activeCompany.id,
        {
          name: form.name.trim(),
          email: normalizeOptionalValue(form.email),
          phone: form.phone.trim(),
          companyUrl: form.companyUrl.trim(),
          address: normalizeOptionalValue(form.address),
          countryId,
          city: form.city.trim(),
          paymentCollectionMode: form.paymentCollectionMode,
        },
        logo ?? undefined,
      );

      setSavedCompany(updated);
      setLogo(null);
      setForm((current) => ({
        ...createFormState(updated),
        address: current.address,
      }));
      onCompanyUpdated();
      toast.success(t('companyProfile.messages.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('companyProfile.messages.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[22rem] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (status === 'empty') {
    return (
      <StatusState
        icon={Building2}
        title={t('companyGuard.empty.title')}
        description={t('companyGuard.empty.description')}
      />
    );
  }

  if (status === 'forbidden') {
    return (
      <StatusState
        icon={AlertCircle}
        tone="warning"
        title={t('companyProfile.states.forbiddenTitle')}
        description={error ?? t('companyProfile.states.forbiddenDescription')}
      />
    );
  }

  if (status === 'error' || !activeCompany) {
    return (
      <StatusState
        icon={XCircle}
        tone="destructive"
        title={t('common.loadError')}
        description={error ?? t('common.genericError')}
        action={
          <Button type="button" variant="outline" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <ToastBar toast={toast.toast} />
      <SectionHeader
        title={t('companyProfile.title')}
        subtitle={t('companyProfile.subtitle')}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {activeCompany.approved
                ? t('companyProfile.badges.approved')
                : t('companyProfile.badges.pending')}
            </Badge>
            <Button type="submit" className="gap-2" disabled={!canSave || isSaving}>
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? t('common.saving') : t('companyProfile.actions.save')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-primary" />
                {t('companyProfile.identity.title')}
              </CardTitle>
              <CardDescription>{t('companyProfile.identity.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FieldShell icon={Building2} label={t('companyProfile.form.name')}>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  aria-invalid={!form.name.trim()}
                  placeholder={t('companyProfile.placeholders.name')}
                />
              </FieldShell>

              <FieldShell icon={Globe2} label={t('companyProfile.form.website')}>
                <Input
                  value={form.companyUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, companyUrl: event.target.value }))
                  }
                  aria-invalid={!form.companyUrl.trim()}
                  placeholder={t('companyProfile.placeholders.website')}
                />
              </FieldShell>

              <FieldShell icon={Mail} label={t('companyProfile.form.email')}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder={t('companyProfile.placeholders.email')}
                />
              </FieldShell>

              <FieldShell icon={Phone} label={t('companyProfile.form.phone')}>
                <Input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  aria-invalid={!form.phone.trim()}
                  placeholder={t('companyProfile.placeholders.phone')}
                />
              </FieldShell>

              <FieldShell icon={MapPin} label={t('companyProfile.form.city')}>
                <Input
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  aria-invalid={!form.city.trim()}
                  placeholder={t('companyProfile.placeholders.city')}
                />
              </FieldShell>

              <FieldShell icon={MapPin} label={t('companyProfile.form.country')}>
                <Input value={countryName} disabled />
              </FieldShell>

              <div className="sm:col-span-2">
                <FieldShell icon={MapPin} label={t('companyProfile.form.address')}>
                  <Textarea
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, address: event.target.value }))
                    }
                    placeholder={t('companyProfile.placeholders.address')}
                    className="min-h-20"
                  />
                </FieldShell>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-primary" />
                {t('companyProfile.payment.title')}
              </CardTitle>
              <CardDescription>{t('companyProfile.payment.description')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FieldShell icon={CreditCard} label={t('companyProfile.form.paymentMode')}>
                <Select
                  value={form.paymentCollectionMode}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      paymentCollectionMode: value as PaymentCollectionMode,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLATFORM">
                      {t('companyProfile.payment.modes.PLATFORM')}
                    </SelectItem>
                    <SelectItem value="COLLECTION_POINT">
                      {t('companyProfile.payment.modes.COLLECTION_POINT')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ImagePlus className="h-5 w-5 text-primary" />
                {t('companyProfile.brand.title')}
              </CardTitle>
              <CardDescription>{t('companyProfile.brand.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary text-xl font-bold text-primary">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt={t('companyProfile.brand.logoAlt')}
                      width={80}
                      height={80}
                      sizes="80px"
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(form.name)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{form.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {logo ? logo.name : t('companyProfile.brand.currentLogo')}
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
              />
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {logo ? t('companyProfile.actions.replaceLogo') : t('companyProfile.actions.uploadLogo')}
                </Button>
                {logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setLogo(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    {t('companyProfile.actions.removeSelection')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </form>
  );
}
