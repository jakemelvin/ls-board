import { apiClient } from '@/lib/api-client';
import type {
  AnnouncementRequest,
  AnnouncementRenewRequest,
  AnnouncementResponse,
  CollectionPointOption,
  TransportModeOption,
  ParcelTypeOption,
} from './types';

const base = (companyId: number) => `/api/delivery/companies/${companyId}`;

// ─── Announcements ──────────────────────────────────────────────────────────

export function getAnnouncements(
  token: string,
  companyId: number,
): Promise<AnnouncementResponse[]> {
  return apiClient.get<AnnouncementResponse[]>(`${base(companyId)}/announcements`, token);
}

export function getActiveAnnouncementsForClient(
  token: string,
): Promise<AnnouncementResponse[]> {
  return apiClient.get<AnnouncementResponse[]>('/api/delivery/announcements/active', token);
}

export function getAnnouncement(
  token: string,
  companyId: number,
  announcementId: number,
): Promise<AnnouncementResponse> {
  return apiClient.get<AnnouncementResponse>(
    `${base(companyId)}/announcements/${announcementId}`,
    token,
  );
}

export function createAnnouncement(
  token: string,
  companyId: number,
  data: AnnouncementRequest,
): Promise<AnnouncementResponse> {
  return apiClient.post<AnnouncementResponse>(
    `${base(companyId)}/announcements`,
    data,
    token,
  );
}

export function updateAnnouncement(
  token: string,
  companyId: number,
  announcementId: number,
  data: AnnouncementRequest,
): Promise<AnnouncementResponse> {
  return apiClient.put<AnnouncementResponse>(
    `${base(companyId)}/announcements/${announcementId}`,
    data,
    token,
  );
}

export function deleteAnnouncement(
  token: string,
  companyId: number,
  announcementId: number,
): Promise<unknown> {
  return apiClient.delete(
    `${base(companyId)}/announcements/${announcementId}`,
    token,
  );
}

export function renewAnnouncement(
  token: string,
  companyId: number,
  announcementId: number,
  data: AnnouncementRenewRequest,
): Promise<AnnouncementResponse> {
  return apiClient.patch<AnnouncementResponse>(
    `${base(companyId)}/announcements/${announcementId}/renew`,
    data,
    token,
  );
}

export function activateAnnouncement(
  token: string,
  companyId: number,
  announcementId: number,
): Promise<AnnouncementResponse> {
  return apiClient.patch<AnnouncementResponse>(
    `${base(companyId)}/announcements/${announcementId}/activate`,
    undefined,
    token,
  );
}

export function deactivateAnnouncement(
  token: string,
  companyId: number,
  announcementId: number,
): Promise<AnnouncementResponse> {
  return apiClient.patch<AnnouncementResponse>(
    `${base(companyId)}/announcements/${announcementId}/deactivate`,
    undefined,
    token,
  );
}

// ─── Support data ───────────────────────────────────────────────────────────

export function getCompanyCollectionPoints(
  token: string,
  companyId: number,
): Promise<CollectionPointOption[]> {
  return apiClient
    .get<
      {
        id: number;
        name: string;
        reference?: string;
        active?: boolean;
        manuallyClosed?: boolean;
        mobileAvailability?: boolean;
        city?: { cityName?: string };
        countryName?: string;
      }[]
    >(
      `${base(companyId)}/collection-points`,
      token,
    )
    .then((list) =>
      list.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        active: p.active,
        manuallyClosed: p.manuallyClosed,
        mobileAvailability: p.mobileAvailability,
        cityName: p.city?.cityName,
        countryName: p.countryName,
      })),
    );
}

export function getCompanyTransportModes(
  token: string,
  companyId: number,
): Promise<TransportModeOption[]> {
  return apiClient
    .get<{ companyId: number; transportModes: { id: number; name: string }[] }>(
      `${base(companyId)}/transport-modes`,
      token,
    )
    .then((res) => res.transportModes ?? []);
}

export function getCompanyParcelTypes(
  token: string,
  companyId: number,
): Promise<ParcelTypeOption[]> {
  return apiClient
    .get<{ companyId: number; parcelTypes: { id: number; name: string }[] }>(
      `${base(companyId)}/parcel-types`,
      token,
    )
    .then((res) => res.parcelTypes ?? []);
}
