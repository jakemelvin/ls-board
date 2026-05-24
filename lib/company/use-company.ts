'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth/store';
import { getCompanies } from '@/lib/admin/api';
import { ApiError } from '@/lib/api-client';
import type { CompanyResponse } from '@/lib/admin/types';

/**
 * The login + user payloads do not carry a companyId, so we resolve it from the
 * companies list by matching the company whose `adminId` is the current user.
 *
 * - `resolved`         → a single company is known (admin match, sole company, or manual pick)
 * - `needs-selection`  → several companies are visible (e.g. super admin) and one must be chosen
 * - `forbidden`        → the user cannot list companies (no way to resolve)
 * - `empty`            → no company exists yet
 */
export type CompanyResolutionStatus =
  | 'loading'
  | 'resolved'
  | 'needs-selection'
  | 'forbidden'
  | 'empty'
  | 'error';

export interface CompanyContext {
  status: CompanyResolutionStatus;
  companyId: number | null;
  company: CompanyResponse | null;
  /** Companies the user is allowed to see — used to render a picker when needed. */
  companies: CompanyResponse[];
  error: string | null;
  selectCompany: (companyId: number) => void;
  retry: () => void;
}

export function useCompanyContext(): CompanyContext {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.userId);
  const storedCompanyId = useAuthStore((s) => s.companyId);
  const setCompanyId = useAuthStore((s) => s.setCompanyId);

  const [status, setStatus] = useState<CompanyResolutionStatus>('loading');
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    if (!token) {
      setStatus('error');
      setError('Session expirée');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const page = await getCompanies(token, { page: 0, size: 100 });
      const list = page.content;
      setCompanies(list);

      const pickById = (id: number) => list.find((c) => c.id === id) ?? null;

      // 1. A company already chosen this session.
      if (storedCompanyId) {
        const match = pickById(storedCompanyId);
        if (match) {
          setCompany(match);
          setStatus('resolved');
          return;
        }
      }

      // 2. The company this user administers.
      const owned = list.find((c) => c.adminId === userId);
      if (owned) {
        setCompany(owned);
        setCompanyId(owned.id);
        setStatus('resolved');
        return;
      }

      // 3. Exactly one visible company → use it.
      if (list.length === 1) {
        setCompany(list[0]);
        setCompanyId(list[0].id);
        setStatus('resolved');
        return;
      }

      // 4. Several visible companies → let the user pick.
      if (list.length > 1) {
        setCompany(null);
        setStatus('needs-selection');
        return;
      }

      // 5. None.
      setStatus('empty');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        setStatus('forbidden');
        setError("Vous n'avez pas l'autorisation de résoudre votre entreprise.");
        return;
      }
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erreur lors de la résolution de l\'entreprise');
    }
  }, [token, userId, storedCompanyId, setCompanyId]);

  useEffect(() => {
    resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userId]);

  const selectCompany = useCallback(
    (id: number) => {
      const match = companies.find((c) => c.id === id) ?? null;
      setCompany(match);
      setCompanyId(id);
      setStatus(match ? 'resolved' : 'needs-selection');
    },
    [companies, setCompanyId],
  );

  return {
    status,
    companyId: company?.id ?? null,
    company,
    companies,
    error,
    selectCompany,
    retry: resolve,
  };
}
