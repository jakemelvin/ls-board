import type { UserRole } from '@/lib/mock-data';

export const TRANSPORTER_PARTY_LABEL = 'Informations reservees';

export function getSenderDisplayName(senderName: string, currentRole: UserRole) {
  return currentRole === 'TRANSPORTER' ? TRANSPORTER_PARTY_LABEL : senderName;
}

export function getRecipientDisplayName(recipientName: string, currentRole: UserRole) {
  return currentRole === 'TRANSPORTER' ? TRANSPORTER_PARTY_LABEL : recipientName;
}

export function getSenderColumnLabel(currentRole: UserRole) {
  return currentRole === 'TRANSPORTER' ? 'Expediteur' : 'Expediteur';
}

export function getRecipientColumnLabel(currentRole: UserRole) {
  return currentRole === 'TRANSPORTER' ? 'Destinataire' : 'Destinataire';
}

export function getParcelHistoryActorDisplayName(
  actorId: string,
  actorName: string,
  currentRole: UserRole
) {
  if (currentRole === 'TRANSPORTER' && actorId === 'client') {
    return TRANSPORTER_PARTY_LABEL;
  }

  return actorName;
}
