'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataPagination } from '@/components/ui/data-pagination';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Badge,
  CompanyGuard,
  ConfirmDialog,
  SectionHeader,
  StatusState,
  ToastBar,
  useToastSimple,
} from '@/components/company/company-shared';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth/store';
import {
  createCompanyRouteException,
  deleteCompanyRouteException,
  getCollectionPoints,
  getCompanyRouteExceptions,
  updateCompanyRouteException,
} from '@/lib/company/api';
import type {
  CollectionPointResponse,
  CompanyRouteExceptionRequest,
  CompanyRouteExceptionResponse,
} from '@/lib/company/types';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useClientPagination } from '@/hooks/use-client-pagination';

type RouteExceptionFormState = {
  originCollectionPointId: string;
  destinationCollectionPointId: string;
  reason: string;
};

const EMPTY_FORM: RouteExceptionFormState = {
  originCollectionPointId: '',
  destinationCollectionPointId: '',
  reason: '',
};

function buildRouteKey(originId: number, destinationId: number) {
  return `${originId}->${destinationId}`;
}

function buildFormFromException(item: CompanyRouteExceptionResponse): RouteExceptionFormState {
  return {
    originCollectionPointId: String(item.originCollectionPointId),
    destinationCollectionPointId: String(item.destinationCollectionPointId),
    reason: item.reason ?? '',
  };
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return '-';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function validateForm(
  form: RouteExceptionFormState,
  routeExceptions: CompanyRouteExceptionResponse[],
  editingId: number | null,
  messages: {
    originRequired: string;
    destinationRequired: string;
    sameRoute: string;
    duplicate: string;
    reasonTooLong: string;
  },
): { errors: string[]; payload?: CompanyRouteExceptionRequest } {
  const errors: string[] = [];
  const originId = Number(form.originCollectionPointId);
  const destinationId = Number(form.destinationCollectionPointId);
  const reason = form.reason.trim();

  if (!originId) errors.push(messages.originRequired);
  if (!destinationId) errors.push(messages.destinationRequired);
  if (originId && destinationId && originId === destinationId) errors.push(messages.sameRoute);
  if (reason.length > 500) errors.push(messages.reasonTooLong);

  if (
    originId &&
    destinationId &&
    routeExceptions.some(
      (item) =>
        item.id !== editingId &&
        item.originCollectionPointId === originId &&
        item.destinationCollectionPointId === destinationId,
    )
  ) {
    errors.push(messages.duplicate);
  }

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    payload: {
      originCollectionPointId: originId,
      destinationCollectionPointId: destinationId,
      reason: reason || undefined,
    },
  };
}

export function RouteExceptionsView() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <RouteExceptionsInner companyId={companyId} companyName={company.name} />
      )}
    </CompanyGuard>
  );
}

function RouteExceptionsInner({
  companyId,
  companyName,
}: {
  companyId: number;
  companyName: string;
}) {
  const token = useAuthStore((state) => state.token);
  const { locale, t } = useTranslation('dashboard');
  const { toast, success, error: showError } = useToastSimple();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPointResponse[]>([]);
  const [routeExceptions, setRouteExceptions] = useState<CompanyRouteExceptionResponse[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RouteExceptionFormState>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [exceptionToDelete, setExceptionToDelete] =
    useState<CompanyRouteExceptionResponse | null>(null);

  const pointOptions = useMemo(
    () =>
      collectionPoints
        .filter((point) => point.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [collectionPoints],
  );

  const filteredRouteExceptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return routeExceptions;

    return routeExceptions.filter((item) =>
      [
        item.originCollectionPointName,
        item.destinationCollectionPointName,
        item.reason,
        item.createdBy,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [routeExceptions, search]);
  const routePagination = useClientPagination(
    filteredRouteExceptions,
    20,
    search,
  );

  const editingException = useMemo(
    () => routeExceptions.find((item) => item.id === editingId) ?? null,
    [editingId, routeExceptions],
  );

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setLoadError(null);

    try {
      const [pointsResponse, exceptionsResponse] = await Promise.all([
        getCollectionPoints(token, companyId),
        getCompanyRouteExceptions(token, companyId),
      ]);

      setCollectionPoints(pointsResponse);
      setRouteExceptions(exceptionsResponse);
    } catch (error) {
      setLoadError(getErrorMessage(error, t('routeExceptions.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [companyId, t, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setValidationErrors([]);
  };

  const handleEdit = (item: CompanyRouteExceptionResponse) => {
    setEditingId(item.id);
    setForm(buildFormFromException(item));
    setValidationErrors([]);
  };

  const handleSubmit = async () => {
    if (!token) return;

    const result = validateForm(form, routeExceptions, editingId, {
      originRequired: t('routeExceptions.validation.originRequired'),
      destinationRequired: t('routeExceptions.validation.destinationRequired'),
      sameRoute: t('routeExceptions.validation.sameRoute'),
      duplicate: t('routeExceptions.validation.duplicate'),
      reasonTooLong: t('routeExceptions.validation.reasonTooLong'),
    });

    if (!result.payload) {
      setValidationErrors(result.errors);
      return;
    }

    setSaving(true);
    setValidationErrors([]);

    try {
      const saved = editingId
        ? await updateCompanyRouteException(token, companyId, editingId, result.payload)
        : await createCompanyRouteException(token, companyId, result.payload);

      setRouteExceptions((current) => {
        if (editingId) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }

        return [saved, ...current];
      });
      resetForm();
      success(
        editingId
          ? t('routeExceptions.messages.updated')
          : t('routeExceptions.messages.created'),
      );
    } catch (error) {
      showError(getErrorMessage(error, t('routeExceptions.errors.save')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !exceptionToDelete) return;

    setDeleting(true);

    try {
      await deleteCompanyRouteException(token, companyId, exceptionToDelete.id);
      setRouteExceptions((current) =>
        current.filter((item) => item.id !== exceptionToDelete.id),
      );
      if (editingId === exceptionToDelete.id) {
        resetForm();
      }
      setExceptionToDelete(null);
      success(t('routeExceptions.messages.deleted'));
    } catch (error) {
      showError(getErrorMessage(error, t('routeExceptions.errors.delete')));
    } finally {
      setDeleting(false);
    }
  };

  const setField =
    (field: keyof RouteExceptionFormState) =>
    (value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    };

  const hasEnoughPoints = pointOptions.length >= 2;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <StatusState
        icon={AlertTriangle}
        tone="destructive"
        title={t('common.loadError')}
        description={loadError}
        action={
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('routeExceptions.title')}
        subtitle={t('routeExceptions.subtitle', { values: { companyName } })}
        action={
          <Button variant="outline" onClick={() => void load()} disabled={saving || deleting}>
            <RefreshCw className="h-4 w-4" />
            {t('common.refresh')}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {editingException ? (
                <Pencil className="h-4 w-4 text-primary" />
              ) : (
                <Plus className="h-4 w-4 text-primary" />
              )}
              {editingException
                ? t('routeExceptions.form.editTitle')
                : t('routeExceptions.form.createTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasEnoughPoints && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                {t('routeExceptions.form.notEnoughPoints')}
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                <ul className="list-inside list-disc space-y-1">
                  {validationErrors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-2">
                <Label>{t('routeExceptions.form.origin')}</Label>
                <Select
                  value={form.originCollectionPointId}
                  onValueChange={setField('originCollectionPointId')}
                  disabled={!hasEnoughPoints || saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('routeExceptions.form.selectPoint')} />
                  </SelectTrigger>
                  <SelectContent>
                    {pointOptions.map((point) => (
                      <SelectItem key={point.id} value={String(point.id)}>
                        {point.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('routeExceptions.form.destination')}</Label>
                <Select
                  value={form.destinationCollectionPointId}
                  onValueChange={setField('destinationCollectionPointId')}
                  disabled={!hasEnoughPoints || saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('routeExceptions.form.selectPoint')} />
                  </SelectTrigger>
                  <SelectContent>
                    {pointOptions.map((point) => (
                      <SelectItem key={point.id} value={String(point.id)}>
                        {point.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="route-exception-reason">
                  {t('routeExceptions.form.reason')}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {form.reason.length}/500
                </span>
              </div>
              <Textarea
                id="route-exception-reason"
                value={form.reason}
                maxLength={500}
                rows={4}
                placeholder={t('routeExceptions.form.reasonPlaceholder')}
                disabled={saving}
                onChange={(event) => setField('reason')(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleSubmit} disabled={saving || !hasEnoughPoints}>
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editingException ? t('common.save') : t('routeExceptions.form.createAction')}
              </Button>
              {editingException && (
                <Button variant="outline" onClick={resetForm} disabled={saving}>
                  <X className="h-4 w-4" />
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">{t('routeExceptions.list.title')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('routeExceptions.list.count', {
                    values: { count: routeExceptions.length },
                  })}
                </p>
              </div>
              <Badge className="bg-primary/10 text-primary">
                <Ban className="h-3.5 w-3.5" />
                {t('routeExceptions.list.activeBadge')}
              </Badge>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('routeExceptions.list.searchPlaceholder')}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredRouteExceptions.length === 0 ? (
              <StatusState
                icon={Route}
                title={
                  routeExceptions.length === 0
                    ? t('routeExceptions.empty.title')
                    : t('common.noResults')
                }
                description={
                  routeExceptions.length === 0
                    ? t('routeExceptions.empty.description')
                    : t('common.tryAnotherSearch')
                }
              />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('routeExceptions.list.columns.route')}</TableHead>
                        <TableHead>{t('routeExceptions.list.columns.reason')}</TableHead>
                        <TableHead>{t('routeExceptions.list.columns.updatedAt')}</TableHead>
                        <TableHead className="text-right">
                          {t('routeExceptions.list.columns.actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routePagination.paginatedItems.map((item) => (
                        <TableRow
                          key={item.id}
                          data-state={editingId === item.id ? 'selected' : undefined}
                        >
                          <TableCell>
                            <RouteLabel item={item} />
                          </TableCell>
                          <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                            {item.reason || t('routeExceptions.list.noReason')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(item.updatedAt ?? item.createdAt, locale)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                                {t('common.edit')}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setExceptionToDelete(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                                {t('common.delete')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden">
                  {routePagination.paginatedItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'space-y-3 rounded-lg border border-border p-4',
                        editingId === item.id && 'border-primary bg-primary/5',
                      )}
                    >
                      <RouteLabel item={item} />
                      <p className="text-sm text-muted-foreground">
                        {item.reason || t('routeExceptions.list.noReason')}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(item.updatedAt ?? item.createdAt, locale)}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setExceptionToDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('common.delete')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <DataPagination
                  page={routePagination.page}
                  pageSize={routePagination.pageSize}
                  totalPages={routePagination.totalPages}
                  totalElements={routePagination.totalElements}
                  onPageChange={routePagination.setPage}
                  onPageSizeChange={routePagination.setPageSize}
                  className="mt-4"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(exceptionToDelete)}
        title={t('routeExceptions.delete.title')}
        description={t('routeExceptions.delete.description', {
          values: {
            route: exceptionToDelete
              ? `${exceptionToDelete.originCollectionPointName} -> ${exceptionToDelete.destinationCollectionPointName}`
              : '',
          },
        })}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setExceptionToDelete(null)}
      />
      <ToastBar toast={toast} />
    </div>
  );
}

function RouteLabel({ item }: { item: CompanyRouteExceptionResponse }) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center gap-2 font-medium text-foreground">
        <span className="truncate">{item.originCollectionPointName}</span>
        <span className="shrink-0 text-muted-foreground">-&gt;</span>
        <span className="truncate">{item.destinationCollectionPointName}</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {buildRouteKey(item.originCollectionPointId, item.destinationCollectionPointId)}
      </div>
    </div>
  );
}
