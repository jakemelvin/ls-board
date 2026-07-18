'use client';

import {
  type ChangeEvent,
  type ElementType,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleUserRound,
  FileImage,
  MapPin,
  Package,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  getOperationalServedCountries,
  searchUsers,
} from '@/lib/auth/api';
import { useAuthStore } from '@/lib/auth/store';
import type { CountryResponse, UserSearchResponse } from '@/lib/auth/types';
import { ApiError } from '@/lib/api-client';
import {
  getCompanyPricingBySelection,
  getOperationalServedCitiesByCountry,
  getParcelTypes,
} from '@/lib/company/api';
import type { CityResponse, ParcelTypeResponse, PricingCriterion } from '@/lib/company/types';
import { useTranslation } from '@/lib/i18n';
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
import { useCurrency } from '@/lib/currency';

const MAX_PARCEL_PHOTOS = 4;
const STEP_KEYS = ['route', 'service', 'parcel', 'people', 'review'] as const;
type StepKey = (typeof STEP_KEYS)[number];

type ShipmentCreateFormState = {
  originCountryId: string;
  originCityId: string;
  destinationCountryId: string;
  destinationCityId: string;
  transportModeId: string;
  companyId: string;
  parcelTypeId: string;
  priority: ShipmentPriority;
  originCollectionPointId: string;
  destinationCollectionPointId: string;
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

type FormErrorKey = keyof ShipmentCreateFormState | 'receiverUser' | 'parcelPhotos';
type ShipmentCreateFormErrors = Partial<Record<FormErrorKey, string>>;
type ReceiverMode = 'MANUAL' | 'PLATFORM';

interface ShipmentCreateViewProps {
  onBack: () => void;
  onCreated: (shipment: Shipment) => void;
}

const DEFAULT_FORM: ShipmentCreateFormState = {
  originCountryId: '',
  originCityId: '',
  destinationCountryId: '',
  destinationCityId: '',
  transportModeId: '',
  companyId: '',
  parcelTypeId: '',
  priority: 'STANDARD',
  originCollectionPointId: '',
  destinationCollectionPointId: '',
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
  const { t } = useTranslation('shipment-create');
  const token = useAuthStore((state) => state.token);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<ShipmentCreateFormErrors>({});
  const [activeStep, setActiveStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);

  const [countries, setCountries] = useState<CountryResponse[]>([]);
  const [originCities, setOriginCities] = useState<CityResponse[]>([]);
  const [destinationCities, setDestinationCities] = useState<CityResponse[]>([]);
  const [parcelTypes, setParcelTypes] = useState<ParcelTypeResponse[]>([]);
  const [transportModes, setTransportModes] = useState<ShipmentAvailableTransportMode[]>([]);
  const [companies, setCompanies] = useState<ShipmentAvailableCompany[]>([]);
  const [originPoints, setOriginPoints] = useState<ShipmentCollectionPointOption[]>([]);
  const [destinationPoints, setDestinationPoints] = useState<ShipmentCollectionPointOption[]>([]);
  const [dimensionCriteria, setDimensionCriteria] = useState<PricingCriterion[] | null>(null);

  const [metadataLoading, setMetadataLoading] = useState(true);
  const [originCitiesLoading, setOriginCitiesLoading] = useState(false);
  const [destinationCitiesLoading, setDestinationCitiesLoading] = useState(false);
  const [transportModesLoading, setTransportModesLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [metadataReload, setMetadataReload] = useState(0);

  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [originCitiesError, setOriginCitiesError] = useState<string | null>(null);
  const [destinationCitiesError, setDestinationCitiesError] = useState<string | null>(null);
  const [transportModesError, setTransportModesError] = useState<string | null>(null);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [senderFrontIdCard, setSenderFrontIdCard] = useState<File | null>(null);
  const [senderBackIdCard, setSenderBackIdCard] = useState<File | null>(null);
  const [parcelPhotos, setParcelPhotos] = useState<File[]>([]);
  const [priceSimulation, setPriceSimulation] = useState<ShipmentPriceSimulationResponse | null>(null);
  const [pendingShipmentInput, setPendingShipmentInput] = useState<CreateShipmentInput | null>(null);

  const [receiverMode, setReceiverMode] = useState<ReceiverMode>('MANUAL');
  const [receiverQuery, setReceiverQuery] = useState('');
  const [receiverResults, setReceiverResults] = useState<UserSearchResponse[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<UserSearchResponse | null>(null);
  const [receiverSearching, setReceiverSearching] = useState(false);
  const [receiverSearchError, setReceiverSearchError] = useState<string | null>(null);

  const routeReady = Boolean(
    form.originCountryId && form.originCityId && form.destinationCountryId && form.destinationCityId,
  );
  const serviceReady = Boolean(routeReady && form.transportModeId && form.companyId);
  const pointsReady = Boolean(serviceReady && form.parcelTypeId);
  const pricingSelectionReady = Boolean(
    pointsReady && form.originCollectionPointId && form.destinationCollectionPointId,
  );

  const selectedTransportMode = transportModes.find(
    (mode) => String(mode.transportModeId) === form.transportModeId,
  );
  const selectedCompany = companies.find(
    (company) => String(company.companyId) === form.companyId,
  );
  const eligibleParcelTypes = useMemo(
    () => getEligibleParcelTypes(selectedCompany, parcelTypes),
    [parcelTypes, selectedCompany],
  );
  const selectedParcelType = eligibleParcelTypes.find(
    (parcelType) => String(parcelType.id) === form.parcelTypeId,
  );
  const isEnvelopeParcel = selectedParcelType ? isEnvelopeParcelType(selectedParcelType) : false;
  const weightRequired = !isEnvelopeParcel && dimensionCriteria?.includes('WEIGHT') === true;
  const volumeRequired = !isEnvelopeParcel && dimensionCriteria?.includes('VOLUME') === true;

  useEffect(() => {
    if (!token) {
      setMetadataError(t('common.sessionExpired'));
      setMetadataLoading(false);
      return;
    }

    let cancelled = false;
    setMetadataLoading(true);
    setMetadataError(null);

    Promise.all([getOperationalServedCountries(), getParcelTypes(token)])
      .then(([countryResponse, parcelTypeResponse]) => {
        if (cancelled) return;
        setCountries(countryResponse);
        setParcelTypes(parcelTypeResponse);
      })
      .catch((error) => {
        if (cancelled) return;
        setMetadataError(apiMessage(error, t('errors.metadata')));
      })
      .finally(() => {
        if (!cancelled) setMetadataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [metadataReload, t, token]);

  useEffect(() => {
    if (!form.originCountryId) {
      setOriginCities([]);
      setOriginCitiesError(null);
      return;
    }

    let cancelled = false;
    setOriginCitiesLoading(true);
    setOriginCitiesError(null);
    getOperationalServedCitiesByCountry(Number(form.originCountryId))
      .then((response) => {
        if (!cancelled) setOriginCities(response);
      })
      .catch((error) => {
        if (cancelled) return;
        setOriginCities([]);
        setOriginCitiesError(apiMessage(error, t('errors.cities')));
      })
      .finally(() => {
        if (!cancelled) setOriginCitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.originCountryId, t]);

  useEffect(() => {
    if (!form.destinationCountryId) {
      setDestinationCities([]);
      setDestinationCitiesError(null);
      return;
    }

    let cancelled = false;
    setDestinationCitiesLoading(true);
    setDestinationCitiesError(null);
    getOperationalServedCitiesByCountry(Number(form.destinationCountryId))
      .then((response) => {
        if (!cancelled) setDestinationCities(response);
      })
      .catch((error) => {
        if (cancelled) return;
        setDestinationCities([]);
        setDestinationCitiesError(apiMessage(error, t('errors.cities')));
      })
      .finally(() => {
        if (!cancelled) setDestinationCitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.destinationCountryId, t]);

  useEffect(() => {
    if (!token || !routeReady) {
      setTransportModes([]);
      setTransportModesError(null);
      return;
    }

    let cancelled = false;
    setTransportModesLoading(true);
    setTransportModesError(null);
    searchShipmentTransportModes(token, {
      originCountryId: Number(form.originCountryId),
      originCityId: Number(form.originCityId),
      destinationCountryId: Number(form.destinationCountryId),
      destinationCityId: Number(form.destinationCityId),
    })
      .then((response) => {
        if (cancelled) return;
        setTransportModes(response);
        setForm((current) =>
          response.some((mode) => String(mode.transportModeId) === current.transportModeId)
            ? current
            : clearAfterRoute(current),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setTransportModes([]);
        setTransportModesError(apiMessage(error, t('errors.transportModes')));
      })
      .finally(() => {
        if (!cancelled) setTransportModesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.destinationCityId, form.destinationCountryId, form.originCityId, form.originCountryId, routeReady, t, token]);

  useEffect(() => {
    if (!token || !routeReady || !form.transportModeId) {
      setCompanies([]);
      setCompaniesError(null);
      return;
    }

    let cancelled = false;
    setCompaniesLoading(true);
    setCompaniesError(null);
    searchShipmentCompanies(token, {
      originCountryId: Number(form.originCountryId),
      originCityId: Number(form.originCityId),
      destinationCountryId: Number(form.destinationCountryId),
      destinationCityId: Number(form.destinationCityId),
      transportModeId: Number(form.transportModeId),
    })
      .then((response) => {
        if (cancelled) return;
        setCompanies(response);
        setForm((current) =>
          response.some((company) => String(company.companyId) === current.companyId)
            ? current
            : clearAfterTransport(current),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setCompanies([]);
        setCompaniesError(apiMessage(error, t('errors.companies')));
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.destinationCityId, form.destinationCountryId, form.originCityId, form.originCountryId, form.transportModeId, routeReady, t, token]);

  useEffect(() => {
    if (!token || !pointsReady) {
      setOriginPoints([]);
      setDestinationPoints([]);
      setPointsError(null);
      return;
    }

    let cancelled = false;
    setPointsLoading(true);
    setPointsError(null);
    getShipmentCollectionPointOptions(token, {
      originCountryId: Number(form.originCountryId),
      originCityId: Number(form.originCityId),
      destinationCountryId: Number(form.destinationCountryId),
      destinationCityId: Number(form.destinationCityId),
      companyId: Number(form.companyId),
      transportModeId: Number(form.transportModeId),
      parcelTypeId: Number(form.parcelTypeId),
    })
      .then((response) => {
        if (cancelled) return;
        setOriginPoints(response.originCollectionPoints ?? []);
        setDestinationPoints(response.destinationCollectionPoints ?? []);
        setForm((current) => ({
          ...current,
          originCollectionPointId: response.originCollectionPoints?.some(
            (point) => String(point.id) === current.originCollectionPointId,
          )
            ? current.originCollectionPointId
            : '',
          destinationCollectionPointId: response.destinationCollectionPoints?.some(
            (point) => String(point.id) === current.destinationCollectionPointId,
          )
            ? current.destinationCollectionPointId
            : '',
        }));
      })
      .catch((error) => {
        if (cancelled) return;
        setOriginPoints([]);
        setDestinationPoints([]);
        setPointsError(apiMessage(error, t('errors.points')));
      })
      .finally(() => {
        if (!cancelled) setPointsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.companyId, form.destinationCityId, form.destinationCountryId, form.originCityId, form.originCountryId, form.parcelTypeId, form.transportModeId, pointsReady, t, token]);

  useEffect(() => {
    if (!token || !pricingSelectionReady || isEnvelopeParcel) {
      setDimensionCriteria(null);
      setPricingError(null);
      setPricingLoading(false);
      return;
    }

    let cancelled = false;
    setPricingLoading(true);
    setPricingError(null);
    getCompanyPricingBySelection(
      token,
      Number(form.companyId),
      Number(form.transportModeId),
      Number(form.originCollectionPointId),
      Number(form.destinationCollectionPointId),
      Number(form.parcelTypeId),
    )
      .then((response) => {
        if (!cancelled) setDimensionCriteria(response.selectedCriteria);
      })
      .catch((error) => {
        if (cancelled) return;
        setDimensionCriteria(null);
        setPricingError(apiMessage(error, t('errors.pricing')));
      })
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.companyId, form.destinationCollectionPointId, form.originCollectionPointId, form.parcelTypeId, form.transportModeId, isEnvelopeParcel, pricingSelectionReady, t, token]);

  useEffect(() => {
    if (receiverMode !== 'PLATFORM' || selectedReceiver || receiverQuery.trim().length < 3 || !token) {
      setReceiverResults([]);
      setReceiverSearching(false);
      setReceiverSearchError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const query = receiverQuery.trim();
      const isPhone = /^\+?[\d\s()-]+$/.test(query);
      setReceiverSearching(true);
      setReceiverSearchError(null);
      searchUsers(token, isPhone ? { phone: query.replace(/[^\d+]/g, '') } : { username: query.replace(/^@/, '') })
        .then((response) => {
          if (!cancelled) setReceiverResults(response.filter((user) => !user.status || user.status === 'ACTIVE'));
        })
        .catch((error) => {
          if (cancelled) return;
          setReceiverResults([]);
          setReceiverSearchError(apiMessage(error, t('errors.userSearch')));
        })
        .finally(() => {
          if (!cancelled) setReceiverSearching(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [receiverMode, receiverQuery, selectedReceiver, t, token]);

  function invalidateSimulation() {
    setPriceSimulation(null);
    setPendingShipmentInput(null);
    setSubmitError(null);
  }

  function updateField<Key extends keyof ShipmentCreateFormState>(
    field: Key,
    value: ShipmentCreateFormState[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    clearErrors(field);
    invalidateSimulation();
  }

  function clearErrors(...fields: FormErrorKey[]) {
    setErrors((current) => {
      if (!fields.some((field) => current[field])) return current;
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });
  }

  function handleCountryChange(field: 'originCountryId' | 'destinationCountryId', value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'originCountryId') next.originCityId = '';
      else next.destinationCityId = '';
      return clearAfterRoute(next);
    });
    clearErrors(field, field === 'originCountryId' ? 'originCityId' : 'destinationCityId');
    setTransportModes([]);
    setCompanies([]);
    setOriginPoints([]);
    setDestinationPoints([]);
    setFurthestStep((current) => Math.min(current, 0));
    invalidateSimulation();
  }

  function handleCityChange(field: 'originCityId' | 'destinationCityId', value: string) {
    setForm((current) => clearAfterRoute({ ...current, [field]: value }));
    clearErrors(field);
    setTransportModes([]);
    setCompanies([]);
    setOriginPoints([]);
    setDestinationPoints([]);
    setFurthestStep((current) => Math.min(current, 0));
    invalidateSimulation();
  }

  function handleTransportChange(value: string) {
    setForm((current) => ({ ...clearAfterTransport(current), transportModeId: value }));
    clearErrors('transportModeId');
    setCompanies([]);
    setOriginPoints([]);
    setDestinationPoints([]);
    setFurthestStep((current) => Math.min(current, 1));
    invalidateSimulation();
  }

  function handleCompanyChange(companyId: string) {
    setForm((current) => ({ ...clearAfterCompany(current), companyId }));
    clearErrors('companyId', 'parcelTypeId', 'originCollectionPointId', 'destinationCollectionPointId');
    setOriginPoints([]);
    setDestinationPoints([]);
    setDimensionCriteria(null);
    setFurthestStep((current) => Math.min(current, 1));
    invalidateSimulation();
  }

  function handleParcelTypeChange(value: string) {
    const parcelType = eligibleParcelTypes.find((item) => String(item.id) === value);
    const envelope = parcelType ? isEnvelopeParcelType(parcelType) : false;
    setForm((current) => ({
      ...current,
      parcelTypeId: value,
      originCollectionPointId: '',
      destinationCollectionPointId: '',
      weightKg: envelope ? '' : current.weightKg,
      volumeM3: envelope ? '' : current.volumeM3,
    }));
    clearErrors('parcelTypeId', 'originCollectionPointId', 'destinationCollectionPointId', 'weightKg', 'volumeM3');
    setOriginPoints([]);
    setDestinationPoints([]);
    setDimensionCriteria(null);
    invalidateSimulation();
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const availableSlots = MAX_PARCEL_PHOTOS - parcelPhotos.length;
    if (selected.length > availableSlots) {
      setErrors((current) => ({ ...current, parcelPhotos: t('errors.photoLimit') }));
      toast({
        title: t('toast.photoLimitTitle'),
        description: t('errors.photoLimit'),
        variant: 'destructive',
      });
    }
    setParcelPhotos((current) => [...current, ...selected.slice(0, availableSlots)]);
    event.target.value = '';
    invalidateSimulation();
  }

  function removePhoto(index: number) {
    setParcelPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
    clearErrors('parcelPhotos');
    invalidateSimulation();
  }

  function selectReceiver(user: UserSearchResponse) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
    setSelectedReceiver(user);
    setReceiverQuery('');
    setReceiverResults([]);
    setForm((current) => ({
      ...current,
      receiverFullName: fullName,
      receiverWhatsappNumber: user.phone ?? '',
      receiverAddress: user.address ?? '',
    }));
    clearErrors('receiverUser', 'receiverFullName', 'receiverWhatsappNumber', 'receiverAddress');
    invalidateSimulation();
  }

  function setReceiverEntryMode(mode: ReceiverMode) {
    setReceiverMode(mode);
    setSelectedReceiver(null);
    setReceiverQuery('');
    setReceiverResults([]);
    setReceiverSearchError(null);
    clearErrors('receiverUser');
    invalidateSimulation();
  }

  function validateStep(step: number) {
    const nextErrors: ShipmentCreateFormErrors = {};
    const required = t('errors.required');

    if (step === 0) {
      if (!form.originCountryId) nextErrors.originCountryId = required;
      if (!form.originCityId) nextErrors.originCityId = required;
      if (!form.destinationCountryId) nextErrors.destinationCountryId = required;
      if (!form.destinationCityId) nextErrors.destinationCityId = required;
    }

    if (step === 1) {
      if (!form.transportModeId) nextErrors.transportModeId = required;
      if (!form.companyId) nextErrors.companyId = required;
    }

    if (step === 2) {
      if (!form.parcelTypeId) nextErrors.parcelTypeId = required;
      if (!form.originCollectionPointId) nextErrors.originCollectionPointId = required;
      if (!form.destinationCollectionPointId) nextErrors.destinationCollectionPointId = required;
      if (!isEnvelopeParcel && pricingLoading) nextErrors.weightKg = t('errors.pricingLoading');
      if (weightRequired && !form.weightKg.trim()) nextErrors.weightKg = required;
      if (volumeRequired && !form.volumeM3.trim()) nextErrors.volumeM3 = required;
      if (form.weightKg && !isPositiveNumber(form.weightKg)) nextErrors.weightKg = t('errors.positiveNumber');
      if (form.volumeM3 && !isPositiveNumber(form.volumeM3)) nextErrors.volumeM3 = t('errors.positiveNumber');
      if (parcelPhotos.length > MAX_PARCEL_PHOTOS) nextErrors.parcelPhotos = t('errors.photoLimit');
    }

    if (step === 3) {
      if (!form.senderFullName.trim()) nextErrors.senderFullName = required;
      if (!form.senderWhatsappNumber.trim()) nextErrors.senderWhatsappNumber = required;
      if (receiverMode === 'PLATFORM' && !selectedReceiver) nextErrors.receiverUser = t('errors.userRequired');
      if (!form.receiverFullName.trim()) nextErrors.receiverFullName = required;
      if (!form.receiverWhatsappNumber.trim()) nextErrors.receiverWhatsappNumber = required;
    }

    setErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(activeStep)) return;
    const next = Math.min(activeStep + 1, STEP_KEYS.length - 1);
    setActiveStep(next);
    setFurthestStep((current) => Math.max(current, next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildPayload(): ShipmentCreateRequest {
    return {
      companyId: Number(form.companyId),
      transportModeId: Number(form.transportModeId),
      originCountryId: Number(form.originCountryId),
      originCityId: Number(form.originCityId),
      destinationCountryId: Number(form.destinationCountryId),
      destinationCityId: Number(form.destinationCityId),
      originCollectionPointId: Number(form.originCollectionPointId),
      destinationCollectionPointId: Number(form.destinationCollectionPointId),
      receiverUserId: selectedReceiver?.id,
      parcelTypeId: Number(form.parcelTypeId),
      priority: form.priority,
      description: optionalString(form.description),
      promoCode: optionalString(form.promoCode),
      ...(isEnvelopeParcel
        ? {}
        : { weightKg: optionalNumber(form.weightKg), volumeM3: optionalNumber(form.volumeM3) }),
      senderUsesRegisteredProfile: false,
      sender: {
        fullName: form.senderFullName.trim(),
        whatsappNumber: form.senderWhatsappNumber.trim(),
        address: optionalString(form.senderAddress),
        idCardNumber: optionalString(form.senderIdCardNumber),
      },
      receiver: {
        fullName: form.receiverFullName.trim(),
        whatsappNumber: form.receiverWhatsappNumber.trim(),
        address: optionalString(form.receiverAddress),
        idCardNumber: optionalString(form.receiverIdCardNumber),
      },
    };
  }

  async function handleSimulate() {
    if (!token) {
      setSubmitError(t('common.sessionExpired'));
      return;
    }
    if (![0, 1, 2, 3].every(validateStep)) return;

    const payload = buildPayload();
    const input: CreateShipmentInput = {
      data: payload,
      senderFrontIdCard,
      senderBackIdCard,
      parcelPhotos,
    };
    setSimulating(true);
    setSubmitError(null);
    try {
      const simulation = await simulateShipmentPrice(token, payload);
      setPriceSimulation(simulation);
      setPendingShipmentInput(input);
    } catch (error) {
      setSubmitError(apiMessage(error, t('errors.simulation')));
    } finally {
      setSimulating(false);
    }
  }

  async function handleCreate() {
    if (!token || !pendingShipmentInput) {
      setSubmitError(t('review.simulationStale'));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const shipment = await createShipment(token, pendingShipmentInput);
      toast({
        title: t('toast.createdTitle'),
        description: t('toast.createdDescription', { values: { reference: shipment.reference } }),
      });
      onCreated(shipment);
    } catch (error) {
      setSubmitError(apiMessage(error, t('errors.creation')));
    } finally {
      setSubmitting(false);
    }
  }

  const stepKey = STEP_KEYS[activeStep];

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="h-auto gap-2 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            {t('header.back')}
          </Button>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t('header.eyebrow')}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t('header.title')}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('header.description')}</p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit gap-1.5 rounded-full px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          {t('header.badge')}
        </Badge>
      </div>

      <WizardProgress
        activeStep={activeStep}
        furthestStep={furthestStep}
        onSelect={setActiveStep}
        t={t}
      />

      {metadataError ? (
        <Card className="border-destructive/30">
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-lg text-sm text-destructive">{metadataError}</p>
            <Button onClick={() => setMetadataReload((value) => value + 1)}>{t('common.retry')}</Button>
          </CardContent>
        </Card>
      ) : metadataLoading ? (
        <Card>
          <CardContent className="flex min-h-64 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-primary" aria-label={t('common.loading')} />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <div className="border-b border-border bg-muted/25 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                {stepIcon(stepKey)}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {String(activeStep + 1).padStart(2, '0')} / {String(STEP_KEYS.length).padStart(2, '0')}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">{t(`${stepKey}.title`)}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(`${stepKey}.description`)}</p>
              </div>
            </div>
          </div>

          <CardContent className="p-5 sm:p-7">
            {activeStep === 0 && (
              <RouteStep
                form={form}
                errors={errors}
                countries={countries}
                originCities={originCities}
                destinationCities={destinationCities}
                originLoading={originCitiesLoading}
                destinationLoading={destinationCitiesLoading}
                originError={originCitiesError}
                destinationError={destinationCitiesError}
                onCountryChange={handleCountryChange}
                onCityChange={handleCityChange}
                t={t}
              />
            )}

            {activeStep === 1 && (
              <ServiceStep
                form={form}
                errors={errors}
                transportModes={transportModes}
                companies={companies}
                transportLoading={transportModesLoading}
                companiesLoading={companiesLoading}
                transportError={transportModesError}
                companiesError={companiesError}
                onTransportChange={handleTransportChange}
                onCompanyChange={handleCompanyChange}
                t={t}
              />
            )}

            {activeStep === 2 && (
              <ParcelStep
                form={form}
                errors={errors}
                parcelTypes={eligibleParcelTypes}
                originPoints={originPoints}
                destinationPoints={destinationPoints}
                pointsLoading={pointsLoading}
                pointsError={pointsError}
                pricingLoading={pricingLoading}
                pricingError={pricingError}
                isEnvelope={isEnvelopeParcel}
                weightRequired={weightRequired}
                volumeRequired={volumeRequired}
                photos={parcelPhotos}
                onParcelTypeChange={handleParcelTypeChange}
                onUpdate={updateField}
                onPhotosChange={handlePhotoChange}
                onRemovePhoto={removePhoto}
                t={t}
              />
            )}

            {activeStep === 3 && (
              <PeopleStep
                form={form}
                errors={errors}
                receiverMode={receiverMode}
                receiverQuery={receiverQuery}
                receiverResults={receiverResults}
                selectedReceiver={selectedReceiver}
                receiverSearching={receiverSearching}
                receiverSearchError={receiverSearchError}
                senderFrontIdCard={senderFrontIdCard}
                senderBackIdCard={senderBackIdCard}
                onModeChange={setReceiverEntryMode}
                onReceiverQueryChange={setReceiverQuery}
                onReceiverSelect={selectReceiver}
                onReceiverClear={() => {
                  setSelectedReceiver(null);
                  setReceiverQuery('');
                  invalidateSimulation();
                }}
                onUpdate={updateField}
                onSenderFrontChange={(file) => {
                  setSenderFrontIdCard(file);
                  invalidateSimulation();
                }}
                onSenderBackChange={(file) => {
                  setSenderBackIdCard(file);
                  invalidateSimulation();
                }}
                t={t}
              />
            )}

            {activeStep === 4 && (
              <ReviewStep
                form={form}
                countries={countries}
                originCities={originCities}
                destinationCities={destinationCities}
                transportMode={selectedTransportMode}
                company={selectedCompany}
                parcelType={selectedParcelType}
                originPoints={originPoints}
                destinationPoints={destinationPoints}
                selectedReceiver={selectedReceiver}
                photoCount={parcelPhotos.length}
                idCardCount={Number(Boolean(senderFrontIdCard)) + Number(Boolean(senderBackIdCard))}
                simulation={priceSimulation}
                t={t}
              />
            )}

            {submitError && (
              <div role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                disabled={activeStep === 0 || submitting || simulating}
                onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('actions.previous')}
              </Button>

              {activeStep < STEP_KEYS.length - 1 ? (
                <Button onClick={goNext} disabled={submitting || simulating} className="gap-2">
                  {t('actions.continue')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : priceSimulation ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" onClick={() => void handleSimulate()} disabled={simulating || submitting}>
                    {simulating ? t('actions.simulating') : t('actions.simulate')}
                  </Button>
                  <Button onClick={() => void handleCreate()} disabled={submitting || simulating} className="gap-2">
                    {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
                    {submitting ? t('actions.creating') : t('actions.create')}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => void handleSimulate()} disabled={simulating || submitting} className="gap-2">
                  {simulating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {simulating ? t('actions.simulating') : t('actions.simulate')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Translate = ReturnType<typeof useTranslation>['t'];

function WizardProgress({ activeStep, furthestStep, onSelect, t }: { activeStep: number; furthestStep: number; onSelect: (step: number) => void; t: Translate }) {
  return (
    <nav aria-label={t('header.title')} className="overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm">
      <ol className="grid min-w-[680px] grid-cols-5 gap-1">
        {STEP_KEYS.map((step, index) => {
          const available = index <= furthestStep;
          const complete = index < activeStep && index <= furthestStep;
          return (
            <li key={step}>
              <button
                type="button"
                disabled={!available}
                aria-current={index === activeStep ? 'step' : undefined}
                onClick={() => onSelect(index)}
                className={cn(
                  'flex min-h-16 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors',
                  index === activeStep ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  !available && 'cursor-not-allowed opacity-45',
                )}
              >
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold', index === activeStep ? 'border-primary-foreground/50 bg-primary-foreground/10' : complete ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background')}>
                  {complete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{t(`steps.${step}.short`)}</span>
                  <span className={cn('block truncate text-xs', index === activeStep ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{t(`steps.${step}.description`)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function RouteStep({ form, errors, countries, originCities, destinationCities, originLoading, destinationLoading, originError, destinationError, onCountryChange, onCityChange, t }: {
  form: ShipmentCreateFormState;
  errors: ShipmentCreateFormErrors;
  countries: CountryResponse[];
  originCities: CityResponse[];
  destinationCities: CityResponse[];
  originLoading: boolean;
  destinationLoading: boolean;
  originError: string | null;
  destinationError: string | null;
  onCountryChange: (field: 'originCountryId' | 'destinationCountryId', value: string) => void;
  onCityChange: (field: 'originCityId' | 'destinationCityId', value: string) => void;
  t: Translate;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <LocationPanel icon={Route} title={t('route.origin')}>
        <SelectField label={t('route.originCountry')} value={form.originCountryId} error={errors.originCountryId} onChange={(event) => onCountryChange('originCountryId', event.target.value)} options={countries.map((country) => ({ value: String(country.countryId), label: country.countryName }))} placeholder={t('common.select')} />
        <SelectField label={t('route.originCity')} value={form.originCityId} error={errors.originCityId} onChange={(event) => onCityChange('originCityId', event.target.value)} options={originCities.map((city) => ({ value: String(city.cityId), label: city.cityName }))} placeholder={originLoading ? t('common.loading') : t('common.select')} disabled={!form.originCountryId || originLoading} hint={originError ?? (!form.originCountryId ? t('route.chooseCountryFirst') : originCities.length === 0 && !originLoading ? t('route.noCity') : undefined)} />
      </LocationPanel>
      <LocationPanel icon={MapPin} title={t('route.destination')}>
        <SelectField label={t('route.destinationCountry')} value={form.destinationCountryId} error={errors.destinationCountryId} onChange={(event) => onCountryChange('destinationCountryId', event.target.value)} options={countries.map((country) => ({ value: String(country.countryId), label: country.countryName }))} placeholder={t('common.select')} />
        <SelectField label={t('route.destinationCity')} value={form.destinationCityId} error={errors.destinationCityId} onChange={(event) => onCityChange('destinationCityId', event.target.value)} options={destinationCities.map((city) => ({ value: String(city.cityId), label: city.cityName }))} placeholder={destinationLoading ? t('common.loading') : t('common.select')} disabled={!form.destinationCountryId || destinationLoading} hint={destinationError ?? (!form.destinationCountryId ? t('route.chooseCountryFirst') : destinationCities.length === 0 && !destinationLoading ? t('route.noCity') : undefined)} />
      </LocationPanel>
    </div>
  );
}

function ServiceStep({ form, errors, transportModes, companies, transportLoading, companiesLoading, transportError, companiesError, onTransportChange, onCompanyChange, t }: {
  form: ShipmentCreateFormState;
  errors: ShipmentCreateFormErrors;
  transportModes: ShipmentAvailableTransportMode[];
  companies: ShipmentAvailableCompany[];
  transportLoading: boolean;
  companiesLoading: boolean;
  transportError: string | null;
  companiesError: string | null;
  onTransportChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  t: Translate;
}) {
  return (
    <div className="space-y-7">
      <ChoiceSection title={t('service.transportMode')} error={errors.transportModeId} loading={transportLoading} empty={!transportLoading && transportModes.length === 0 ? transportError ?? t('service.noTransport') : transportError}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {transportModes.map((mode) => (
            <ChoiceCard key={mode.transportModeId} selected={String(mode.transportModeId) === form.transportModeId} onClick={() => onTransportChange(String(mode.transportModeId))} icon={Truck} title={mode.transportModeName} description={t('service.companyCount', { values: { count: mode.companyCount } })} />
          ))}
        </div>
      </ChoiceSection>

      <ChoiceSection title={t('service.companies')} error={errors.companyId} loading={companiesLoading} empty={!form.transportModeId ? t('service.companiesHint') : !companiesLoading && companies.length === 0 ? companiesError ?? t('service.noCompany') : companiesError}>
        <div className="grid gap-3 md:grid-cols-2">
          {companies.map((company) => {
            const rating = company.reviews?.averageRating;
            const reviews = company.reviews?.reviewCount ?? 0;
            return (
              <ChoiceCard
                key={company.companyId}
                selected={String(company.companyId) === form.companyId}
                onClick={() => onCompanyChange(String(company.companyId))}
                icon={Building2}
                title={company.companyName}
                description={t('service.pointCount', { values: { origin: company.originCollectionPointCount, destination: company.destinationCollectionPointCount } })}
                meta={[
                  typeof company.deliveredShipmentCount === 'number' ? t('service.deliveries', { values: { count: company.deliveredShipmentCount } }) : null,
                  typeof rating === 'number' ? t('service.rating', { values: { rating: rating.toFixed(1), count: reviews } }) : null,
                ].filter(Boolean).join(' · ')}
              />
            );
          })}
        </div>
      </ChoiceSection>
    </div>
  );
}

function ParcelStep({ form, errors, parcelTypes, originPoints, destinationPoints, pointsLoading, pointsError, pricingLoading, pricingError, isEnvelope, weightRequired, volumeRequired, photos, onParcelTypeChange, onUpdate, onPhotosChange, onRemovePhoto, t }: {
  form: ShipmentCreateFormState;
  errors: ShipmentCreateFormErrors;
  parcelTypes: ParcelTypeResponse[];
  originPoints: ShipmentCollectionPointOption[];
  destinationPoints: ShipmentCollectionPointOption[];
  pointsLoading: boolean;
  pointsError: string | null;
  pricingLoading: boolean;
  pricingError: string | null;
  isEnvelope: boolean;
  weightRequired: boolean;
  volumeRequired: boolean;
  photos: File[];
  onParcelTypeChange: (value: string) => void;
  onUpdate: <Key extends keyof ShipmentCreateFormState>(field: Key, value: ShipmentCreateFormState[Key]) => void;
  onPhotosChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  t: Translate;
}) {
  const dimensionHint = pricingError ?? (pricingLoading ? t('common.loading') : t('parcel.optionalByPricing'));
  return (
    <div className="space-y-7">
      <ChoiceSection title={t('parcel.type')} error={errors.parcelTypeId} empty={parcelTypes.length === 0 ? t('parcel.noParcelType') : null}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parcelTypes.map((parcelType) => (
            <ChoiceCard key={parcelType.id} selected={String(parcelType.id) === form.parcelTypeId} onClick={() => onParcelTypeChange(String(parcelType.id))} icon={Package} title={parcelType.name} />
          ))}
        </div>
      </ChoiceSection>

      <ChoiceSection title={t('parcel.priority')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard selected={form.priority === 'STANDARD'} onClick={() => onUpdate('priority', 'STANDARD')} icon={ShieldCheck} title={t('parcel.standard')} description={t('parcel.standardDescription')} />
          <ChoiceCard selected={form.priority === 'EXPRESS'} onClick={() => onUpdate('priority', 'EXPRESS')} icon={Sparkles} title={t('parcel.express')} description={t('parcel.expressDescription')} />
        </div>
      </ChoiceSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <SelectField label={t('parcel.originPoint')} value={form.originCollectionPointId} error={errors.originCollectionPointId} onChange={(event) => onUpdate('originCollectionPointId', event.target.value)} options={originPoints.map((point) => ({ value: String(point.id), label: pointLabel(point) }))} placeholder={pointsLoading ? t('common.loading') : t('common.select')} disabled={!form.parcelTypeId || pointsLoading} hint={pointsError ?? (!form.parcelTypeId ? t('parcel.pointsHint') : originPoints.length === 0 && !pointsLoading ? t('parcel.noPoints') : undefined)} />
        <SelectField label={t('parcel.destinationPoint')} value={form.destinationCollectionPointId} error={errors.destinationCollectionPointId} onChange={(event) => onUpdate('destinationCollectionPointId', event.target.value)} options={destinationPoints.map((point) => ({ value: String(point.id), label: pointLabel(point) }))} placeholder={pointsLoading ? t('common.loading') : t('common.select')} disabled={!form.parcelTypeId || pointsLoading} hint={!form.parcelTypeId ? t('parcel.pointsHint') : destinationPoints.length === 0 && !pointsLoading ? t('parcel.noPoints') : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InputField label={`${t('parcel.weight')}${weightRequired ? ' *' : ''}`} type="number" min="0" step="0.01" value={form.weightKg} error={errors.weightKg} disabled={isEnvelope} placeholder={isEnvelope ? '—' : '5.5'} onChange={(event) => onUpdate('weightKg', event.target.value)} hint={isEnvelope ? t('parcel.notForEnvelope') : weightRequired ? t('parcel.requiredByPricing') : dimensionHint} />
        <InputField label={`${t('parcel.volume')}${volumeRequired ? ' *' : ''}`} type="number" min="0" step="0.001" value={form.volumeM3} error={errors.volumeM3} disabled={isEnvelope} placeholder={isEnvelope ? '—' : '0.25'} onChange={(event) => onUpdate('volumeM3', event.target.value)} hint={isEnvelope ? t('parcel.notForEnvelope') : volumeRequired ? t('parcel.requiredByPricing') : dimensionHint} />
        <InputField label={t('parcel.promo')} list="shipment-active-promos" value={form.promoCode} onChange={(event) => onUpdate('promoCode', event.target.value)} placeholder={t('common.optional')} />
        <div className="lg:col-span-2">
          <TextAreaField label={t('parcel.descriptionLabel')} value={form.description} onChange={(event) => onUpdate('description', event.target.value)} placeholder={t('parcel.descriptionPlaceholder')} />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">{t('parcel.photos')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('parcel.photosDescription')}</p>
          </div>
          <Badge variant="outline">{t('parcel.photoCount', { values: { count: photos.length } })}</Badge>
        </div>
        <label className={cn('mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground hover:bg-muted', photos.length >= MAX_PARCEL_PHOTOS && 'pointer-events-none opacity-50')}>
          <FileImage className="h-4 w-4" />
          {t('parcel.addPhotos')}
          <input className="sr-only" type="file" accept="image/*" multiple disabled={photos.length >= MAX_PARCEL_PHOTOS} onChange={onPhotosChange} />
        </label>
        {errors.parcelPhotos && <p className="mt-2 text-sm text-destructive">{errors.parcelPhotos}</p>}
        {photos.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {photos.map((photo, index) => (
              <li key={`${photo.name}-${photo.lastModified}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                <FileImage className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{photo.name}</span>
                <button type="button" onClick={() => onRemovePhoto(index)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`${t('actions.remove')} ${photo.name}`}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PeopleStep({ form, errors, receiverMode, receiverQuery, receiverResults, selectedReceiver, receiverSearching, receiverSearchError, senderFrontIdCard, senderBackIdCard, onModeChange, onReceiverQueryChange, onReceiverSelect, onReceiverClear, onUpdate, onSenderFrontChange, onSenderBackChange, t }: {
  form: ShipmentCreateFormState;
  errors: ShipmentCreateFormErrors;
  receiverMode: ReceiverMode;
  receiverQuery: string;
  receiverResults: UserSearchResponse[];
  selectedReceiver: UserSearchResponse | null;
  receiverSearching: boolean;
  receiverSearchError: string | null;
  senderFrontIdCard: File | null;
  senderBackIdCard: File | null;
  onModeChange: (mode: ReceiverMode) => void;
  onReceiverQueryChange: (value: string) => void;
  onReceiverSelect: (user: UserSearchResponse) => void;
  onReceiverClear: () => void;
  onUpdate: <Key extends keyof ShipmentCreateFormState>(field: Key, value: ShipmentCreateFormState[Key]) => void;
  onSenderFrontChange: (file: File | null) => void;
  onSenderBackChange: (file: File | null) => void;
  t: Translate;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ContactPanel title={t('people.sender')} icon={UserRound}>
        <InputField label={t('people.fullName')} value={form.senderFullName} error={errors.senderFullName} onChange={(event) => onUpdate('senderFullName', event.target.value)} placeholder={t('people.senderNamePlaceholder')} />
        <InputField label={t('people.phone')} value={form.senderWhatsappNumber} error={errors.senderWhatsappNumber} onChange={(event) => onUpdate('senderWhatsappNumber', event.target.value)} placeholder={t('people.phonePlaceholder')} />
        <InputField label={t('people.idCard')} value={form.senderIdCardNumber} onChange={(event) => onUpdate('senderIdCardNumber', event.target.value)} placeholder={t('common.optional')} />
        <TextAreaField label={t('people.address')} value={form.senderAddress} onChange={(event) => onUpdate('senderAddress', event.target.value)} placeholder={t('people.addressPlaceholder')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FileInput label={t('people.idFront')} file={senderFrontIdCard} onChange={onSenderFrontChange} />
          <FileInput label={t('people.idBack')} file={senderBackIdCard} onChange={onSenderBackChange} />
        </div>
      </ContactPanel>

      <ContactPanel title={t('people.receiver')} icon={CircleUserRound}>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button type="button" onClick={() => onModeChange('MANUAL')} className={cn('min-h-10 rounded-lg px-3 text-sm font-medium transition-colors', receiverMode === 'MANUAL' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>{t('people.manual')}</button>
          <button type="button" onClick={() => onModeChange('PLATFORM')} className={cn('min-h-10 rounded-lg px-3 text-sm font-medium transition-colors', receiverMode === 'PLATFORM' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>{t('people.platformUser')}</button>
        </div>

        {receiverMode === 'PLATFORM' && (
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            {selectedReceiver ? (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('people.selectedUser')}</p>
                  <p className="truncate font-semibold text-foreground">{userDisplayName(selectedReceiver)}</p>
                  <p className="truncate text-sm text-muted-foreground">@{selectedReceiver.username}{selectedReceiver.phone ? ` · ${selectedReceiver.phone}` : ''}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={onReceiverClear}>{t('people.changeUser')}</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <FieldShell label={t('people.searchLabel')} error={errors.receiverUser} hint={receiverSearchError ?? (receiverQuery.trim().length < 3 ? t('people.searchHint') : undefined)}>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={receiverQuery} onChange={(event) => onReceiverQueryChange(event.target.value)} className="pl-9" placeholder={t('people.searchPlaceholder')} />
                    {receiverSearching && <RefreshCw className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
                  </div>
                </FieldShell>
                {receiverQuery.trim().length >= 3 && !receiverSearching && receiverResults.length === 0 && !receiverSearchError && <p className="text-sm text-muted-foreground">{t('people.noUser')}</p>}
                {receiverResults.length > 0 && (
                  <div className="max-h-56 space-y-2 overflow-y-auto" role="listbox">
                    {receiverResults.map((user) => (
                      <button key={user.id} type="button" role="option" aria-selected="false" onClick={() => onReceiverSelect(user)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left hover:border-primary/50 hover:bg-primary/5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><UserRound className="h-4 w-4" /></div>
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{userDisplayName(user)}</p><p className="truncate text-xs text-muted-foreground">@{user.username}{user.phone ? ` · ${user.phone}` : ''}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <InputField label={t('people.fullName')} value={form.receiverFullName} error={errors.receiverFullName} onChange={(event) => onUpdate('receiverFullName', event.target.value)} placeholder={t('people.receiverNamePlaceholder')} />
        <InputField label={t('people.phone')} value={form.receiverWhatsappNumber} error={errors.receiverWhatsappNumber} onChange={(event) => onUpdate('receiverWhatsappNumber', event.target.value)} placeholder={t('people.phonePlaceholder')} />
        <InputField label={t('people.idCard')} value={form.receiverIdCardNumber} onChange={(event) => onUpdate('receiverIdCardNumber', event.target.value)} placeholder={t('common.optional')} />
        <TextAreaField label={t('people.address')} value={form.receiverAddress} onChange={(event) => onUpdate('receiverAddress', event.target.value)} placeholder={t('people.addressPlaceholder')} />
      </ContactPanel>
    </div>
  );
}

function ReviewStep({ form, countries, originCities, destinationCities, transportMode, company, parcelType, originPoints, destinationPoints, selectedReceiver, photoCount, idCardCount, simulation, t }: {
  form: ShipmentCreateFormState;
  countries: CountryResponse[];
  originCities: CityResponse[];
  destinationCities: CityResponse[];
  transportMode?: ShipmentAvailableTransportMode;
  company?: ShipmentAvailableCompany;
  parcelType?: ParcelTypeResponse;
  originPoints: ShipmentCollectionPointOption[];
  destinationPoints: ShipmentCollectionPointOption[];
  selectedReceiver: UserSearchResponse | null;
  photoCount: number;
  idCardCount: number;
  simulation: ShipmentPriceSimulationResponse | null;
  t: Translate;
}) {
  const { formatMoney: formatSelectedMoney } = useCurrency();
  const originCountry = countries.find((country) => String(country.countryId) === form.originCountryId)?.countryName;
  const destinationCountry = countries.find((country) => String(country.countryId) === form.destinationCountryId)?.countryName;
  const originCity = originCities.find((city) => String(city.cityId) === form.originCityId)?.cityName;
  const destinationCity = destinationCities.find((city) => String(city.cityId) === form.destinationCityId)?.cityName;
  const originPoint = originPoints.find((point) => String(point.id) === form.originCollectionPointId)?.name;
  const destinationPoint = destinationPoints.find((point) => String(point.id) === form.destinationCollectionPointId)?.name;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <ReviewCard icon={Route} title={t('review.route')} lines={[`${originCity}, ${originCountry}`, `${destinationCity}, ${destinationCountry}`]} />
        <ReviewCard icon={Truck} title={t('review.service')} lines={[transportMode?.transportModeName ?? t('common.notSelected'), company?.companyName ?? t('common.notSelected')]} />
        <ReviewCard icon={Package} title={t('review.parcel')} lines={[`${parcelType?.name ?? t('common.notSelected')} · ${form.priority === 'EXPRESS' ? t('parcel.express') : t('parcel.standard')}`, `${originPoint} → ${destinationPoint}`]} />
        <ReviewCard icon={UserRound} title={t('review.contacts')} lines={[t('review.sender', { values: { name: form.senderFullName } }), t('review.receiver', { values: { name: form.receiverFullName } }), selectedReceiver ? t('review.linkedAccount') : '']} />
        <ReviewCard icon={FileImage} title={t('review.files')} lines={[t('review.photos', { values: { count: photoCount } }), t('review.idCards', { values: { count: idCardCount } })]} />
      </div>

      {simulation && (
        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-primary/5">
          <div className="flex flex-col gap-3 border-b border-primary/20 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-semibold text-primary">{t('review.priceTitle')}</p><p className="mt-1 text-sm text-muted-foreground">{t('review.total')}</p></div>
            <p className="text-3xl font-bold tracking-tight text-foreground">{formatSelectedMoney(simulation.totalToPay)}</p>
          </div>
          <div className="grid gap-px bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
            <PriceCell label={t('review.companyPrice')} value={formatSelectedMoney(simulation.totalCompanyPrice)} />
            <PriceCell label={t('review.platformFee')} value={formatSelectedMoney(simulation.feeAmount)} />
            <PriceCell label={t('review.insurance')} value={formatSelectedMoney(simulation.insuranceAmount)} />
            <PriceCell label={t('review.expressSurcharge')} value={formatSelectedMoney(simulation.expressSurchargeAmount)} />
            <PriceCell label={t('review.discount')} value={formatSelectedMoney(simulation.discountAmount)} />
            <PriceCell label={t('review.payment')} value={simulation.expectedPaymentStatus ?? t('common.notProvided')} />
            <PriceCell label={t('review.onlineAmount')} value={formatSelectedMoney(simulation.platformAmountBeforeDiscount)} />
            <PriceCell label={t('review.collectionPointAmount')} value={formatSelectedMoney(simulation.collectionPointAmountToPay)} />
          </div>
          <div className="border-t border-primary/20 px-5 py-3 text-sm text-muted-foreground">
            {simulation.paymentCollectionMode === 'COLLECTION_POINT'
              ? t('review.collectionPointPlan')
              : t('review.platformPlan')}
          </div>
          {simulation.promoCode && <div className="flex items-center gap-2 border-t border-primary/20 px-5 py-3 text-sm"><CheckCircle2 className={cn('h-4 w-4', simulation.promoCodeApplied ? 'text-primary' : 'text-muted-foreground')} />{simulation.promoCodeApplied ? t('review.promoApplied') : t('review.promoNotApplied')} · {simulation.promoCode}</div>}
        </div>
      )}
    </div>
  );
}

function LocationPanel({ icon: Icon, title, children }: { icon: ElementType; title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-border bg-muted/15 p-4 sm:p-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><h4 className="font-semibold text-foreground">{title}</h4></div>{children}</section>;
}

function ContactPanel({ icon: Icon, title, children }: { icon: ElementType; title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-border bg-muted/10 p-4 sm:p-5"><div className="flex items-center gap-3 border-b border-border pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><h4 className="font-semibold text-foreground">{title}</h4></div>{children}</section>;
}

function ChoiceSection({ title, error, loading, empty, children }: { title: string; error?: string; loading?: boolean; empty?: string | null; children: ReactNode }) {
  return <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold text-foreground">{title}</h4>{loading && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}</div>{error && <p className="text-sm text-destructive">{error}</p>}{empty && <div className={cn('rounded-xl border border-dashed p-4 text-sm', error ? 'border-destructive/30 text-destructive' : 'border-border text-muted-foreground')}>{empty}</div>}{children}</section>;
}

function ChoiceCard({ selected, onClick, icon: Icon, title, description, meta }: { selected: boolean; onClick: () => void; icon: ElementType; title: string; description?: string; meta?: string }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={cn('group relative flex min-h-24 w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-primary bg-primary/8 shadow-sm' : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30')}><span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground')}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-foreground">{title}</span>{description && <span className="mt-1 block text-sm leading-5 text-muted-foreground">{description}</span>}{meta && <span className="mt-2 block text-xs text-muted-foreground">{meta}</span>}</span>{selected && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}</button>;
}

function FieldShell({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium text-foreground">{label}</span>{children}{(error || hint) && <span className={cn('block text-xs leading-5', error ? 'text-destructive' : 'text-muted-foreground')}>{error ?? hint}</span>}</label>;
}

function SelectField({ label, options, placeholder, error, hint, ...props }: React.ComponentProps<'select'> & { label: string; options: Array<{ value: string; label: string }>; placeholder: string; error?: string; hint?: string }) {
  return <FieldShell label={label} error={error} hint={hint}><select {...props} className={cn('border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-md border px-3 text-sm text-foreground outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50', error && 'border-destructive')}><option value="">{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></FieldShell>;
}

function InputField({ label, error, hint, ...props }: React.ComponentProps<typeof Input> & { label: string; error?: string; hint?: string }) {
  return <FieldShell label={label} error={error} hint={hint}><Input {...props} className={cn(error && 'border-destructive', props.className)} /></FieldShell>;
}

function TextAreaField({ label, error, hint, ...props }: React.ComponentProps<typeof Textarea> & { label: string; error?: string; hint?: string }) {
  return <FieldShell label={label} error={error} hint={hint}><Textarea {...props} className={cn(error && 'border-destructive', props.className)} /></FieldShell>;
}

function FileInput({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) {
  return <FieldShell label={label} hint={file?.name}><input type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] ?? null)} className="border-input bg-background file:bg-muted file:text-foreground h-11 w-full rounded-md border text-sm text-muted-foreground file:mr-3 file:h-full file:border-0 file:px-3" /></FieldShell>;
}

function ReviewCard({ icon: Icon, title, lines }: { icon: ElementType; title: string; lines: string[] }) {
  return <div className="rounded-2xl border border-border bg-muted/15 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" />{title}</div><div className="mt-3 space-y-1">{lines.filter(Boolean).map((line, index) => <p key={`${line}-${index}`} className="text-sm text-muted-foreground">{line}</p>)}</div></div>;
}

function PriceCell({ label, value }: { label: string; value: string }) {
  return <div className="bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-semibold text-foreground">{value}</p></div>;
}

function stepIcon(step: StepKey) {
  const Icon = { route: Route, service: Building2, parcel: Package, people: UserRound, review: CheckCircle2 }[step];
  return <Icon className="h-5 w-5" />;
}

function clearAfterRoute(form: ShipmentCreateFormState): ShipmentCreateFormState {
  return { ...form, transportModeId: '', companyId: '', parcelTypeId: '', originCollectionPointId: '', destinationCollectionPointId: '', weightKg: '', volumeM3: '' };
}

function clearAfterTransport(form: ShipmentCreateFormState): ShipmentCreateFormState {
  return { ...form, companyId: '', parcelTypeId: '', originCollectionPointId: '', destinationCollectionPointId: '', weightKg: '', volumeM3: '' };
}

function clearAfterCompany(form: ShipmentCreateFormState): ShipmentCreateFormState {
  return { ...form, parcelTypeId: '', originCollectionPointId: '', destinationCollectionPointId: '', weightKg: '', volumeM3: '' };
}

function getEligibleParcelTypes(company: ShipmentAvailableCompany | undefined, catalog: ParcelTypeResponse[]) {
  if (!company) return [];
  const pricedTypes = new Map<number, string>();
  company.pricings?.forEach((pricing) => {
    if (pricing.parcelTypeId != null) pricedTypes.set(pricing.parcelTypeId, pricing.parcelTypeName ?? '');
  });
  if (pricedTypes.size === 0) return catalog;
  return Array.from(pricedTypes, ([id, name]) => catalog.find((item) => item.id === id) ?? { id, name: name || String(id), systemDefined: false });
}

function isEnvelopeParcelType(parcelType: ParcelTypeResponse) {
  const name = parcelType.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['enveloppe', 'envelope', 'courrier', 'letter', 'document'].some((word) => name.includes(word));
}

function pointLabel(point: ShipmentCollectionPointOption) {
  return [point.name, point.address, point.cityName].filter(Boolean).join(' · ');
}

function userDisplayName(user: UserSearchResponse) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
}

function optionalString(value: string) {
  return value.trim() || undefined;
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function isPositiveNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
