'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Package,
  Waypoints,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/company/company-shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompanyOperationalReadiness } from '@/lib/admin/types';
import { useTranslation } from '@/lib/i18n';

interface OperationalReadinessCheck {
  label: string;
  ok: boolean;
  count?: number;
}

function getOperationalReadinessChecks(
  data: CompanyOperationalReadiness,
): OperationalReadinessCheck[] {
  return [
    { label: 'Types de colis', ok: data.parcelTypesConfigured, count: data.parcelTypeCount },
    { label: 'Modes de transport', ok: data.transportModesConfigured, count: data.transportModeCount },
    { label: 'Tarification', ok: data.pricingConfigured, count: data.pricingCount },
    {
      label: 'Estimations de livraison',
      ok: data.deliveryEstimatesConfigured,
      count: data.deliveryEstimateCount,
    },
    { label: 'Zones geographiques', ok: data.zonesConfigured, count: data.zoneCount },
    { label: 'Points de collecte', ok: data.collectionPointsConfigured, count: data.collectionPointCount },
    {
      label: 'Responsables de points',
      ok: data.collectionPointResponsiblesConfigured,
      count: data.collectionPointsWithResponsibleCount,
    },
    { label: 'Transporteurs', ok: data.transportersConfigured, count: data.transporterCount },
    { label: 'Flottes assignees', ok: data.assignedFlottesConfigured, count: data.assignedFlotteCount },
  ];
}

export function formatOperationalReadinessDate(value: string, locale = 'fr') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function OperationalReadinessDialog({
  data,
  onClose,
}: {
  data: CompanyOperationalReadiness | null;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation('company');
  if (!data) return null;

  const checks = getOperationalReadinessChecks(data);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-border bg-card shadow-xl">
        <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-card/95 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={data.exploitable ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
                {data.exploitable ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {data.exploitable ? t('readiness.status.ready') : t('readiness.status.incomplete')}
              </Badge>
              <Badge className="bg-secondary text-secondary-foreground">
                {t('readiness.checkedAt', { values: { date: formatOperationalReadinessDate(data.checkedAt, locale) } })}
              </Badge>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">{data.companyName}</h3>
              <p className="text-sm text-muted-foreground">
                {t('readiness.description')}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <Card className="border-border bg-background/50">
              <CardHeader>
                <CardTitle className="text-base">{t('readiness.global')}</CardTitle>
                <CardDescription>{data.summary}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {checks.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {check.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-sm text-foreground">{check.label}</span>
                    </div>
                    {check.count !== undefined && (
                      <span className="text-sm font-medium text-muted-foreground">{check.count}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-background/50">
              <CardHeader>
                <CardTitle className="text-base">{t('readiness.remaining')}</CardTitle>
                <CardDescription>
                  {data.missingItems.length === 0
                    ? t('readiness.noBlocking')
                    : `${data.missingItems.length} element(s) empechent encore une exploitation complete.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.missingItems.length === 0 ? (
                  <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success">
                    Tous les prerequis critiques remontes par l'API sont satisfaits.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.missingItems.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <span className="text-sm text-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border bg-background/50">
              <CardHeader>
                <CardTitle className="text-base">{t('readiness.pricing.title')}</CardTitle>
                <CardDescription>{t('readiness.pricing.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Tarifs configures" value={data.pricingCount} ok={data.pricingConfigured} />
                <InfoRow label="Compatibilite enveloppes" value={data.envelopePricingCompatible ? 'OK' : 'Incomplet'} ok={data.envelopePricingCompatible} />
                <ReadinessList
                  title="Modes sans tarification"
                  items={data.missingPricingTransportModes ?? []}
                  emptyLabel="Tous les modes actifs ont une tarification."
                  icon={Waypoints}
                />
                <ReadinessList
                  title="Configurations tarifaires manquantes"
                  items={data.missingPricingConfigurations ?? []}
                  emptyLabel="Toutes les configurations tarifaires requises sont couvertes."
                  icon={Waypoints}
                />
                <ReadinessList
                  title="Modes non compatibles enveloppes"
                  items={data.missingEnvelopeCompatiblePricingTransportModes ?? []}
                  emptyLabel="Les tarifs sont compatibles avec les envois enveloppe."
                  icon={Package}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-background/50">
              <CardHeader>
                <CardTitle className="text-base">{t('readiness.estimates.title')}</CardTitle>
                <CardDescription>{t('readiness.estimates.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow
                  label="Estimations configurees"
                  value={data.deliveryEstimateCount}
                  ok={data.deliveryEstimatesConfigured}
                />
                <ReadinessList
                  title="Modes sans estimation"
                  items={data.missingDeliveryEstimateTransportModes ?? []}
                  emptyLabel="Tous les modes actifs ont une estimation."
                  icon={Clock3}
                />
                <ReadinessList
                  title="Configurations d'estimation manquantes"
                  items={data.missingDeliveryEstimateConfigurations ?? []}
                  emptyLabel="Toutes les configurations d'estimation sont couvertes."
                  icon={Clock3}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-background/50">
              <CardHeader>
                <CardTitle className="text-base">{t('readiness.network.title')}</CardTitle>
                <CardDescription>{t('readiness.network.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Zones" value={data.zoneCount} ok={data.zonesConfigured} />
                <InfoRow label="Points de collecte" value={data.collectionPointCount} ok={data.collectionPointsConfigured} />
                <InfoRow
                  label="Points avec responsable"
                  value={data.collectionPointsWithResponsibleCount}
                  ok={data.collectionPointResponsiblesConfigured}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-background/50">
              <CardHeader>
                <CardTitle className="text-base">{t('readiness.capacity.title')}</CardTitle>
                <CardDescription>{t('readiness.capacity.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Transporteurs actifs" value={data.transporterCount} ok={data.transportersConfigured} />
                <InfoRow label="Flottes assignees" value={data.assignedFlotteCount} ok={data.assignedFlottesConfigured} />
                <InfoRow label="Types de colis" value={data.parcelTypeCount} ok={data.parcelTypesConfigured} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: number | string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{value}</span>
    </div>
  );
}

function ReadinessList({
  title,
  items,
  emptyLabel,
  icon: Icon,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  icon: React.ElementType;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
