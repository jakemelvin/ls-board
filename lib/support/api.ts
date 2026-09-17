import { apiClient } from '@/lib/api-client';
import type { SupportContactResponse } from './types';

/** Returns the active support contacts exposed by the Delivery Service API. */
export function getActiveSupportContacts(
  token?: string | null,
): Promise<SupportContactResponse[]> {
  return apiClient.get<SupportContactResponse[]>('/api/delivery/support/contacts', token);
}
