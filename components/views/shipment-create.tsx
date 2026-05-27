'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  FileImage,
  MapPinned,
  Package,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getCountries } from '@/lib/auth/api';
import type { CountryResponse } from '@/lib/auth/types';
import { getCities, getParcelTypes } from '@/lib/company/api';
import type { CityResponse, ParcelTypeResponse } from '@/lib/company/types';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import {
  createShipment,
  getShipmentCollectionPointOptions,
  searchShipmentCompanies,
  searchShipmentTransportModes,
} from '@/lib/shipments/api';
import type {
  Shipment,
  ShipmentAvailableCompany,
  ShipmentAvailableTransportMode,
  ShipmentCollectionPointOption,
  ShipmentCreateRequest,
  ShipmentPriority,
} from '@/lib/shipments/types';
import { cn } from '@/lib/utils';

type ShipmentCreateFormState = {
  originCountryId: string;
  originCityId: string;
  destinationCountryId: string;
  destinationCityId: string;
  parcelTypeId: string;
  transportModeId: string;
  companyId: string;
  originCollectionPointId: string;
  destinationCollectionPointId: string;
  priority: ShipmentPriority;
  weightKg: string;
  volumeM3: string;
  promoCode: string;
  description: string;
  senderFullName: string;
  senderWhatsappNumber: string;
  senderAddress: string;
  senderIdCardNumber: string;
  receiverFullName: string;
  receiverWhatsappNumber: string;
  receiverAddress: string;
  receiverIdCardNumber: string;
};

type ShipmentCreateFormErrors = Partial<Record<keyof ShipmentCreateFormState, string>>;

interface ShipmentCreateViewProps {
  onBack: () => void;
  onCreated: (shipment: Shipment) => void;
}

const DEFAULT_FORM: ShipmentCreateFormState = {
  originCountryId: '',
  originCityId: '',
  destinationCountryId: '',
  destinationCityId: '',
  parcelTypeId: '',
  transportModeId: '',
  companyId: '',
  originCollectionPointId: '',
  destinationCollectionPointId: '',
  priority: 'STANDARD',
  weightKg: '',
  volumeM3: '',
  promoCode: '',
  description: '',
  senderFullName: '',
  senderWhatsappNumber: '',
  senderAddress: '',
  senderIdCardNumber: '',
  receiverFullName: '',
  receiverWhatsappNumber: '',
  receiverAddress: '',
  receiverIdCardNumber: '',
};

export function ShipmentCreateView({ onBack, onCreated }: ShipmentCreateViewProps) {
  const token = useAuthStore((state) => state.token);
  const [form, setForm] = useState<ShipmentCreateFormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<ShipmentCreateFormErrors>({});

  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [cities, setCities] = useState<CityResponse[]>([]);
  const [parcelTypes, setParcelTypes] = useState<ParcelTypeResponse[]>([]);
  const [transportModes, setTransportModes] = useState<ShipmentAvailableTransportMode[]>([]);
  const [companies, setCompanies] = useState<ShipmentAvailableCompany[]>([]);
  const [originCollectionPoints, setOriginCollectionPoints] = useState<ShipmentCollectionPointOption[]>([]);
  const [destinationCollectionPoints, setDestinationCollectionPoints] = useState<ShipmentCollectionPointOption[]>([]);

  const [metadataLoading, setMetadataLoading] = useState(true);
  const [transportModesLoading, setTransportModesLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [collectionPointsLoading, setCollectionPointsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [transportModesError, setTransportModesError] = useState<string | null>(null);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [collectionPointsError, setCollectionPointsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [senderFrontIdCard, setSenderFrontIdCard] = useState<File | null>(null);
  const [senderBackIdCard, setSenderBackIdCard] = useState<File | null>(null);
  const [parcelPhotos, setParcelPhotos] = useState<File[]>([]);

  const originCities = useMemo(
    () => cities.filter((city) => String(city.countryId) === form.originCountryId),
    [cities, form.originCountryId],
  );
  const destinationCities = useMemo(
    () => cities.filter((city) => String(city.countryId) === form.destinationCountryId),
    [cities, form.destinationCountryId],
  );

  const routeReady = Boolean(
    form.originCountryId &&
      form.originCityId &&
      form.destinationCountryId &&
      form.destinationCityId,
  );
  const companySearchReady = Boolean(routeReady && form.transportModeId && form.parcelTypeId);
  const pointSearchReady = Boolean(companySearchReady && form.companyId);

  useEffect(() => {
    if (!token) {
      setMetadataError('Session expiree');
      setMetadataLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMetadata() {
      setMetadataLoading(true);
      setMetadataError(null);

      try {
        const [countriesResponse, citiesResponse, parcelTypesResponse] = await Promise.all([
          getCountries(),
          getCities(),
          getParcelTypes(token),
        ]);

        if (cancelled) {
          return;
        }

        setCountries(countriesResponse);
        setCities(citiesResponse);
        setParcelTypes(parcelTypesResponse);
      } catch (error) {
        if (!cancelled) {
          setMetadataError(
            error instanceof ApiError
              ? error.message
              : 'Impossible de charger les donnees de creation du shipment.',
          );
        }
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    }

    void loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !routeReady) {
      setTransportModes([]);
      setTransportModesError(null);
      return;
    }

    let cancelled = false;

    async function loadTransportModes() {
      setTransportModesLoading(true);
      setTransportModesError(null);

      try {
        const response = await searchShipmentTransportModes(token, {
          originCountryId: Number(form.originCountryId),
          originCityId: Number(form.originCityId),
          destinationCountryId: Number(form.destinationCountryId),
          destinationCityId: Number(form.destinationCityId),
        });

        if (cancelled) {
          return;
        }

        setTransportModes(response);
        setForm((current) =>
          response.some((mode) => String(mode.transportModeId) === current.transportModeId)
            ? current
            : {
                ...current,
                transportModeId: '',
                companyId: '',
                originCollectionPointId: '',
                destinationCollectionPointId: '',
              },
        );
      } catch (error) {
        if (!cancelled) {
          setTransportModes([]);
          setTransportModesError(
            error instanceof ApiError
              ? error.message
              : 'Impossible de charger les modes de transport disponibles.',
          );
        }
      } finally {
        if (!cancelled) {
          setTransportModesLoading(false);
        }
      }
    }

    void loadTransportModes();

    return () => {
      cancelled = true;
    };
  }, [
    form.destinationCityId,
    form.destinationCountryId,
    form.originCityId,
    form.originCountryId,
    routeReady,
    token,
  ]);

  useEffect(() => {
    if (!token || !companySearchReady) {
      setCompanies([]);
      setCompaniesError(null);
      return;
    }

    let cancelled = false;

    async function loadCompanies() {
      setCompaniesLoading(true);
      setCompaniesError(null);

      try {
        const response = await searchShipmentCompanies(token, {
          originCountryId: Number(form.originCountryId),
          originCityId: Number(form.originCityId),
          destinationCountryId: Number(form.destinationCountryId),
          destinationCityId: Number(form.destinationCityId),
          transportModeId: Number(form.transportModeId),
          parcelTypeId: Number(form.parcelTypeId),
        });

        if (cancelled) {
          return;
        }

        setCompanies(response);
        setForm((current) =>
          response.some((company) => String(company.companyId) === current.companyId)
            ? current
            : {
                ...current,
                companyId: '',
                originCollectionPointId: '',
                destinationCollectionPointId: '',
              },
        );
      } catch (error) {
        if (!cancelled) {
          setCompanies([]);
          setCompaniesError(
            error instanceof ApiError
              ? error.message
              : 'Impossible de charger les compagnies compatibles.',
          );
        }
      } finally {
        if (!cancelled) {
          setCompaniesLoading(false);
        }
      }
    }

    void loadCompanies();

    return () => {
      cancelled = true;
    };
  }, [
    companySearchReady,
    form.destinationCityId,
    form.destinationCountryId,
    form.originCityId,
    form.originCountryId,
    form.parcelTypeId,
    form.transportModeId,
    token,
  ]);

  useEffect(() => {
    if (!token || !pointSearchReady) {
      setOriginCollectionPoints([]);
      setDestinationCollectionPoints([]);
      setCollectionPointsError(null);
      return;
    }

    let cancelled = false;

    async function loadCollectionPoints() {
      setCollectionPointsLoading(true);
      setCollectionPointsError(null);

      try {
        const response = await getShipmentCollectionPointOptions(token, {
          companyId: Number(form.companyId),
          originCountryId: Number(form.originCountryId),
          originCityId: Number(form.originCityId),
          destinationCountryId: Number(form.destinationCountryId),
          destinationCityId: Number(form.destinationCityId),
          transportModeId: Number(form.transportModeId),
          parcelTypeId: Number(form.parcelTypeId),
        });

        if (cancelled) {
          return;
        }

        setOriginCollectionPoints(response.originCollectionPoints);
        setDestinationCollectionPoints(response.destinationCollectionPoints);
        setForm((current) => ({
          ...current,
          originCollectionPointId: response.originCollectionPoints.some(
            (point) => String(point.id) === current.originCollectionPointId,
          )
            ? current.originCollectionPointId
            : '',
          destinationCollectionPointId: response.destinationCollectionPoints.some(
            (point) => String(point.id) === current.destinationCollectionPointId,
          )
            ? current.destinationCollectionPointId
            : '',
        }));
      } catch (error) {
        if (!cancelled) {
          setOriginCollectionPoints([]);
          setDestinationCollectionPoints([]);
          setCollectionPointsError(
            error instanceof ApiError
              ? error.message
              : 'Impossible de charger les points de collecte disponibles.',
          );
        }
      } finally {
        if (!cancelled) {
          setCollectionPointsLoading(false);
        }
      }
    }

    void loadCollectionPoints();

    return () => {
      cancelled = true;
    };
  }, [
    form.companyId,
    form.destinationCityId,
    form.destinationCountryId,
    form.originCityId,
    form.originCountryId,
    form.parcelTypeId,
    form.transportModeId,
    pointSearchReady,
    token,
  ]);

  function updateField<Key extends keyof ShipmentCreateFormState>(
    field: Key,
    value: ShipmentCreateFormState[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmitError(null);
  }

  function handleCountryChange(field: 'originCountryId' | 'destinationCountryId', value: string) {
    updateField(field, value);

    if (field === 'originCountryId') {
      setForm((current) => ({
        ...current,
        originCountryId: value,
        originCityId: '',
        transportModeId: '',
        companyId: '',
        originCollectionPointId: '',
        destinationCollectionPointId: '',
      }));
    } else {
      setForm((current) => ({
        ...current,
        destinationCountryId: value,
        destinationCityId: '',
        transportModeId: '',
        companyId: '',
        originCollectionPointId: '',
        destinationCollectionPointId: '',
      }));
    }

    setTransportModes([]);
    setCompanies([]);
    setOriginCollectionPoints([]);
    setDestinationCollectionPoints([]);
  }

  function handleCityChange(field: 'originCityId' | 'destinationCityId', value: string) {
    updateField(field, value);
    setForm((current) => ({
      ...current,
      [field]: value,
      transportModeId: '',
      companyId: '',
      originCollectionPointId: '',
      destinationCollectionPointId: '',
    }));
    setTransportModes([]);
    setCompanies([]);
    setOriginCollectionPoints([]);
    setDestinationCollectionPoints([]);
  }

  function handleParcelTypeChange(value: string) {
    updateField('parcelTypeId', value);
    setForm((current) => ({
      ...current,
      parcelTypeId: value,
      companyId: '',
      originCollectionPointId: '',
      destinationCollectionPointId: '',
    }));
    setCompanies([]);
    setOriginCollectionPoints([]);
    setDestinationCollectionPoints([]);
  }

  function handleTransportModeChange(value: string) {
    updateField('transportModeId', value);
    setForm((current) => ({
      ...current,
      transportModeId: value,
      companyId: '',
      originCollectionPointId: '',
      destinationCollectionPointId: '',
    }));
    setCompanies([]);
    setOriginCollectionPoints([]);
    setDestinationCollectionPoints([]);
  }

  function handleCompanyChange(value: string) {
    updateField('companyId', value);
    setForm((current) => ({
      ...current,
      companyId: value,
      originCollectionPointId: '',
      destinationCollectionPointId: '',
    }));
    setOriginCollectionPoints([]);
    setDestinationCollectionPoints([]);
  }

  function handleSingleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
  ) {
    setter(event.target.files?.[0] ?? null);
  }

  function validateForm() {
    const nextErrors: ShipmentCreateFormErrors = {};

    if (!form.originCountryId) nextErrors.originCountryId = 'Selectionnez le pays d origine.';
    if (!form.originCityId) nextErrors.originCityId = 'Selectionnez la ville d origine.';
    if (!form.destinationCountryId) nextErrors.destinationCountryId = 'Selectionnez le pays de destination.';
    if (!form.destinationCityId) nextErrors.destinationCityId = 'Selectionnez la ville de destination.';
    if (!form.parcelTypeId) nextErrors.parcelTypeId = 'Selectionnez le type de colis.';
    if (!form.transportModeId) nextErrors.transportModeId = 'Selectionnez le mode de transport.';
    if (!form.companyId) nextErrors.companyId = 'Selectionnez la compagnie.';
    if (!form.originCollectionPointId) nextErrors.originCollectionPointId = 'Selectionnez le point d origine.';
    if (!form.destinationCollectionPointId) {
      nextErrors.destinationCollectionPointId = 'Selectionnez le point de destination.';
    }
    if (!form.senderFullName.trim()) nextErrors.senderFullName = 'Le nom de l expediteur est requis.';
    if (!form.senderWhatsappNumber.trim()) {
      nextErrors.senderWhatsappNumber = 'Le telephone de l expediteur est requis.';
    }
    if (!form.receiverFullName.trim()) nextErrors.receiverFullName = 'Le nom du destinataire est requis.';
    if (!form.receiverWhatsappNumber.trim()) {
      nextErrors.receiverWhatsappNumber = 'Le telephone du destinataire est requis.';
    }

    if (form.weightKg && Number(form.weightKg) < 0) {
      nextErrors.weightKg = 'Le poids doit etre positif.';
    }

    if (form.volumeM3 && Number(form.volumeM3) < 0) {
      nextErrors.volumeM3 = 'Le volume doit etre positif.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!token) {
      setSubmitError('Session expiree');
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payload: ShipmentCreateRequest = {
      companyId: Number(form.companyId),
      transportModeId: Number(form.transportModeId),
      originCountryId: Number(form.originCountryId),
      originCityId: Number(form.originCityId),
      destinationCountryId: Number(form.destinationCountryId),
      destinationCityId: Number(form.destinationCityId),
      originCollectionPointId: Number(form.originCollectionPointId),
      destinationCollectionPointId: Number(form.destinationCollectionPointId),
      parcelTypeId: Number(form.parcelTypeId),
      priority: form.priority,
      description: normalizeOptionalString(form.description),
      promoCode: normalizeOptionalString(form.promoCode),
      weightKg: toOptionalNumber(form.weightKg),
      volumeM3: toOptionalNumber(form.volumeM3),
      senderUsesRegisteredProfile: false,
      sender: {
        fullName: form.senderFullName.trim(),
        whatsappNumber: form.senderWhatsappNumber.trim(),
        address: normalizeOptionalString(form.senderAddress),
        idCardNumber: normalizeOptionalString(form.senderIdCardNumber),
      },
      receiver: {
        fullName: form.receiverFullName.trim(),
        whatsappNumber: form.receiverWhatsappNumber.trim(),
        address: normalizeOptionalString(form.receiverAddress),
        idCardNumber: normalizeOptionalString(form.receiverIdCardNumber),
      },
    };

    setSubmitting(true);
    setSubmitError(null);

    try {
      const shipment = await createShipment(token, {
        data: payload,
        senderFrontIdCard,
        senderBackIdCard,
        parcelPhotos,
      });

      toast({
        title: 'Shipment cree',
        description: `Le shipment ${shipment.reference} a ete cree avec succes.`,
      });
      onCreated(shipment);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Impossible de creer le shipment.';
      setSubmitError(message);
      toast({
        title: 'Creation impossible',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTransportMode = transportModes.find(
    (mode) => String(mode.transportModeId) === form.transportModeId,
  );
  const selectedCompany = companies.find((company) => String(company.companyId) === form.companyId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="w-fit gap-2 px-0 text-muted-foreground hover:text-foreground" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Retour aux shipments
          </Button>
          <div>
            <p className="text-sm font-medium text-primary">Creation shipment</p>
            <h2 className="text-2xl font-bold text-foreground">Nouveau shipment collecteur</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Le backend calcule les modes de transport, compagnies et points compatibles a
              partir du trajet choisi. On evite ainsi les combinaisons invalides des la saisie.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Mobile ready</Badge>
          <Badge variant="outline">Multipart API</Badge>
          <Badge variant="outline">Collector flow</Badge>
        </div>
      </div>

      {metadataError ? (
        <Card className="border-border bg-card">
          <CardContent className="space-y-4 px-6 py-16 text-center">
            <p className="text-sm text-destructive">{metadataError}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onBack}>
                Retour
              </Button>
              <Button onClick={() => window.location.reload()}>Recharger</Button>
            </div>
          </CardContent>
        </Card>
      ) : metadataLoading ? (
        <Card className="border-border bg-card">
          <CardContent className="flex items-center justify-center py-24">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-6">
              <SectionCard
                title="Trajet"
                description="Choisissez l origine et la destination pour recuperer les options disponibles."
                icon={Route}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <SelectField
                    label="Pays d origine"
                    value={form.originCountryId}
                    onChange={(event) => handleCountryChange('originCountryId', event.target.value)}
                    error={errors.originCountryId}
                    placeholder="Selectionner..."
                    options={countries.map((country) => ({
                      value: String(country.countryId),
                      label: country.countryName,
                    }))}
                  />
                  <SelectField
                    label="Ville d origine"
                    value={form.originCityId}
                    onChange={(event) => handleCityChange('originCityId', event.target.value)}
                    error={errors.originCityId}
                    placeholder="Selectionner..."
                    disabled={!form.originCountryId}
                    options={originCities.map((city) => ({
                      value: String(city.cityId),
                      label: city.cityName,
                    }))}
                  />
                  <SelectField
                    label="Pays de destination"
                    value={form.destinationCountryId}
                    onChange={(event) => handleCountryChange('destinationCountryId', event.target.value)}
                    error={errors.destinationCountryId}
                    placeholder="Selectionner..."
                    options={countries.map((country) => ({
                      value: String(country.countryId),
                      label: country.countryName,
                    }))}
                  />
                  <SelectField
                    label="Ville de destination"
                    value={form.destinationCityId}
                    onChange={(event) => handleCityChange('destinationCityId', event.target.value)}
                    error={errors.destinationCityId}
                    placeholder="Selectionner..."
                    disabled={!form.destinationCountryId}
                    options={destinationCities.map((city) => ({
                      value: String(city.cityId),
                      label: city.cityName,
                    }))}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Reseau de livraison"
                description="Le choix du trajet alimente automatiquement le transport, la compagnie et les points."
                icon={Truck}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <SelectField
                    label="Type de colis"
                    value={form.parcelTypeId}
                    onChange={(event) => handleParcelTypeChange(event.target.value)}
                    error={errors.parcelTypeId}
                    placeholder="Selectionner..."
                    options={parcelTypes.map((type) => ({
                      value: String(type.id),
                      label: type.name,
                    }))}
                  />
                  <SelectField
                    label="Priorite"
                    value={form.priority}
                    onChange={(event) => updateField('priority', event.target.value as ShipmentPriority)}
                    options={[
                      { value: 'STANDARD', label: 'Standard' },
                      { value: 'EXPRESS', label: 'Express' },
                    ]}
                  />
                  <SelectField
                    label="Mode de transport"
                    value={form.transportModeId}
                    onChange={(event) => handleTransportModeChange(event.target.value)}
                    error={errors.transportModeId}
                    placeholder={transportModesLoading ? 'Chargement...' : 'Selectionner...'}
                    disabled={!routeReady || transportModesLoading}
                    options={transportModes.map((mode) => ({
                      value: String(mode.transportModeId),
                      label: `${mode.transportModeName} • ${mode.companyCount} compagnie(s)`,
                    }))}
                    hint={transportModesError ?? (!routeReady ? 'Renseignez d abord le trajet.' : undefined)}
                  />
                  <SelectField
                    label="Compagnie"
                    value={form.companyId}
                    onChange={(event) => handleCompanyChange(event.target.value)}
                    error={errors.companyId}
                    placeholder={companiesLoading ? 'Chargement...' : 'Selectionner...'}
                    disabled={!companySearchReady || companiesLoading}
                    options={companies.map((company) => ({
                      value: String(company.companyId),
                      label: `${company.companyName} • ${company.originCollectionPointCount}/${company.destinationCollectionPointCount} points`,
                    }))}
                    hint={
                      companiesError ??
                      (!companySearchReady
                        ? 'Selectionnez le type de colis et le mode de transport.'
                        : undefined)
                    }
                  />
                  <SelectField
                    label="Point de collecte d origine"
                    value={form.originCollectionPointId}
                    onChange={(event) => updateField('originCollectionPointId', event.target.value)}
                    error={errors.originCollectionPointId}
                    placeholder={collectionPointsLoading ? 'Chargement...' : 'Selectionner...'}
                    disabled={!pointSearchReady || collectionPointsLoading}
                    options={originCollectionPoints.map((point) => ({
                      value: String(point.id),
                      label: buildCollectionPointLabel(point),
                    }))}
                    hint={collectionPointsError ?? undefined}
                  />
                  <SelectField
                    label="Point de collecte de destination"
                    value={form.destinationCollectionPointId}
                    onChange={(event) => updateField('destinationCollectionPointId', event.target.value)}
                    error={errors.destinationCollectionPointId}
                    placeholder={collectionPointsLoading ? 'Chargement...' : 'Selectionner...'}
                    disabled={!pointSearchReady || collectionPointsLoading}
                    options={destinationCollectionPoints.map((point) => ({
                      value: String(point.id),
                      label: buildCollectionPointLabel(point),
                    }))}
                  />
                </div>
              </SectionCard>

              <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard
                  title="Expediteur"
                  description="Identite et contact de la personne qui depose le colis."
                  icon={UserRound}
                >
                  <div className="space-y-4">
                    <InputField
                      label="Nom complet"
                      value={form.senderFullName}
                      onChange={(event) => updateField('senderFullName', event.target.value)}
                      error={errors.senderFullName}
                      placeholder="Jean Expediteur"
                    />
                    <InputField
                      label="Telephone / WhatsApp"
                      value={form.senderWhatsappNumber}
                      onChange={(event) => updateField('senderWhatsappNumber', event.target.value)}
                      error={errors.senderWhatsappNumber}
                      placeholder="237690000111"
                    />
                    <InputField
                      label="Numero de piece"
                      value={form.senderIdCardNumber}
                      onChange={(event) => updateField('senderIdCardNumber', event.target.value)}
                      placeholder="CMR-123456"
                    />
                    <TextAreaField
                      label="Adresse"
                      value={form.senderAddress}
                      onChange={(event) => updateField('senderAddress', event.target.value)}
                      placeholder="Akwa, Douala"
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Destinataire"
                  description="Identite et contact de la personne qui recuperera le colis."
                  icon={MapPinned}
                >
                  <div className="space-y-4">
                    <InputField
                      label="Nom complet"
                      value={form.receiverFullName}
                      onChange={(event) => updateField('receiverFullName', event.target.value)}
                      error={errors.receiverFullName}
                      placeholder="Marie Receptrice"
                    />
                    <InputField
                      label="Telephone / WhatsApp"
                      value={form.receiverWhatsappNumber}
                      onChange={(event) => updateField('receiverWhatsappNumber', event.target.value)}
                      error={errors.receiverWhatsappNumber}
                      placeholder="237690000222"
                    />
                    <InputField
                      label="Numero de piece"
                      value={form.receiverIdCardNumber}
                      onChange={(event) => updateField('receiverIdCardNumber', event.target.value)}
                      placeholder="CNI-778899"
                    />
                    <TextAreaField
                      label="Adresse"
                      value={form.receiverAddress}
                      onChange={(event) => updateField('receiverAddress', event.target.value)}
                      placeholder="Messassi, Yaounde"
                    />
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                title="Colis et justificatifs"
                description="Caracteristiques du colis et pieces jointes a transmettre a l API."
                icon={Package}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <InputField
                    label="Poids (kg)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.weightKg}
                    onChange={(event) => updateField('weightKg', event.target.value)}
                    error={errors.weightKg}
                    placeholder="5.50"
                  />
                  <InputField
                    label="Volume (m3)"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.volumeM3}
                    onChange={(event) => updateField('volumeM3', event.target.value)}
                    error={errors.volumeM3}
                    placeholder="0.250"
                  />
                  <InputField
                    label="Code promo"
                    value={form.promoCode}
                    onChange={(event) => updateField('promoCode', event.target.value)}
                    placeholder="PROMO2026"
                  />
                  <div className="lg:col-span-2">
                    <TextAreaField
                      label="Description"
                      value={form.description}
                      onChange={(event) => updateField('description', event.target.value)}
                      placeholder="Description du contenu, fragilite, consignes..."
                    />
                  </div>
                  <div className="lg:col-span-2 grid gap-4 lg:grid-cols-3">
                    <FileField
                      label="Recto piece expediteur"
                      accept="image/*"
                      onChange={(event) => handleSingleFileChange(event, setSenderFrontIdCard)}
                      fileName={senderFrontIdCard?.name}
                    />
                    <FileField
                      label="Verso piece expediteur"
                      accept="image/*"
                      onChange={(event) => handleSingleFileChange(event, setSenderBackIdCard)}
                      fileName={senderBackIdCard?.name}
                    />
                    <FileField
                      label="Photos du colis"
                      accept="image/*"
                      multiple
                      onChange={(event) => setParcelPhotos(Array.from(event.target.files ?? []))}
                      fileName={
                        parcelPhotos.length > 0
                          ? `${parcelPhotos.length} photo(s) selectionnee(s)`
                          : undefined
                      }
                    />
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <Card className="border-border bg-card xl:sticky xl:top-6">
                <CardHeader>
                  <CardTitle className="text-lg">Resume de creation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SummaryLine
                    icon={Route}
                    label="Trajet"
                    value={
                      routeReady
                        ? `${getCityName(cities, form.originCityId)} -> ${getCityName(cities, form.destinationCityId)}`
                        : 'Trajet en attente'
                    }
                  />
                  <SummaryLine
                    icon={Truck}
                    label="Transport"
                    value={selectedTransportMode?.transportModeName || 'Non selectionne'}
                  />
                  <SummaryLine
                    icon={Building2}
                    label="Compagnie"
                    value={selectedCompany?.companyName || 'Non selectionnee'}
                  />
                  <SummaryLine
                    icon={ShieldCheck}
                    label="Priorite"
                    value={form.priority === 'EXPRESS' ? 'Express' : 'Standard'}
                  />
                  <SummaryLine
                    icon={FileImage}
                    label="Fichiers"
                    value={[
                      senderFrontIdCard ? 'recto' : null,
                      senderBackIdCard ? 'verso' : null,
                      parcelPhotos.length > 0 ? `${parcelPhotos.length} photo(s)` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ') || 'Aucun fichier'}
                  />

                  {submitError && (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                      {submitError}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting}>
                      <Package className="h-4 w-4" />
                      {submitting ? 'Creation en cours...' : 'Creer le shipment'}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={onBack} disabled={submitting}>
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FieldShell({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selectionner...',
  error,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'border-input bg-background ring-offset-background focus-visible:ring-ring/50 flex h-11 w-full rounded-md border px-3 text-sm text-foreground outline-none transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-[3px]',
          error && 'border-destructive',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function InputField({
  label,
  error,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; error?: string; hint?: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      <Input {...props} className={cn(error && 'border-destructive', props.className)} />
    </FieldShell>
  );
}

function TextAreaField({
  label,
  error,
  hint,
  ...props
}: React.ComponentProps<typeof Textarea> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      <Textarea {...props} className={cn(error && 'border-destructive', props.className)} />
    </FieldShell>
  );
}

function FileField({
  label,
  fileName,
  ...props
}: React.ComponentProps<'input'> & { label: string; fileName?: string }) {
  return (
    <FieldShell label={label} hint={fileName}>
      <input
        type="file"
        {...props}
        className="border-input bg-background file:bg-secondary file:text-secondary-foreground h-11 w-full rounded-md border text-sm text-foreground file:mr-3 file:h-full file:border-0 file:px-3"
      />
    </FieldShell>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function getCityName(cities: CityResponse[], cityId: string) {
  return cities.find((city) => String(city.cityId) === cityId)?.cityName || 'Ville';
}

function buildCollectionPointLabel(point: ShipmentCollectionPointOption) {
  return [point.name, point.cityName, point.countryName].filter(Boolean).join(' • ');
}

function normalizeOptionalString(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
