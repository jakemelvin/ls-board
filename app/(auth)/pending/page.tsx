'use client';

import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    icon: CheckCircle2,
    label: 'Demande reçue',
    description: 'Votre demande de création de compte a bien été enregistrée.',
    done: true,
  },
  {
    icon: Clock,
    label: 'Examen en cours',
    description: 'Notre équipe vérifie les informations de votre entreprise.',
    done: false,
  },
  {
    icon: Mail,
    label: 'Notification par email',
    description: 'Vous recevrez un email dès que votre compte sera approuvé.',
    done: false,
  },
];

export default function PendingPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-10 text-center">
        {/* Icon + Title */}
        <div className="space-y-4">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/30">
              <Clock className="h-9 w-9 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Demande en cours d'examen
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Votre entreprise a été enregistrée avec succès. Un super administrateur
              SENDAMhub doit approuver votre compte avant que vous puissiez accéder à la
              plateforme.
            </p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex gap-4">
                <div className="flex flex-col items-center gap-0">
                  <div
                    className={
                      step.done
                        ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
                        : i === 1
                        ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/30'
                        : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`mt-1 h-8 w-px ${step.done ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </div>
                <div className="pb-2">
                  <p className={`text-sm font-semibold ${step.done ? 'text-foreground' : i === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estimated time */}
        <div className="rounded-xl border border-border bg-muted/50 px-5 py-4 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Délai estimé :</span> 24 à 48 heures
            ouvrées. En cas de besoin, contactez{' '}
            <span className="font-medium text-primary">support@sendam.fr</span>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la connexion
          </Button>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Vérifier le statut
          </button>
        </div>
      </div>
    </div>
  );
}
