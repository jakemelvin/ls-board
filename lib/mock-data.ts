// Types
export type ParcelStatus = 'CREATED' | 'RECEIVED_AT_COLLECTION_POINT' | 'IN_TRANSIT' | 'ARRIVED_AT_DESTINATION' | 'DELIVERED' | 'REJECTED';
export type KycDocumentType = 'CNI' | 'PASSPORT' | 'PERMIS_DE_CONDUIRE';
export type KycVerificationStatus = 'VERIFIED' | 'PENDING_REVIEW';

export type VehicleType = 'MOTO' | 'VAN' | 'CAMION' | 'AVION';
export type VehicleStatus = 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE';

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'COLLECTOR' | 'TRANSPORTER' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type CollectionPointCapacityUnit = 'KG' | 'M3';
export type CollectionPointGeoLocationSource = 'GPS_CAPTURE' | 'MANUAL';
export type CollectionPointMapScope = 'COMPANY' | 'NETWORK';
export type SubscriptionPlanType =
  | 'FREE_TRIAL'
  | 'NATIONAL_LIMITED'
  | 'NATIONAL_UNLIMITED'
  | 'INTERNATIONAL_LIMITED'
  | 'INTERNATIONAL_UNLIMITED';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
export type CommissionBeneficiaryRole = 'COLLECTOR' | 'TRANSPORTER';
export type CommissionStatus = 'PAYABLE' | 'PAID' | 'CANCELED';
export type WeekdayKey = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type ShipmentType = 'STANDARD' | 'EXPRESS' | 'ECONOMY';
export type ParcelPickupReadiness = 'PENDING' | 'READY';
export type ParcelNoteVisibility = 'INTERNAL' | 'CLIENT';
export type ParcelGroupScope = 'COLLECTION_POINT' | 'TRANSPORTER_TOUR';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  countryId: string;
  cityId: string;
  address?: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  assignedPointId?: string;
  assignedVehicleId?: string;
  transporterCommissionRate?: number;
  avatar?: string;
  profilePhotoUrl?: string;
}

export interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  zoneId: string;
  maxCapacity: {
    value: number;
    unit: CollectionPointCapacityUnit;
  };
  responsibleId: string;
  isOpen: boolean;
  openingHours: CollectionPointOpeningHours;
  closedReason?: string;
  commissionRate?: number;
  whatsappPhone?: string;
  geoLocation?: CollectionPointGeoLocation;
  organizationId?: string;
  organizationName?: string;
}

export interface CollectionPointGeoLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  source: CollectionPointGeoLocationSource;
  capturedByUserId?: string;
  capturedByName?: string;
  capturedAt: Date;
}

export interface CollectionPointOpeningHours {
  days: WeekdayKey[];
  opensAt: string;
  closesAt: string;
}

export interface NetworkCollectionPoint {
  id: string;
  name: string;
  address: string;
  zoneId: string;
  isOpen: boolean;
  openingHours: CollectionPointOpeningHours;
  geoLocation: CollectionPointGeoLocation;
  organizationId: string;
  organizationName: string;
  contactPhone?: string;
  services: string[];
}

export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface City {
  id: string;
  countryId: string;
  name: string;
}

export interface Zone {
  id: string;
  cityId: string;
  name: string;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  plate: string;
  maxVolume: number; // m³
  maxWeight: number; // kg
  status: VehicleStatus;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone?: string;
  recipientFullAddress?: string;
  weight: number; // kg
  volume: number; // m3
  description: string;
  declaredValue?: number;
  shipmentType?: ShipmentType;
  pricingRuleId?: string;
  estimatedDistanceKm?: number;
  estimatedPrice?: number;
  packageCondition: 'GOOD' | 'FRAGILE';
  senderKyc: {
    documentType: KycDocumentType;
    documentNumber: string;
    verificationStatus: KycVerificationStatus;
    verifiedAt: Date;
  };
  status: ParcelStatus;
  originPointId: string;
  destinationCountryId?: string;
  destinationCityId?: string;
  destinationZoneId?: string;
  destinationPointId: string;
  currentVehicleId?: string;
  groupId?: string;
  pickupReadiness: ParcelPickupReadiness;
  images?: ParcelImage[];
  collectedByUserId?: string;
  collectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  history: ParcelHistoryEntry[];
}

export interface ParcelImage {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeInBytes: number;
}

export interface ParcelHistoryEntry {
  status: ParcelStatus;
  timestamp: Date;
  actorId: string;
  actorName: string;
  location: string;
  vehicleId?: string;
}

export interface TransferRequest {
  id: string;
  parcelIds: string[];
  pickedParcelIds?: string[];
  transporterId: string;
  collectorId: string;
  collectionPointId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  createdAt: Date;
  respondedAt?: Date;
  completedAt?: Date;
}

export interface ParcelGroup {
  id: string;
  reference: string;
  scope: ParcelGroupScope;
  collectionPointId?: string;
  vehicleId?: string;
  parcelIds: string[];
  createdByUserId: string;
  createdByName: string;
  createdAt: Date;
}

export interface ParcelNote {
  id: string;
  targetType: 'PARCEL' | 'GROUP';
  targetId: string;
  parcelIds: string[];
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  message: string;
  visibility: ParcelNoteVisibility;
  createdAt: Date;
}

export interface PricingRule {
  id: string;
  name: string;
  shipmentType: ShipmentType;
  basePrice: number;
  pricePerKg: number;
  pricePerKm: number;
  zoneMultiplier: number;
}

export interface SubscriptionPlan {
  id: string;
  type: SubscriptionPlanType;
  name: string;
  description: string;
  monthlyPrice: number;
  currency: 'XAF';
  nationalShipmentLimit: number | null;
  internationalShipmentLimit: number | null;
  trialDays?: number;
  features: string[];
  isRecommended?: boolean;
  upgradeRank: number;
}

export interface CompanySubscription {
  id: string;
  organizationId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  id: string;
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  nationalUsed: number;
  internationalUsed: number;
  updatedAt: Date;
}

export interface CommissionEntry {
  id: string;
  parcelId: string;
  trackingNumber: string;
  beneficiaryRole: CommissionBeneficiaryRole;
  beneficiaryUserId: string;
  beneficiaryName: string;
  sourceCollectionPointId?: string;
  sourceCollectionPointName?: string;
  sourceVehicleId?: string;
  sourceVehicleLabel?: string;
  rate: number;
  baseAmount: number;
  commissionAmount: number;
  currency: 'XAF';
  status: CommissionStatus;
  earnedAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateParcelInput {
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone?: string;
  recipientFullAddress?: string;
  weight: number;
  volume: number;
  description: string;
  shipmentType: ShipmentType;
  pricingRuleId: string;
  estimatedDistanceKm: number;
  estimatedPrice: number;
  packageCondition: 'GOOD' | 'FRAGILE';
  senderKyc: {
    documentType: KycDocumentType;
    documentNumber: string;
  };
  destinationCountryId: string;
  destinationCityId: string;
  destinationZoneId: string;
  destinationPointId: string;
  originPointId: string;
  createdBy: Pick<User, 'id' | 'name'>;
  images?: ParcelImage[];
}

// Demo accounts
export const DEMO_USERS: User[] = [
  {
    id: 'super-admin-1',
    email: 'superadmin@sendam.com',
    name: 'Super Admin',
    firstName: 'Super',
    lastName: 'Admin',
    username: 'super.admin',
    phone: '+221 77 000 00 00',
    countryId: 'country-1',
    cityId: 'city-1',
    password: 'SuperAdmin123!',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    avatar: 'SA',
  },
  {
    id: 'admin-1',
    email: 'admin@express.com',
    name: 'Marie Dupont',
    firstName: 'Marie',
    lastName: 'Dupont',
    username: 'marie.dupont',
    phone: '+33 6 11 22 33 44',
    countryId: 'country-1',
    cityId: 'city-1',
    address: '12 Rue du Siege',
    password: 'Admin123!',
    role: 'ADMIN',
    status: 'ACTIVE',
    avatar: 'MD',
  },
  {
    id: 'employee-1',
    email: 'employe@express.com',
    name: 'Claire Martin',
    firstName: 'Claire',
    lastName: 'Martin',
    username: 'claire.martin',
    phone: '+33 6 21 43 65 87',
    countryId: 'country-1',
    cityId: 'city-2',
    address: '28 Avenue Operations',
    password: 'Employe123!',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    avatar: 'CM',
  },
  {
    id: 'collector-1',
    email: 'collecteur@bastos.com',
    name: 'Jean Bastos',
    firstName: 'Jean',
    lastName: 'Bastos',
    username: 'jean.bastos',
    phone: '+33 6 55 12 12 12',
    countryId: 'country-1',
    cityId: 'city-1',
    address: '15 Rue de la Paix',
    password: 'Collecteur123!',
    role: 'COLLECTOR',
    status: 'ACTIVE',
    assignedPointId: 'point-1',
    avatar: 'JB',
  },
  {
    id: 'collector-2',
    email: 'collecteur@nord.com',
    name: 'Sophie Martin',
    firstName: 'Sophie',
    lastName: 'Martin',
    username: 'sophie.martin',
    phone: '+33 6 77 14 14 14',
    countryId: 'country-1',
    cityId: 'city-2',
    address: '78 Avenue du Nord',
    password: 'Collecteur456!',
    role: 'COLLECTOR',
    status: 'ACTIVE',
    assignedPointId: 'point-2',
    avatar: 'SM',
  },
  {
    id: 'transporter-1',
    email: 'transporteur@van.com',
    name: 'Pierre Van',
    firstName: 'Pierre',
    lastName: 'Van',
    username: 'pierre.van',
    phone: '+33 6 88 16 16 16',
    countryId: 'country-1',
    cityId: 'city-1',
    address: 'Depot Ouest',
    password: 'Transport123!',
    role: 'TRANSPORTER',
    status: 'ACTIVE',
    assignedVehicleId: 'vehicle-1',
    transporterCommissionRate: 12,
    avatar: 'PV',
  },
  {
    id: 'transporter-2',
    email: 'transporteur@moto.com',
    name: 'Lucas Rapide',
    firstName: 'Lucas',
    lastName: 'Rapide',
    username: 'lucas.rapide',
    phone: '+33 6 99 18 18 18',
    countryId: 'country-1',
    cityId: 'city-3',
    address: 'Zone Logistique Sud',
    password: 'Transport456!',
    role: 'TRANSPORTER',
    status: 'ACTIVE',
    assignedVehicleId: 'vehicle-2',
    transporterCommissionRate: 9.5,
    avatar: 'LR',
  },
];

// Collection Points
export const COUNTRIES: Country[] = [
  {
    id: 'country-1',
    name: 'France',
    code: 'FR',
  },
  {
    id: 'country-2',
    name: 'Cameroun',
    code: 'CM',
  },
];

export const CITIES: City[] = [
  {
    id: 'city-1',
    countryId: 'country-1',
    name: 'Paris',
  },
  {
    id: 'city-2',
    countryId: 'country-1',
    name: 'Lille',
  },
  {
    id: 'city-3',
    countryId: 'country-1',
    name: 'Marseille',
  },
  {
    id: 'city-4',
    countryId: 'country-2',
    name: 'Douala',
  },
  {
    id: 'city-5',
    countryId: 'country-2',
    name: 'Yaounde',
  },
];

export const ZONES: Zone[] = [
  {
    id: 'zone-1',
    cityId: 'city-1',
    name: 'Centre Ville',
  },
  {
    id: 'zone-2',
    cityId: 'city-2',
    name: 'Nord Gare',
  },
  {
    id: 'zone-3',
    cityId: 'city-3',
    name: 'Sud Littoral',
  },
  {
    id: 'zone-4',
    cityId: 'city-4',
    name: 'Akwa',
  },
  {
    id: 'zone-5',
    cityId: 'city-5',
    name: 'Centre Administratif',
  },
];

export const COLLECTION_POINTS: CollectionPoint[] = [
  {
    id: 'point-1',
    name: 'Pharmacie du Centre',
    address: '15 Rue de la Paix',
    zoneId: 'zone-1',
    maxCapacity: {
      value: 180,
      unit: 'KG',
    },
    responsibleId: 'collector-1',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '08:00',
      closesAt: '18:00',
    },
    commissionRate: 7.5,
    whatsappPhone: '+33 6 55 12 12 12',
    organizationId: 'company-sendam',
    organizationName: 'Sendam Express',
    geoLocation: {
      latitude: 48.8698,
      longitude: 2.3322,
      accuracyMeters: 18,
      source: 'GPS_CAPTURE',
      capturedByUserId: 'collector-1',
      capturedByName: 'Jean Bastos',
      capturedAt: new Date('2024-01-12T09:30:00'),
    },
  },
  {
    id: 'point-2',
    name: 'Boutique Nord',
    address: '78 Avenue du Nord',
    zoneId: 'zone-2',
    maxCapacity: {
      value: 4.5,
      unit: 'M3',
    },
    responsibleId: 'collector-2',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '09:00',
      closesAt: '19:00',
    },
    whatsappPhone: '+33 6 77 14 14 14',
    organizationId: 'company-sendam',
    organizationName: 'Sendam Express',
    geoLocation: {
      latitude: 50.637,
      longitude: 3.0633,
      accuracyMeters: 24,
      source: 'GPS_CAPTURE',
      capturedByUserId: 'collector-2',
      capturedByName: 'Sophie Martin',
      capturedAt: new Date('2024-01-12T10:15:00'),
    },
  },
  {
    id: 'point-3',
    name: 'Relais Express Sud',
    address: '42 Boulevard du Sud',
    zoneId: 'zone-3',
    maxCapacity: {
      value: 260,
      unit: 'KG',
    },
    responsibleId: 'collector-1',
    isOpen: false,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '08:30',
      closesAt: '17:30',
    },
    closedReason: 'Indisponible temporairement',
    commissionRate: 5,
    whatsappPhone: '+33 6 55 12 12 12',
    organizationId: 'company-sendam',
    organizationName: 'Sendam Express',
    geoLocation: {
      latitude: 43.2965,
      longitude: 5.3698,
      source: 'MANUAL',
      capturedByUserId: 'employee-1',
      capturedByName: 'Claire Martin',
      capturedAt: new Date('2024-01-13T14:20:00'),
    },
  },
  {
    id: 'point-4',
    name: 'Agence Republique',
    address: '24 Place de la Republique',
    zoneId: 'zone-1',
    maxCapacity: {
      value: 130,
      unit: 'KG',
    },
    responsibleId: 'collector-1',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '08:30',
      closesAt: '19:00',
    },
    commissionRate: 6,
    whatsappPhone: '+33 6 55 12 12 12',
    organizationId: 'company-sendam',
    organizationName: 'Sendam Express',
    geoLocation: {
      latitude: 48.8674,
      longitude: 2.3631,
      accuracyMeters: 19,
      source: 'GPS_CAPTURE',
      capturedByUserId: 'collector-1',
      capturedByName: 'Jean Bastos',
      capturedAt: new Date('2024-01-15T09:00:00'),
    },
  },
  {
    id: 'point-5',
    name: 'Sendam Lille Centre',
    address: '31 Rue Faidherbe',
    zoneId: 'zone-2',
    maxCapacity: {
      value: 160,
      unit: 'KG',
    },
    responsibleId: 'collector-2',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '08:00',
      closesAt: '18:30',
    },
    commissionRate: 6.5,
    whatsappPhone: '+33 6 77 14 14 14',
    organizationId: 'company-sendam',
    organizationName: 'Sendam Express',
    geoLocation: {
      latitude: 50.6364,
      longitude: 3.0686,
      accuracyMeters: 21,
      source: 'GPS_CAPTURE',
      capturedByUserId: 'collector-2',
      capturedByName: 'Sophie Martin',
      capturedAt: new Date('2024-01-15T09:20:00'),
    },
  },
  {
    id: 'point-6',
    name: 'Depot Marseille Prado',
    address: '109 Avenue du Prado',
    zoneId: 'zone-3',
    maxCapacity: {
      value: 6,
      unit: 'M3',
    },
    responsibleId: 'collector-1',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '09:00',
      closesAt: '18:00',
    },
    whatsappPhone: '+33 6 55 12 12 12',
    organizationId: 'company-sendam',
    organizationName: 'Sendam Express',
    geoLocation: {
      latitude: 43.2804,
      longitude: 5.3874,
      accuracyMeters: 26,
      source: 'MANUAL',
      capturedByUserId: 'employee-1',
      capturedByName: 'Claire Martin',
      capturedAt: new Date('2024-01-15T10:15:00'),
    },
  },
  {
    id: 'point-7',
    name: 'Sendam Douala Akwa',
    address: 'Boulevard de la Liberte',
    zoneId: 'zone-4',
    maxCapacity: {
      value: 220,
      unit: 'KG',
    },
    responsibleId: 'collector-2',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '08:00',
      closesAt: '18:00',
    },
    commissionRate: 8,
    whatsappPhone: '+237 6 77 14 14 14',
    organizationId: 'company-sendam',
    organizationName: 'Sendam Express',
    geoLocation: {
      latitude: 4.0523,
      longitude: 9.7049,
      accuracyMeters: 30,
      source: 'MANUAL',
      capturedByUserId: 'employee-1',
      capturedByName: 'Claire Martin',
      capturedAt: new Date('2024-01-15T11:00:00'),
    },
  },
  {
    id: 'point-8',
    name: 'Sendam Yaounde Kennedy',
    address: '18 Avenue Kennedy',
    zoneId: 'zone-5',
    maxCapacity: {
      value: 180,
      unit: 'KG',
    },
    responsibleId: 'collector-1',
    isOpen: false,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '08:30',
      closesAt: '17:30',
    },
    closedReason: 'Audit inventaire en cours',
    organizationId: 'company-sendam',
    organizationName: 'Sendam Express',
    geoLocation: {
      latitude: 3.8678,
      longitude: 11.5179,
      accuracyMeters: 34,
      source: 'MANUAL',
      capturedByUserId: 'employee-1',
      capturedByName: 'Claire Martin',
      capturedAt: new Date('2024-01-15T11:30:00'),
    },
  },
];

export const NETWORK_COLLECTION_POINTS: NetworkCollectionPoint[] = [
  {
    id: 'network-point-1',
    name: 'Relais Montmartre',
    address: '8 Rue des Abbesses',
    zoneId: 'zone-1',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '09:00',
      closesAt: '20:00',
    },
    geoLocation: {
      latitude: 48.8841,
      longitude: 2.3379,
      accuracyMeters: 20,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T08:00:00'),
    },
    organizationId: 'network-urban-drop',
    organizationName: 'Urban Drop',
    contactPhone: '+33 1 44 55 66 77',
    services: ['Depot client', 'Retrait client', 'Transfert transporteur'],
  },
  {
    id: 'network-point-2',
    name: 'Point Gare Lille Europe',
    address: '12 Avenue le Corbusier',
    zoneId: 'zone-2',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '07:30',
      closesAt: '19:30',
    },
    geoLocation: {
      latitude: 50.6388,
      longitude: 3.0758,
      accuracyMeters: 16,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T08:10:00'),
    },
    organizationId: 'network-nord-link',
    organizationName: 'Nord Link Logistics',
    contactPhone: '+33 3 20 11 22 33',
    services: ['Depot client', 'Retrait client'],
  },
  {
    id: 'network-point-3',
    name: 'Akwa Service Point',
    address: 'Rue Joffre Akwa',
    zoneId: 'zone-4',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '08:00',
      closesAt: '18:30',
    },
    geoLocation: {
      latitude: 4.0511,
      longitude: 9.7043,
      accuracyMeters: 28,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T08:20:00'),
    },
    organizationId: 'network-camship',
    organizationName: 'CamShip Relay',
    contactPhone: '+237 6 55 44 33 22',
    services: ['Depot client', 'Retrait client', 'Stockage court'],
  },
  {
    id: 'network-point-4',
    name: 'Yaounde Centre Express',
    address: 'Avenue Kennedy',
    zoneId: 'zone-5',
    isOpen: false,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '08:30',
      closesAt: '17:30',
    },
    geoLocation: {
      latitude: 3.8667,
      longitude: 11.5167,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T08:30:00'),
    },
    organizationId: 'network-camship',
    organizationName: 'CamShip Relay',
    contactPhone: '+237 6 77 88 99 00',
    services: ['Retrait client', 'Transfert transporteur'],
  },
  {
    id: 'network-point-5',
    name: 'Vieux-Port Relais',
    address: '4 Quai du Port',
    zoneId: 'zone-3',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '09:00',
      closesAt: '19:00',
    },
    geoLocation: {
      latitude: 43.296,
      longitude: 5.37,
      accuracyMeters: 22,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T08:40:00'),
    },
    organizationId: 'network-mediterranee',
    organizationName: 'Mediterranee Relay',
    contactPhone: '+33 4 91 22 33 44',
    services: ['Depot client', 'Retrait client'],
  },
  {
    id: 'network-point-6',
    name: 'Saint-Lazare Pickup',
    address: '20 Rue de Rome',
    zoneId: 'zone-1',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '07:00',
      closesAt: '20:30',
    },
    geoLocation: {
      latitude: 48.8754,
      longitude: 2.3258,
      accuracyMeters: 17,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T09:00:00'),
    },
    organizationId: 'network-urban-drop',
    organizationName: 'Urban Drop',
    contactPhone: '+33 1 48 22 10 10',
    services: ['Depot client', 'Retrait client', 'Casier partenaire'],
  },
  {
    id: 'network-point-7',
    name: 'Opera Colis Service',
    address: '5 Rue Halevy',
    zoneId: 'zone-1',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '10:00',
      closesAt: '21:00',
    },
    geoLocation: {
      latitude: 48.8719,
      longitude: 2.3316,
      accuracyMeters: 14,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T09:10:00'),
    },
    organizationId: 'network-parcel-hub',
    organizationName: 'Parcel Hub',
    contactPhone: '+33 1 47 88 12 45',
    services: ['Retrait client', 'Retour marchand'],
  },
  {
    id: 'network-point-8',
    name: 'Wazemmes Relay',
    address: '3 Place Nouvelle Aventure',
    zoneId: 'zone-2',
    isOpen: true,
    openingHours: {
      days: ['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '09:30',
      closesAt: '19:00',
    },
    geoLocation: {
      latitude: 50.6261,
      longitude: 3.0512,
      accuracyMeters: 25,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T09:20:00'),
    },
    organizationId: 'network-nord-link',
    organizationName: 'Nord Link Logistics',
    contactPhone: '+33 3 20 55 66 77',
    services: ['Depot client', 'Retrait client', 'Stockage court'],
  },
  {
    id: 'network-point-9',
    name: 'La Joliette Hub',
    address: '10 Place de la Joliette',
    zoneId: 'zone-3',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '08:00',
      closesAt: '18:30',
    },
    geoLocation: {
      latitude: 43.3043,
      longitude: 5.3661,
      accuracyMeters: 20,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T09:30:00'),
    },
    organizationId: 'network-mediterranee',
    organizationName: 'Mediterranee Relay',
    contactPhone: '+33 4 91 40 50 60',
    services: ['Depot client', 'Retrait client', 'Transfert transporteur'],
  },
  {
    id: 'network-point-10',
    name: 'Bonapriso Express',
    address: 'Avenue Charles de Gaulle',
    zoneId: 'zone-4',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '08:00',
      closesAt: '18:00',
    },
    geoLocation: {
      latitude: 4.0309,
      longitude: 9.6995,
      accuracyMeters: 32,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T09:40:00'),
    },
    organizationId: 'network-camship',
    organizationName: 'CamShip Relay',
    contactPhone: '+237 6 90 11 22 33',
    services: ['Depot client', 'Retrait client'],
  },
  {
    id: 'network-point-11',
    name: 'Bastos Point Relais',
    address: 'Rue Joseph Mballa Eloumden',
    zoneId: 'zone-5',
    isOpen: true,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      opensAt: '08:30',
      closesAt: '19:00',
    },
    geoLocation: {
      latitude: 3.8892,
      longitude: 11.5163,
      accuracyMeters: 29,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T09:50:00'),
    },
    organizationId: 'network-camship',
    organizationName: 'CamShip Relay',
    contactPhone: '+237 6 70 44 55 66',
    services: ['Retrait client', 'Retour marchand'],
  },
  {
    id: 'network-point-12',
    name: 'Melen Parcel Desk',
    address: 'Carrefour Melen',
    zoneId: 'zone-5',
    isOpen: false,
    openingHours: {
      days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      opensAt: '09:00',
      closesAt: '17:00',
    },
    geoLocation: {
      latitude: 3.8614,
      longitude: 11.5002,
      source: 'MANUAL',
      capturedByUserId: 'seed',
      capturedByName: 'Import reseau',
      capturedAt: new Date('2024-01-14T10:00:00'),
    },
    organizationId: 'network-central-africa-drop',
    organizationName: 'Central Africa Drop',
    contactPhone: '+237 6 88 10 20 30',
    services: ['Depot client', 'Retrait client'],
  },
];

// Vehicles / Fleet
export const VEHICLES: Vehicle[] = [
  {
    id: 'vehicle-1',
    type: 'VAN',
    plate: 'AB-123-CD',
    maxVolume: 12,
    maxWeight: 1500,
    status: 'AVAILABLE',
  },
  {
    id: 'vehicle-2',
    type: 'MOTO',
    plate: 'EF-456-GH',
    maxVolume: 0.5,
    maxWeight: 50,
    status: 'IN_TRANSIT',
  },
  {
    id: 'vehicle-3',
    type: 'CAMION',
    plate: 'IJ-789-KL',
    maxVolume: 40,
    maxWeight: 5000,
    status: 'AVAILABLE',
  },
  {
    id: 'vehicle-4',
    type: 'VAN',
    plate: 'MN-012-OP',
    maxVolume: 15,
    maxWeight: 1800,
    status: 'MAINTENANCE',
  },
];

// Parcels
export const PARCELS: Parcel[] = [
  {
    id: 'parcel-1',
    trackingNumber: 'EXP-2024-001',
    senderName: 'Alice Bernard',
    senderPhone: '+33 6 12 34 56 78',
    recipientName: 'Marc Petit',
    weight: 2.5,
    volume: 0.03,
    description: 'Boite de medicaments',
    declaredValue: 85,
    packageCondition: 'GOOD',
    senderKyc: {
      documentType: 'CNI',
      documentNumber: 'AB123456',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-15T09:45:00'),
    },
    status: 'DELIVERED',
    originPointId: 'point-1',
    destinationPointId: 'point-2',
    pickupReadiness: 'READY',
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-16T14:30:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-15T10:00:00'), actorId: 'client', actorName: 'Alice Bernard', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-15T11:30:00'), actorId: 'collector-1', actorName: 'Jean Bastos', location: 'Pharmacie du Centre' },
      { status: 'IN_TRANSIT', timestamp: new Date('2024-01-15T14:00:00'), actorId: 'transporter-1', actorName: 'Pierre Van', location: 'En route', vehicleId: 'vehicle-1' },
      { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date('2024-01-16T09:00:00'), actorId: 'transporter-1', actorName: 'Pierre Van', location: 'Boutique Nord' },
      { status: 'DELIVERED', timestamp: new Date('2024-01-16T14:30:00'), actorId: 'collector-2', actorName: 'Sophie Martin', location: 'Boutique Nord' },
    ],
  },
  {
    id: 'parcel-2',
    trackingNumber: 'EXP-2024-002',
    senderName: 'Claire Dubois',
    senderPhone: '+33 6 22 11 44 55',
    recipientName: 'Thomas Grand',
    weight: 5.0,
    volume: 0.08,
    description: 'Pieces detachees auto',
    declaredValue: 220,
    packageCondition: 'FRAGILE',
    senderKyc: {
      documentType: 'PASSPORT',
      documentNumber: 'FR552198',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-16T08:40:00'),
    },
    status: 'IN_TRANSIT',
    originPointId: 'point-1',
    destinationPointId: 'point-3',
    currentVehicleId: 'vehicle-2',
    groupId: 'group-2',
    pickupReadiness: 'READY',
    createdAt: new Date('2024-01-16T09:00:00'),
    updatedAt: new Date('2024-01-16T15:00:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-16T09:00:00'), actorId: 'client', actorName: 'Claire Dubois', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-16T10:30:00'), actorId: 'collector-1', actorName: 'Jean Bastos', location: 'Pharmacie du Centre' },
      { status: 'IN_TRANSIT', timestamp: new Date('2024-01-16T15:00:00'), actorId: 'transporter-2', actorName: 'Lucas Rapide', location: 'En route', vehicleId: 'vehicle-2' },
    ],
  },
  {
    id: 'parcel-3',
    trackingNumber: 'EXP-2024-003',
    senderName: 'Paul Martin',
    senderPhone: '+33 6 98 76 54 32',
    recipientName: 'Emma Blanc',
    weight: 1.2,
    volume: 0.01,
    description: 'Documents contractuels',
    declaredValue: 35,
    packageCondition: 'GOOD',
    senderKyc: {
      documentType: 'CNI',
      documentNumber: 'PM443210',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-17T07:50:00'),
    },
    status: 'RECEIVED_AT_COLLECTION_POINT',
    originPointId: 'point-2',
    destinationPointId: 'point-1',
    pickupReadiness: 'PENDING',
    createdAt: new Date('2024-01-17T08:00:00'),
    updatedAt: new Date('2024-01-17T09:30:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-17T08:00:00'), actorId: 'client', actorName: 'Paul Martin', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-17T09:30:00'), actorId: 'collector-2', actorName: 'Sophie Martin', location: 'Boutique Nord' },
    ],
  },
  {
    id: 'parcel-4',
    trackingNumber: 'EXP-2024-004',
    senderName: 'Julie Noir',
    senderPhone: '+33 6 77 88 91 12',
    recipientName: 'David Rouge',
    weight: 3.8,
    volume: 0.05,
    description: 'Cosmetiques scelles',
    declaredValue: 140,
    packageCondition: 'FRAGILE',
    senderKyc: {
      documentType: 'CNI',
      documentNumber: 'JN778811',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-17T09:35:00'),
    },
    status: 'CREATED',
    originPointId: 'point-3',
    destinationPointId: 'point-2',
    pickupReadiness: 'PENDING',
    createdAt: new Date('2024-01-17T10:00:00'),
    updatedAt: new Date('2024-01-17T10:00:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-17T10:00:00'), actorId: 'client', actorName: 'Julie Noir', location: 'En ligne' },
    ],
  },
  {
    id: 'parcel-5',
    trackingNumber: 'EXP-2024-005',
    senderName: 'Nicolas Vert',
    senderPhone: '+33 6 18 27 36 45',
    recipientName: 'Laura Bleu',
    weight: 0.8,
    volume: 0.015,
    description: 'Accessoires telephonie',
    declaredValue: 60,
    packageCondition: 'GOOD',
    senderKyc: {
      documentType: 'PERMIS_DE_CONDUIRE',
      documentNumber: 'NV102938',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-16T10:40:00'),
    },
    status: 'IN_TRANSIT',
    originPointId: 'point-1',
    destinationPointId: 'point-2',
    currentVehicleId: 'vehicle-2',
    groupId: 'group-2',
    pickupReadiness: 'READY',
    createdAt: new Date('2024-01-16T11:00:00'),
    updatedAt: new Date('2024-01-16T16:00:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-16T11:00:00'), actorId: 'client', actorName: 'Nicolas Vert', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-16T12:00:00'), actorId: 'collector-1', actorName: 'Jean Bastos', location: 'Pharmacie du Centre' },
      { status: 'IN_TRANSIT', timestamp: new Date('2024-01-16T16:00:00'), actorId: 'transporter-2', actorName: 'Lucas Rapide', location: 'En route', vehicleId: 'vehicle-2' },
    ],
  },
  {
    id: 'parcel-6',
    trackingNumber: 'EXP-2024-006',
    senderName: 'Marie Rose',
    senderPhone: '+33 6 54 44 33 22',
    recipientName: 'Antoine Gris',
    weight: 4.2,
    volume: 0.09,
    description: 'Textiles premium',
    declaredValue: 180,
    packageCondition: 'GOOD',
    senderKyc: {
      documentType: 'PASSPORT',
      documentNumber: 'MR667700',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-15T13:35:00'),
    },
    status: 'ARRIVED_AT_DESTINATION',
    originPointId: 'point-2',
    destinationPointId: 'point-3',
    pickupReadiness: 'READY',
    createdAt: new Date('2024-01-15T14:00:00'),
    updatedAt: new Date('2024-01-17T08:00:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-15T14:00:00'), actorId: 'client', actorName: 'Marie Rose', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-15T15:30:00'), actorId: 'collector-2', actorName: 'Sophie Martin', location: 'Boutique Nord' },
      { status: 'IN_TRANSIT', timestamp: new Date('2024-01-16T08:00:00'), actorId: 'transporter-1', actorName: 'Pierre Van', location: 'En route', vehicleId: 'vehicle-1' },
      { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date('2024-01-17T08:00:00'), actorId: 'transporter-1', actorName: 'Pierre Van', location: 'Relais Express Sud' },
    ],
  },
  {
    id: 'parcel-7',
    trackingNumber: 'EXP-2024-007',
    senderName: 'Hugo Jaune',
    senderPhone: '+33 6 70 80 90 10',
    recipientName: 'Camille Orange',
    weight: 2.0,
    volume: 0.025,
    description: 'Produits cosmetiques',
    declaredValue: 95,
    packageCondition: 'FRAGILE',
    senderKyc: {
      documentType: 'CNI',
      documentNumber: 'HJ019283',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-17T06:55:00'),
    },
    status: 'RECEIVED_AT_COLLECTION_POINT',
    originPointId: 'point-1',
    destinationPointId: 'point-3',
    pickupReadiness: 'PENDING',
    createdAt: new Date('2024-01-17T07:00:00'),
    updatedAt: new Date('2024-01-17T08:30:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-17T07:00:00'), actorId: 'client', actorName: 'Hugo Jaune', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-17T08:30:00'), actorId: 'collector-1', actorName: 'Jean Bastos', location: 'Pharmacie du Centre' },
    ],
  },
  {
    id: 'parcel-8',
    trackingNumber: 'EXP-2024-008',
    senderName: 'Léa Violet',
    senderPhone: '+33 6 15 25 35 45',
    recipientName: 'Maxime Indigo',
    weight: 6.5,
    volume: 0.18,
    description: 'Petit electromenager',
    declaredValue: 310,
    packageCondition: 'FRAGILE',
    senderKyc: {
      documentType: 'PASSPORT',
      documentNumber: 'LV550021',
      verificationStatus: 'PENDING_REVIEW',
      verifiedAt: new Date('2024-01-16T12:40:00'),
    },
    status: 'REJECTED',
    originPointId: 'point-3',
    destinationPointId: 'point-1',
    pickupReadiness: 'PENDING',
    createdAt: new Date('2024-01-16T13:00:00'),
    updatedAt: new Date('2024-01-16T14:00:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-16T13:00:00'), actorId: 'client', actorName: 'Léa Violet', location: 'En ligne' },
      { status: 'REJECTED', timestamp: new Date('2024-01-16T14:00:00'), actorId: 'collector-1', actorName: 'Jean Bastos', location: 'Relais Express Sud' },
    ],
  },
  {
    id: 'parcel-9',
    trackingNumber: 'EXP-2024-009',
    senderName: 'Olivier Brun',
    senderPhone: '+33 6 23 45 67 89',
    recipientName: 'Sarah Beige',
    weight: 1.5,
    volume: 0.02,
    description: 'Dossier papier',
    declaredValue: 40,
    packageCondition: 'GOOD',
    senderKyc: {
      documentType: 'CNI',
      documentNumber: 'OB450987',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-17T10:20:00'),
    },
    status: 'CREATED',
    originPointId: 'point-2',
    destinationPointId: 'point-3',
    pickupReadiness: 'PENDING',
    createdAt: new Date('2024-01-17T11:00:00'),
    updatedAt: new Date('2024-01-17T11:00:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-17T11:00:00'), actorId: 'client', actorName: 'Olivier Brun', location: 'En ligne' },
    ],
  },
  {
    id: 'parcel-10',
    trackingNumber: 'EXP-2024-010',
    senderName: 'Chloé Cyan',
    senderPhone: '+33 6 66 77 88 99',
    recipientName: 'Théo Magenta',
    weight: 3.0,
    volume: 0.06,
    description: 'Vetements enfant',
    declaredValue: 120,
    packageCondition: 'GOOD',
    senderKyc: {
      documentType: 'PERMIS_DE_CONDUIRE',
      documentNumber: 'CC882211',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-14T08:20:00'),
    },
    status: 'DELIVERED',
    originPointId: 'point-3',
    destinationPointId: 'point-2',
    pickupReadiness: 'READY',
    createdAt: new Date('2024-01-14T09:00:00'),
    updatedAt: new Date('2024-01-15T16:00:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-14T09:00:00'), actorId: 'client', actorName: 'Chloé Cyan', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-14T10:30:00'), actorId: 'collector-1', actorName: 'Jean Bastos', location: 'Relais Express Sud' },
      { status: 'IN_TRANSIT', timestamp: new Date('2024-01-14T14:00:00'), actorId: 'transporter-1', actorName: 'Pierre Van', location: 'En route', vehicleId: 'vehicle-1' },
      { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date('2024-01-15T10:00:00'), actorId: 'transporter-1', actorName: 'Pierre Van', location: 'Boutique Nord' },
      { status: 'DELIVERED', timestamp: new Date('2024-01-15T16:00:00'), actorId: 'collector-2', actorName: 'Sophie Martin', location: 'Boutique Nord' },
    ],
  },
  {
    id: 'parcel-11',
    trackingNumber: 'EXP-2024-011',
    senderName: 'Nadia Sable',
    senderPhone: '+33 6 32 54 76 98',
    recipientName: 'Kevin Ivoire',
    weight: 2.7,
    volume: 0.04,
    description: 'Boite textile',
    packageCondition: 'GOOD',
    senderKyc: {
      documentType: 'CNI',
      documentNumber: 'NS554433',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-17T07:20:00'),
    },
    status: 'RECEIVED_AT_COLLECTION_POINT',
    originPointId: 'point-1',
    destinationPointId: 'point-2',
    pickupReadiness: 'PENDING',
    createdAt: new Date('2024-01-17T07:30:00'),
    updatedAt: new Date('2024-01-17T09:10:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-17T07:30:00'), actorId: 'client', actorName: 'Nadia Sable', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-17T09:10:00'), actorId: 'collector-1', actorName: 'Jean Bastos', location: 'Pharmacie du Centre' },
    ],
  },
  {
    id: 'parcel-12',
    trackingNumber: 'EXP-2024-012',
    senderName: 'Boris Lin',
    senderPhone: '+33 6 41 52 63 74',
    recipientName: 'Helene Dor',
    weight: 3.3,
    volume: 0.05,
    description: 'Equipement bureau',
    packageCondition: 'FRAGILE',
    senderKyc: {
      documentType: 'PASSPORT',
      documentNumber: 'BL440011',
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date('2024-01-17T08:05:00'),
    },
    status: 'RECEIVED_AT_COLLECTION_POINT',
    originPointId: 'point-1',
    destinationPointId: 'point-3',
    pickupReadiness: 'PENDING',
    createdAt: new Date('2024-01-17T08:15:00'),
    updatedAt: new Date('2024-01-17T09:40:00'),
    history: [
      { status: 'CREATED', timestamp: new Date('2024-01-17T08:15:00'), actorId: 'client', actorName: 'Boris Lin', location: 'En ligne' },
      { status: 'RECEIVED_AT_COLLECTION_POINT', timestamp: new Date('2024-01-17T09:40:00'), actorId: 'collector-1', actorName: 'Jean Bastos', location: 'Pharmacie du Centre' },
    ],
  },
];

// Transfer Requests
export const TRANSFER_REQUESTS: TransferRequest[] = [
  {
    id: 'transfer-1',
    parcelIds: ['parcel-3', 'parcel-7'],
    transporterId: 'transporter-1',
    collectorId: 'collector-1',
    collectionPointId: 'point-1',
    status: 'PENDING',
    createdAt: new Date('2024-01-17T10:30:00'),
  },
  {
    id: 'transfer-2',
    parcelIds: ['parcel-9'],
    transporterId: 'transporter-2',
    collectorId: 'collector-2',
    collectionPointId: 'point-2',
    status: 'PENDING',
    createdAt: new Date('2024-01-17T11:30:00'),
  },
];

export const PARCEL_GROUPS: ParcelGroup[] = [
  {
    id: 'group-2',
    reference: 'LOT-2024-0002',
    scope: 'TRANSPORTER_TOUR',
    collectionPointId: 'point-1',
    vehicleId: 'vehicle-2',
    parcelIds: ['parcel-2', 'parcel-5'],
    createdByUserId: 'transporter-2',
    createdByName: 'Lucas Rapide',
    createdAt: new Date('2024-01-16T14:20:00'),
  },
];

export const PARCEL_NOTES: ParcelNote[] = [
  {
    id: 'note-1',
    targetType: 'GROUP',
    targetId: 'group-2',
    parcelIds: ['parcel-2', 'parcel-5'],
    authorId: 'transporter-2',
    authorName: 'Lucas Rapide',
    authorRole: 'TRANSPORTER',
    message: 'Depart confirme. Les clients peuvent se preparer a une livraison au point relais.',
    visibility: 'CLIENT',
    createdAt: new Date('2024-01-16T15:05:00'),
  },
  {
    id: 'note-2',
    targetType: 'PARCEL',
    targetId: 'parcel-3',
    parcelIds: ['parcel-3'],
    authorId: 'collector-2',
    authorName: 'Sophie Martin',
    authorRole: 'COLLECTOR',
    message: 'Colis controle et mis de cote pour le prochain chargement.',
    visibility: 'INTERNAL',
    createdAt: new Date('2024-01-17T09:35:00'),
  },
];

// Pricing Rules
export const PRICING_RULES: PricingRule[] = [
  {
    id: 'price-1',
    name: 'Standard Local',
    shipmentType: 'STANDARD',
    basePrice: 5.00,
    pricePerKg: 1.50,
    pricePerKm: 0.10,
    zoneMultiplier: 1.0,
  },
  {
    id: 'price-2',
    name: 'Express National',
    shipmentType: 'EXPRESS',
    basePrice: 12.00,
    pricePerKg: 2.00,
    pricePerKm: 0.15,
    zoneMultiplier: 1.5,
  },
  {
    id: 'price-3',
    shipmentType: 'ECONOMY',
    name: 'Économique',
    basePrice: 3.50,
    pricePerKg: 1.00,
    pricePerKm: 0.08,
    zoneMultiplier: 0.8,
  },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-free-trial',
    type: 'FREE_TRIAL',
    name: 'Free Trial',
    description: "Decouverte complete de l'application pendant 30 jours.",
    monthlyPrice: 0,
    currency: 'XAF',
    nationalShipmentLimit: 50,
    internationalShipmentLimit: 5,
    trialDays: 30,
    features: [
      '50 envois nationaux inclus',
      '5 envois internationaux inclus',
      'Carte des points de collecte',
      'Support email standard',
    ],
    upgradeRank: 1,
  },
  {
    id: 'plan-national-limited',
    type: 'NATIONAL_LIMITED',
    name: 'National Limite',
    description: 'Pour les operations locales avec un volume mensuel controle.',
    monthlyPrice: 49,
    currency: 'XAF',
    nationalShipmentLimit: 500,
    internationalShipmentLimit: 0,
    features: [
      '500 envois nationaux par mois',
      'Gestion des points de collecte',
      'Gestion equipe et roles',
      'Alertes de quota',
    ],
    upgradeRank: 2,
  },
  {
    id: 'plan-national-unlimited',
    type: 'NATIONAL_UNLIMITED',
    name: 'National Illimite',
    description: 'Pour les entreprises qui expedient sans limite au niveau national.',
    monthlyPrice: 99,
    currency: 'XAF',
    nationalShipmentLimit: null,
    internationalShipmentLimit: 0,
    features: [
      'Envois nationaux illimites',
      'Tableaux de bord operationnels',
      'Gestion flotte et transporteurs',
      'Support prioritaire',
    ],
    isRecommended: true,
    upgradeRank: 3,
  },
  {
    id: 'plan-international-limited',
    type: 'INTERNATIONAL_LIMITED',
    name: 'International Limite',
    description: 'Pour developper les flux internationaux avec une limite maitrisee.',
    monthlyPrice: 179,
    currency: 'XAF',
    nationalShipmentLimit: null,
    internationalShipmentLimit: 300,
    features: [
      'Envois nationaux illimites',
      '300 envois internationaux par mois',
      'Suivi multi-pays',
      'Support prioritaire',
    ],
    upgradeRank: 4,
  },
  {
    id: 'plan-international-unlimited',
    type: 'INTERNATIONAL_UNLIMITED',
    name: 'International Illimite',
    description: 'Pour les reseaux multi-pays sans limite operationnelle.',
    monthlyPrice: 299,
    currency: 'XAF',
    nationalShipmentLimit: null,
    internationalShipmentLimit: null,
    features: [
      'Envois nationaux illimites',
      'Envois internationaux illimites',
      'Support prioritaire et accompagnement',
      'Scalabilite reseau avancee',
    ],
    upgradeRank: 5,
  },
];

export const COMPANY_SUBSCRIPTION: CompanySubscription = {
  id: 'subscription-company-sendam',
  organizationId: 'company-sendam',
  planId: 'plan-national-limited',
  status: 'ACTIVE',
  currentPeriodStart: new Date('2026-05-01T00:00:00'),
  currentPeriodEnd: new Date('2026-05-31T23:59:59'),
  autoRenew: true,
  updatedAt: new Date('2026-05-09T10:00:00'),
};

export const SUBSCRIPTION_USAGE: SubscriptionUsage = {
  id: 'usage-company-sendam-2026-05',
  organizationId: 'company-sendam',
  periodStart: new Date('2026-05-01T00:00:00'),
  periodEnd: new Date('2026-05-31T23:59:59'),
  nationalUsed: 500,
  internationalUsed: 0,
  updatedAt: new Date('2026-05-09T10:00:00'),
};

// Helper functions
export function getStatusLabel(status: ParcelStatus): string {
  const labels: Record<ParcelStatus, string> = {
    CREATED: 'Créé',
    RECEIVED_AT_COLLECTION_POINT: 'Reçu au point',
    IN_TRANSIT: 'En transit',
    ARRIVED_AT_DESTINATION: 'Arrivé',
    DELIVERED: 'Livré',
    REJECTED: 'Rejeté',
  };
  return labels[status];
}

export function getKycDocumentLabel(type: KycDocumentType): string {
  const labels: Record<KycDocumentType, string> = {
    CNI: 'Carte nationale',
    PASSPORT: 'Passeport',
    PERMIS_DE_CONDUIRE: 'Permis de conduire',
  };

  return labels[type];
}

export function getKycVerificationStatusLabel(status: KycVerificationStatus): string {
  const labels: Record<KycVerificationStatus, string> = {
    VERIFIED: 'Verifie',
    PENDING_REVIEW: 'A revoir',
  };

  return labels[status];
}

export function getKycVerificationStatusColor(status: KycVerificationStatus): string {
  const colors: Record<KycVerificationStatus, string> = {
    VERIFIED: 'bg-success/20 text-success',
    PENDING_REVIEW: 'bg-warning/20 text-warning',
  };

  return colors[status];
}

export function getStatusColor(status: ParcelStatus): string {
  const colors: Record<ParcelStatus, string> = {
    CREATED: 'bg-muted text-muted-foreground',
    RECEIVED_AT_COLLECTION_POINT: 'bg-chart-1/20 text-chart-1',
    IN_TRANSIT: 'bg-warning/20 text-warning',
    ARRIVED_AT_DESTINATION: 'bg-chart-2/20 text-chart-2',
    DELIVERED: 'bg-success/20 text-success',
    REJECTED: 'bg-destructive/20 text-destructive',
  };
  return colors[status];
}

export function getVehicleTypeLabel(type: VehicleType): string {
  const labels: Record<VehicleType, string> = {
    MOTO: 'Moto',
    VAN: 'Van',
    CAMION: 'Camion',
    AVION: 'Avion',
  };
  return labels[type];
}

export function getVehicleStatusLabel(status: VehicleStatus): string {
  const labels: Record<VehicleStatus, string> = {
    AVAILABLE: 'Disponible',
    IN_TRANSIT: 'En transit',
    MAINTENANCE: 'Maintenance',
  };
  return labels[status];
}

export function getVehicleStatusColor(status: VehicleStatus): string {
  const colors: Record<VehicleStatus, string> = {
    AVAILABLE: 'bg-success/20 text-success',
    IN_TRANSIT: 'bg-warning/20 text-warning',
    MAINTENANCE: 'bg-destructive/20 text-destructive',
  };
  return colors[status];
}
