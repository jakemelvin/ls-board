'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Calculator,
  Clock3,
  Coins,
  Eye,
  FileImage,
  MapPin,
  Package,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { CopyTrackingNumberButton } from '@/components/copy-tracking-number-button';
import { TrackingStepper } from '@/components/tracking-stepper';
import {
  formatMoney,
  getCommissionStatusClassName,
  getCommissionStatusLabel,
  getParcelCommissionForUser,
} from '@/lib/commissions';
import {
  getKycDocumentLabel,
  getStatusColor,
  getStatusLabel,
  type KycDocumentType,
  type Parcel,
  type ParcelImage,
  type ParcelStatus,
  type ShipmentType,
  type User,
  type UserRole,
} from '@/lib/mock-data';
import {
  getParcelHistoryActorDisplayName,
  getRecipientColumnLabel,
  getRecipientDisplayName,
  getSenderColumnLabel,
  getSenderDisplayName,
} from '@/lib/parcel-privacy';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  calculateOperationPrice,
  estimateRouteDistanceKm,
  getPricingRuleForShipmentType,
  shipmentTypeLabels,
} from '@/lib/pricing';

const STATUS_FILTERS: { value: ParcelStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'CREATED', label: 'Cree' },
  { value: 'RECEIVED_AT_COLLECTION_POINT', label: 'Recu' },
  { value: 'IN_TRANSIT', label: 'En transit' },
  { value: 'ARRIVED_AT_DESTINATION', label: 'Arrive' },
  { value: 'DELIVERED', label: 'Livre' },
  { value: 'REJECTED', label: 'Rejete' },
];

const parcelConditionOptions: { value: 'GOOD' | 'FRAGILE'; label: string }[] = [
  { value: 'GOOD', label: 'Conforme' },
  { value: 'FRAGILE', label: 'Fragile' },
];

const shipmentTypeOptions: { value: ShipmentType; label: string }[] = [
  { value: 'STANDARD', label: shipmentTypeLabels.STANDARD },
  { value: 'EXPRESS', label: shipmentTypeLabels.EXPRESS },
  { value: 'ECONOMY', label: shipmentTypeLabels.ECONOMY },
];

const collectorParcelRequiredFieldCount = 13;

interface ParcelManagementProps {
  currentRole: UserRole;
  currentUser: User;
}

interface CollectorParcelFormState {
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientFullAddress: string;
  destinationCountryId: string;
  destinationCityId: string;
  destinationZoneId: string;
  destinationPointId: string;
  weight: string;
  volume: string;
  description: string;
  shipmentType: ShipmentType;
  packageCondition: 'GOOD' | 'FRAGILE';
  senderKycDocumentType: KycDocumentType;
  senderKycDocumentNumber: string;
  images: ParcelImage[];
}

const initialCollectorParcelFormState: CollectorParcelFormState = {
  senderName: '',
  senderPhone: '',
  recipientName: '',
  recipientPhone: '',
  recipientFullAddress: '',
  destinationCountryId: '',
  destinationCityId: '',
  destinationZoneId: '',
  destinationPointId: '',
  weight: '',
  volume: '',
  description: '',
  shipmentType: 'STANDARD',
  packageCondition: 'GOOD',
  senderKycDocumentType: 'CNI',
  senderKycDocumentNumber: '',
  images: [],
};

type ParcelCommissionDetails = NonNullable<ReturnType<typeof getParcelCommissionForUser>>;

function ParcelCommissionCard({
  commission,
  currentRole,
}: {
  commission: ParcelCommissionDetails;
  currentRole: UserRole;
}) {
  const statusLabel =
    commission.status === 'PENDING_DELIVERY'
      ? 'Estimee, payable a la livraison'
      : getCommissionStatusLabel(commission.status);
  const statusClassName =
    commission.status === 'PENDING_DELIVERY'
      ? 'bg-muted text-muted-foreground'
      : getCommissionStatusClassName(commission.status);

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ma commission</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {currentRole === 'COLLECTOR'
                ? 'Part calculee sur le point de collecte d origine.'
                : 'Part calculee sur votre trajet transporteur.'}
            </p>
          </div>
        </div>
        <span className={cn('w-fit rounded-lg px-2 py-1 text-xs font-medium', statusClassName)}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Montant</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatMoney(commission.commissionAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Calcul</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {commission.rate}% de {formatMoney(commission.baseAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
          <p className="mt-1 text-sm font-medium text-foreground">{commission.sourceLabel}</p>
        </div>
      </div>
    </div>
  );
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Invalid file payload'));
    };

    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

export function ParcelManagement({ currentRole, currentUser }: ParcelManagementProps) {
  const {
    parcels,
    collectionPoints,
    countries,
    cities,
    zones,
    pricingRules,
    commissions,
    addParcel,
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ParcelStatus | 'ALL'>(
    currentRole === 'TRANSPORTER' ? 'IN_TRANSIT' : 'ALL'
  );
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false);
  const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
  const [isSubmittingParcel, setIsSubmittingParcel] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [collectorParcelForm, setCollectorParcelForm] = useState<CollectorParcelFormState>(
    initialCollectorParcelFormState
  );

  const transporterScopedParcels =
    currentRole === 'TRANSPORTER'
      ? parcels.filter(
          (parcel) =>
            (parcel.status === 'IN_TRANSIT' || parcel.status === 'DELIVERED') &&
            parcel.history.some((entry) => entry.actorId === currentUser.id)
        )
      : parcels;

  const availableFilters =
    currentRole === 'TRANSPORTER'
      ? STATUS_FILTERS.filter(
          (filter) =>
            filter.value === 'ALL' ||
            filter.value === 'IN_TRANSIT' ||
            filter.value === 'DELIVERED'
        )
      : STATUS_FILTERS;

  const assignedCollectionPoint = useMemo(
    () =>
      currentUser.assignedPointId
        ? collectionPoints.find((point) => point.id === currentUser.assignedPointId) ?? null
        : null,
    [collectionPoints, currentUser.assignedPointId]
  );

  const collectorDestinationOptions = useMemo(
    () =>
      assignedCollectionPoint
        ? collectionPoints.filter((point) => point.id !== assignedCollectionPoint.id)
        : collectionPoints,
    [assignedCollectionPoint, collectionPoints]
  );

  const destinationZoneIdsWithPoints = useMemo(
    () => new Set(collectorDestinationOptions.map((point) => point.zoneId)),
    [collectorDestinationOptions]
  );

  const destinationCountryOptions = useMemo(
    () =>
      countries.filter((country) =>
        cities.some(
          (city) =>
            city.countryId === country.id &&
            zones.some(
              (zone) => zone.cityId === city.id && destinationZoneIdsWithPoints.has(zone.id)
            )
        )
      ),
    [cities, countries, destinationZoneIdsWithPoints, zones]
  );

  const destinationCityOptions = useMemo(
    () =>
      collectorParcelForm.destinationCountryId
        ? cities.filter(
            (city) =>
              city.countryId === collectorParcelForm.destinationCountryId &&
              zones.some(
                (zone) => zone.cityId === city.id && destinationZoneIdsWithPoints.has(zone.id)
              )
          )
        : [],
    [cities, collectorParcelForm.destinationCountryId, destinationZoneIdsWithPoints, zones]
  );

  const destinationZoneOptions = useMemo(
    () =>
      collectorParcelForm.destinationCityId
        ? zones.filter(
            (zone) =>
              zone.cityId === collectorParcelForm.destinationCityId &&
              destinationZoneIdsWithPoints.has(zone.id)
          )
        : [],
    [collectorParcelForm.destinationCityId, destinationZoneIdsWithPoints, zones]
  );

  const destinationPointOptions = useMemo(
    () =>
      collectorParcelForm.destinationZoneId
        ? collectorDestinationOptions.filter(
            (point) => point.zoneId === collectorParcelForm.destinationZoneId
          )
        : [],
    [collectorDestinationOptions, collectorParcelForm.destinationZoneId]
  );

  const selectedDestinationCountry = countries.find(
    (country) => country.id === collectorParcelForm.destinationCountryId
  );
  const selectedDestinationCity = cities.find(
    (city) => city.id === collectorParcelForm.destinationCityId
  );
  const selectedDestinationZone = zones.find(
    (zone) => zone.id === collectorParcelForm.destinationZoneId
  );
  const selectedDestinationPoint = collectionPoints.find(
    (point) => point.id === collectorParcelForm.destinationPointId
  );
  const selectedPricingRule = useMemo(
    () => getPricingRuleForShipmentType(pricingRules, collectorParcelForm.shipmentType),
    [collectorParcelForm.shipmentType, pricingRules]
  );
  const estimatedDistanceKm = useMemo(
    () =>
      estimateRouteDistanceKm(
        assignedCollectionPoint ?? undefined,
        selectedDestinationPoint,
        zones,
        cities,
        countries
      ),
    [assignedCollectionPoint, cities, collectionPoints, countries, selectedDestinationPoint, zones]
  );
  const estimatedOperationPrice = useMemo(() => {
    const weight = Number(collectorParcelForm.weight);

    if (!selectedPricingRule || !Number.isFinite(weight) || weight <= 0 || estimatedDistanceKm <= 0) {
      return null;
    }

    return calculateOperationPrice(selectedPricingRule, weight, estimatedDistanceKm);
  }, [collectorParcelForm.weight, estimatedDistanceKm, selectedPricingRule]);

  const collectorParcelCompletion = useMemo(() => {
    const requiredFields = [
      collectorParcelForm.senderName.trim(),
      collectorParcelForm.senderPhone.trim(),
      collectorParcelForm.recipientName.trim(),
      collectorParcelForm.recipientPhone.trim(),
      collectorParcelForm.destinationCountryId,
      collectorParcelForm.destinationCityId,
      collectorParcelForm.destinationZoneId,
      collectorParcelForm.destinationPointId,
      collectorParcelForm.weight.trim(),
      collectorParcelForm.volume.trim(),
      collectorParcelForm.description.trim(),
      collectorParcelForm.shipmentType,
      collectorParcelForm.senderKycDocumentNumber.trim(),
    ];

    return requiredFields.filter(Boolean).length;
  }, [collectorParcelForm]);

  const filteredParcels = transporterScopedParcels.filter((parcel) => {
    const matchesSearch = parcel.trackingNumber
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSenderSearch =
      currentRole === 'TRANSPORTER' ||
      parcel.senderName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRecipientSearch =
      currentRole === 'TRANSPORTER' ||
      parcel.recipientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || parcel.status === statusFilter;

    return (
      matchesSearch && matchesSenderSearch && matchesRecipientSearch && matchesStatus
    );
  });

  const getPointName = (pointId: string) =>
    collectionPoints.find((point) => point.id === pointId)?.name || pointId;
  const getCountryName = (countryId?: string) =>
    countryId ? countries.find((country) => country.id === countryId)?.name : undefined;
  const getCityName = (cityId?: string) =>
    cityId ? cities.find((city) => city.id === cityId)?.name : undefined;
  const getZoneName = (zoneId?: string) =>
    zoneId ? zones.find((zone) => zone.id === zoneId)?.name : undefined;
  const selectedParcelCommission = selectedParcel
    ? getParcelCommissionForUser(selectedParcel, currentUser, collectionPoints, commissions)
    : null;

  const openDetailDialog = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setIsDetailDialogOpen(true);
  };

  const resetCollectorParcelForm = () => {
    setCollectorParcelForm(initialCollectorParcelFormState);
    setCreationError(null);
  };

  const closeCreateView = () => {
    setIsCreateViewOpen(false);
    setIsPricingDialogOpen(false);
    resetCollectorParcelForm();
    setIsSubmittingParcel(false);
  };

  const removeCollectorParcelImage = (imageId: string) => {
    setCollectorParcelForm((current) => ({
      ...current,
      images: current.images.filter((image) => image.id !== imageId),
    }));
  };

  const handleCollectorParcelImagesChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const imageDrafts = await Promise.all(
      files.map(async (file) => ({
        id: `parcel-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        url: await fileToDataUrl(file),
        mimeType: file.type || 'image/jpeg',
        sizeInBytes: file.size,
      }))
    );

    setCollectorParcelForm((current) => ({
      ...current,
      images: [...current.images, ...imageDrafts],
    }));

    event.target.value = '';
  };

  const validateCollectorParcelForm = () => {
    if (!assignedCollectionPoint) {
      setCreationError("Ce collecteur n'a pas de point de collecte assigne.");
      return null;
    }

    const weight = Number(collectorParcelForm.weight);
    const volume = Number(collectorParcelForm.volume);

    if (
      !collectorParcelForm.senderName.trim() ||
      !collectorParcelForm.senderPhone.trim() ||
      !collectorParcelForm.recipientName.trim() ||
      !collectorParcelForm.recipientPhone.trim() ||
      !collectorParcelForm.destinationCountryId ||
      !collectorParcelForm.destinationCityId ||
      !collectorParcelForm.destinationZoneId ||
      !collectorParcelForm.destinationPointId ||
      !collectorParcelForm.description.trim() ||
      !collectorParcelForm.shipmentType ||
      !collectorParcelForm.senderKycDocumentNumber.trim()
    ) {
      setCreationError('Renseignez tous les champs obligatoires avant de valider.');
      return null;
    }

    if (
      !Number.isFinite(weight) ||
      weight <= 0 ||
      !Number.isFinite(volume) ||
      volume <= 0
    ) {
      setCreationError('Les valeurs logistiques doivent etre valides.');
      return null;
    }

    if (!selectedPricingRule || estimatedOperationPrice === null || estimatedDistanceKm <= 0) {
      setCreationError("Aucune tarification valide n'est configuree pour ce type d'envoi.");
      return null;
    }

    setCreationError(null);

    return { weight, volume };
  };

  const handleCollectorParcelSubmit = () => {
    if (!validateCollectorParcelForm()) {
      return;
    }

    setIsPricingDialogOpen(true);
  };

  const handleConfirmCollectorParcelCreation = async () => {
    const validatedForm = validateCollectorParcelForm();

    if (!assignedCollectionPoint || !selectedPricingRule || estimatedOperationPrice === null || !validatedForm) {
      return;
    }

    setIsSubmittingParcel(true);
    setCreationError(null);

    try {
      const createdParcel = addParcel({
        senderName: collectorParcelForm.senderName.trim(),
        senderPhone: collectorParcelForm.senderPhone.trim(),
        recipientName: collectorParcelForm.recipientName.trim(),
        recipientPhone: collectorParcelForm.recipientPhone.trim(),
        recipientFullAddress: collectorParcelForm.recipientFullAddress.trim() || undefined,
        weight: validatedForm.weight,
        volume: validatedForm.volume,
        description: collectorParcelForm.description.trim(),
        shipmentType: collectorParcelForm.shipmentType,
        pricingRuleId: selectedPricingRule.id,
        estimatedDistanceKm,
        estimatedPrice: estimatedOperationPrice,
        packageCondition: collectorParcelForm.packageCondition,
        senderKyc: {
          documentType: collectorParcelForm.senderKycDocumentType,
          documentNumber: collectorParcelForm.senderKycDocumentNumber.trim(),
        },
        destinationCountryId: collectorParcelForm.destinationCountryId,
        destinationCityId: collectorParcelForm.destinationCityId,
        destinationZoneId: collectorParcelForm.destinationZoneId,
        destinationPointId: collectorParcelForm.destinationPointId,
        originPointId: assignedCollectionPoint.id,
        createdBy: {
          id: currentUser.id,
          name: currentUser.name,
        },
        images: collectorParcelForm.images,
      });

      setSelectedParcel(createdParcel);
      setIsDetailDialogOpen(true);
      closeCreateView();
    } finally {
      setIsSubmittingParcel(false);
    }
  };

  if (currentRole === 'COLLECTOR' && isCreateViewOpen) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button variant="outline" className="gap-2" onClick={closeCreateView}>
              <ArrowLeft className="h-4 w-4" />
              Retour a la liste
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Enregistrer un colis</h2>
              <p className="text-muted-foreground">
                Creez un colis directement depuis le point de collecte, avec prise en
                charge immediate.
              </p>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
            <div className="rounded-2xl border border-border bg-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Point source
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-foreground">
                {assignedCollectionPoint ? assignedCollectionPoint.name : 'Non assigne'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Champs requis
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {collectorParcelCompletion}/{collectorParcelRequiredFieldCount}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Images
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {collectorParcelForm.images.length} ajoutee(s)
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Expediteur</p>
                  <p className="text-sm text-muted-foreground">
                    Identite et piece KYC du deposant
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="min-w-0 md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Nom complet
                  </label>
                  <Input
                    value={collectorParcelForm.senderName}
                    onChange={(event) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        senderName: event.target.value,
                      }))
                    }
                    placeholder="Alice Bernard"
                    className="bg-secondary"
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Telephone
                  </label>
                  <Input
                    value={collectorParcelForm.senderPhone}
                    onChange={(event) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        senderPhone: event.target.value,
                      }))
                    }
                    placeholder="+237 6 99 99 99 99"
                    className="bg-secondary"
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Type de piece KYC
                  </label>
                  <Select
                    value={collectorParcelForm.senderKycDocumentType}
                    onValueChange={(value: KycDocumentType) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        senderKycDocumentType: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNI">Carte nationale</SelectItem>
                      <SelectItem value="PASSPORT">Passeport</SelectItem>
                      <SelectItem value="PERMIS_DE_CONDUIRE">
                        Permis de conduire
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Numero de piece
                  </label>
                  <Input
                    value={collectorParcelForm.senderKycDocumentNumber}
                    onChange={(event) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        senderKycDocumentNumber: event.target.value,
                      }))
                    }
                    placeholder="AB123456"
                    className="bg-secondary"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Destinataire</p>
                  <p className="text-sm text-muted-foreground">
                    Coordonnees et point de livraison
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="min-w-0 md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Nom complet
                  </label>
                  <Input
                    value={collectorParcelForm.recipientName}
                    onChange={(event) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        recipientName: event.target.value,
                      }))
                    }
                    placeholder="Marc Petit"
                    className="bg-secondary"
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Telephone
                  </label>
                  <Input
                    value={collectorParcelForm.recipientPhone}
                    onChange={(event) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        recipientPhone: event.target.value,
                      }))
                    }
                    placeholder="+33 6 12 34 56 78"
                    className="bg-secondary"
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Pays
                  </label>
                  <Select
                    value={collectorParcelForm.destinationCountryId}
                    onValueChange={(value) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        destinationCountryId: value,
                        destinationCityId: '',
                        destinationZoneId: '',
                        destinationPointId: '',
                      }))
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue placeholder="Selectionnez le pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationCountryOptions.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Ville
                  </label>
                  <Select
                    value={collectorParcelForm.destinationCityId}
                    onValueChange={(value) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        destinationCityId: value,
                        destinationZoneId: '',
                        destinationPointId: '',
                      }))
                    }
                    disabled={!collectorParcelForm.destinationCountryId}
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue placeholder="Selectionnez la ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationCityOptions.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Zone
                  </label>
                  <Select
                    value={collectorParcelForm.destinationZoneId}
                    onValueChange={(value) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        destinationZoneId: value,
                        destinationPointId: '',
                      }))
                    }
                    disabled={!collectorParcelForm.destinationCityId}
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue placeholder="Selectionnez la zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationZoneOptions.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Point de collecte
                  </label>
                  <Select
                    value={collectorParcelForm.destinationPointId}
                    onValueChange={(value) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        destinationPointId: value,
                      }))
                    }
                    disabled={!collectorParcelForm.destinationZoneId}
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue placeholder="Selectionnez le point" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinationPointOptions.map((point) => (
                        <SelectItem key={point.id} value={point.id}>
                          {point.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Adresse complete <span className="text-muted-foreground">(optionnel)</span>
                  </label>
                  <Textarea
                    value={collectorParcelForm.recipientFullAddress}
                    onChange={(event) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        recipientFullAddress: event.target.value,
                      }))
                    }
                    placeholder="Quartier, rue, immeuble, repere de livraison..."
                    className="min-h-[88px] resize-none bg-secondary"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5">
                <p className="font-medium text-foreground">Caracteristiques du colis</p>
                <p className="text-sm text-muted-foreground">
                  Donnees logistiques et informations de traitement
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Poids (kg)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={collectorParcelForm.weight}
                    onChange={(event) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        weight: event.target.value,
                      }))
                    }
                    placeholder="2.5"
                    className="bg-secondary"
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Volume (m3)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={collectorParcelForm.volume}
                    onChange={(event) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        volume: event.target.value,
                      }))
                    }
                    placeholder="0.03"
                    className="bg-secondary"
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Type d'envoi
                  </label>
                  <Select
                    value={collectorParcelForm.shipmentType}
                    onValueChange={(value: ShipmentType) =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        shipmentType: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shipmentTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Etat du colis
                  </label>
                  <Select
                    value={collectorParcelForm.packageCondition}
                    onValueChange={(value: 'GOOD' | 'FRAGILE') =>
                      setCollectorParcelForm((current) => ({
                        ...current,
                        packageCondition: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parcelConditionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 min-w-0">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Description logistique
                </label>
                <Textarea
                  value={collectorParcelForm.description}
                  onChange={(event) =>
                    setCollectorParcelForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Nature du colis, precautions, contenu declare..."
                  className="min-h-[120px] resize-none bg-secondary"
                />
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Controle rapide</p>
                  <p className="text-sm text-muted-foreground">
                    Resume avant validation finale
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-secondary px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Source
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {assignedCollectionPoint ? assignedCollectionPoint.name : 'Non assigne'}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Destination
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {collectorParcelForm.destinationPointId
                      ? getPointName(collectorParcelForm.destinationPointId)
                      : 'A definir'}
                  </p>
                  {(selectedDestinationCountry ||
                    selectedDestinationCity ||
                    selectedDestinationZone) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        selectedDestinationCountry?.name,
                        selectedDestinationCity?.name,
                        selectedDestinationZone?.name,
                      ]
                        .filter(Boolean)
                        .join(' / ')}
                    </p>
                  )}
                  {collectorParcelForm.recipientFullAddress.trim() && (
                    <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                      {collectorParcelForm.recipientFullAddress.trim()}
                    </p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl bg-secondary px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Type
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {shipmentTypeLabels[collectorParcelForm.shipmentType]}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Poids
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {collectorParcelForm.weight || '0'} kg
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Volume
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {collectorParcelForm.volume || '0'} m3
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Calculator className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Estimation
                      </p>
                      <p className="mt-2 text-lg font-bold text-foreground">
                        {estimatedOperationPrice !== null
                          ? `${estimatedOperationPrice.toFixed(2)} EUR`
                          : 'A calculer'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedPricingRule
                          ? `${selectedPricingRule.name} - ${estimatedDistanceKm} km estimes`
                          : "Aucune regle pour ce type d'envoi"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Images du colis</p>
                  <p className="text-sm text-muted-foreground">
                    Preuves visuelles et etat physique
                  </p>
                </div>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                <FileImage className="h-4 w-4 shrink-0" />
                <span className="min-w-0">Ajouter une ou plusieurs images</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleCollectorParcelImagesChange}
                />
              </label>

              {collectorParcelForm.images.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {collectorParcelForm.images.map((image) => (
                    <div
                      key={image.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {image.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(image.sizeInBytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => removeCollectorParcelImage(image.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
                  Aucune image ajoutee pour le moment.
                </div>
              )}
            </section>

            {creationError && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {creationError}
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">
                Verification KYC et creation immediate dans le stock local du point.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Button variant="outline" onClick={closeCreateView}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCollectorParcelSubmit}
                  disabled={isSubmittingParcel || !assignedCollectionPoint}
                  className="gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  Voir l'estimation
                </Button>
              </div>
            </div>
          </aside>
        </div>

        <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
          <DialogContent className="max-w-xl border-border bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Calculator className="h-5 w-5 text-primary" />
                Estimation de l'operation
              </DialogTitle>
              <DialogDescription>
                Verifiez le tarif calcule avant l'enregistrement definitif du colis.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Prix estime
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  {estimatedOperationPrice !== null
                    ? `${estimatedOperationPrice.toFixed(2)} EUR`
                    : 'Indisponible'}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedPricingRule
                    ? `${selectedPricingRule.name} - ${shipmentTypeLabels[collectorParcelForm.shipmentType]}`
                    : "Aucune regle associee au type d'envoi"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary px-4 py-3">
                  <p className="text-xs text-muted-foreground">Origine</p>
                  <p className="mt-1 font-medium text-foreground">
                    {assignedCollectionPoint?.name ?? 'Non assigne'}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary px-4 py-3">
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedDestinationPoint?.name ?? 'A definir'}
                  </p>
                </div>
                <div className="rounded-xl bg-secondary px-4 py-3">
                  <p className="text-xs text-muted-foreground">Poids facture</p>
                  <p className="mt-1 font-medium text-foreground">
                    {collectorParcelForm.weight || '0'} kg
                  </p>
                </div>
                <div className="rounded-xl bg-secondary px-4 py-3">
                  <p className="text-xs text-muted-foreground">Distance estimee</p>
                  <p className="mt-1 font-medium text-foreground">
                    {estimatedDistanceKm} km
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPricingDialogOpen(false)}>
                Retour
              </Button>
              <Button
                onClick={handleConfirmCollectorParcelCreation}
                disabled={isSubmittingParcel || estimatedOperationPrice === null}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Confirmer l'enregistrement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Package className="h-5 w-5 text-primary" />
                {selectedParcel?.trackingNumber}
                {selectedParcel && (
                  <CopyTrackingNumberButton
                    trackingNumber={selectedParcel.trackingNumber}
                    className="h-8 w-8"
                  />
                )}
              </DialogTitle>
              <DialogDescription>
                Details complets du colis et progression de ses statuts.
              </DialogDescription>
            </DialogHeader>
            {selectedParcel && (
              <div className="space-y-6 py-4">
                <TrackingStepper
                  currentStatus={selectedParcel.status}
                  history={selectedParcel.history}
                />

                <div className="grid gap-4 rounded-xl bg-secondary p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {getSenderColumnLabel(currentRole)}
                    </p>
                    <p className="font-medium text-foreground">
                      {getSenderDisplayName(selectedParcel.senderName, currentRole)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {getRecipientColumnLabel(currentRole)}
                    </p>
                    <p className="font-medium text-foreground">
                      {getRecipientDisplayName(selectedParcel.recipientName, currentRole)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Poids</p>
                    <p className="font-medium text-foreground">{selectedParcel.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cree le</p>
                    <p className="font-medium text-foreground">
                      {selectedParcel.createdAt.toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Origine</p>
                    <p className="font-medium text-foreground">
                      {getPointName(selectedParcel.originPointId)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Destination</p>
                    <p className="font-medium text-foreground">
                      {getPointName(selectedParcel.destinationPointId)}
                    </p>
                    {[
                      getCountryName(selectedParcel.destinationCountryId),
                      getCityName(selectedParcel.destinationCityId),
                      getZoneName(selectedParcel.destinationZoneId),
                    ].some(Boolean) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          getCountryName(selectedParcel.destinationCountryId),
                          getCityName(selectedParcel.destinationCityId),
                          getZoneName(selectedParcel.destinationZoneId),
                        ]
                          .filter(Boolean)
                          .join(' / ')}
                      </p>
                    )}
                  </div>
                  {selectedParcel.recipientPhone && (
                    <div>
                      <p className="text-xs text-muted-foreground">Telephone destinataire</p>
                      <p className="font-medium text-foreground">{selectedParcel.recipientPhone}</p>
                    </div>
                  )}
                  {selectedParcel.recipientFullAddress && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Adresse complete</p>
                      <p className="font-medium text-foreground">
                        {selectedParcel.recipientFullAddress}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">KYC expediteur</p>
                    <p className="font-medium text-foreground">
                      {getKycDocumentLabel(selectedParcel.senderKyc.documentType)} ·{' '}
                      {selectedParcel.senderKyc.documentNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type d'envoi</p>
                    <p className="font-medium text-foreground">
                      {selectedParcel.shipmentType
                        ? shipmentTypeLabels[selectedParcel.shipmentType]
                        : 'Non renseigne'}
                    </p>
                  </div>
                  {selectedParcel.estimatedPrice !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground">Prix estime</p>
                      <p className="font-medium text-foreground">
                        {selectedParcel.estimatedPrice.toLocaleString('fr-FR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        EUR
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Volume</p>
                    <p className="font-medium text-foreground">{selectedParcel.volume} m3</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Etat du colis</p>
                    <p className="font-medium text-foreground">
                      {selectedParcel.packageCondition === 'FRAGILE' ? 'Fragile' : 'Conforme'}
                    </p>
                  </div>
                </div>

                {selectedParcelCommission && (
                  <ParcelCommissionCard
                    commission={selectedParcelCommission}
                    currentRole={currentRole}
                  />
                )}

                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-sm font-medium text-foreground">Description</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedParcel.description}
                  </p>
                </div>

                {selectedParcel.images && selectedParcel.images.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-medium text-foreground">Images du colis</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedParcel.images.map((image) => (
                        <div
                          key={image.id}
                          className="overflow-hidden rounded-xl border border-border bg-card"
                        >
                          <img
                            src={image.url}
                            alt={image.name}
                            className="h-44 w-full object-cover"
                          />
                          <div className="space-y-1 p-3">
                            <p className="truncate text-sm font-medium text-foreground">
                              {image.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(image.sizeInBytes / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Historique</p>
                  <div className="space-y-3">
                    {selectedParcel.history.map((entry, index) => (
                      <div
                        key={`${entry.status}-${entry.timestamp.toISOString()}-${index}`}
                        className="rounded-xl border border-border bg-card p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <span
                            className={cn(
                              'inline-flex w-fit rounded-lg px-2 py-1 text-xs font-medium',
                              getStatusColor(entry.status)
                            )}
                          >
                            {getStatusLabel(entry.status)}
                          </span>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock3 className="h-4 w-4" />
                            <span>{entry.timestamp.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {getParcelHistoryActorDisplayName(
                                entry.actorId,
                                entry.actorName,
                                currentRole
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{entry.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestion des Colis</h2>
          <p className="text-muted-foreground">
            {currentRole === 'TRANSPORTER'
              ? 'Colis vous concernant, actuellement en transit ou deja livres'
              : currentRole === 'COLLECTOR'
                ? 'Enregistrez directement les colis recus et consultez leur historique'
                : 'Liste complete et historique des colis'}
          </p>
        </div>
        {currentRole === 'COLLECTOR' && (
          <Button
            className="gap-2"
            onClick={() => setIsCreateViewOpen(true)}
            disabled={!assignedCollectionPoint}
          >
            <Plus className="h-4 w-4" />
            Enregistrer un colis
          </Button>
        )}
      </div>

      <div
        className={cn(
          'grid gap-4',
          currentRole === 'TRANSPORTER' ? 'md:grid-cols-2' : 'md:grid-cols-6'
        )}
      >
        {availableFilters.slice(1).map((filter) => {
          const count = transporterScopedParcels.filter(
            (parcel) => parcel.status === filter.value
          ).length;

          return (
            <Card key={filter.value} className="border-border bg-card">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-xs text-muted-foreground">{filter.label}</span>
                <span className="text-xl font-bold text-foreground">{count}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              currentRole === 'TRANSPORTER'
                ? 'Rechercher par numero de reference...'
                : 'Rechercher par numero, expediteur ou destinataire...'
            }
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="bg-secondary pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {availableFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">N° Suivi</TableHead>
                <TableHead className="text-muted-foreground">
                  {getSenderColumnLabel(currentRole)}
                </TableHead>
                <TableHead className="text-muted-foreground">
                  {getRecipientColumnLabel(currentRole)}
                </TableHead>
                <TableHead className="text-muted-foreground">Poids</TableHead>
                <TableHead className="text-muted-foreground">Origine</TableHead>
                <TableHead className="text-muted-foreground">Destination</TableHead>
                <TableHead className="text-muted-foreground">Statut</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParcels.map((parcel) => (
                <TableRow key={parcel.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-mono font-medium text-foreground">
                        {parcel.trackingNumber}
                      </span>
                      <CopyTrackingNumberButton trackingNumber={parcel.trackingNumber} />
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {getSenderDisplayName(parcel.senderName, currentRole)}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {getRecipientDisplayName(parcel.recipientName, currentRole)}
                  </TableCell>
                  <TableCell className="text-foreground">{parcel.weight} kg</TableCell>
                  <TableCell className="text-muted-foreground">
                    {getPointName(parcel.originPointId)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getPointName(parcel.destinationPointId)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-block rounded-lg px-2 py-1 text-xs font-medium',
                        getStatusColor(parcel.status)
                      )}
                    >
                      {getStatusLabel(parcel.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {parcel.updatedAt.toLocaleDateString('fr-FR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openDetailDialog(parcel)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredParcels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Aucun colis trouve
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Package className="h-5 w-5 text-primary" />
              {selectedParcel?.trackingNumber}
              {selectedParcel && (
                <CopyTrackingNumberButton
                  trackingNumber={selectedParcel.trackingNumber}
                  className="h-8 w-8"
                />
              )}
            </DialogTitle>
            <DialogDescription>
              Details complets du colis et progression de ses statuts.
            </DialogDescription>
          </DialogHeader>
          {selectedParcel && (
            <div className="space-y-6 py-4">
              <TrackingStepper
                currentStatus={selectedParcel.status}
                history={selectedParcel.history}
              />

              <div className="grid gap-4 rounded-xl bg-secondary p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {getSenderColumnLabel(currentRole)}
                  </p>
                  <p className="font-medium text-foreground">
                    {getSenderDisplayName(selectedParcel.senderName, currentRole)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {getRecipientColumnLabel(currentRole)}
                  </p>
                  <p className="font-medium text-foreground">
                    {getRecipientDisplayName(selectedParcel.recipientName, currentRole)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Poids</p>
                  <p className="font-medium text-foreground">{selectedParcel.weight} kg</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cree le</p>
                  <p className="font-medium text-foreground">
                    {selectedParcel.createdAt.toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Origine</p>
                  <p className="font-medium text-foreground">
                    {getPointName(selectedParcel.originPointId)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium text-foreground">
                    {getPointName(selectedParcel.destinationPointId)}
                  </p>
                  {[
                    getCountryName(selectedParcel.destinationCountryId),
                    getCityName(selectedParcel.destinationCityId),
                    getZoneName(selectedParcel.destinationZoneId),
                  ].some(Boolean) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        getCountryName(selectedParcel.destinationCountryId),
                        getCityName(selectedParcel.destinationCityId),
                        getZoneName(selectedParcel.destinationZoneId),
                      ]
                        .filter(Boolean)
                        .join(' / ')}
                    </p>
                  )}
                </div>
                {selectedParcel.recipientPhone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Telephone destinataire</p>
                    <p className="font-medium text-foreground">{selectedParcel.recipientPhone}</p>
                  </div>
                )}
                {selectedParcel.recipientFullAddress && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Adresse complete</p>
                    <p className="font-medium text-foreground">
                      {selectedParcel.recipientFullAddress}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">KYC expediteur</p>
                  <p className="font-medium text-foreground">
                    {getKycDocumentLabel(selectedParcel.senderKyc.documentType)} ·{' '}
                    {selectedParcel.senderKyc.documentNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type d'envoi</p>
                  <p className="font-medium text-foreground">
                    {selectedParcel.shipmentType
                      ? shipmentTypeLabels[selectedParcel.shipmentType]
                      : 'Non renseigne'}
                  </p>
                </div>
                {selectedParcel.estimatedPrice !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Prix estime</p>
                    <p className="font-medium text-foreground">
                      {selectedParcel.estimatedPrice.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      EUR
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="font-medium text-foreground">{selectedParcel.volume} m3</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Etat du colis</p>
                  <p className="font-medium text-foreground">
                    {selectedParcel.packageCondition === 'FRAGILE' ? 'Fragile' : 'Conforme'}
                  </p>
                </div>
              </div>

              {selectedParcelCommission && (
                <ParcelCommissionCard
                  commission={selectedParcelCommission}
                  currentRole={currentRole}
                />
              )}

              <div className="rounded-xl bg-secondary p-4">
                <p className="text-sm font-medium text-foreground">Description</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedParcel.description}
                </p>
              </div>

              {selectedParcel.images && selectedParcel.images.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Images du colis</p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedParcel.images.map((image) => (
                      <div
                        key={image.id}
                        className="overflow-hidden rounded-xl border border-border bg-card"
                      >
                        <img
                          src={image.url}
                          alt={image.name}
                          className="h-44 w-full object-cover"
                        />
                        <div className="space-y-1 p-3">
                          <p className="truncate text-sm font-medium text-foreground">
                            {image.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(image.sizeInBytes / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Historique</p>
                <div className="space-y-3">
                  {selectedParcel.history.map((entry, index) => (
                    <div
                      key={`${entry.status}-${entry.timestamp.toISOString()}-${index}`}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <span
                          className={cn(
                            'inline-flex w-fit rounded-lg px-2 py-1 text-xs font-medium',
                            getStatusColor(entry.status)
                          )}
                        >
                          {getStatusLabel(entry.status)}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          <span>{entry.timestamp.toLocaleString('fr-FR')}</span>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <UserIcon className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {getParcelHistoryActorDisplayName(
                              entry.actorId,
                              entry.actorName,
                              currentRole
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{entry.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
