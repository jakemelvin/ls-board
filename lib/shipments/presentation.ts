import type {
  Shipment,
  ShipmentDestinationDepositItemStatus,
  ShipmentDestinationDepositStatus,
  ShipmentPaymentCollectionMode,
  ShipmentPaymentStatus,
  ShipmentPriority,
  ShipmentStatus,
  ShipmentTransactionStatus,
  ShipmentTransmissionStatus,
} from './types';

export function getShipmentPaymentStatusClassName(status: ShipmentPaymentStatus) {
  switch (status) {
    case 'PAID':
      return 'bg-success/15 text-success';
    case 'PAYMENT_AT_COLLECTION_POINT':
      return 'bg-primary/15 text-primary';
    case 'UNPAID':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function getShipmentTransactionStatusClassName(status: ShipmentTransactionStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-success/15 text-success';
    case 'PLATFORM_FEE_PAID':
      return 'bg-warning/15 text-warning';
    case 'INITIATED':
      return 'bg-primary/15 text-primary';
    case 'FAILED':
    case 'CANCELLED':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-muted text-muted-foreground';
  }
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
