'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, ChevronDown, LogOut, RefreshCw, UserRound } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { getUser, updateMyProfile, uploadMyPhoto } from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import type {
  ApiRole,
  AuthUser,
  UpdateUserProfileRequest,
  UserResponse,
} from '@/lib/auth/types';
import { useTranslation } from '@/lib/i18n';
import type { User } from '@/lib/mock-data';
import { resolveRemoteAssetUrl } from '@/lib/asset-url';
import { cn } from '@/lib/utils';

interface DashboardProfileMenuProps {
  currentUser: User;
  onLogout: () => void;
}

type ProfileForm = {
  firstName: string;
  lastName: string;
  city: string;
  address: string;
  idCardNumber: string;
  language: string;
};

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  city: '',
  address: '',
  idCardNumber: '',
  language: '',
};

export function DashboardProfileMenu({ currentUser, onLogout }: DashboardProfileMenuProps) {
  const { t } = useTranslation('dashboard');
  const { token, userId, user: sessionUser, setUser } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => formFromUser(sessionUser, currentUser));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const sessionUserRef = useRef(sessionUser);
  const currentUserRef = useRef(currentUser);

  const displayUser = useMemo(
    () => mergeDisplayUser(sessionUser, currentUser),
    [currentUser, sessionUser],
  );
  const avatarUrl = photoPreview ?? resolveRemoteAssetUrl(displayUser.profileImageUrl);
  const displayName = getDisplayName(displayUser, currentUser.name);
  const roleLabel = getRoleLabel(displayUser.role, currentUser.role, t);

  useEffect(() => {
    sessionUserRef.current = sessionUser;
    currentUserRef.current = currentUser;
  });

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedPhoto);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedPhoto]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isCurrent = true;

    setSelectedPhoto(null);
    setForm(formFromUser(sessionUserRef.current, currentUserRef.current));

    if (!token || !userId) {
      return;
    }

    async function loadProfileOnce() {
      setLoading(true);
      setError(null);

      try {
        const profile = await getUser(token!, userId!);
        if (!isCurrent) {
          return;
        }
        setUser(profile);
        setForm(formFromUser(profile, currentUserRef.current));
      } catch (err) {
        if (!isCurrent) {
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : t('profile.messages.loadFailed'),
        );
        setForm(formFromUser(sessionUserRef.current, currentUserRef.current));
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    void loadProfileOnce();

    return () => {
      isCurrent = false;
    };
  }, [open, setUser, t, token, userId]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedPhoto(file);
  };

  const handleSave = async () => {
    if (!token) {
      setError(t('profile.messages.sessionExpired'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = buildProfilePayload(form);
      let updatedUser = await updateMyProfile(token, payload);

      if (selectedPhoto) {
        updatedUser = await uploadMyPhoto(token, selectedPhoto);
      }

      setUser(updatedUser);
      setSelectedPhoto(null);
      setOpen(false);
      toast({
        title: t('profile.messages.saved'),
        description: t('profile.messages.savedDescription'),
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t('profile.messages.saveFailed');
      setError(message);
      toast({
        title: t('profile.messages.saveFailed'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-secondary sm:gap-3">
            <ProfileAvatar
              name={displayName}
              fallback={displayUser.avatar}
              url={avatarUrl}
              className="h-10 w-10"
            />
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {displayUser.email || roleLabel}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {displayUser.email || displayUser.username || roleLabel}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setOpen(true);
            }}
          >
            <UserRound className="h-4 w-4" />
            {t('profile.menu.open')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4" />
            {t('shell.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={(nextOpen) => !saving && setOpen(nextOpen)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('profile.title')}</DialogTitle>
            <DialogDescription>{t('profile.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-secondary/30 p-4 sm:flex-row sm:items-center">
              <div className="relative w-fit">
                <ProfileAvatar
                  name={displayName}
                  fallback={displayUser.avatar}
                  url={avatarUrl}
                  className="h-20 w-20"
                />
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-primary">
                  <Camera className="h-4 w-4" />
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-base font-semibold text-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground">{roleLabel}</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={saving}
                  className="max-w-sm bg-card"
                />
                <p className="text-xs text-muted-foreground">{t('profile.photoHint')}</p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t('profile.messages.loading')}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileField
                id="profile-firstName"
                label={t('profile.fields.firstName')}
                value={form.firstName}
                onChange={(value) => updateField('firstName', value)}
                disabled={saving}
              />
              <ProfileField
                id="profile-lastName"
                label={t('profile.fields.lastName')}
                value={form.lastName}
                onChange={(value) => updateField('lastName', value)}
                disabled={saving}
              />
              <ReadonlyField label={t('profile.fields.username')} value={displayUser.username} />
              <ReadonlyField label={t('profile.fields.email')} value={displayUser.email} />
              <ReadonlyField label={t('profile.fields.phone')} value={displayUser.phone} />
              <ProfileField
                id="profile-city"
                label={t('profile.fields.city')}
                value={form.city}
                onChange={(value) => updateField('city', value)}
                disabled={saving}
              />
              <ProfileField
                id="profile-address"
                label={t('profile.fields.address')}
                value={form.address}
                onChange={(value) => updateField('address', value)}
                disabled={saving}
              />
              <ProfileField
                id="profile-idCard"
                label={t('profile.fields.idCardNumber')}
                value={form.idCardNumber}
                onChange={(value) => updateField('idCardNumber', value)}
                disabled={saving}
              />
              <ProfileField
                id="profile-language"
                label={t('profile.fields.language')}
                value={form.language}
                onChange={(value) => updateField('language', value)}
                disabled={saving}
                placeholder="fr"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || loading} className="gap-2">
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProfileAvatar({
  name,
  fallback,
  url,
  className,
}: {
  name: string;
  fallback?: string;
  url?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn('rounded-xl', className)}>
      {url && <AvatarImage src={url} alt={name} />}
      <AvatarFallback className="rounded-xl bg-primary text-sm font-bold text-primary-foreground">
        {fallback || getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function ProfileField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="bg-secondary"
      />
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex h-9 items-center rounded-md border border-border bg-secondary/40 px-3 text-sm text-muted-foreground">
        {value || '-'}
      </div>
    </div>
  );
}

function formFromUser(user: AuthUser | UserResponse | undefined, fallback: User): ProfileForm {
  return {
    firstName: user?.firstName ?? fallback.firstName ?? '',
    lastName: user?.lastName ?? fallback.lastName ?? '',
    city: user?.city ?? '',
    address: user?.address ?? fallback.address ?? '',
    idCardNumber: user?.idCardNumber ?? '',
    language:
      typeof user?.language === 'string'
        ? user.language
        : user?.language?.languageCode ?? '',
  };
}

function mergeDisplayUser(user: AuthUser | undefined, fallback: User) {
  return {
    id: user?.id ? String(user.id) : fallback.id,
    firstName: user?.firstName ?? fallback.firstName,
    lastName: user?.lastName ?? fallback.lastName,
    name: getDisplayName(user, fallback.name),
    username: user?.username ?? fallback.username,
    email: user?.email ?? fallback.email,
    phone: user?.phone ?? fallback.phone,
    role: user?.role,
    avatar: getInitials(getDisplayName(user, fallback.name)),
    profileImageUrl: user?.profileImageUrl ?? fallback.profilePhotoUrl,
  };
}

function getDisplayName(user: AuthUser | { firstName?: string; lastName?: string } | undefined, fallback: string) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'U';
}

function buildProfilePayload(form: ProfileForm): UpdateUserProfileRequest {
  return {
    firstName: trimToUndefined(form.firstName),
    lastName: trimToUndefined(form.lastName),
    city: trimToUndefined(form.city),
    address: trimToUndefined(form.address),
    idCardNumber: trimToUndefined(form.idCardNumber),
    language: trimToUndefined(form.language),
  };
}

function trimToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function getRoleLabel(
  apiRole: ApiRole | undefined,
  fallbackRole: User['role'],
  t: ReturnType<typeof useTranslation>['t'],
) {
  const role = apiRole ?? fallbackRole;

  switch (role) {
    case 'SUPER_ADMIN':
      return t('roles.superAdmin');
    case 'COLLECTOR':
      return t('roles.collector');
    case 'TRANSPORTER':
      return t('roles.transporter');
    case 'EMPLOYEE_COMPANY':
    case 'EMPLOYEE':
      return t('roles.employee');
    case 'ADMIN_COMPANY':
    case 'ADMIN':
    default:
      return t('roles.adminCompany');
  }
}
