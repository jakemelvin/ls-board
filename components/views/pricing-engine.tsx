'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, RefreshCw, Save, Trash2, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import {
  getCollectionPoints,
  getCompanyPricing,
  getCompanyTransportModes,
  getPricingRequirements,
  upsertCompanyPricing,
} from '@/lib/company/api';
import type {
  CollectionPointResponse,
  CompanyPricingDistanceRuleRequest,
  CompanyPricingRangeRuleRequest,
  CompanyPricingRequirementsResponse,
  CompanyPricingResponse,
  PricingCriterion,
  TransportModeResponse,
} from '@/lib/company/types';
import {
  CompanyGuard,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';

const CRITERIA: { id: PricingCriterion; label: string; hint: string }[] = [
  { id: 'FIXED', label: 'Prix fixe', hint: 'Un montant unique par expédition.' },
  { id: 'DISTANCE', label: 'Distance', hint: 'Un prix par paire origine/destination.' },
  { id: 'WEIGHT', label: 'Poids', hint: 'Des tranches basées sur le poids.' },
  { id: 'VOLUME', label: 'Volume', hint: 'Des tranches basées sur le volume.' },
];

type RangeRuleDraft = {
  id: string;
  minValue: string;
  maxValue: string;
  amount: string;
};

type DistanceRuleDraft = {
  id: string;
  originCollectionPointId: string;
  destinationCollectionPointId: string;
  amount: string;
};

type PricingFormState = {
  selectedCriteria: PricingCriterion[];
  fixedPrice: string;
  distanceRules: DistanceRuleDraft[];
  weightRules: RangeRuleDraft[];
  volumeRules: RangeRuleDraft[];
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyRangeRule(): RangeRuleDraft {
  return { id: createId(), minValue: '', maxValue: '', amount: '' };
}

function createEmptyDistanceRule(): DistanceRuleDraft {
  return {
    id: createId(),
    originCollectionPointId: '',
    destinationCollectionPointId: '',
    amount: '',
  };
}

function createDefaultForm(): PricingFormState {
  return {
    selectedCriteria: ['FIXED'],
    fixedPrice: '',
    distanceRules: [],
    weightRules: [createEmptyRangeRule()],
    volumeRules: [createEmptyRangeRule()],
  };
}

function buildFormFromPricing(pricing?: CompanyPricingResponse | null): PricingFormState {
  if (!pricing) {
    return createDefaultForm();
  }

  return {
    selectedCriteria: pricing.selectedCriteria,
    fixedPrice: pricing.fixedPrice != null ? String(pricing.fixedPrice) : '',
    distanceRules: pricing.distanceRules.map((rule) => ({
      id: String(rule.id),
      originCollectionPointId: String(rule.originCollectionPointId),
      destinationCollectionPointId: String(rule.destinationCollectionPointId),
      amount: String(rule.amount),
    })),
    weightRules:
      pricing.weightRules.length > 0
        ? pricing.weightRules.map((rule) => ({
            id: String(rule.id),
            minValue: String(rule.minValue),
            maxValue: rule.maxValue != null ? String(rule.maxValue) : '',
            amount: String(rule.amount),
          }))
        : [createEmptyRangeRule()],
    volumeRules:
      pricing.volumeRules.length > 0
        ? pricing.volumeRules.map((rule) => ({
            id: String(rule.id),
            minValue: String(rule.minValue),
            maxValue: rule.maxValue != null ? String(rule.maxValue) : '',
            amount: String(rule.amount),
          }))
        : [createEmptyRangeRule()],
  };
}

function formatCriterionList(criteria: PricingCriterion[]) {
  return CRITERIA.filter((item) => criteria.includes(item.id))
    .map((item) => item.label)
    .join(', ');
}

function buildCriteriaKey(criteria: PricingCriterion[]) {
  return [...criteria].sort().join('|');
}

function areDistanceRulesEquivalent(
  left: DistanceRuleDraft[],
  right: DistanceRuleDraft[],
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((rule, index) => {
    const candidate = right[index];
    return (
      candidate !== undefined &&
      rule.originCollectionPointId === candidate.originCollectionPointId &&
      rule.destinationCollectionPointId === candidate.destinationCollectionPointId &&
      rule.amount === candidate.amount
    );
  });
}

function RangeRulesEditor({
  title,
  unit,
  value,
  onChange,
}: {
  title: string;
  unit: string;
  value: RangeRuleDraft[];
  onChange: (value: RangeRuleDraft[]) => void;
}) {
  const updateRule = (id: string, patch: Partial<RangeRuleDraft>) =>
    onChange(value.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

  const removeRule = (id: string) =>
    onChange(value.length === 1 ? [createEmptyRangeRule()] : value.filter((rule) => rule.id !== id));

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">Définissez les tranches de {unit} et leur montant.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onChange([...value, createEmptyRangeRule()])}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {value.map((rule) => (
          <div key={rule.id} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rule.minValue}
              onChange={(event) => updateRule(rule.id, { minValue: event.target.value })}
              placeholder={`Min ${unit}`}
              className="bg-secondary"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rule.maxValue}
              onChange={(event) => updateRule(rule.id, { maxValue: event.target.value })}
              placeholder={`Max ${unit} (optionnel)`}
              className="bg-secondary"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rule.amount}
              onChange={(event) => updateRule(rule.id, { amount: event.target.value })}
              placeholder="Montant"
              className="bg-secondary"
            />
            <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DistanceRulesEditor({
  points,
  value,
  requirements,
  onChange,
}: {
  points: CollectionPointResponse[];
  value: DistanceRuleDraft[];
  requirements: CompanyPricingRequirementsResponse | null;
  onChange: (value: DistanceRuleDraft[]) => void;
}) {
  const pointMap = useMemo(
    () => new Map(points.map((point) => [String(point.id), point.name])),
    [points],
  );

  const updateRule = (id: string, patch: Partial<DistanceRuleDraft>) =>
    onChange(value.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

  const removeRule = (id: string) =>
    onChange(value.length === 1 ? [createEmptyDistanceRule()] : value.filter((rule) => rule.id !== id));

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Règles par distance</p>
          <p className="text-sm text-muted-foreground">
            Associez un montant à chaque trajet entre points de collecte.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onChange([...value, createEmptyDistanceRule()])}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {requirements && requirements.requiredDistancePairs.length > 0 && (
        <div className="rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
          Paires attendues: {requirements.requiredDistancePairs
            .map((pair) => `${pair.originCollectionPointName} -> ${pair.destinationCollectionPointName}`)
            .join(' • ')}
        </div>
      )}

      <div className="space-y-3">
        {value.map((rule) => (
          <div key={rule.id} className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]">
            <Select
              value={rule.originCollectionPointId}
              onValueChange={(originCollectionPointId) => updateRule(rule.id, { originCollectionPointId })}
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Point origine" />
              </SelectTrigger>
              <SelectContent>
                {points.map((point) => (
                  <SelectItem key={point.id} value={String(point.id)}>
                    {point.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={rule.destinationCollectionPointId}
              onValueChange={(destinationCollectionPointId) =>
                updateRule(rule.id, { destinationCollectionPointId })
              }
            >
              <SelectTrigger className="bg-secondary">
                <SelectValue placeholder="Point destination" />
              </SelectTrigger>
              <SelectContent>
                {points.map((point) => (
                  <SelectItem key={point.id} value={String(point.id)}>
                    {point.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min="0"
              step="0.01"
              value={rule.amount}
              onChange={(event) => updateRule(rule.id, { amount: event.target.value })}
              placeholder="Montant"
              className="bg-secondary"
            />

            <Button variant="ghost" size="icon" onClick={() => removeRule(rule.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>

            {rule.originCollectionPointId && rule.destinationCollectionPointId && (
              <p className="text-xs text-muted-foreground md:col-span-4">
                {pointMap.get(rule.originCollectionPointId)} {'->'} {pointMap.get(rule.destinationCollectionPointId)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyPricingInner({ companyId, companyName }: { companyId: number; companyName: string }) {
  const token = useAuthStore((state) => state.token);
  const { toast, success, error: showError } = useToastSimple();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [transportModes, setTransportModes] = useState<TransportModeResponse[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointResponse[]>([]);
  const [pricingList, setPricingList] = useState<CompanyPricingResponse[]>([]);
  const [selectedTransportModeId, setSelectedTransportModeId] = useState<string>('');
  const [form, setForm] = useState<PricingFormState>(createDefaultForm());
  const [requirements, setRequirements] = useState<CompanyPricingRequirementsResponse | null>(null);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const criteriaKey = useMemo(
    () => buildCriteriaKey(form.selectedCriteria),
    [form.selectedCriteria],
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [modeResponse, pointsResponse, pricingResponse] = await Promise.all([
        getCompanyTransportModes(token, companyId),
        getCollectionPoints(token, companyId),
        getCompanyPricing(token, companyId),
      ]);
      setTransportModes(modeResponse.transportModes);
      setCollectionPoints(pointsResponse);
      setPricingList(pricingResponse);

      const firstModeId =
        selectedTransportModeId ||
        String(pricingResponse[0]?.transportModeId ?? modeResponse.transportModes[0]?.id ?? '');
      setSelectedTransportModeId(firstModeId);
      const currentPricing =
        pricingResponse.find((item) => String(item.transportModeId) === firstModeId) ?? null;
      setForm(buildFormFromPricing(currentPricing));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [token, companyId, selectedTransportModeId]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPricing = useMemo(
    () => pricingList.find((item) => String(item.transportModeId) === selectedTransportModeId) ?? null,
    [pricingList, selectedTransportModeId],
  );

  useEffect(() => {
    setForm(buildFormFromPricing(selectedPricing));
  }, [selectedPricing]);

  useEffect(() => {
    const transportModeId = Number(selectedTransportModeId);
    if (!token || !transportModeId || form.selectedCriteria.length === 0) {
      setRequirements(null);
      return;
    }

    let cancelled = false;
    setRequirementsLoading(true);
    getPricingRequirements(token, companyId, transportModeId, {
      selectedCriteria: form.selectedCriteria,
    })
      .then((response) => {
        if (cancelled) return;
        setRequirements(response);
        if (response.requiredDistancePairs.length > 0 && form.selectedCriteria.includes('DISTANCE')) {
          setForm((current) => {
            const nextRules = response.requiredDistancePairs.map((pair) => {
              const existing = current.distanceRules.find(
                (rule) =>
                  Number(rule.originCollectionPointId) === pair.originCollectionPointId &&
                  Number(rule.destinationCollectionPointId) === pair.destinationCollectionPointId,
              );
              return {
                id: existing?.id ?? createId(),
                originCollectionPointId: String(pair.originCollectionPointId),
                destinationCollectionPointId: String(pair.destinationCollectionPointId),
                amount: existing?.amount ?? '',
              };
            });
            if (areDistanceRulesEquivalent(current.distanceRules, nextRules)) {
              return current;
            }
            return { ...current, distanceRules: nextRules };
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          showError(err instanceof ApiError ? err.message : 'Impossible de charger les exigences');
        }
      })
      .finally(() => {
        if (!cancelled) setRequirementsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, companyId, selectedTransportModeId, criteriaKey]);

  const toggleCriterion = (criterion: PricingCriterion) => {
    setForm((current) => {
      const exists = current.selectedCriteria.includes(criterion);
      const next = exists
        ? current.selectedCriteria.filter((item) => item !== criterion)
        : [...current.selectedCriteria, criterion];
      return {
        ...current,
        selectedCriteria: next.length > 0 ? next : [criterion],
      };
    });
  };

  const buildRangeRules = (value: RangeRuleDraft[]): CompanyPricingRangeRuleRequest[] =>
    value
      .filter((rule) => rule.minValue !== '' && rule.amount !== '')
      .map((rule) => ({
        minValue: Number(rule.minValue),
        maxValue: rule.maxValue !== '' ? Number(rule.maxValue) : undefined,
        amount: Number(rule.amount),
      }));

  const buildDistanceRules = (value: DistanceRuleDraft[]): CompanyPricingDistanceRuleRequest[] =>
    value
      .filter(
        (rule) =>
          rule.originCollectionPointId !== '' &&
          rule.destinationCollectionPointId !== '' &&
          rule.amount !== '',
      )
      .map((rule) => ({
        originCollectionPointId: Number(rule.originCollectionPointId),
        destinationCollectionPointId: Number(rule.destinationCollectionPointId),
        amount: Number(rule.amount),
      }));

  const handleSave = async () => {
    if (!token || !selectedTransportModeId) return;
    setSaving(true);
    try {
      const payload = {
        selectedCriteria: form.selectedCriteria,
        fixedPrice: form.selectedCriteria.includes('FIXED') && form.fixedPrice !== '' ? Number(form.fixedPrice) : undefined,
        distanceRules: form.selectedCriteria.includes('DISTANCE') ? buildDistanceRules(form.distanceRules) : undefined,
        weightRules: form.selectedCriteria.includes('WEIGHT') ? buildRangeRules(form.weightRules) : undefined,
        volumeRules: form.selectedCriteria.includes('VOLUME') ? buildRangeRules(form.volumeRules) : undefined,
      };

      const saved = await upsertCompanyPricing(token, companyId, Number(selectedTransportModeId), payload);
      setPricingList((current) => {
        const exists = current.some((item) => item.transportModeId === saved.transportModeId);
        return exists
          ? current.map((item) => (item.transportModeId === saved.transportModeId ? saved : item))
          : [saved, ...current];
      });
      success('Tarification enregistrée');
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <StatusState
        icon={Calculator}
        tone="destructive"
        title="Erreur de chargement"
        description={error}
        action={
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        }
      />
    );
  }

  if (transportModes.length === 0) {
    return (
      <StatusState
        icon={Waypoints}
        title="Aucun mode de transport actif"
        description="Activez d’abord un ou plusieurs modes de transport pour pouvoir définir les tarifs."
      />
    );
  }

  return (
    <div className="space-y-6">
      <ToastBar toast={toast} />

      <SectionHeader
        title="Tarification"
        subtitle={`Configuration des grilles tarifaires de ${companyName} par mode de transport.`}
        action={
          <Button onClick={handleSave} disabled={saving || !selectedTransportModeId} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Modes configurés</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{pricingList.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Points disponibles</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{collectionPoints.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Critères actifs</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatCriterionList(form.selectedCriteria)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Modes de transport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transportModes.map((mode) => {
              const configured = pricingList.some((item) => item.transportModeId === mode.id);
              const active = String(mode.id) === selectedTransportModeId;
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedTransportModeId(String(mode.id))}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    active ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{mode.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {configured ? 'Tarification enregistrée' : 'À configurer'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        configured
                          ? 'bg-success/15 text-success'
                          : 'bg-warning/15 text-warning'
                      }`}
                    >
                      {configured ? 'OK' : 'Brouillon'}
                    </span>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-base">Configuration tarifaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Mode de transport</Label>
                <Select value={selectedTransportModeId} onValueChange={setSelectedTransportModeId}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Sélectionnez un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportModes.map((mode) => (
                      <SelectItem key={mode.id} value={String(mode.id)}>
                        {mode.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Critères de calcul</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {CRITERIA.map((criterion) => {
                    const active = form.selectedCriteria.includes(criterion.id);
                    return (
                      <button
                        key={criterion.id}
                        onClick={() => toggleCriterion(criterion.id)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${
                          active ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <p className="font-medium text-foreground">{criterion.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{criterion.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {requirementsLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  Vérification des exigences tarifaires...
                </div>
              )}

              {requirements && (
                <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
                  <p className="font-medium text-foreground">Exigences de l’API</p>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <p>Prix fixe requis: {requirements.fixedPriceRequired ? 'Oui' : 'Non'}</p>
                    <p>Règles distance requises: {requirements.distanceRulesRequired ? 'Oui' : 'Non'}</p>
                    <p>Règles poids requises: {requirements.weightRulesRequired ? 'Oui' : 'Non'}</p>
                    <p>Règles volume requises: {requirements.volumeRulesRequired ? 'Oui' : 'Non'}</p>
                    {requirements.weightRulesInstruction && <p>{requirements.weightRulesInstruction}</p>}
                    {requirements.volumeRulesInstruction && <p>{requirements.volumeRulesInstruction}</p>}
                  </div>
                </div>
              )}

              {form.selectedCriteria.includes('FIXED') && (
                <div className="space-y-2">
                  <Label>Prix fixe</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.fixedPrice}
                    onChange={(event) => setForm((current) => ({ ...current, fixedPrice: event.target.value }))}
                    className="max-w-xs bg-secondary"
                    placeholder="0.00"
                  />
                </div>
              )}

              {form.selectedCriteria.includes('DISTANCE') && (
                <div className="space-y-3">
                  <DistanceRulesEditor
                    points={collectionPoints}
                    value={form.distanceRules}
                    requirements={requirements}
                    onChange={(distanceRules) => setForm((current) => ({ ...current, distanceRules }))}
                  />
                </div>
              )}

              {form.selectedCriteria.includes('WEIGHT') && (
                <RangeRulesEditor
                  title="Tranches de poids"
                  unit="kg"
                  value={form.weightRules}
                  onChange={(weightRules) => setForm((current) => ({ ...current, weightRules }))}
                />
              )}

              {form.selectedCriteria.includes('VOLUME') && (
                <RangeRulesEditor
                  title="Tranches de volume"
                  unit="m3"
                  value={form.volumeRules}
                  onChange={(volumeRules) => setForm((current) => ({ ...current, volumeRules }))}
                />
              )}
            </CardContent>
          </Card>

          {selectedPricing && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Dernière configuration enregistrée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Mode: <span className="font-medium text-foreground">{selectedPricing.transportModeName}</span>
                </p>
                <p>
                  Critères: <span className="font-medium text-foreground">{formatCriterionList(selectedPricing.selectedCriteria)}</span>
                </p>
                <p>
                  Distance: <span className="font-medium text-foreground">{selectedPricing.distanceRules.length} règle(s)</span>
                </p>
                <p>
                  Poids: <span className="font-medium text-foreground">{selectedPricing.weightRules.length} tranche(s)</span>
                </p>
                <p>
                  Volume: <span className="font-medium text-foreground">{selectedPricing.volumeRules.length} tranche(s)</span>
                </p>
                {selectedPricing.updatedAt && (
                  <p>
                    Mis à jour le{' '}
                    <span className="font-medium text-foreground">
                      {new Date(selectedPricing.updatedAt).toLocaleString()}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function PricingEngine() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CompanyPricingInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}
