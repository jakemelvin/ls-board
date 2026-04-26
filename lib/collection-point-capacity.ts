import {
  type CollectionPoint,
  type CollectionPointCapacityUnit,
  type Parcel,
} from '@/lib/mock-data';

const capacityUnitLabels: Record<CollectionPointCapacityUnit, string> = {
  KG: 'kg',
  M3: 'm3',
};

export function getCollectionPointCapacityUnitLabel(unit: CollectionPointCapacityUnit) {
  return capacityUnitLabels[unit];
}

export function formatCapacityValue(
  value: number,
  unit: CollectionPointCapacityUnit,
  options?: { maximumFractionDigits?: number }
) {
  const maximumFractionDigits =
    options?.maximumFractionDigits ?? (unit === 'KG' ? 0 : 2);

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

export function formatCapacity(value: number, unit: CollectionPointCapacityUnit) {
  return `${formatCapacityValue(value, unit)} ${getCollectionPointCapacityUnitLabel(unit)}`;
}

export function formatCollectionPointMaxCapacity(point: CollectionPoint) {
  return formatCapacity(point.maxCapacity.value, point.maxCapacity.unit);
}

export function getParcelLoadForCapacityUnit(
  parcel: Parcel,
  unit: CollectionPointCapacityUnit
) {
  return unit === 'KG' ? parcel.weight : parcel.volume;
}

export function isParcelStoredAtCollectionPoint(pointId: string, parcel: Parcel) {
  if (
    parcel.status === 'RECEIVED_AT_COLLECTION_POINT' &&
    (parcel.originPointId === pointId || parcel.destinationPointId === pointId)
  ) {
    return true;
  }

  return (
    parcel.status === 'ARRIVED_AT_DESTINATION' && parcel.destinationPointId === pointId
  );
}

export function getCollectionPointStoredParcels(pointId: string, parcels: Parcel[]) {
  return parcels.filter((parcel) => isParcelStoredAtCollectionPoint(pointId, parcel));
}

export function getCollectionPointCurrentLoad(point: CollectionPoint, parcels: Parcel[]) {
  return getCollectionPointStoredParcels(point.id, parcels).reduce(
    (sum, parcel) => sum + getParcelLoadForCapacityUnit(parcel, point.maxCapacity.unit),
    0
  );
}

export function getCollectionPointParcelCount(pointId: string, parcels: Parcel[]) {
  return getCollectionPointStoredParcels(pointId, parcels).length;
}

export function getCollectionPointSaturationRate(point: CollectionPoint, parcels: Parcel[]) {
  if (point.maxCapacity.value <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((getCollectionPointCurrentLoad(point, parcels) / point.maxCapacity.value) * 100)
  );
}

export function formatCollectionPointLoad(point: CollectionPoint, parcels: Parcel[]) {
  return formatCapacity(getCollectionPointCurrentLoad(point, parcels), point.maxCapacity.unit);
}

export function formatCollectionPointLoadRatio(point: CollectionPoint, parcels: Parcel[]) {
  return `${formatCollectionPointLoad(point, parcels)} / ${formatCollectionPointMaxCapacity(point)}`;
}
