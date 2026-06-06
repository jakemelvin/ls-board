'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCompanyEmployees } from '@/lib/admin/api';
import { ApiError } from '@/lib/api-client';
import {
  activateCollectionPoint,
  assignCollectionPointResponsible,
  createCollectionPoint,
  createZone,
  deactivateCollectionPoint,
  deleteCollectionPoint,
  deleteZone,
  getCities,
  getCollectionPoints,
  getZones,
  manuallyCloseCollectionPoint,
  reopenCollectionPoint,
  updateCollectionPoint,
  updateCollectionPointCommissionPercentage,
  updateZone,
} from '@/lib/company/api';
import type {
  CityResponse,
  CollectionPointRequest,
  CollectionPointResponse,
  MessageResponse,
  ZoneRequest,
  ZoneResponse,
} from '@/lib/company/types';
import type { UserResponse } from '@/lib/auth/types';

function replacePoint(
  points: CollectionPointResponse[],
  nextPoint: CollectionPointResponse,
): CollectionPointResponse[] {
  const exists = points.some((point) => point.id === nextPoint.id);
  if (!exists) {
    return [nextPoint, ...points];
  }

  return points.map((point) => (point.id === nextPoint.id ? nextPoint : point));
}

export interface SaveCollectionPointInput {
  pointId?: number;
  payload: CollectionPointRequest;
  photo?: File;
}

export interface UseCollectionPointsManagerOptions {
  companyId: number;
  token: string | null;
}

export function useCollectionPointsManager({
  companyId,
  token,
}: UseCollectionPointsManagerOptions) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionPointId, setActionPointId] = useState<number | null>(null);

  const [zones, setZones] = useState<ZoneResponse[]>([]);
  const [cities, setCities] = useState<CityResponse[]>([]);
  const [points, setPoints] = useState<CollectionPointResponse[]>([]);
  const [employees, setEmployees] = useState<UserResponse[]>([]);

  const loadPoints = useCallback(async () => {
    if (!token) {
      return [];
    }

    const nextPoints = await getCollectionPoints(token, companyId);
    setPoints(nextPoints);
    return nextPoints;
  }, [token, companyId]);

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Session expiree');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [citiesData, zonesData, pointsData, employeesData] = await Promise.all([
        getCities(),
        getZones(token, companyId),
        getCollectionPoints(token, companyId),
        getCompanyEmployees(token, companyId),
      ]);

      setCities(citiesData);
      setZones(zonesData);
      setPoints(pointsData);
      setEmployees(employeesData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [token, companyId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const responsibles = useMemo(
    () =>
      employees.filter((user) =>
        ['ADMIN_COMPANY', 'EMPLOYEE_COMPANY', 'COLLECTOR'].includes(user.role),
      ),
    [employees],
  );

  const saveZone = useCallback(
    async (payload: ZoneRequest, zoneId?: number) => {
      if (!token) {
        throw new Error('Session expiree');
      }

      setSaving(true);
      try {
        const zone = zoneId
          ? await updateZone(token, companyId, zoneId, payload)
          : await createZone(token, companyId, payload);

        setZones((current) =>
          zoneId ? current.map((item) => (item.id === zone.id ? zone : item)) : [zone, ...current],
        );

        return zone;
      } finally {
        setSaving(false);
      }
    },
    [token, companyId],
  );

  const removeZone = useCallback(
    async (zoneId: number) => {
      if (!token) {
        throw new Error('Session expiree');
      }

      setSaving(true);
      try {
        await deleteZone(token, companyId, zoneId);
        setZones((current) => current.filter((zone) => zone.id !== zoneId));
      } finally {
        setSaving(false);
      }
    },
    [token, companyId],
  );

  const savePoint = useCallback(
    async ({ pointId, payload, photo }: SaveCollectionPointInput) => {
      if (!token) {
        throw new Error('Session expiree');
      }

      setSaving(true);
      try {
        let point = pointId
          ? await updateCollectionPoint(token, companyId, pointId, payload, photo)
          : await createCollectionPoint(token, companyId, payload, photo);

        if (
          payload.commissionPercentage != null &&
          point.commissionPercentage !== payload.commissionPercentage
        ) {
          point = await updateCollectionPointCommissionPercentage(
            token,
            companyId,
            point.id,
            payload.commissionPercentage,
          );
        }

        if (payload.responsibleId && point.responsible?.id !== payload.responsibleId) {
          point = await assignCollectionPointResponsible(
            token,
            companyId,
            point.id,
            payload.responsibleId,
          );
        }

        if (payload.manuallyClosed !== undefined && point.manuallyClosed !== payload.manuallyClosed) {
          point = payload.manuallyClosed
            ? await manuallyCloseCollectionPoint(token, companyId, point.id)
            : await reopenCollectionPoint(token, companyId, point.id);
        }

        setPoints((current) => replacePoint(current, point));
        return point;
      } finally {
        setSaving(false);
      }
    },
    [token, companyId],
  );

  const removePoint = useCallback(
    async (pointId: number): Promise<MessageResponse> => {
      if (!token) {
        throw new Error('Session expiree');
      }

      setSaving(true);
      try {
        const response = await deleteCollectionPoint(token, companyId, pointId);
        setPoints((current) => current.filter((point) => point.id !== pointId));
        return response;
      } finally {
        setSaving(false);
      }
    },
    [token, companyId],
  );

  const togglePointAvailability = useCallback(
    async (point: CollectionPointResponse) => {
      if (!token) {
        throw new Error('Session expiree');
      }

      setActionPointId(point.id);
      try {
        const updated = point.manuallyClosed
          ? await reopenCollectionPoint(token, companyId, point.id)
          : await manuallyCloseCollectionPoint(token, companyId, point.id);

        setPoints((current) => replacePoint(current, updated));
        return updated;
      } finally {
        setActionPointId(null);
      }
    },
    [token, companyId],
  );

  const deactivatePoint = useCallback(
    async (pointId: number) => {
      if (!token) {
        throw new Error('Session expiree');
      }

      setActionPointId(pointId);
      try {
        const response = await deactivateCollectionPoint(token, companyId, pointId);
        await loadPoints();
        return response;
      } finally {
        setActionPointId(null);
      }
    },
    [token, companyId, loadPoints],
  );

  const activatePoint = useCallback(
    async (pointId: number) => {
      if (!token) {
        throw new Error('Session expiree');
      }

      setActionPointId(pointId);
      try {
        const response = await activateCollectionPoint(token, companyId, pointId);
        await loadPoints();
        return response;
      } finally {
        setActionPointId(null);
      }
    },
    [token, companyId, loadPoints],
  );

  return {
    loading,
    error,
    saving,
    actionPointId,
    zones,
    cities,
    points,
    employees,
    responsibles,
    refresh,
    saveZone,
    removeZone,
    savePoint,
    removePoint,
    togglePointAvailability,
    deactivatePoint,
    activatePoint,
  };
}
