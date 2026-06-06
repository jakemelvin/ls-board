import type {
  Shipment,
  ShipmentDestinationDepositItemStatus,
  ShipmentDestinationDepositStatus,
  ShipmentPaymentCollectionMode,
  ShipmentPaymentStatus,
  ShipmentPriority,
  ShipmentStatus,
  ShipmentTransmissionStatus,
} from './types';

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  CREATED: 'Cree',
  PAID: 'Paye',
  AWAITING_DROP_OFF: 'En attente de depot',
  RECEIVED_AT_COLLECTION_POINT: 'Recu au point',
  READY_FOR_TRANSPORT: 'Pret au transport',
  IN_TRANSIT: 'En transit',
  ARRIVED_DESTINATION_POINT: 'Arrive au point destination',
  READY_FOR_PICKUP: 'Pret au retrait',
  DELIVERED: 'Livre',
  CANCELLED: 'Annule',
  RETURNED: 'Retourne',
};

export const SHIPMENT_PRIORITY_LABELS: Record<ShipmentPriority, string> = {
  STANDARD: 'Standard',
  EXPRESS: 'Express',
};

export const SHIPMENT_PAYMENT_STATUS_LABELS: Record<ShipmentPaymentStatus, string> = {
  UNPAID: 'Non paye',
  PAID: 'Paye',
  PAYMENT_AT_COLLECTION_POINT: 'Paiement au point',
};

export const SHIPMENT_COLLECTION_MODE_LABELS: Record<ShipmentPaymentCollectionMode, string> = {
  PLATFORM: 'Plateforme',
  COLLECTION_POINT: 'Point de collecte',
};

export function getShipmentStatusLabel(status: ShipmentStatus) {
  return SHIPMENT_STATUS_LABELS[status] ?? status;
}

export function getShipmentStatusClassName(status: ShipmentStatus) {
  switch (status) {
    case 'CREATED':
    case 'PAID':
    case 'AWAITING_DROP_OFF':
      return 'bg-muted text-muted-foreground';
    case 'RECEIVED_AT_COLLECTION_POINT':
    case 'READY_FOR_TRANSPORT':
    case 'READY_FOR_PICKUP':
      return 'bg-warning/15 text-warning';
    case 'IN_TRANSIT':
      return 'bg-primary/15 text-primary';
    case 'ARRIVED_DESTINATION_POINT':
      return 'bg-chart-2/15 text-chart-2';
    case 'DELIVERED':
      return 'bg-success/15 text-success';
    case 'CANCELLED':
    case 'RETURNED':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export const SHIPMENT_TRANSMISSION_STATUS_LABELS: Record<ShipmentTransmissionStatus, string> = {
  PENDING_COLLECTOR_APPROVAL: 'En attente collecteur',
  COLLECTOR_APPROVED: 'Approuvee',
  COLLECTOR_REJECTED: 'Rejetee',
  PARTIALLY_DISPATCHED: 'Partiellement embarquee',
  FULLY_DISPATCHED: 'Entierement embarquee',
};

export function getShipmentTransmissionStatusClassName(status: ShipmentTransmissionStatus) {
  switch (status) {
    case 'PENDING_COLLECTOR_APPROVAL':
      return 'bg-warning/15 text-warning';
    case 'COLLECTOR_APPROVED':
      return 'bg-primary/15 text-primary';
    case 'PARTIALLY_DISPATCHED':
      return 'bg-chart-2/15 text-chart-2';
    case 'FULLY_DISPATCHED':
      return 'bg-success/15 text-success';
    case 'COLLECTOR_REJECTED':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export const SHIPMENT_DESTINATION_DEPOSIT_STATUS_LABELS: Record<
  ShipmentDestinationDepositStatus,
  string
> = {
  PENDING_COLLECTOR_REVIEW: 'En attente de controle',
  FULLY_ACCEPTED: 'Acceptee',
  PARTIALLY_ACCEPTED: 'Partiellement acceptee',
  FULLY_REJECTED: 'Rejetee',
};

export function getShipmentDestinationDepositStatusClassName(
  status: ShipmentDestinationDepositStatus,
) {
  switch (status) {
    case 'PENDING_COLLECTOR_REVIEW':
      return 'bg-warning/15 text-warning';
    case 'FULLY_ACCEPTED':
      return 'bg-success/15 text-success';
    case 'PARTIALLY_ACCEPTED':
      return 'bg-chart-2/15 text-chart-2';
    case 'FULLY_REJECTED':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export const SHIPMENT_DESTINATION_DEPOSIT_ITEM_STATUS_LABELS: Record<
  ShipmentDestinationDepositItemStatus,
  string
> = {
  PENDING: 'En attente',
  ACCEPTED: 'Accepte',
  REJECTED: 'Rejete',
};

export function getShipmentDestinationDepositItemStatusClassName(
  status: ShipmentDestinationDepositItemStatus,
) {
  switch (status) {
    case 'PENDING':
      return 'bg-warning/15 text-warning';
    case 'ACCEPTED':
      return 'bg-success/15 text-success';
    case 'REJECTED':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function formatShipmentDate(value?: string) {
  if (!value) {
    return 'Non renseigne';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatShipmentMoney(value?: number) {
  if (value == null) {
    return 'Non renseigne';
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export function getShipmentSenderName(shipment: Shipment) {
  return shipment.sender?.fullName || 'Expediteur non renseigne';
}

export function getShipmentReceiverName(shipment: Shipment) {
  return shipment.receiver?.fullName || 'Destinataire non renseigne';
}

export function getShipmentOriginLabel(shipment: Shipment) {
  return shipment.originCollectionPoint?.name || shipment.originCityName || 'Origine non renseignee';
}

export function getShipmentDestinationLabel(shipment: Shipment) {
  return (
    shipment.destinationCollectionPoint?.name ||
    shipment.destinationCityName ||
    'Destination non renseignee'
  );
}
