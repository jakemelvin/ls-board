import type { CollectionPoint, WeekdayKey } from '@/lib/mock-data';

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mer',
  THURSDAY: 'Jeu',
  FRIDAY: 'Ven',
  SATURDAY: 'Sam',
  SUNDAY: 'Dim',
};

const WEEKDAY_ORDER: WeekdayKey[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export function formatOpeningHours(point: Pick<CollectionPoint, 'openingHours'>) {
  const orderedDays = WEEKDAY_ORDER.filter((day) => point.openingHours.days.includes(day));
  const daysLabel =
    orderedDays.length === WEEKDAY_ORDER.length
      ? 'Tous les jours'
      : orderedDays.map((day) => WEEKDAY_LABELS[day]).join(', ');

  return `${daysLabel} · ${point.openingHours.opensAt} - ${point.openingHours.closesAt}`;
}

export function formatCommissionRate(point: Pick<CollectionPoint, 'commissionRate'>) {
  return point.commissionRate === undefined ? 'Aucune commission' : `${point.commissionRate}%`;
}

export function isCollectionPointVisibleToClients(point: Pick<CollectionPoint, 'isOpen'>) {
  return point.isOpen;
}

export function getCollectionPointStatusLabel(point: Pick<CollectionPoint, 'isOpen'>) {
  return point.isOpen ? 'Visible mobile' : 'Masque mobile';
}

export function getCollectionPointStatusClassName(point: Pick<CollectionPoint, 'isOpen'>) {
  return point.isOpen ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive';
}
