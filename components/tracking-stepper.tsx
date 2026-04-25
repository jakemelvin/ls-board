'use client';

import { Check, Circle, Package, Truck, MapPin, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParcelStatus, ParcelHistoryEntry } from '@/lib/mock-data';

interface TrackingStepperProps {
  currentStatus: ParcelStatus;
  history: ParcelHistoryEntry[];
}

const STEPS: { status: ParcelStatus; label: string; icon: React.ElementType }[] = [
  { status: 'CREATED', label: 'Créé', icon: Package },
  { status: 'RECEIVED_AT_COLLECTION_POINT', label: 'Reçu Point A', icon: MapPin },
  { status: 'IN_TRANSIT', label: 'En Transit', icon: Truck },
  { status: 'ARRIVED_AT_DESTINATION', label: 'Arrivé Point B', icon: MapPin },
  { status: 'DELIVERED', label: 'Livré', icon: CheckCircle2 },
];

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

  if (isRejected) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-destructive/10 p-6">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
            <Package className="h-6 w-6 text-destructive" />
          </div>
          <p className="font-medium text-destructive">Colis Rejeté</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {history[history.length - 1]?.location || 'Non conforme'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        {/* Progress line background */}
        <div className="absolute left-0 top-5 h-0.5 w-full bg-border" />
        
        {/* Progress line filled */}
        <div
          className="absolute left-0 top-5 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const historyEntry = history.find((h) => h.status === step.status);
          const Icon = step.icon;

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isCompleted && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-primary/20 text-primary',
                  !isCompleted && !isCurrent && 'border-border bg-card text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    'text-xs font-medium',
                    (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                {historyEntry && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {historyEntry.timestamp.toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
