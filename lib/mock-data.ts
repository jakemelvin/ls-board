// Types
export type ParcelStatus = 'CREATED' | 'RECEIVED_AT_COLLECTION_POINT' | 'IN_TRANSIT' | 'ARRIVED_AT_DESTINATION' | 'DELIVERED' | 'REJECTED';
export type KycDocumentType = 'CNI' | 'PASSPORT' | 'PERMIS_DE_CONDUIRE';
export type KycVerificationStatus = 'VERIFIED' | 'PENDING_REVIEW';

export type VehicleType = 'MOTO' | 'VAN' | 'CAMION' | 'AVION';
export type VehicleStatus = 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE';

export type UserRole = 'ADMIN' | 'COLLECTOR' | 'TRANSPORTER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedPointId?: string;
  assignedVehicleId?: string;
  avatar?: string;
}

export interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  capacity: number;
  currentStock: number;
  responsibleId: string;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  plate: string;
  maxVolume: number; // m³
  maxWeight: number; // kg
  status: VehicleStatus;
  assignedTransporterId?: string;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  weight: number; // kg
  description: string;
  declaredValue: number;
  packageCondition: 'GOOD' | 'FRAGILE';
  senderKyc: {
    documentType: KycDocumentType;
    documentNumber: string;
    verificationStatus: KycVerificationStatus;
    verifiedAt: Date;
  };
  status: ParcelStatus;
  originPointId: string;
  destinationPointId: string;
  currentVehicleId?: string;
  createdAt: Date;
  updatedAt: Date;
  history: ParcelHistoryEntry[];
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
  transporterId: string;
  collectorId: string;
  collectionPointId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: Date;
}

export interface PricingRule {
  id: string;
  name: string;
  basePrice: number;
  pricePerKg: number;
  pricePerKm: number;
  zoneMultiplier: number;
}

// Demo accounts
export const DEMO_USERS: User[] = [
  {
    id: 'admin-1',
    email: 'admin@express.com',
    name: 'Marie Dupont',
    role: 'ADMIN',
    avatar: 'MD',
  },
  {
    id: 'collector-1',
    email: 'collecteur@bastos.com',
    name: 'Jean Bastos',
    role: 'COLLECTOR',
    assignedPointId: 'point-1',
    avatar: 'JB',
  },
  {
    id: 'collector-2',
    email: 'collecteur@nord.com',
    name: 'Sophie Martin',
    role: 'COLLECTOR',
    assignedPointId: 'point-2',
    avatar: 'SM',
  },
  {
    id: 'transporter-1',
    email: 'transporteur@van.com',
    name: 'Pierre Van',
    role: 'TRANSPORTER',
    assignedVehicleId: 'vehicle-1',
    avatar: 'PV',
  },
  {
    id: 'transporter-2',
    email: 'transporteur@moto.com',
    name: 'Lucas Rapide',
    role: 'TRANSPORTER',
    assignedVehicleId: 'vehicle-2',
    avatar: 'LR',
  },
];

// Collection Points
export const COLLECTION_POINTS: CollectionPoint[] = [
  {
    id: 'point-1',
    name: 'Pharmacie du Centre',
    address: '15 Rue de la Paix',
    city: 'Paris',
    capacity: 100,
    currentStock: 45,
    responsibleId: 'collector-1',
  },
  {
    id: 'point-2',
    name: 'Boutique Nord',
    address: '78 Avenue du Nord',
    city: 'Lille',
    capacity: 80,
    currentStock: 32,
    responsibleId: 'collector-2',
  },
  {
    id: 'point-3',
    name: 'Relais Express Sud',
    address: '42 Boulevard du Sud',
    city: 'Marseille',
    capacity: 120,
    currentStock: 67,
    responsibleId: 'collector-1',
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
    assignedTransporterId: 'transporter-1',
  },
  {
    id: 'vehicle-2',
    type: 'MOTO',
    plate: 'EF-456-GH',
    maxVolume: 0.5,
    maxWeight: 50,
    status: 'IN_TRANSIT',
    assignedTransporterId: 'transporter-2',
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

// Pricing Rules
export const PRICING_RULES: PricingRule[] = [
  {
    id: 'price-1',
    name: 'Standard Local',
    basePrice: 5.00,
    pricePerKg: 1.50,
    pricePerKm: 0.10,
    zoneMultiplier: 1.0,
  },
  {
    id: 'price-2',
    name: 'Express National',
    basePrice: 12.00,
    pricePerKg: 2.00,
    pricePerKm: 0.15,
    zoneMultiplier: 1.5,
  },
  {
    id: 'price-3',
    name: 'Économique',
    basePrice: 3.50,
    pricePerKg: 1.00,
    pricePerKm: 0.08,
    zoneMultiplier: 0.8,
  },
];

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
