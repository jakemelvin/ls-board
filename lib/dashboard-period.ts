import type { Parcel } from '@/lib/mock-data';
import { getParcelRevenueBase } from '@/lib/commissions';

export type DashboardPeriodPreset =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'CURRENT_MONTH'
  | 'PREVIOUS_MONTH'
  | 'CURRENT_YEAR'
  | 'CUSTOM';

export interface DateRange {
  from: Date;
  to: Date;
}

export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriodPreset, string> = {
  TODAY: "Aujourd'hui",
  LAST_7_DAYS: '7 derniers jours',
  CURRENT_MONTH: 'Mois courant',
  PREVIOUS_MONTH: 'Mois precedent',
  CURRENT_YEAR: 'Annee courante',
  CUSTOM: 'Personnalise',
};

export function getDefaultDashboardPeriod(): DateRange {
  return getDashboardPeriodRange('CURRENT_MONTH');
}

export function getDashboardPeriodRange(preset: DashboardPeriodPreset, now = new Date()): DateRange {
  const today = startOfDay(now);

  if (preset === 'TODAY') {
    return { from: today, to: endOfDay(today) };
  }

  if (preset === 'LAST_7_DAYS') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDay(today) };
  }

  if (preset === 'PREVIOUS_MONTH') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0));
    return { from, to };
  }

  if (preset === 'CURRENT_YEAR') {
    return {
      from: new Date(today.getFullYear(), 0, 1),
      to: endOfDay(new Date(today.getFullYear(), 11, 31)),
    };
  }

  return {
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

export function isDateInRange(date: Date, range: DateRange) {
  return date.getTime() >= startOfDay(range.from).getTime() && date.getTime() <= endOfDay(range.to).getTime();
}

export function filterParcelsByPeriod(parcels: Parcel[], range: DateRange) {
  return parcels.filter((parcel) => isDateInRange(parcel.createdAt, range));
}

export function getDeliveredParcelsByPeriod(parcels: Parcel[], range: DateRange) {
  return parcels.filter((parcel) => {
    const deliveredAt = parcel.history.find((entry) => entry.status === 'DELIVERED')?.timestamp;
    return deliveredAt ? isDateInRange(deliveredAt, range) : false;
  });
}

export function getParcelRevenueTotal(parcels: Parcel[]) {
  return parcels.reduce((sum, parcel) => sum + getParcelRevenueBase(parcel), 0);
}

export function buildParcelVolumeSeries(parcels: Parcel[], range: DateRange) {
  return buildDailySeries(range).map((item) => ({
    ...item,
    colis: parcels.filter((parcel) => isSameDay(parcel.createdAt, item.date)).length,
  }));
}

export function buildRevenueSeries(parcels: Parcel[], range: DateRange) {
  return buildDailySeries(range).map((item) => ({
    ...item,
    revenue: Math.round(
      parcels
        .filter((parcel) => isSameDay(parcel.createdAt, item.date))
        .reduce((sum, parcel) => sum + getParcelRevenueBase(parcel), 0)
    ),
  }));
}

export function formatDateRange(range: DateRange) {
  return `${formatShortDate(range.from)} - ${formatShortDate(range.to)}`;
}

export function normalizeDateRange(range: DateRange): DateRange {
  if (range.from.getTime() <= range.to.getTime()) {
    return { from: startOfDay(range.from), to: endOfDay(range.to) };
  }

  return { from: startOfDay(range.to), to: endOfDay(range.from) };
}

function buildDailySeries(range: DateRange) {
  const normalizedRange = normalizeDateRange(range);
  const days: Array<{ name: string; date: Date }> = [];
  const cursor = startOfDay(normalizedRange.from);

  while (cursor.getTime() <= normalizedRange.to.getTime()) {
    days.push({
      name: cursor.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      }),
      date: new Date(cursor),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}
