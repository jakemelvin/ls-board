'use client';

import { useCallback, useEffect, useMemo, useState, type ElementType } from 'react';
import { CircleHelp, ExternalLink, FileQuestion, Globe2, Headphones, Mail, MessageCircle, Phone, RefreshCw } from 'lucide-react';

import { StatusState } from '@/components/company/company-shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import { useTranslation } from '@/lib/i18n';
import { getSupportContactAction } from '@/lib/support/contact-action';
import { getActiveSupportContacts } from '@/lib/support/api';
import type { SupportContactResponse, SupportContactType } from '@/lib/support/types';

const ICONS: Record<SupportContactType, ElementType> = {
  EMAIL: Mail,
  PHONE: Phone,
  WHATSAPP: MessageCircle,
  LIVE_CHAT: Headphones,
  WEBSITE: Globe2,
  FAQ: FileQuestion,
  OTHER: CircleHelp,
};

export function SupportView() {
  const token = useAuthStore((state) => state.token);
  const { t } = useTranslation('dashboard');
  const [contacts, setContacts] = useState<SupportContactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getActiveSupportContacts(token);
      setContacts(response.filter((contact) => contact.active !== false));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('support.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [t, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const orderedContacts = useMemo(
    () => [...contacts].sort((left, right) => (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER)),
    [contacts],
  );

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="max-w-3xl">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('support.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('support.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner className="h-8 w-8 text-primary" /></div>
      ) : error ? (
        <StatusState icon={CircleHelp} tone="destructive" title={t('common.loadError')} description={error} action={<Button variant="outline" className="gap-2" onClick={refresh}><RefreshCw className="h-4 w-4" />{t('common.retry')}</Button>} />
      ) : orderedContacts.length === 0 ? (
        <StatusState icon={CircleHelp} title={t('support.emptyTitle')} description={t('support.emptyDescription')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {orderedContacts.map((contact) => {
            const Icon = ICONS[contact.type];
            const action = getSupportContactAction(contact);
            const content = <><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="font-semibold text-foreground">{contact.title}</p><p className="mt-1 break-words text-sm text-muted-foreground">{contact.value}</p>{contact.description && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{contact.description}</p>}</div>{action.external && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}</>;
            return action.href ? <a key={contact.id} href={action.href} target={action.external ? '_blank' : undefined} rel={action.external ? 'noreferrer' : undefined} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/30"><CardContent className="flex gap-3 p-4">{content}</CardContent></Card></a> : <Card key={contact.id}><CardContent className="flex gap-3 p-4">{content}</CardContent></Card>;
          })}
        </div>
      )}
    </div>
  );
}
