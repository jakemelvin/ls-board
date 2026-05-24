import type { ReactNode } from 'react';
import { Package2, MapPin, BarChart3 } from 'lucide-react';
import { SendamLogo } from '@/components/sendam-logo';

const FEATURES = [
  { icon: Package2, label: 'Gestion des colis en temps réel' },
  { icon: MapPin, label: 'Réseau de points de collecte' },
  { icon: BarChart3, label: 'Tableaux de bord opérationnels' },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Left branding panel */}
      <div className="relative hidden lg:flex lg:w-[480px] lg:flex-col lg:justify-between overflow-hidden border-r border-border p-12">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(96,165,250,0.12),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(91,145,255,0.08),transparent_60%)]" />

        {/* Top: Logo */}
        <div className="relative">
          <SendamLogo />
        </div>

        {/* Middle: Headline */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground">
              La plateforme logistique{' '}
              <span className="text-primary">nouvelle génération</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Gérez vos colis, transporteurs et points de collecte depuis un seul
              tableau de bord unifié.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-foreground/80">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: Legal */}
        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} SENDAMhub. Tous droits réservés.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <SendamLogo />
        </div>
        {children}
      </div>
    </div>
  );
}
