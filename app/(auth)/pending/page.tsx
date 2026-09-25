'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth/store';
import { getActiveSupportContacts } from '@/lib/support/api';
import { getSupportContactAction } from '@/lib/support/contact-action';
import type { SupportContactResponse } from '@/lib/support/types';

function getSupportEmail(contacts: SupportContactResponse[]) {
  return (
    contacts
      .filter((contact) => contact.type === 'EMAIL' && contact.active !== false)
      .sort(
        (left, right) =>
          (left.displayOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.displayOrder ?? Number.MAX_SAFE_INTEGER),
      )
      .find((contact) => Boolean(contact.value.trim())) ?? null
  );
}

export default function PendingPage() {
  const router = useRouter();
  const { t } = useTranslation('pending');
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [supportEmail, setSupportEmail] = useState<SupportContactResponse | null>(null);
  const [isLoadingSupportEmail, setIsLoadingSupportEmail] = useState(true);
  const steps = [
    { icon: CheckCircle2, label: t('steps.requestReceived.label'), description: t('steps.requestReceived.description'), done: true },
    { icon: Clock, label: t('steps.reviewInProgress.label'), description: t('steps.reviewInProgress.description'), done: false },
    { icon: Mail, label: t('steps.emailNotification.label'), description: t('steps.emailNotification.description'), done: false },
  ];

  useEffect(() => {
    if (!isHydrated) return;

    let cancelled = false;
    setIsLoadingSupportEmail(true);

    getActiveSupportContacts(token)
      .then((contacts) => {
        if (!cancelled) setSupportEmail(getSupportEmail(contacts));
      })
      .catch(() => {
        if (!cancelled) setSupportEmail(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSupportEmail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, token]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-10 text-center">
        {/* Icon + Title */}
        <div className="space-y-4">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/30">
              <Clock className="h-9 w-9 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('heading')}
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              {t('body')}
            </p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex gap-4">
                <div className="flex flex-col items-center gap-0">
                  <div
                    className={
                      step.done
                        ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
                        : i === 1
                        ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/30'
                        : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`mt-1 h-8 w-px ${step.done ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
                <div className="pb-2">
                  <p className={`text-sm font-semibold ${step.done ? 'text-foreground' : i === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estimated time */}
        <div className="rounded-xl border border-border bg-muted/50 px-5 py-4 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">{t('estimatedTime.label')}</span>{' '}
            {isLoadingSupportEmail
              ? t('estimatedTime.loading')
              : supportEmail
                ? <>{t('estimatedTime.description', { values: { email: supportEmail.value } })}{' '}<a href={getSupportContactAction(supportEmail).href ?? undefined} className="font-medium text-primary underline underline-offset-2">{t('estimatedTime.contactAction')}</a></>
                : t('estimatedTime.unavailable')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('actions.backToLogin')}
          </Button>
        </div>
      </div>
    </div>
  );
}
