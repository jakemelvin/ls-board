'use client';

import { Check, Package, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParcelStatus, ParcelHistoryEntry } from '@/lib/mock-data';

interface TrackingStepperProps {
  currentStatus: ParcelStatus;
  history: ParcelHistoryEntry[];
}

type DisplayStep = {
  key:
    | 'CREATED'
    | 'TRANSIT_TO_COLLECTION'
    | 'RECEIVED_AT_COLLECTION_POINT'
    | 'IN_TRANSIT'
    | 'ARRIVED_AT_DESTINATION'
    | 'DELIVERED';
  label: string;
  icon: React.ElementType;
  isCompleted: boolean;
  isCurrent: boolean;
  timestamp?: Date;
  location?: string;
};

const STATUS_ORDER: Record<ParcelStatus, number> = {
  CREATED: 0,
  RECEIVED_AT_COLLECTION_POINT: 1,
  IN_TRANSIT: 2,
  ARRIVED_AT_DESTINATION: 3,
  DELIVERED: 4,
  REJECTED: -1,
};

export function TrackingStepper({ currentStatus, history }: TrackingStepperProps) {
  const currentIndex = STATUS_ORDER[currentStatus];
  const isRejected = currentStatus === 'REJECTED';
  const createdEntry = history.find((entry) => entry.status === 'CREATED');
  const receivedEntry = history.find(
    (entry) => entry.status === 'RECEIVED_AT_COLLECTION_POINT'
  );
  const inTransitEntry = history.find((entry) => entry.status === 'IN_TRANSIT');
  const arrivedEntry = history.find((entry) => entry.status === 'ARRIVED_AT_DESTINATION');
  const deliveredEntry = history.find((entry) => entry.status === 'DELIVERED');
  const hasReachedCollection = currentIndex >= STATUS_ORDER.RECEIVED_AT_COLLECTION_POINT;
  const isCurrentlyTransitToCollection = currentStatus === 'CREATED' && history.length > 0;

  if (isRejected) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-destructive/10 p-6">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
            <Package className="h-6 w-6 text-destructive" />
          </div>
          <p className="font-medium text-destructive">Colis Rejete</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {history[history.length - 1]?.location || 'Non conforme'}
          </p>
        </div>
      </div>
    );
  }

  const steps: DisplayStep[] = [
    {
      key: 'CREATED',
      label: 'Demande client',
      icon: Package,
      isCompleted: currentIndex > STATUS_ORDER.CREATED,
      isCurrent: currentStatus === 'CREATED' && !isCurrentlyTransitToCollection,
      timestamp: createdEntry?.timestamp,
      location: createdEntry?.location,
    },
    {
      key: 'TRANSIT_TO_COLLECTION',
      label: 'En transit vers point',
      icon: Truck,
      isCompleted: hasReachedCollection,
      isCurrent: isCurrentlyTransitToCollection,
      timestamp: receivedEntry?.timestamp ?? createdEntry?.timestamp,
      location: receivedEntry?.location ?? createdEntry?.location,
    },
    {
      key: 'RECEIVED_AT_COLLECTION_POINT',
      label: 'Recu au point',
      icon: MapPin,
      isCompleted: currentIndex > STATUS_ORDER.RECEIVED_AT_COLLECTION_POINT,
      isCurrent: currentStatus === 'RECEIVED_AT_COLLECTION_POINT',
      timestamp: receivedEntry?.timestamp,
      location: receivedEntry?.location,
    },
    {
      key: 'IN_TRANSIT',
      label: 'En transit',
      icon: Truck,
      isCompleted: currentIndex > STATUS_ORDER.IN_TRANSIT,
      isCurrent: currentStatus === 'IN_TRANSIT',
      timestamp: inTransitEntry?.timestamp,
      location: inTransitEntry?.location,
    },
    {
      key: 'ARRIVED_AT_DESTINATION',
      label: 'Arrive au point',
      icon: MapPin,
      isCompleted: currentIndex > STATUS_ORDER.ARRIVED_AT_DESTINATION,
      isCurrent: currentStatus === 'ARRIVED_AT_DESTINATION',
      timestamp: arrivedEntry?.timestamp,
      location: arrivedEntry?.location,
    },
    {
      key: 'DELIVERED',
      label: 'Livre',
      icon: CheckCircle2,
      isCompleted: false,
      isCurrent: currentStatus === 'DELIVERED',
      timestamp: deliveredEntry?.timestamp,
      location: deliveredEntry?.location,
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="hidden gap-3 md:grid md:grid-cols-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.isCompleted || step.isCurrent;

          return (
            <div key={step.key} className="relative flex flex-col items-center text-center">
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-[calc(50%+1.5rem)] top-5 h-0.5 w-[calc(100%-0.5rem)]',
                    step.isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-card',
                  step.isCompleted && 'border-primary bg-primary text-primary-foreground',
                  step.isCurrent && 'border-primary bg-primary/15 text-primary',
                  !isActive && 'border-border text-muted-foreground'
                )}
              >
                {step.isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <p
                className={cn(
                  'mt-2 text-xs font-medium',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {step.timestamp && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {step.timestamp.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 md:hidden">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = step.isCompleted || step.isCurrent;

          return (
            <div key={step.key} className="flex items-start gap-3 rounded-lg bg-card p-3">
              <div
                className={cn(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                  step.isCompleted && 'border-primary bg-primary text-primary-foreground',
                  step.isCurrent && 'border-primary bg-primary/15 text-primary',
                  !isActive && 'border-border text-muted-foreground'
                )}
              >
                {step.isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                {step.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {step.timestamp.toLocaleString('fr-FR')}
                  </p>
                )}
                {step.location && (
                  <p className="truncate text-xs text-muted-foreground">{step.location}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
