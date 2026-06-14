import type { Page } from '@/lib/admin/types';
import type { Shipment, ShipmentStatus } from '@/lib/shipments/types';

export type SuperAdminShipmentStatusFilter = ShipmentStatus | 'ALL';

export interface SuperAdminShipmentCompanyOption {
  id: number;
  name: string;
}

export interface GetSuperAdminShipmentsParams {
  page?: number;
  size?: number;
  query?: string;
  status?: SuperAdminShipmentStatusFilter;
  companyId?: number | 'ALL';
  createdFrom?: string;
  createdTo?: string;
}

export interface SuperAdminShipmentPage extends Page<Shipment> {
  companies: SuperAdminShipmentCompanyOption[];
}

const COMPANIES: SuperAdminShipmentCompanyOption[] = [
  { id: 101, name: 'Sendam Express' },
  { id: 102, name: 'Urban Drop' },
  { id: 103, name: 'Africa Relay' },
  { id: 104, name: 'Euro Cargo Link' },
];

type ShipmentSeed = {
  id: number;
  reference: string;
  companyId: number;
  companyName: string;
  sender: string;
  receiver: string;
  senderPhone: string;
  receiverPhone: string;
  originCityName: string;
  originCountryName: string;
  destinationCityName: string;
  destinationCountryName: string;
  originPoint: string;
  destinationPoint: string;
  status: ShipmentStatus;
  priority: Shipment['priority'];
  paymentStatus: Shipment['paymentStatus'];
  price: number;
  weightKg: number;
  volumeM3: number;
  description: string;
  createdAt: string;
  actor: string;
};

const LIFECYCLE: ShipmentStatus[] = [
  'CREATED',
  'PAID',
  'AWAITING_DROP_OFF',
  'RECEIVED_AT_COLLECTION_POINT',
  'READY_FOR_TRANSPORT',
  'IN_TRANSIT',
  'ARRIVED_DESTINATION_POINT',
  'READY_FOR_PICKUP',
  'DELIVERED',
];

const MOCK_SEEDS: ShipmentSeed[] = [
  {
    id: 7001,
    reference: 'SHP-2026-07001',
    companyId: 101,
    companyName: 'Sendam Express',
    sender: 'Nadia Mbarga',
    receiver: 'Luc Moreau',
    senderPhone: '+237 6 70 11 22 33',
    receiverPhone: '+33 6 44 12 90 10',
    originCityName: 'Douala',
    originCountryName: 'Cameroun',
    destinationCityName: 'Paris',
    destinationCountryName: 'France',
    originPoint: 'Sendam Douala Akwa',
    destinationPoint: 'Pharmacie du Centre',
    status: 'DELIVERED',
    priority: 'EXPRESS',
    paymentStatus: 'PAID',
    price: 84.5,
    weightKg: 3.2,
    volumeM3: 0.05,
    description: 'Documents administratifs scelles.',
    createdAt: '2026-05-27T08:15:00.000Z',
    actor: 'amina.super',
  },
  {
    id: 7002,
    reference: 'SHP-2026-07002',
    companyId: 102,
    companyName: 'Urban Drop',
    sender: 'Claire Bernard',
    receiver: 'Mathis Nguema',
    senderPhone: '+33 6 22 10 44 55',
    receiverPhone: '+237 6 90 33 45 67',
    originCityName: 'Lyon',
    originCountryName: 'France',
    destinationCityName: 'Yaounde',
    destinationCountryName: 'Cameroun',
    originPoint: 'Relais Lyon Part-Dieu',
    destinationPoint: 'Sendam Yaounde Kennedy',
    status: 'IN_TRANSIT',
    priority: 'STANDARD',
    paymentStatus: 'PAID',
    price: 62,
    weightKg: 5.4,
    volumeM3: 0.12,
    description: 'Pieces detachees auto.',
    createdAt: '2026-05-29T10:30:00.000Z',
    actor: 'operations.urban',
  },
  {
    id: 7003,
    reference: 'SHP-2026-07003',
    companyId: 103,
    companyName: 'Africa Relay',
    sender: 'Paul Fotso',
    receiver: 'Emma Blanc',
    senderPhone: '+237 6 71 15 16 17',
    receiverPhone: '+33 6 13 45 67 89',
    originCityName: 'Yaounde',
    originCountryName: 'Cameroun',
    destinationCityName: 'Marseille',
    destinationCountryName: 'France',
    originPoint: 'Agence Bastos',
    destinationPoint: 'Depot Marseille Prado',
    status: 'READY_FOR_PICKUP',
    priority: 'EXPRESS',
    paymentStatus: 'PAYMENT_AT_COLLECTION_POINT',
    price: 73.9,
    weightKg: 1.1,
    volumeM3: 0.02,
    description: 'Enveloppe juridique.',
    createdAt: '2026-06-01T07:45:00.000Z',
    actor: 'collector.bastos',
  },
  {
    id: 7004,
    reference: 'SHP-2026-07004',
    companyId: 101,
    companyName: 'Sendam Express',
    sender: 'Julie Eboa',
    receiver: 'David Rouge',
    senderPhone: '+237 6 55 88 91 12',
    receiverPhone: '+33 6 77 40 41 42',
    originCityName: 'Douala',
    originCountryName: 'Cameroun',
    destinationCityName: 'Lille',
    destinationCountryName: 'France',
    originPoint: 'Sendam Douala Akwa',
    destinationPoint: 'Sendam Lille Centre',
    status: 'RECEIVED_AT_COLLECTION_POINT',
    priority: 'STANDARD',
    paymentStatus: 'UNPAID',
    price: 41.25,
    weightKg: 2.8,
    volumeM3: 0.04,
    description: 'Cosmetiques scelles.',
    createdAt: '2026-06-02T12:00:00.000Z',
    actor: 'jean.collect',
  },
  {
    id: 7005,
    reference: 'SHP-2026-07005',
    companyId: 104,
    companyName: 'Euro Cargo Link',
    sender: 'Nicolas Vert',
    receiver: 'Laura Bleu',
    senderPhone: '+33 6 18 27 36 45',
    receiverPhone: '+237 6 77 10 10 10',
    originCityName: 'Paris',
    originCountryName: 'France',
    destinationCityName: 'Douala',
    destinationCountryName: 'Cameroun',
    originPoint: 'Agence Republique',
    destinationPoint: 'Sendam Douala Akwa',
    status: 'ARRIVED_DESTINATION_POINT',
    priority: 'STANDARD',
    paymentStatus: 'PAID',
    price: 58.75,
    weightKg: 0.8,
    volumeM3: 0.015,
    description: 'Accessoires telephonie.',
    createdAt: '2026-06-03T09:25:00.000Z',
    actor: 'lucas.transit',
  },
  {
    id: 7006,
    reference: 'SHP-2026-07006',
    companyId: 103,
    companyName: 'Africa Relay',
    sender: 'Marie Rose',
    receiver: 'Antoine Gris',
    senderPhone: '+237 6 54 44 33 22',
    receiverPhone: '+33 6 65 70 80 90',
    originCityName: 'Douala',
    originCountryName: 'Cameroun',
    destinationCityName: 'Paris',
    destinationCountryName: 'France',
    originPoint: 'Sendam Douala Akwa',
    destinationPoint: 'Relais Montmartre',
    status: 'CANCELLED',
    priority: 'EXPRESS',
    paymentStatus: 'UNPAID',
    price: 0,
    weightKg: 4.2,
    volumeM3: 0.09,
    description: 'Textiles premium.',
    createdAt: '2026-06-04T15:10:00.000Z',
    actor: 'support.africa',
  },
  {
    id: 7007,
    reference: 'SHP-2026-07007',
    companyId: 102,
    companyName: 'Urban Drop',
    sender: 'Hugo Jaune',
    receiver: 'Camille Orange',
    senderPhone: '+33 6 70 80 90 10',
    receiverPhone: '+237 6 33 21 21 21',
    originCityName: 'Lille',
    originCountryName: 'France',
    destinationCityName: 'Yaounde',
    destinationCountryName: 'Cameroun',
    originPoint: 'Sendam Lille Centre',
    destinationPoint: 'Sendam Yaounde Kennedy',
    status: 'READY_FOR_TRANSPORT',
    priority: 'STANDARD',
    paymentStatus: 'PAID',
    price: 39.99,
    weightKg: 2,
    volumeM3: 0.025,
    description: 'Produits cosmetiques.',
    createdAt: '2026-06-06T06:55:00.000Z',
    actor: 'sophie.collect',
  },
  {
    id: 7008,
    reference: 'SHP-2026-07008',
    companyId: 104,
    companyName: 'Euro Cargo Link',
    sender: 'Lea Violet',
    receiver: 'Maxime Indigo',
    senderPhone: '+33 6 15 25 35 45',
    receiverPhone: '+237 6 88 99 00 11',
    originCityName: 'Marseille',
    originCountryName: 'France',
    destinationCityName: 'Douala',
    destinationCountryName: 'Cameroun',
    originPoint: 'Depot Marseille Prado',
    destinationPoint: 'Sendam Douala Akwa',
    status: 'RETURNED',
    priority: 'STANDARD',
    paymentStatus: 'PAID',
    price: 67.4,
    weightKg: 6.5,
    volumeM3: 0.18,
    description: 'Petit electromenager.',
    createdAt: '2026-06-07T13:00:00.000Z',
    actor: 'quality.euro',
  },
  {
    id: 7009,
    reference: 'SHP-2026-07009',
    companyId: 101,
    companyName: 'Sendam Express',
    sender: 'Samuel Meka',
    receiver: 'Ariane Dupont',
    senderPhone: '+237 6 11 22 33 44',
    receiverPhone: '+33 6 10 20 30 40',
    originCityName: 'Yaounde',
    originCountryName: 'Cameroun',
    destinationCityName: 'Paris',
    destinationCountryName: 'France',
    originPoint: 'Sendam Yaounde Kennedy',
    destinationPoint: 'Agence Republique',
    status: 'PAID',
    priority: 'EXPRESS',
    paymentStatus: 'PAID',
    price: 52.15,
    weightKg: 0.6,
    volumeM3: 0.01,
    description: 'Contrat signe.',
    createdAt: '2026-06-09T08:05:00.000Z',
    actor: 'web.checkout',
  },
  {
    id: 7010,
    reference: 'SHP-2026-07010',
    companyId: 103,
    companyName: 'Africa Relay',
    sender: 'Mireille Talla',
    receiver: 'Benoit Caron',
    senderPhone: '+237 6 23 45 67 89',
    receiverPhone: '+33 6 98 76 54 32',
    originCityName: 'Douala',
    originCountryName: 'Cameroun',
    destinationCityName: 'Lyon',
    destinationCountryName: 'France',
    originPoint: 'Sendam Douala Akwa',
    destinationPoint: 'Relais Lyon Part-Dieu',
    status: 'AWAITING_DROP_OFF',
    priority: 'STANDARD',
    paymentStatus: 'PAYMENT_AT_COLLECTION_POINT',
    price: 47,
    weightKg: 1.7,
    volumeM3: 0.03,
    description: 'Bijoux fantaisie declares.',
    createdAt: '2026-06-10T16:40:00.000Z',
    actor: 'client.portal',
  },
  {
    id: 7011,
    reference: 'SHP-2026-07011',
    companyId: 102,
    companyName: 'Urban Drop',
    sender: 'Olivier Kenfack',
    receiver: 'Maya Petit',
    senderPhone: '+237 6 45 45 45 45',
    receiverPhone: '+33 6 30 31 32 33',
    originCityName: 'Douala',
    originCountryName: 'Cameroun',
    destinationCityName: 'Lille',
    destinationCountryName: 'France',
    originPoint: 'Sendam Douala Akwa',
    destinationPoint: 'Sendam Lille Centre',
    status: 'CREATED',
    priority: 'STANDARD',
    paymentStatus: 'UNPAID',
    price: 35.2,
    weightKg: 0.9,
    volumeM3: 0.02,
    description: 'Vetements enfants.',
    createdAt: '2026-06-12T09:10:00.000Z',
    actor: 'client.portal',
  },
  {
    id: 7012,
    reference: 'SHP-2026-07012',
    companyId: 104,
    companyName: 'Euro Cargo Link',
    sender: 'Ruth Bell',
    receiver: 'Diane Assomo',
    senderPhone: '+33 6 61 62 63 64',
    receiverPhone: '+237 6 41 42 43 44',
    originCityName: 'Paris',
    originCountryName: 'France',
    destinationCityName: 'Yaounde',
    destinationCountryName: 'Cameroun',
    originPoint: 'Relais Montmartre',
    destinationPoint: 'Sendam Yaounde Kennedy',
    status: 'IN_TRANSIT',
    priority: 'EXPRESS',
    paymentStatus: 'PAID',
    price: 91.1,
    weightKg: 7.8,
    volumeM3: 0.22,
    description: 'Materiel informatique assure.',
    createdAt: '2026-06-13T11:20:00.000Z',
    actor: 'pierre.transit',
  },
];

const MOCK_SHIPMENTS = MOCK_SEEDS.map(toShipment).sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
);

export async function getSuperAdminShipments(
  _token: string,
  params: GetSuperAdminShipmentsParams = {},
): Promise<SuperAdminShipmentPage> {
  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const filtered = filterShipments(MOCK_SHIPMENTS, params);
  const content = filtered.slice(page * size, page * size + size);
  const totalPages = Math.ceil(filtered.length / size);

  return Promise.resolve({
    content,
    totalPages,
    totalElements: filtered.length,
    number: page,
    size,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
    companies: COMPANIES,
  });
}

export async function getSuperAdminShipment(
  _token: string,
  shipmentId: number,
): Promise<Shipment> {
  const shipment = MOCK_SHIPMENTS.find((item) => item.id === shipmentId);

  if (!shipment) {
    throw new Error('Shipment not found');
  }

  return Promise.resolve(shipment);
}

function filterShipments(
  shipments: Shipment[],
  params: GetSuperAdminShipmentsParams,
) {
  const query = params.query?.trim().toLowerCase();
  const status = params.status && params.status !== 'ALL' ? params.status : undefined;
  const companyId = params.companyId && params.companyId !== 'ALL' ? params.companyId : undefined;
  const createdFrom = params.createdFrom ? new Date(`${params.createdFrom}T00:00:00`) : undefined;
  const createdTo = params.createdTo ? new Date(`${params.createdTo}T23:59:59`) : undefined;

  return shipments.filter((shipment) => {
    if (status && shipment.status !== status) return false;
    if (companyId && shipment.companyId !== companyId) return false;

    const createdAt = new Date(shipment.createdAt);
    if (createdFrom && createdAt < createdFrom) return false;
    if (createdTo && createdAt > createdTo) return false;

    if (!query) return true;

    return [
      shipment.reference,
      shipment.code,
      shipment.companyName,
      shipment.sender?.fullName,
      shipment.receiver?.fullName,
      shipment.originCityName,
      shipment.destinationCityName,
      shipment.originCollectionPoint?.name,
      shipment.destinationCollectionPoint?.name,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });
}

function toShipment(seed: ShipmentSeed): Shipment {
  const statusHistory = buildStatusHistory(seed.status, seed.createdAt, seed.actor);
  const updatedAt = statusHistory.at(-1)?.changedAt ?? seed.createdAt;

  return {
    id: seed.id,
    reference: seed.reference,
    code: `CODE-${String(seed.id).slice(-4)}`,
    clientUserId: seed.id + 1000,
    createdByUserId: seed.id + 2000,
    companyId: seed.companyId,
    companyName: seed.companyName,
    originCountryName: seed.originCountryName,
    originCityName: seed.originCityName,
    destinationCountryName: seed.destinationCountryName,
    destinationCityName: seed.destinationCityName,
    transportModeId: seed.priority === 'EXPRESS' ? 2 : 1,
    transportModeName: seed.priority === 'EXPRESS' ? 'Express international' : 'Standard reseau',
    parcelTypeId: seed.weightKg > 5 ? 3 : 1,
    parcelTypeName: seed.weightKg > 5 ? 'Colis volumineux' : 'Colis standard',
    originCollectionPoint: {
      id: seed.companyId * 10 + 1,
      name: seed.originPoint,
      address: `${seed.originCityName}, ${seed.originCountryName}`,
      cityName: seed.originCityName,
      countryName: seed.originCountryName,
      phone: seed.senderPhone,
    },
    destinationCollectionPoint: {
      id: seed.companyId * 10 + 2,
      name: seed.destinationPoint,
      address: `${seed.destinationCityName}, ${seed.destinationCountryName}`,
      cityName: seed.destinationCityName,
      countryName: seed.destinationCountryName,
      phone: seed.receiverPhone,
    },
    priority: seed.priority,
    description: seed.description,
    volumeM3: seed.volumeM3,
    weightKg: seed.weightKg,
    status: seed.status,
    paymentStatus: seed.paymentStatus,
    paymentCollectionMode:
      seed.paymentStatus === 'PAYMENT_AT_COLLECTION_POINT'
        ? 'COLLECTION_POINT'
        : 'PLATFORM',
    companyPrice: Number((seed.price * 0.86).toFixed(2)),
    feeAmount: Number((seed.price * 0.1).toFixed(2)),
    discountAmount: seed.priority === 'EXPRESS' ? 0 : 2,
    price: seed.price,
    sender: {
      fullName: seed.sender,
      whatsappNumber: seed.senderPhone,
      address: seed.originPoint,
      countryName: seed.originCountryName,
      cityName: seed.originCityName,
      usesRegisteredProfile: true,
      idCardNumber: `ID-${seed.id}`,
    },
    receiver: {
      fullName: seed.receiver,
      whatsappNumber: seed.receiverPhone,
      address: seed.destinationPoint,
      countryName: seed.destinationCountryName,
      cityName: seed.destinationCityName,
      usesRegisteredProfile: false,
    },
    photos: [],
    statusHistory,
    createdAt: seed.createdAt,
    updatedAt,
    createdBy: seed.actor,
  };
}

function buildStatusHistory(status: ShipmentStatus, createdAt: string, actor: string) {
  const statuses = getHistoryStatuses(status);
  const baseDate = new Date(createdAt);

  return statuses.map((toStatus, index) => {
    const fromStatus = index > 0 ? statuses[index - 1] : undefined;
    const changedAt = new Date(baseDate.getTime() + index * 5 * 60 * 60 * 1000);

    return {
      id: Number(`${baseDate.getTime()}${index}`.slice(-9)),
      fromStatus,
      toStatus,
      changedAt: changedAt.toISOString(),
      changedByUsername: index === 0 ? actor : actorForStatus(toStatus),
      note: noteForStatus(toStatus),
    };
  });
}

function getHistoryStatuses(status: ShipmentStatus) {
  if (status === 'CANCELLED') {
    return ['CREATED', 'PAID', 'CANCELLED'] satisfies ShipmentStatus[];
  }

  if (status === 'RETURNED') {
    return [
      'CREATED',
      'PAID',
      'AWAITING_DROP_OFF',
      'RECEIVED_AT_COLLECTION_POINT',
      'READY_FOR_TRANSPORT',
      'IN_TRANSIT',
      'ARRIVED_DESTINATION_POINT',
      'RETURNED',
    ] satisfies ShipmentStatus[];
  }

  const currentIndex = LIFECYCLE.indexOf(status);
  return LIFECYCLE.slice(0, currentIndex + 1);
}

function actorForStatus(status: ShipmentStatus) {
  switch (status) {
    case 'RECEIVED_AT_COLLECTION_POINT':
    case 'READY_FOR_PICKUP':
    case 'DELIVERED':
      return 'collector.ops';
    case 'READY_FOR_TRANSPORT':
    case 'IN_TRANSIT':
    case 'ARRIVED_DESTINATION_POINT':
    case 'RETURNED':
      return 'transporter.ops';
    case 'CANCELLED':
      return 'support.ops';
    default:
      return 'system';
  }
}

function noteForStatus(status: ShipmentStatus) {
  switch (status) {
    case 'CREATED':
      return 'Shipment cree depuis le portail client.';
    case 'PAID':
      return 'Paiement ou intention de paiement enregistree.';
    case 'AWAITING_DROP_OFF':
      return 'Depot client attendu au point origine.';
    case 'RECEIVED_AT_COLLECTION_POINT':
      return 'Colis controle par le collecteur origine.';
    case 'READY_FOR_TRANSPORT':
      return 'Shipment disponible pour prise transporteur.';
    case 'IN_TRANSIT':
      return 'Shipment embarque et suivi en transit.';
    case 'ARRIVED_DESTINATION_POINT':
      return 'Arrivee confirmee au point destination.';
    case 'READY_FOR_PICKUP':
      return 'Destinataire notifie pour retrait.';
    case 'DELIVERED':
      return 'Code de retrait valide, shipment livre.';
    case 'CANCELLED':
      return 'Shipment annule avant depot operationnel.';
    case 'RETURNED':
      return 'Shipment retourne apres incident de livraison.';
    default:
      return undefined;
  }
}
