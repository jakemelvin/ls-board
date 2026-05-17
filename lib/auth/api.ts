import { apiClient } from '@/lib/api-client';
import type {
  LoginRequest,
  LoginResponse,
  CreateCompanyRequest,
  CompanyResponse,
  CountryResponse,
} from './types';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/api/delivery/auth/login', data);
}

export async function logout(token: string): Promise<void> {
  await apiClient.post<{ message: string }>('/api/delivery/auth/logout', {}, token);
}

export async function registerCompany(
  data: CreateCompanyRequest,
  logo?: File,
): Promise<CompanyResponse> {
  const formData = new FormData();
  formData.append(
    'data',
    new Blob([JSON.stringify(data)], { type: 'application/json' }),
  );
  if (logo) {
    formData.append('logo', logo);
  }
  return apiClient.postForm<CompanyResponse>('/api/delivery/companies', formData);
}

export async function getCountries(): Promise<CountryResponse[]> {
  return apiClient.get<CountryResponse[]>('/api/countries');
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
