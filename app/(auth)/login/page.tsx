'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type FormValues = {
  username: string;
  password: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useTranslation('login');

  const [showPassword, setShowPassword] = useState(false);
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(() =>
    searchParams.get('reason') === 'session-expired' ? 'messages.sessionExpired' : null,
  );
  const [customServerError, setCustomServerError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        username: z.string().min(1, t('validation.usernameRequired')),
        password: z.string().min(1, t('validation.passwordRequired')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerErrorKey(null);
    setCustomServerError(null);

    try {
      const response = await login(values);

      if (response.role === 'CLIENT') {
        setServerErrorKey('messages.accessDenied');
        return;
      }

      setAuth({
        token: response.token,
        userId: response.userId,
        role: response.role,
      });

      const from = searchParams.get('from') ?? '/';
      router.replace(from);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setServerErrorKey('messages.invalidCredentials');
        } else {
          setCustomServerError(err.message);
        }
      } else {
        setServerErrorKey('messages.unexpectedError');
      }
    }
  };

  const serverError = serverErrorKey ? t(serverErrorKey) : customServerError;

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {t('title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username">{t('fields.username')}</Label>
          <Input
            id="username"
            autoComplete="username"
            placeholder={t('placeholders.username')}
            {...register('username')}
            className={cn(errors.username && 'border-destructive focus-visible:ring-destructive')}
          />
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('fields.password')}</Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('placeholders.password')}
              {...register('password')}
              className={cn(
                'pr-10',
                errors.password && 'border-destructive focus-visible:ring-destructive',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? t('password.hide') : t('password.show')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('actions.submitting')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              {t('actions.submit')}
            </span>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('register.prompt')}{' '}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('register.link')}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
