'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileImage,
  MapPinned,
  Package,
  ReceiptText,
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
import { getCities, getCompanyPricingBySelection, getParcelTypes } from '@/lib/company/api';
import type { CityResponse, ParcelTypeResponse, PricingCriterion } from '@/lib/company/types';
import { useAuthStore } from '@/lib/auth/store';
import { ApiError } from '@/lib/api-client';
import { getPaymentModes, getPromoCodes, getShipmentFees } from '@/lib/platform-finance/api';
import type {
  PaymentModeResponse,
  PromoCodeResponse,
  ShipmentFeeResponse,
} from '@/lib/platform-finance/types';
import {
  createShipment,
  getShipmentCollectionPointOptions,
  searchShipmentCompanies,
  searchShipmentTransportModes,
  simulateShipmentPrice,
} from '@/lib/shipments/api';
import type {
  CreateShipmentInput,
  Shipment,
  ShipmentAvailableCompany,
  ShipmentAvailableTransportMode,
  ShipmentCollectionPointOption,
  ShipmentCreateRequest,
  ShipmentPriceSimulationResponse,
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
  const [shipmentFees, setShipmentFees] = useState<ShipmentFeeResponse[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCodeResponse[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeResponse[]>([]);

  const [metadataLoading, setMetadataLoading] = useState(true);
  const [transportModesLoading, setTransportModesLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [collectionPointsLoading, setCollectionPointsLoading] = useState(false);
  const [dimensionRequirementsLoading, setDimensionRequirementsLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [transportModesError, setTransportModesError] = useState<string | null>(null);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [collectionPointsError, setCollectionPointsError] = useState<string | null>(null);
  const [dimensionRequirementsError, setDimensionRequirementsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [senderFrontIdCard, setSenderFrontIdCard] = useState<File | null>(null);
  const [senderBackIdCard, setSenderBackIdCard] = useState<File | null>(null);
  const [parcelPhotos, setParcelPhotos] = useState<File[]>([]);
  const [priceSimulation, setPriceSimulation] =
    useState<ShipmentPriceSimulationResponse | null>(null);
  const [pendingShipmentInput, setPendingShipmentInput] =
    useState<CreateShipmentInput | null>(null);
  const [dimensionCriteria, setDimensionCriteria] = useState<PricingCriterion[] | null>(null);

  const originCities = useMemo(
    () => cities.filter((city) => String(city.countryId) === form.originCountryId),
    [cities, form.originCountryId],
  );
  const destinationCities = useMemo(
    () => cities.filter((city) => String(city.countryId) === form.destinationCountryId),
    [cities, form.destinationCountryId],
  );
  const selectedParcelType = useMemo(
    () => parcelTypes.find((type) => getParcelTypeId(type) === form.parcelTypeId),
    [form.parcelTypeId, parcelTypes],
  );
  const selectedShipmentFee = useMemo(
    () =>
      shipmentFees.find(
        (fee) => fee.active !== false && String(fee.originCountryId) === form.originCountryId,
      ) ?? null,
    [form.originCountryId, shipmentFees],
  );
  const activePromoCodes = useMemo(
    () =>
      promoCodes.filter((promo) => {
        if (promo.active === false) return false;
        if (!promo.expiresAt) return true;
        return new Date(promo.expiresAt).getTime() > Date.now();
      }),
    [promoCodes],
  );
  const activePaymentModes = useMemo(
    () => paymentModes.filter((mode) => mode.active !== false),
    [paymentModes],
  );
  const isEnvelopeParcel = selectedParcelType ? isEnvelopeParcelType(selectedParcelType) : false;
  const weightRequired = !isEnvelopeParcel && dimensionCriteria?.includes('WEIGHT') === true;
  const volumeRequired = !isEnvelopeParcel && dimensionCriteria?.includes('VOLUME') === true;
  const dimensionsOptional =
    !isEnvelopeParcel &&
    dimensionCriteria != null &&
    !dimensionCriteria.includes('WEIGHT') &&
    !dimensionCriteria.includes('VOLUME');

  const routeReady = Boolean(
    form.originCountryId &&
      form.originCityId &&
      form.destinationCountryId &&
      form.destinationCityId,
  );
  const companySearchReady = Boolean(routeReady && form.transportModeId && form.parcelTypeId);
  const pointSearchReady = Boolean(companySearchReady && form.companyId);
  const pricingSelectionReady = Boolean(
    pointSearchReady && form.originCollectionPointId && form.destinationCollectionPointId,
  );

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
        const [
          countriesResponse,
          citiesResponse,
          parcelTypesResponse,
          feesResponse,
          promosResponse,
          paymentsResponse,
        ] = await Promise.all([
          getCountries(),
          getCities(),
          getParcelTypes(token),
          getShipmentFees(token).catch(() => []),
          getPromoCodes(token).catch(() => []),
          getPaymentModes(token).catch(() => []),
        ]);

        if (cancelled) {
          return;
        }

        setCountries(countriesResponse);
        setCities(citiesResponse);
        setParcelTypes(parcelTypesResponse);
        setShipmentFees(feesResponse);
        setPromoCodes(promosResponse);
        setPaymentModes(paymentsResponse);
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

  useEffect(() => {
    if (!isEnvelopeParcel) {
      return;
    }

    setForm((current) =>
      current.weightKg || current.volumeM3
        ? {
            ...current,
            weightKg: '',
            volumeM3: '',
          }
        : current,
    );
    setErrors((current) => {
      if (!current.weightKg && !current.volumeM3) {
        return current;
      }

      const next = { ...current };
      delete next.weightKg;
      delete next.volumeM3;
      return next;
    });
  }, [isEnvelopeParcel]);

  useEffect(() => {
    if (!token || !pricingSelectionReady || isEnvelopeParcel) {
      setDimensionCriteria(null);
      setDimensionRequirementsError(null);
      setDimensionRequirementsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDimensionRequirements() {
      setDimensionRequirementsLoading(true);
      setDimensionRequirementsError(null);

      try {
        const pricing = await getCompanyPricingBySelection(
          token,
          Number(form.companyId),
          Number(form.transportModeId),
          Number(form.originCollectionPointId),
          Number(form.destinationCollectionPointId),
          Number(form.parcelTypeId),
        );

        if (cancelled) {
          return;
        }

        setDimensionCriteria(pricing.selectedCriteria);
      } catch (error) {
        if (!cancelled) {
          setDimensionCriteria(null);
          setDimensionRequirementsError(
            error instanceof ApiError
              ? error.message
              : 'Impossible de charger les criteres de tarification.',
          );
        }
      } finally {
        if (!cancelled) {
          setDimensionRequirementsLoading(false);
        }
      }
    }

    void loadDimensionRequirements();

    return () => {
      cancelled = true;
    };
  }, [
    form.companyId,
    form.destinationCollectionPointId,
    form.originCollectionPointId,
    form.parcelTypeId,
    form.transportModeId,
    isEnvelopeParcel,
    pricingSelectionReady,
    token,
  ]);

  function updateField<Key extends keyof ShipmentCreateFormState>(
    field: Key,
    value: ShipmentCreateFormState[Key],
  ) {
    if (isEnvelopeParcel && (field === 'weightKg' || field === 'volumeM3')) {
      return;
    }

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
    setPriceSimulation(null);
    setPendingShipmentInput(null);
    if (
      field === 'companyId' ||
      field === 'transportModeId' ||
      field === 'parcelTypeId' ||
      field === 'originCollectionPointId' ||
      field === 'destinationCollectionPointId'
    ) {
      setDimensionCriteria(null);
      setDimensionRequirementsError(null);
    }
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
    const nextParcelType = parcelTypes.find((type) => getParcelTypeId(type) === value);
    const nextIsEnvelopeParcel = nextParcelType ? isEnvelopeParcelType(nextParcelType) : false;

    updateField('parcelTypeId', value);
    setForm((current) => ({
      ...current,
      parcelTypeId: value,
      companyId: '',
      originCollectionPointId: '',
      destinationCollectionPointId: '',
      weightKg: nextIsEnvelopeParcel ? '' : current.weightKg,
      volumeM3: nextIsEnvelopeParcel ? '' : current.volumeM3,
    }));
    setErrors((current) => {
      if (!nextIsEnvelopeParcel || (!current.weightKg && !current.volumeM3)) {
        return current;
      }

      const next = { ...current };
      delete next.weightKg;
      delete next.volumeM3;
      return next;
    });
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
    resetSimulation();
  }

  function resetSimulation() {
    setPriceSimulation(null);
    setPendingShipmentInput(null);
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

    if (!isEnvelopeParcel && dimensionRequirementsLoading) {
      nextErrors.weightKg = 'Patientez pendant le chargement de la tarification.';
    }

    if (weightRequired && !form.weightKg.trim()) {
      nextErrors.weightKg = 'Le poids est requis par la tarification.';
    }

    if (volumeRequired && !form.volumeM3.trim()) {
      nextErrors.volumeM3 = 'Le volume est requis par la tarification.';
    }

    if (!isEnvelopeParcel && form.weightKg) {
      const weight = Number(form.weightKg);
      if (!Number.isFinite(weight) || weight < 0) {
        nextErrors.weightKg = 'Le poids doit etre positif.';
      }
    }

    if (!isEnvelopeParcel && form.volumeM3) {
      const volume = Number(form.volumeM3);
      if (!Number.isFinite(volume) || volume < 0) {
        nextErrors.volumeM3 = 'Le volume doit etre positif.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildShipmentCreatePayload(): ShipmentCreateRequest {
    return {
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
      ...(isEnvelopeParcel
        ? {}
        : {
            weightKg: toOptionalNumber(form.weightKg),
            volumeM3: toOptionalNumber(form.volumeM3),
          }),
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
  }

  async function handleSimulatePrice() {
    if (!token) {
      setSubmitError('Session expiree');
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payload = buildShipmentCreatePayload();
    const shipmentInput: CreateShipmentInput = {
      data: payload,
      senderFrontIdCard,
      senderBackIdCard,
      parcelPhotos,
    };

    setSimulating(true);
    setSubmitError(null);
    setPriceSimulation(null);
    setPendingShipmentInput(null);

    try {
      const simulation = await simulateShipmentPrice(token, payload);
      setPriceSimulation(simulation);
      setPendingShipmentInput(shipmentInput);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Impossible de simuler le prix du shipment.';
      setSubmitError(message);
      toast({
        title: 'Simulation impossible',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSimulating(false);
    }
  }

  async function handleConfirmCreate() {
    if (!token) {
      setSubmitError('Session expiree');
      return;
    }

    if (!pendingShipmentInput) {
      setSubmitError('Relancez la simulation avant de creer le shipment.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const shipment = await createShipment(token, pendingShipmentInput);

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

  function closeSimulationDialog() {
    if (submitting) {
      return;
    }

    setPriceSimulation(null);
    setPendingShipmentInput(null);
  }

  const selectedTransportMode = transportModes.find(
    (mode) => String(mode.transportModeId) === form.transportModeId,
  );
  const selectedCompany = companies.find((company) => String(company.companyId) === form.companyId);
  const dimensionHint =
    dimensionRequirementsError ??
    (dimensionRequirementsLoading
      ? 'Chargement des criteres de tarification...'
      : dimensionsOptional
        ? 'Facultatif selon la tarification configuree.'
        : undefined);
  const weightHint = isEnvelopeParcel
    ? 'Non applicable pour une enveloppe.'
    : weightRequired
      ? 'Requis par la tarification au poids.'
      : dimensionHint;
  const volumeHint = isEnvelopeParcel
    ? 'Non applicable pour une enveloppe.'
    : volumeRequired
      ? 'Requis par la tarification au volume.'
      : dimensionHint;

  return (
    <div className="space-y-6">
      <PriceSimulationDialog
        data={priceSimulation}
        loading={submitting}
        onClose={closeSimulationDialog}
        onConfirm={() => void handleConfirmCreate()}
      />

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
                      value: getParcelTypeId(type),
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
                    label={weightRequired ? 'Poids (kg) *' : 'Poids (kg)'}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.weightKg}
                    onChange={(event) => {
                      if (!isEnvelopeParcel) updateField('weightKg', event.target.value);
                    }}
                    error={errors.weightKg}
                    hint={weightHint}
                    disabled={isEnvelopeParcel}
                    readOnly={isEnvelopeParcel}
                    placeholder={isEnvelopeParcel ? 'Non applicable' : '5.50'}
                  />
                  <InputField
                    label={volumeRequired ? 'Volume (m3) *' : 'Volume (m3)'}
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.volumeM3}
                    onChange={(event) => {
                      if (!isEnvelopeParcel) updateField('volumeM3', event.target.value);
                    }}
                    error={errors.volumeM3}
                    hint={volumeHint}
                    disabled={isEnvelopeParcel}
                    readOnly={isEnvelopeParcel}
                    placeholder={isEnvelopeParcel ? 'Non applicable' : '0.250'}
                  />
                  <InputField
                    label="Code promo"
                    list="active-promo-codes"
                    value={form.promoCode}
                    onChange={(event) => updateField('promoCode', event.target.value)}
                    placeholder={activePromoCodes[0]?.code ?? 'PROMO2026'}
                  />
                  <datalist id="active-promo-codes">
                    {activePromoCodes.map((promo) => (
                      <option key={promo.id} value={promo.code}>
                        {promo.description ?? promo.code}
                      </option>
                    ))}
                  </datalist>
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
                      onChange={(event) => {
                        setParcelPhotos(Array.from(event.target.files ?? []));
                        resetSimulation();
                      }}
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
                    icon={ReceiptText}
                    label="Frais plateforme"
                    value={
                      selectedShipmentFee
                        ? formatMoney(selectedShipmentFee.amount)
                        : form.originCountryId
                          ? 'Aucun frais actif'
                          : 'Pays origine requis'
                    }
                  />
                  <SummaryLine
                    icon={CreditCard}
                    label="Paiements"
                    value={
                      activePaymentModes.length > 0
                        ? activePaymentModes.map((mode) => mode.name).join(', ')
                        : 'Aucun mode actif'
                    }
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
                    <Button
                      className="w-full gap-2"
                      onClick={() => void handleSimulatePrice()}
                      disabled={simulating || submitting}
                    >
                      {simulating ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ReceiptText className="h-4 w-4" />
                      )}
                      {simulating ? 'Simulation en cours...' : 'Simuler le prix'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={onBack}
                      disabled={simulating || submitting}
                    >
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

function PriceSimulationDialog({
  data,
  loading,
  onClose,
  onConfirm,
}: {
  data: ShipmentPriceSimulationResponse | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Simulation tarifaire</p>
              <h3 className="text-xl font-semibold text-foreground">Prix potentiel du shipment</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Verifiez le montant calcule avant de confirmer la creation.
              </p>
            </div>
            <Badge variant={data.promoCodeApplied ? 'default' : 'outline'}>
              {data.promoCodeApplied ? 'Promo appliquee' : 'Sans promo'}
            </Badge>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-5">
            <p className="text-sm text-muted-foreground">Total a payer</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {formatMoney(data.totalToPay)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Paiement attendu : {formatPaymentStatus(data.expectedPaymentStatus)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SimulationLine label="Prix compagnie" value={formatMoney(data.totalCompanyPrice)} />
            <SimulationLine label="Frais plateforme" value={formatMoney(data.feeAmount)} />
            <SimulationLine label="Assurance" value={formatMoney(data.insuranceAmount)} />
            <SimulationLine label="Avant remise" value={formatMoney(data.totalBeforeDiscount)} />
            <SimulationLine label="Remise" value={formatMoney(data.discountAmount)} />
            <SimulationLine label="Base compagnie" value={formatMoney(data.baseCompanyPrice)} />
            <SimulationLine label="Surcout express" value={formatMoney(data.expressSurchargeAmount)} />
            <SimulationLine label="Total final" value={formatMoney(data.totalToPay)} emphasis />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SimulationLine label="Compagnie" value={data.companyName ?? 'Non renseignee'} />
            <SimulationLine label="Transport" value={data.transportModeName ?? 'Non renseigne'} />
            <SimulationLine label="Type de colis" value={data.parcelTypeName ?? 'Non renseigne'} />
            <SimulationLine label="Priorite" value={formatSimulationPriority(data.priority)} />
            <SimulationLine
              label="Paiement"
              value={formatPaymentCollectionMode(data.paymentCollectionMode)}
            />
            <SimulationLine
              label="Code promo"
              value={
                data.promoCode
                  ? `${data.promoCode} (${data.promoCodeApplied ? 'applique' : 'non applique'})`
                  : 'Aucun'
              }
            />
            <SimulationLine
              label="Origine"
              value={data.originCollectionPoint?.name ?? data.originCityName ?? 'Non renseignee'}
            />
            <SimulationLine
              label="Destination"
              value={data.destinationCollectionPoint?.name ?? data.destinationCityName ?? 'Non renseignee'}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Modifier
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="gap-2">
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            {loading ? 'Creation en cours...' : 'Confirmer et creer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SimulationLine({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-secondary/20 px-4 py-3',
        emphasis && 'border-primary/40 bg-primary/10',
      )}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function getCityName(cities: CityResponse[], cityId: string) {
  return cities.find((city) => String(city.cityId) === cityId)?.cityName || 'Ville';
}

function buildCollectionPointLabel(point: ShipmentCollectionPointOption) {
  return [point.name, point.cityName, point.countryName].filter(Boolean).join(' - ');
}

function getParcelTypeId(parcelType: ParcelTypeResponse) {
  return String(parcelType.id);
}

function isEnvelopeParcelType(parcelType: ParcelTypeResponse) {
  const normalizedName = normalizeCatalogName(parcelType.name);
  return [
    'enveloppe',
    'envelope',
    'courrier',
    'letter',
    'document',
  ].some((keyword) => normalizedName.includes(keyword));
}

function normalizeCatalogName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function formatMoney(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPaymentStatus(status?: string) {
  switch (status) {
    case 'PAID':
      return 'paye';
    case 'PAYMENT_AT_COLLECTION_POINT':
      return 'paiement au point de collecte';
    case 'UNPAID':
      return 'non paye';
    default:
      return 'non renseigne';
  }
}

function formatPaymentCollectionMode(mode?: string) {
  switch (mode) {
    case 'PLATFORM':
      return 'Plateforme';
    case 'COLLECTION_POINT':
      return 'Point de collecte';
    default:
      return 'Non renseigne';
  }
}

function formatSimulationPriority(priority?: ShipmentPriority) {
  switch (priority) {
    case 'EXPRESS':
      return 'Express';
    case 'STANDARD':
      return 'Standard';
    default:
      return 'Non renseignee';
  }
}
