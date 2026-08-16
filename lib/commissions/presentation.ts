import type {
  CommissionBeneficiaryType,
  CommissionHistoryAction,
  CommissionPaymentBatchStatus,
  CommissionStatus,
} from './types';

export const COMMISSION_STATUS_CLASS_NAMES: Record<CommissionStatus, string> = {
  ACCRUED: 'bg-warning/15 text-warning',
  PAYMENT_PROPOSED: 'bg-primary/15 text-primary',
  PAYMENT_DISPUTED: 'bg-destructive/15 text-destructive',
  PAID: 'bg-success/15 text-success',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export const COMMISSION_BATCH_STATUS_CLASS_NAMES: Record<CommissionPaymentBatchStatus, string> = {
  AWAITING_BENEFICIARY_CONFIRMATION: 'bg-primary/15 text-primary',
  PAID: 'bg-success/15 text-success',
  REFUSED: 'bg-destructive/15 text-destructive',
  CANCELLED: 'bg-muted text-muted-foreground',
};

export const COMMISSION_STATUS_KEYS: Record<CommissionStatus, string> = {
  ACCRUED: 'statuses.ACCRUED',
  PAYMENT_PROPOSED: 'statuses.PAYMENT_PROPOSED',
  PAYMENT_DISPUTED: 'statuses.PAYMENT_DISPUTED',
  PAID: 'statuses.PAID',
  CANCELLED: 'statuses.CANCELLED',
};

export const COMMISSION_BATCH_STATUS_KEYS: Record<CommissionPaymentBatchStatus, string> = {
  AWAITING_BENEFICIARY_CONFIRMATION: 'batchStatuses.AWAITING_BENEFICIARY_CONFIRMATION',
  PAID: 'batchStatuses.PAID',
  REFUSED: 'batchStatuses.REFUSED',
  CANCELLED: 'batchStatuses.CANCELLED',
};

export const COMMISSION_ROLE_KEYS: Record<CommissionBeneficiaryType, string> = {
  COLLECTOR: 'roles.COLLECTOR',
  TRANSPORTER: 'roles.TRANSPORTER',
};

export const COMMISSION_HISTORY_ACTION_KEYS: Record<CommissionHistoryAction, string> = {
  ACCRUED: 'historyActions.ACCRUED',
  PAYMENT_DECLARED: 'historyActions.PAYMENT_DECLARED',
  PAYMENT_ACCEPTED: 'historyActions.PAYMENT_ACCEPTED',
  PAYMENT_REFUSED: 'historyActions.PAYMENT_REFUSED',
  PAYMENT_DECLARATION_CANCELLED: 'historyActions.PAYMENT_DECLARATION_CANCELLED',
};

