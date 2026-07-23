import { useCallback, useEffect, useRef, useState } from 'react';
import type { Page } from '@/lib/admin/types';

interface UsePaginatedQueryOptions<T> {
  query: (page: number, pageSize: number) => Promise<Page<T>>;
  enabled?: boolean;
  initialPageSize?: number;
  errorMessage: string;
}

export function usePaginatedQuery<T>({
  query,
  enabled = true,
  initialPageSize = 20,
  errorMessage,
}: UsePaginatedQueryOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const response = await query(page, pageSize);
      if (currentRequestId !== requestId.current) return;

      setItems(response.content ?? []);
      setTotalPages(response.totalPages ?? 0);
      setTotalElements(response.totalElements ?? 0);
    } catch (cause) {
      if (currentRequestId !== requestId.current) return;

      setItems([]);
      setTotalPages(0);
      setTotalElements(0);
      setError(cause instanceof Error ? cause.message : errorMessage);
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
      }
    }
  }, [enabled, errorMessage, page, pageSize, query]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    items,
    page,
    pageSize,
    totalPages,
    totalElements,
    loading,
    error,
    setPage,
    setPageSize,
    reload,
  };
}
