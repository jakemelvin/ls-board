import type { UserRole } from '@/lib/mock-data';

const TRANSPORTER_PARTY_LABEL_FALLBACK = 'Informations reservees';

export function getSenderDisplayName(
  senderName: string,
  currentRole: UserRole,
  restrictedLabel = TRANSPORTER_PARTY_LABEL_FALLBACK,
) {
  return currentRole === 'TRANSPORTER' ? restrictedLabel : senderName;
}

export function getRecipientDisplayName(
  recipientName: string,
  currentRole: UserRole,
  restrictedLabel = TRANSPORTER_PARTY_LABEL_FALLBACK,
) {
  return currentRole === 'TRANSPORTER' ? restrictedLabel : recipientName;
}

export function getSenderColumnLabel(currentRole: UserRole, senderLabel = 'Expediteur') {
  return senderLabel;
}

export function getRecipientColumnLabel(currentRole: UserRole, recipientLabel = 'Destinataire') {
  return recipientLabel;
}

export function getParcelHistoryActorDisplayName(
  actorId: string,
  actorName: string,
  currentRole: UserRole
) {
  if (currentRole === 'TRANSPORTER' && actorId === 'client') {
    return TRANSPORTER_PARTY_LABEL_FALLBACK;
  }

  return actorName;
}
