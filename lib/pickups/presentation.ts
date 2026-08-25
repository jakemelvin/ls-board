import type {
  ParcelPickupNegotiationStatus,
  ParcelPickupOpportunityStatus,
  ParcelPickupTrackingAction,
} from './types';

export const PICKUP_OPPORTUNITY_STATUS_KEYS: Record<ParcelPickupOpportunityStatus, string> = {
  ACTIVE: 'opportunityStatuses.ACTIVE',
  CLOSED: 'opportunityStatuses.CLOSED',
  CANCELLED: 'opportunityStatuses.CANCELLED',
};

export const PICKUP_NEGOTIATION_STATUS_KEYS: Record<ParcelPickupNegotiationStatus, string> = {
  PENDING_COMPANY_REVIEW: 'negotiationStatuses.PENDING_COMPANY_REVIEW',
  PENDING_CLIENT_REVIEW: 'negotiationStatuses.PENDING_CLIENT_REVIEW',
  REJECTED: 'negotiationStatuses.REJECTED',
  AWAITING_DEPOSIT_PAYMENT: 'negotiationStatuses.AWAITING_DEPOSIT_PAYMENT',
  DEPOSIT_PAYMENT_PENDING: 'negotiationStatuses.DEPOSIT_PAYMENT_PENDING',
  AGREED: 'negotiationStatuses.AGREED',
  PICKED_UP: 'negotiationStatuses.PICKED_UP',
  IN_TRANSIT: 'negotiationStatuses.IN_TRANSIT',
  DELIVERED: 'negotiationStatuses.DELIVERED',
  CANCELLED: 'negotiationStatuses.CANCELLED',
};

export const PICKUP_TRACKING_ACTION_KEYS: Record<ParcelPickupTrackingAction, string> = {
  PROPOSAL_CREATED: 'trackingActions.PROPOSAL_CREATED',
  COMPANY_ACCEPTED: 'trackingActions.COMPANY_ACCEPTED',
  COMPANY_REJECTED: 'trackingActions.COMPANY_REJECTED',
  DEPOSIT_PAYMENT_INITIATED: 'trackingActions.DEPOSIT_PAYMENT_INITIATED',
  DEPOSIT_PAYMENT_CONFIRMED: 'trackingActions.DEPOSIT_PAYMENT_CONFIRMED',
  DEPOSIT_PAYMENT_FAILED: 'trackingActions.DEPOSIT_PAYMENT_FAILED',
  PICKUP_CONFIRMED: 'trackingActions.PICKUP_CONFIRMED',
  TRANSPORT_STARTED: 'trackingActions.TRANSPORT_STARTED',
  DELIVERY_CONFIRMED: 'trackingActions.DELIVERY_CONFIRMED',
  CANCELLED: 'trackingActions.CANCELLED',
};

export function getPickupStatusClassName(
  status: ParcelPickupOpportunityStatus | ParcelPickupNegotiationStatus,
) {
  if (status === 'ACTIVE' || status === 'AGREED' || status === 'DELIVERED') {
    return 'bg-success/15 text-success';
  }
  if (status === 'PENDING_COMPANY_REVIEW' || status === 'PENDING_CLIENT_REVIEW' || status === 'AWAITING_DEPOSIT_PAYMENT') {
    return 'bg-warning/15 text-warning';
  }
  if (status === 'DEPOSIT_PAYMENT_PENDING' || status === 'PICKED_UP' || status === 'IN_TRANSIT') {
    return 'bg-primary/15 text-primary';
  }
  if (status === 'REJECTED') return 'bg-destructive/15 text-destructive';
  return 'bg-muted text-muted-foreground';
}

export function getNextPickupTrackingAction(
  status: ParcelPickupNegotiationStatus,
): ParcelPickupTrackingAction | null {
  if (status === 'AGREED') return 'PICKUP_CONFIRMED';
  if (status === 'PICKED_UP') return 'TRANSPORT_STARTED';
  if (status === 'IN_TRANSIT') return 'DELIVERY_CONFIRMED';
  return null;
}

