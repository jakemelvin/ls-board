import { useEffect, useMemo, useState } from 'react';

export function useClientPagination<T>(
  items: T[],
  initialPageSize = 20,
  resetKey?: string,
) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.ceil(items.length / pageSize);
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const start = safePage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageSize, safePage]);

  return {
    page: safePage,
    pageSize,
    totalPages,
    totalElements: items.length,
    paginatedItems,
    setPage,
    setPageSize,
  };
}
