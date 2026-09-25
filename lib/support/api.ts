import { apiClient } from '@/lib/api-client';
import type { SupportContactRequest, SupportContactResponse } from './types';

/** Returns the active support contacts exposed by the Delivery Service API. */
export function getActiveSupportContacts(
  token?: string | null,
): Promise<SupportContactResponse[]> {
  return apiClient.get<SupportContactResponse[]>('/api/delivery/support/contacts', token);
}

/** Returns all non-deleted contacts for the platform administration. */
export function getSupportContactsForAdministration(token: string): Promise<SupportContactResponse[]> {
  return apiClient.get<SupportContactResponse[]>('/api/delivery/support/contacts/admin', token);
}

export function createSupportContact(
  token: string,
  payload: SupportContactRequest,
): Promise<SupportContactResponse> {
  return apiClient.post<SupportContactResponse>('/api/delivery/support/contacts', payload, token);
}

export function updateSupportContact(
  token: string,
  id: number,
  payload: SupportContactRequest,
): Promise<SupportContactResponse> {
  return apiClient.put<SupportContactResponse>(`/api/delivery/support/contacts/${id}`, payload, token);
}

export function setSupportContactActive(
  token: string,
  id: number,
  active: boolean,
): Promise<SupportContactResponse> {
  return apiClient.patch<SupportContactResponse>(
    `/api/delivery/support/contacts/${id}/activation`,
    { active },
    token,
  );
}

/** The backend performs a logical deletion. */
export function deleteSupportContact(token: string, id: number): Promise<void> {
  return apiClient.delete<void>(`/api/delivery/support/contacts/${id}`, token);
}
