'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface DataPaginationProps {
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
  className?: string;
}

export function DataPagination({
  page,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  loading = false,
  className,
}: DataPaginationProps) {
  const { t } = useTranslation('dashboard');
  const safeTotalPages = Math.max(totalPages, 1);
  const safePage = Math.min(Math.max(page, 0), safeTotalPages - 1);
  const [pageInput, setPageInput] = useState(String(safePage + 1));
  const availablePageSizes = useMemo(
    () =>
      Array.from(new Set([...pageSizeOptions, pageSize]))
        .filter((size) => Number.isInteger(size) && size > 0)
        .sort((left, right) => left - right),
    [pageSize, pageSizeOptions],
  );

  useEffect(() => {
    setPageInput(String(safePage + 1));
  }, [safePage]);

  const commitPageInput = () => {
    const requestedPage = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(requestedPage)) {
      setPageInput(String(safePage + 1));
      return;
    }

    const nextPage = Math.min(Math.max(requestedPage, 1), safeTotalPages) - 1;
    setPageInput(String(nextPage + 1));
    if (nextPage !== safePage) {
      onPageChange(nextPage);
    }
  };

  const changePageSize = (value: string) => {
    const nextPageSize = Number(value);
    if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) return;

    onPageSizeChange(nextPageSize);
    if (safePage !== 0) {
      onPageChange(0);
    }
  };

  return (
    <nav
      aria-label={t('pagination.label')}
      data-testid="data-pagination"
      className={cn(
        'flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
        <span aria-live="polite">
          {t('pagination.total', { values: { count: totalElements } })}
        </span>
        <div className="flex items-center gap-2">
          <span>{t('pagination.rowsPerPage')}</span>
          <Select value={String(pageSize)} onValueChange={changePageSize}>
            <SelectTrigger
              size="sm"
              className="w-19"
              aria-label={t('pagination.rowsPerPage')}
              data-testid="pagination-page-size"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {availablePageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <div className="flex items-center gap-2">
          <span>{t('pagination.page')}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={safeTotalPages}
            value={pageInput}
            disabled={loading || totalPages === 0}
            onChange={(event) => setPageInput(event.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitPageInput();
                event.currentTarget.blur();
              }
            }}
            aria-label={t('pagination.goToPage')}
            data-testid="pagination-page-input"
            className="h-9 w-16 text-center tabular-nums"
          />
          <span className="whitespace-nowrap tabular-nums">
            {t('pagination.of', { values: { total: safeTotalPages } })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            disabled={loading || safePage === 0}
            onClick={() => onPageChange(0)}
            aria-label={t('pagination.first')}
            title={t('pagination.first')}
          >
            <ChevronsLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-11 sm:size-8"
            disabled={loading || safePage === 0}
            onClick={() => onPageChange(safePage - 1)}
            aria-label={t('pagination.previous')}
            title={t('pagination.previous')}
            data-testid="pagination-previous"
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="size-11 sm:size-8"
            disabled={loading || totalPages === 0 || safePage >= totalPages - 1}
            onClick={() => onPageChange(safePage + 1)}
            aria-label={t('pagination.next')}
            title={t('pagination.next')}
            data-testid="pagination-next"
          >
            <ChevronRight />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            disabled={loading || totalPages === 0 || safePage >= totalPages - 1}
            onClick={() => onPageChange(totalPages - 1)}
            aria-label={t('pagination.last')}
            title={t('pagination.last')}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </nav>
  );
}
