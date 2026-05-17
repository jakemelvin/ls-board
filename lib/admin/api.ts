import { apiClient } from '@/lib/api-client';
import type {
  UserResponse,
  CompanyResponse,
  Page,
  PageParams,
  CompanyOperationalReadiness,
  ChangePasswordPayload,
  CommissionUpdatePayload,
  CreateUserRequest,
} from './types';

function buildPageQuery(params: PageParams): string {
  const p = params.page ?? 0;
  const s = params.size ?? 20;
  return `page=${p}&size=${s}`;
}

// ─── User APIs ─────────────────────────────────────────────────────────────

export function getUsers(token: string, params: PageParams = {}): Promise<Page<UserResponse>> {
  return apiClient.get<Page<UserResponse>>(
    `/api/delivery/users?${buildPageQuery(params)}`,
    token,
  );
}

export function getUser(token: string, id: number): Promise<UserResponse> {
  return apiClient.get<UserResponse>(`/api/delivery/users/${id}`, token);
}

export function activateUser(token: string, id: number): Promise<unknown> {
  return apiClient.put(`/api/delivery/users/${id}/activate`, undefined, token);
}

export function suspendUser(token: string, id: number): Promise<unknown> {
  return apiClient.put(`/api/delivery/users/${id}/suspend`, undefined, token);
}

export function deleteUser(token: string, id: number): Promise<unknown> {
  return apiClient.delete(`/api/delivery/users/${id}`, token);
}

export function updateUserPhone(
  token: string,
  id: number,
  phone: string,
): Promise<{ message: string }> {
  return apiClient.put<{ message: string }>(
    `/api/delivery/users/${id}/phone?phone=${encodeURIComponent(phone)}`,
    undefined,
    token,
  );
}

export function changeUserPassword(
  token: string,
  id: number,
  payload: ChangePasswordPayload,
): Promise<{ message: string }> {
  return apiClient.put<{ message: string }>(
    `/api/delivery/users/${id}/password`,
    payload,
    token,
  );
}

export function updateUserCommission(
  token: string,
  id: number,
  payload: CommissionUpdatePayload,
): Promise<UserResponse> {
  return apiClient.patch<UserResponse>(
    `/api/delivery/users/${id}/commission-percentage`,
    payload,
    token,
  );
}

export function createUser(
  token: string,
  data: CreateUserRequest,
): Promise<UserResponse> {
  return apiClient.post<UserResponse>('/api/delivery/users', data, token);
}

// ─── Company APIs ──────────────────────────────────────────────────────────

export function getCompanies(
  token: string,
  params: PageParams = {},
): Promise<Page<CompanyResponse>> {
  return apiClient.get<Page<CompanyResponse>>(
    `/api/delivery/companies?${buildPageQuery(params)}`,
    token,
  );
}

export function getCompany(token: string, id: number): Promise<CompanyResponse> {
  return apiClient.get<CompanyResponse>(`/api/delivery/companies/${id}`, token);
}

export function approveCompany(token: string, id: number): Promise<CompanyResponse> {
  return apiClient.put<CompanyResponse>(
    `/api/delivery/companies/${id}/approve`,
    undefined,
    token,
  );
}

export function deleteCompany(token: string, id: number): Promise<unknown> {
  return apiClient.delete(`/api/delivery/companies/${id}`, token);
}

export function getCompanyOperationalReadiness(
  token: string,
  id: number,
): Promise<CompanyOperationalReadiness> {
  return apiClient.get<CompanyOperationalReadiness>(
    `/api/delivery/companies/${id}/operational-readiness`,
    token,
  );
}

export function getCompanyEmployees(token: string, id: number): Promise<UserResponse[]> {
  return apiClient.get<UserResponse[]>(`/api/delivery/companies/${id}/employees`, token);
}
