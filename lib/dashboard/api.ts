import { apiClient } from '@/lib/api-client';
import type {
  CollectorDashboardResponse,
  CompanyDashboardResponse,
  DashboardDateRangeParams,
  SuperAdminDashboardResponse,
  TransporterDashboardResponse,
} from './types';

function buildDateRangeQuery(params: DashboardDateRangeParams) {
  const search = new URLSearchParams();
  search.set('startDate', params.startDate);
  search.set('endDate', params.endDate);
  return search.toString();
}

export function getSuperAdminDashboard(
  token: string,
  params: DashboardDateRangeParams,
): Promise<SuperAdminDashboardResponse> {
  return apiClient.get<SuperAdminDashboardResponse>(
    `/api/delivery/super-admin/dashboard?${buildDateRangeQuery(params)}`,
    token,
  );
}

export function getCompanyDashboard(
  token: string,
  companyId: number,
  params: DashboardDateRangeParams,
): Promise<CompanyDashboardResponse> {
  return apiClient.get<CompanyDashboardResponse>(
    `/api/delivery/companies/${companyId}/dashboard?${buildDateRangeQuery(params)}`,
    token,
  );
}

export function getCollectorDashboard(token: string): Promise<CollectorDashboardResponse> {
  return apiClient.get<CollectorDashboardResponse>('/api/delivery/collectors/dashboard', token);
}

export function getTransporterDashboard(token: string): Promise<TransporterDashboardResponse> {
  return apiClient.get<TransporterDashboardResponse>('/api/delivery/transporters/dashboard', token);
}
