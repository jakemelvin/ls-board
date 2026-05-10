import type {
  CollectionPoint,
  CommissionBeneficiaryRole,
  CommissionEntry,
  CommissionStatus,
  Parcel,
  User,
  Vehicle,
} from '@/lib/mock-data';

export function formatMoney(amount: number, currency: 'EUR' = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getParcelRevenueBase(parcel: Parcel) {
  if (typeof parcel.estimatedPrice === 'number' && Number.isFinite(parcel.estimatedPrice)) {
    return parcel.estimatedPrice;
  }

  const declaredValuePart = (parcel.declaredValue ?? 0) * 0.03;
  const weightPart = parcel.weight * 4.25;
  const volumePart = parcel.volume * 38;

  return roundMoney(Math.max(9.9, 12 + declaredValuePart + weightPart + volumePart));
}

export function calculateCommissionAmount(baseAmount: number, rate: number) {
  return roundMoney((baseAmount * rate) / 100);
}

export function getCommissionStatusLabel(status: CommissionStatus) {
  const labels: Record<CommissionStatus, string> = {
    PAYABLE: 'A payer',
    PAID: 'Payee',
    CANCELED: 'Annulee',
  };

  return labels[status];
}

export function getCommissionRoleLabel(role: CommissionBeneficiaryRole) {
  return role === 'COLLECTOR' ? 'Collecteur' : 'Transporteur';
}

export function getCommissionStatusClassName(status: CommissionStatus) {
  const classes: Record<CommissionStatus, string> = {
    PAYABLE: 'bg-warning/20 text-warning',
    PAID: 'bg-success/20 text-success',
    CANCELED: 'bg-destructive/20 text-destructive',
  };

  return classes[status];
}

export function getCommissionSummary(commissions: CommissionEntry[]) {
  const payable = commissions.filter((commission) => commission.status === 'PAYABLE');
  const paid = commissions.filter((commission) => commission.status === 'PAID');
  const collector = commissions.filter((commission) => commission.beneficiaryRole === 'COLLECTOR');
  const transporter = commissions.filter((commission) => commission.beneficiaryRole === 'TRANSPORTER');

  return {
    payableAmount: sumCommissionAmounts(payable),
    paidAmount: sumCommissionAmounts(paid),
    collectorAmount: sumCommissionAmounts(collector),
    transporterAmount: sumCommissionAmounts(transporter),
    payableCount: payable.length,
    paidCount: paid.length,
    totalCount: commissions.length,
  };
}

export function getUserCommissionSummary(commissions: CommissionEntry[], userId: string) {
  const userCommissions = commissions.filter((commission) => commission.beneficiaryUserId === userId);
  const latestCommission = [...userCommissions].sort(
    (left, right) => right.earnedAt.getTime() - left.earnedAt.getTime()
  )[0];

  return {
    entries: userCommissions,
    payableAmount: sumCommissionAmounts(
      userCommissions.filter((commission) => commission.status === 'PAYABLE')
    ),
    paidAmount: sumCommissionAmounts(
      userCommissions.filter((commission) => commission.status === 'PAID')
    ),
    latestCommission,
    parcelCount: new Set(userCommissions.map((commission) => commission.parcelId)).size,
  };
}

export interface ParcelUserCommission {
  rate: number;
  baseAmount: number;
  commissionAmount: number;
  status: CommissionStatus | 'PENDING_DELIVERY';
  sourceLabel: string;
  isEstimated: boolean;
}

export function getParcelCommissionForUser(
  parcel: Parcel,
  user: User,
  collectionPoints: CollectionPoint[],
  commissions: CommissionEntry[]
): ParcelUserCommission | null {
  if (user.role !== 'COLLECTOR' && user.role !== 'TRANSPORTER') {
    return null;
  }

  const existingCommission = commissions.find(
    (commission) => commission.parcelId === parcel.id && commission.beneficiaryUserId === user.id
  );

  if (existingCommission) {
    return {
      rate: existingCommission.rate,
      baseAmount: existingCommission.baseAmount,
      commissionAmount: existingCommission.commissionAmount,
      status: existingCommission.status,
      sourceLabel:
        existingCommission.sourceCollectionPointName ??
        existingCommission.sourceVehicleLabel ??
        'Source commission',
      isEstimated: false,
    };
  }

  if (user.role === 'COLLECTOR') {
    const originPoint = collectionPoints.find((point) => point.id === parcel.originPointId);

    if (
      !originPoint ||
      originPoint.responsibleId !== user.id ||
      originPoint.commissionRate === undefined
    ) {
      return null;
    }

    const baseAmount = getParcelRevenueBase(parcel);

    return {
      rate: originPoint.commissionRate,
      baseAmount,
      commissionAmount: calculateCommissionAmount(baseAmount, originPoint.commissionRate),
      status: parcel.status === 'DELIVERED' ? 'PAYABLE' : 'PENDING_DELIVERY',
      sourceLabel: originPoint.name,
      isEstimated: parcel.status !== 'DELIVERED',
    };
  }

  if (
    user.transporterCommissionRate === undefined ||
    !parcel.history.some((entry) => entry.actorId === user.id && entry.status === 'IN_TRANSIT')
  ) {
    return null;
  }

  const baseAmount = getParcelRevenueBase(parcel);

  return {
    rate: user.transporterCommissionRate,
    baseAmount,
    commissionAmount: calculateCommissionAmount(baseAmount, user.transporterCommissionRate),
    status: parcel.status === 'DELIVERED' ? 'PAYABLE' : 'PENDING_DELIVERY',
    sourceLabel: 'Trajet transporteur',
    isEstimated: parcel.status !== 'DELIVERED',
  };
}

export function buildCommissionEntries(
  parcels: Parcel[],
  collectionPoints: CollectionPoint[],
  users: User[],
  vehicles: Vehicle[]
): CommissionEntry[] {
  const deliveredParcels = parcels.filter((parcel) => parcel.status === 'DELIVERED');

  return deliveredParcels.flatMap((parcel, parcelIndex) => {
    const earnedAt = getParcelDeliveredAt(parcel);
    const baseAmount = getParcelRevenueBase(parcel);
    const originPoint = collectionPoints.find((point) => point.id === parcel.originPointId);
    const entries: CommissionEntry[] = [];

    if (originPoint?.commissionRate !== undefined) {
      const collector = users.find((user) => user.id === originPoint.responsibleId);

      if (collector) {
        entries.push(
          createCommissionEntry({
            id: `commission-${parcel.id}-collector`,
            parcel,
            beneficiaryRole: 'COLLECTOR',
            beneficiaryUserId: collector.id,
            beneficiaryName: collector.name,
            rate: originPoint.commissionRate,
            baseAmount,
            status: parcelIndex % 2 === 0 ? 'PAYABLE' : 'PAID',
            earnedAt,
            sourceCollectionPointId: originPoint.id,
            sourceCollectionPointName: originPoint.name,
          })
        );
      }
    }

    const transporterSteps = parcel.history.filter(
      (entry) =>
        entry.status === 'IN_TRANSIT' &&
        users.some((user) => user.id === entry.actorId && user.role === 'TRANSPORTER')
    );
    const uniqueTransporterIds = Array.from(new Set(transporterSteps.map((entry) => entry.actorId)));

    uniqueTransporterIds.forEach((transporterId, transporterIndex) => {
      const transporter = users.find((user) => user.id === transporterId);

      if (!transporter?.transporterCommissionRate) {
        return;
      }

      const firstStep = transporterSteps.find((entry) => entry.actorId === transporterId);
      const vehicle = vehicles.find((item) => item.id === firstStep?.vehicleId);

      entries.push(
        createCommissionEntry({
          id: `commission-${parcel.id}-transporter-${transporterId}`,
          parcel,
          beneficiaryRole: 'TRANSPORTER',
          beneficiaryUserId: transporter.id,
          beneficiaryName: transporter.name,
          rate: transporter.transporterCommissionRate,
          baseAmount,
          status: (parcelIndex + transporterIndex) % 2 === 0 ? 'PAYABLE' : 'PAID',
          earnedAt,
          sourceVehicleId: vehicle?.id,
          sourceVehicleLabel: vehicle ? `${vehicle.type} ${vehicle.plate}` : undefined,
        })
      );
    });

    return entries;
  });
}

function createCommissionEntry(input: {
  id: string;
  parcel: Parcel;
  beneficiaryRole: CommissionBeneficiaryRole;
  beneficiaryUserId: string;
  beneficiaryName: string;
  rate: number;
  baseAmount: number;
  status: CommissionStatus;
  earnedAt: Date;
  sourceCollectionPointId?: string;
  sourceCollectionPointName?: string;
  sourceVehicleId?: string;
  sourceVehicleLabel?: string;
}): CommissionEntry {
  const paidAt = input.status === 'PAID' ? addDays(input.earnedAt, 2) : undefined;

  return {
    id: input.id,
    parcelId: input.parcel.id,
    trackingNumber: input.parcel.trackingNumber,
    beneficiaryRole: input.beneficiaryRole,
    beneficiaryUserId: input.beneficiaryUserId,
    beneficiaryName: input.beneficiaryName,
    sourceCollectionPointId: input.sourceCollectionPointId,
    sourceCollectionPointName: input.sourceCollectionPointName,
    sourceVehicleId: input.sourceVehicleId,
    sourceVehicleLabel: input.sourceVehicleLabel,
    rate: input.rate,
    baseAmount: input.baseAmount,
    commissionAmount: calculateCommissionAmount(input.baseAmount, input.rate),
    currency: 'EUR',
    status: input.status,
    earnedAt: input.earnedAt,
    paidAt,
    createdAt: input.earnedAt,
    updatedAt: paidAt ?? input.earnedAt,
  };
}

function getParcelDeliveredAt(parcel: Parcel) {
  return (
    [...parcel.history]
      .reverse()
      .find((entry) => entry.status === 'DELIVERED')?.timestamp ?? parcel.updatedAt
  );
}

function sumCommissionAmounts(commissions: CommissionEntry[]) {
  return roundMoney(commissions.reduce((sum, commission) => sum + commission.commissionAmount, 0));
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}
