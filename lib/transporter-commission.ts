import type { User } from '@/lib/mock-data';

export function formatTransporterCommission(user: Pick<User, 'role' | 'transporterCommissionRate'>) {
  if (user.role !== 'TRANSPORTER') {
    return null;
  }

  return user.transporterCommissionRate === undefined
    ? 'Aucune commission'
    : `${user.transporterCommissionRate}%`;
}

export function isValidOptionalCommissionRate(value: string) {
  if (value.trim() === '') {
    return true;
  }

  const rate = Number(value);

  return Number.isFinite(rate) && rate >= 0 && rate <= 100;
}
