'use client';

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuthStore } from '@/lib/auth/store';
import { getCurrentUserCompany } from '@/lib/company/api';
import { ApiError } from '@/lib/api-client';
import type { CompanyResponse } from '@/lib/admin/types';

/**
 * Resolves the connected user's company from the dedicated endpoint.
 */
export type CompanyResolutionStatus =
  | 'loading'
  | 'resolved'
  | 'forbidden'
  | 'empty'
  | 'error';

export interface CompanyContext {
  status: CompanyResolutionStatus;
  companyId: number | null;
  company: CompanyResponse | null;
  error: string | null;
  retry: () => void;
}

interface UseCompanyContextOptions {
  enabled?: boolean;
}

const SharedCompanyContext = createContext<CompanyContext | null>(null);

export function CompanyContextProvider({
  value,
  children,
}: {
  value: CompanyContext;
  children: ReactNode;
}) {
  return createElement(SharedCompanyContext.Provider, { value }, children);
}

export function useCompanyContext({ enabled = true }: UseCompanyContextOptions = {}): CompanyContext {
  const sharedContext = useContext(SharedCompanyContext);
  const localContext = useCompanyResolution({ enabled: sharedContext ? false : enabled });

  return sharedContext ?? localContext;
}

function useCompanyResolution({ enabled }: Required<UseCompanyContextOptions>): CompanyContext {
  const token = useAuthStore((s) => s.token);
  const setCompanyId = useAuthStore((s) => s.setCompanyId);

  const [status, setStatus] = useState<CompanyResolutionStatus>(enabled ? 'loading' : 'empty');
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!token) {
      setCompany(null);
      setStatus('error');
      setError('Session expirée');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const resolvedCompany = await getCurrentUserCompany(token);

      if (!resolvedCompany?.id) {
        setCompany(null);
        setStatus('empty');
        return;
      }

      setCompany(resolvedCompany);
      setCompanyId(resolvedCompany.id);
      setStatus('resolved');
    } catch (err) {
      setCompany(null);

      if (err instanceof ApiError && err.status === 404) {
        setStatus('empty');
        return;
      }

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setStatus('forbidden');
        setError("Vous n'avez pas l'autorisation de récupérer votre entreprise.");
        return;
      }

      setStatus('error');
      setError(err instanceof Error ? err.message : "Erreur lors de la récupération de l'entreprise");
    }
  }, [enabled, token, setCompanyId]);

  useEffect(() => {
    if (enabled) {
      void resolve();
    }
  }, [enabled, resolve]);

  return {
    status,
    companyId: company?.id ?? null,
    company,
    error,
    retry: resolve,
  };
}
