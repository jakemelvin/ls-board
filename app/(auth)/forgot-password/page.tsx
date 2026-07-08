'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, KeyRound, Mail, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  requestPasswordReset,
  resendPasswordResetCode,
  resetPassword,
  verifyPasswordResetCode,
} from '@/lib/auth/api';
import { ApiError } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Step = 'request' | 'verify' | 'reset' | 'done';
type FieldErrors = Partial<Record<'email' | 'code' | 'newPassword' | 'confirmPassword', string>>;
type LoadingAction = 'request' | 'verify' | 'reset' | 'resend' | null;

export default function ForgotPasswordPage() {
  const { t } = useTranslation('login');
  const [step, setStep] = useState<Step>('request');
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const schemas = useMemo(
    () => ({
      request: z.object({
        email: z
          .string()
          .min(1, t('reset.validation.emailRequired'))
          .email(t('reset.validation.emailInvalid')),
      }),
      verify: z.object({
        email: z.string().email(t('reset.validation.emailInvalid')),
        code: z
          .string()
          .min(1, t('reset.validation.codeRequired'))
          .regex(/^[0-9]{4}$/, t('reset.validation.codeInvalid')),
      }),
      reset: z
        .object({
          email: z.string().email(t('reset.validation.emailInvalid')),
          code: z
            .string()
            .min(1, t('reset.validation.codeRequired'))
            .regex(/^[0-9]{4}$/, t('reset.validation.codeInvalid')),
          newPassword: z
            .string()
            .min(1, t('reset.validation.passwordRequired'))
            .min(8, t('reset.validation.passwordMin')),
          confirmPassword: z.string().min(1, t('reset.validation.confirmPasswordRequired')),
        })
        .refine((values) => values.newPassword === values.confirmPassword, {
          path: ['confirmPassword'],
          message: t('reset.validation.passwordMismatch'),
        }),
    }),
    [t],
  );

  const isBusy = loadingAction !== null;

  const resetFeedback = () => {
    setFieldErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const readError = (err: unknown, fallbackKey: string) =>
    err instanceof ApiError ? err.message : t(fallbackKey);

  const setZodErrors = (error: z.ZodError) => {
    const flattened = error.flatten().fieldErrors;
    setFieldErrors({
      email: flattened.email?.[0],
      code: flattened.code?.[0],
      newPassword: flattened.newPassword?.[0],
      confirmPassword: flattened.confirmPassword?.[0],
    });
  };

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    const parsed = schemas.request.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setZodErrors(parsed.error);
      return;
    }

    setLoadingAction('request');
    try {
      const response = await requestPasswordReset(parsed.data);
      setEmail(parsed.data.email);
      setSuccessMessage(response.message ?? t('reset.messages.codeSent'));
      setStep('verify');
    } catch (err) {
      setErrorMessage(readError(err, 'reset.messages.requestFailed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    const parsed = schemas.verify.safeParse({ email: email.trim(), code: code.trim() });
    if (!parsed.success) {
      setZodErrors(parsed.error);
      return;
    }

    setLoadingAction('verify');
    try {
      const response = await verifyPasswordResetCode(parsed.data);
      setCode(parsed.data.code);
      setSuccessMessage(response.message ?? t('reset.messages.codeVerified'));
      setStep('reset');
    } catch (err) {
      setErrorMessage(readError(err, 'reset.messages.verifyFailed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    const parsed = schemas.reset.safeParse({
      email: email.trim(),
      code: code.trim(),
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      setZodErrors(parsed.error);
      return;
    }

    setLoadingAction('reset');
    try {
      const response = await resetPassword({
        email: parsed.data.email,
        code: parsed.data.code,
        newPassword: parsed.data.newPassword,
      });
      setSuccessMessage(response.message ?? t('reset.messages.resetDone'));
      setNewPassword('');
      setConfirmPassword('');
      setStep('done');
    } catch (err) {
      setErrorMessage(readError(err, 'reset.messages.resetFailed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResendCode = async () => {
    resetFeedback();

    const parsed = schemas.request.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setZodErrors(parsed.error);
      setStep('request');
      return;
    }

    setLoadingAction('resend');
    try {
      const response = await resendPasswordResetCode(parsed.data);
      setSuccessMessage(response.message ?? t('reset.messages.resendDone'));
    } catch (err) {
      setErrorMessage(readError(err, 'reset.messages.resendFailed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChangeEmail = () => {
    resetFeedback();
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('request');
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {step === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('reset.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('reset.subtitle')}</p>
        </div>
      </div>

      <ResetProgress step={step} t={t} />

      {(errorMessage || successMessage) && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-xl border px-4 py-3',
            errorMessage
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-success/30 bg-success/10 text-success',
          )}
        >
          {errorMessage ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="text-sm">{errorMessage ?? successMessage}</p>
        </div>
      )}

      {step === 'request' && (
        <form onSubmit={handleRequestCode} className="space-y-5">
          <Field
            id="email"
            label={t('reset.fields.email')}
            error={fieldErrors.email}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('reset.placeholders.email')}
              disabled={isBusy}
              className={cn(fieldErrors.email && 'border-destructive focus-visible:ring-destructive')}
            />
          </Field>
          <Button type="submit" className="w-full gap-2" disabled={isBusy}>
            {loadingAction === 'request' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {loadingAction === 'request' ? t('reset.actions.sending') : t('reset.actions.sendCode')}
          </Button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerifyCode} className="space-y-5">
          <ReadonlyEmail email={email} onChangeEmail={handleChangeEmail} t={t} disabled={isBusy} />
          <Field id="code" label={t('reset.fields.code')} error={fieldErrors.code}>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder={t('reset.placeholders.code')}
              disabled={isBusy}
              className={cn(
                'font-mono text-lg tracking-[0.35em]',
                fieldErrors.code && 'border-destructive focus-visible:ring-destructive',
              )}
            />
          </Field>
          <Button type="submit" className="w-full gap-2" disabled={isBusy}>
            {loadingAction === 'verify' && <RefreshCw className="h-4 w-4 animate-spin" />}
            {loadingAction === 'verify' ? t('reset.actions.verifying') : t('reset.actions.verifyCode')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2"
            onClick={() => void handleResendCode()}
            disabled={isBusy}
          >
            {loadingAction === 'resend' && <RefreshCw className="h-4 w-4 animate-spin" />}
            {loadingAction === 'resend' ? t('reset.actions.resending') : t('reset.actions.resendCode')}
          </Button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <ReadonlyEmail email={email} onChangeEmail={handleChangeEmail} t={t} disabled={isBusy} />
          <Field id="newPassword" label={t('reset.fields.newPassword')} error={fieldErrors.newPassword}>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t('reset.placeholders.newPassword')}
              disabled={isBusy}
              className={cn(
                fieldErrors.newPassword && 'border-destructive focus-visible:ring-destructive',
              )}
            />
          </Field>
          <Field
            id="confirmPassword"
            label={t('reset.fields.confirmPassword')}
            error={fieldErrors.confirmPassword}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t('reset.placeholders.confirmPassword')}
              disabled={isBusy}
              className={cn(
                fieldErrors.confirmPassword && 'border-destructive focus-visible:ring-destructive',
              )}
            />
          </Field>
          <Button type="submit" className="w-full gap-2" disabled={isBusy}>
            {loadingAction === 'reset' && <RefreshCw className="h-4 w-4 animate-spin" />}
            {loadingAction === 'reset' ? t('reset.actions.resetting') : t('reset.actions.resetPassword')}
          </Button>
        </form>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/login">{t('reset.actions.backToLogin')}</Link>
          </Button>
        </div>
      )}

      {step !== 'done' && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t('reset.actions.backToLogin')}
          </Link>
        </p>
      )}
    </div>
  );
}

function ResetProgress({ step, t }: { step: Step; t: ReturnType<typeof useTranslation>['t'] }) {
  const steps: Array<{ key: Exclude<Step, 'done'>; label: string }> = [
    { key: 'request', label: t('reset.steps.request') },
    { key: 'verify', label: t('reset.steps.verify') },
    { key: 'reset', label: t('reset.steps.reset') },
  ];
  const currentIndex = step === 'done' ? steps.length : steps.findIndex((item) => item.key === step);

  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((item, index) => (
        <div
          key={item.key}
          className={cn(
            'rounded-lg border px-3 py-2 text-center text-xs font-medium',
            index <= currentIndex
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border bg-secondary/40 text-muted-foreground',
          )}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ReadonlyEmail({
  email,
  onChangeEmail,
  t,
  disabled,
}: {
  email: string;
  onChangeEmail: () => void;
  t: ReturnType<typeof useTranslation>['t'];
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{t('reset.fields.email')}</p>
          <p className="text-sm font-medium text-foreground">{email}</p>
        </div>
        <button
          type="button"
          onClick={onChangeEmail}
          disabled={disabled}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
        >
          {t('reset.actions.changeEmail')}
        </button>
      </div>
    </div>
  );
}
