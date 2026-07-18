import { apiClient } from '@/lib/api-client';
import type {
  ChangePasswordRequest,
  CompanyResponse,
  CountryResponse,
  CreateCompanyRequest,
  ForgotPasswordRequest,
  ForgotPasswordVerifyRequest,
  LoginRequest,
  LoginResponse,
  MessageResponse,
  ResetPasswordRequest,
  UpdateUserProfileRequest,
  UserResponse,
  UserSearchResponse,
} from './types';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/api/delivery/auth/login', data);
}

export async function logout(token: string): Promise<void> {
  await apiClient.post<{ message: string }>('/api/delivery/auth/logout', {}, token);
}

export async function requestPasswordReset(
  data: ForgotPasswordRequest,
): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>('/api/delivery/users/forgot-password', data);
}

export async function verifyPasswordResetCode(
  data: ForgotPasswordVerifyRequest,
): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>('/api/delivery/users/forgot-password/verify', data);
}

export async function resetPassword(data: ResetPasswordRequest): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>('/api/delivery/users/forgot-password/reset', data);
}

export async function resendPasswordResetCode(
  data: ForgotPasswordRequest,
): Promise<MessageResponse> {
  return apiClient.post<MessageResponse>('/api/delivery/users/forgot-password/resend', data);
}

export async function getUser(token: string, userId: number): Promise<UserResponse> {
  return apiClient.get<UserResponse>(`/api/delivery/users/${userId}`, token);
}

export async function updateMyProfile(
  token: string,
  data: UpdateUserProfileRequest,
): Promise<UserResponse> {
  return apiClient.put<UserResponse>('/api/delivery/users/me', data, token);
}

export async function changePassword(
  token: string,
  userId: number,
  data: ChangePasswordRequest,
): Promise<MessageResponse> {
  return apiClient.put<MessageResponse>(`/api/delivery/users/${userId}/password`, data, token);
}

export async function uploadMyPhoto(token: string, photo: File): Promise<UserResponse> {
  const formData = new FormData();
  formData.append('photo', photo);
  return apiClient.postForm<UserResponse>('/api/delivery/users/me/photo', formData, token);
}

export async function registerCompany(
  data: CreateCompanyRequest,
  logo?: File,
  token?: string,
): Promise<CompanyResponse> {
  const formData = new FormData();
  formData.append(
    'data',
    new Blob([JSON.stringify(data)], { type: 'application/json' }),
  );
  if (logo) {
    formData.append('logo', logo);
  }
  return apiClient.postForm<CompanyResponse>('/api/delivery/companies', formData, token);
}

export async function getCountries(): Promise<CountryResponse[]> {
  return apiClient.getCached<CountryResponse[]>('/api/countries', null, 30 * 60_000);
}

export async function getOperationalServedCountries(): Promise<CountryResponse[]> {
  return apiClient.getCached<CountryResponse[]>(
    '/api/countries/operational-served',
    null,
    10 * 60_000,
  );
}

export async function searchUsers(
  token: string,
  query: { username?: string; phone?: string },
): Promise<UserSearchResponse[]> {
  const search = new URLSearchParams();
  if (query.username) search.set('username', query.username);
  if (query.phone) search.set('phone', query.phone);

  return apiClient.get<UserSearchResponse[]>(
    `/api/delivery/users/search?${search.toString()}`,
    token,
  );
}

export async function approveCompany(
  companyId: number,
  token: string,
): Promise<CompanyResponse> {
  return apiClient.put<CompanyResponse>(
    `/api/delivery/companies/${companyId}/approve`,
    undefined,
    token,
  );
}
