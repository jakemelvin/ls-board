import { apiClient } from '@/lib/api-client';
import type { ExchangeRateResponse } from './types';

export function getExchangeRates(): Promise<ExchangeRateResponse> {
  return apiClient.getCached<ExchangeRateResponse>('/api/exchange-rates', null, 6 * 60 * 60_000);
}
