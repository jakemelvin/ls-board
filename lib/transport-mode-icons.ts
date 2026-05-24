import type { ElementType } from 'react';
import {
  Anchor,
  Bike,
  Bus,
  Cable,
  Car,
  Forklift,
  PersonStanding,
  Plane,
  Ship,
  Tractor,
  Train,
  Truck,
  Waypoints,
  Zap,
} from 'lucide-react';

type IconRule = { keywords: string[]; icon: ElementType };

// Ordered most-specific first to avoid false substring matches.
// Each entry covers both French and English variants.
const RULES: IconRule[] = [
  {
    // Air / Aérien
    keywords: [
      'air', 'avion', 'aérien', 'aerien', 'vol', 'drone', 'aéro', 'aero',
      'aerial', 'aviation', 'flight',
    ],
    icon: Plane,
  },
  {
    // Sea / Maritime
    keywords: [
      'sea', 'ocean', 'maritime', 'marine', 'naval', 'ship', 'vessel', 'ferry',
      'bateau', 'navire', 'fluvial', 'barge', 'mer', 'marin',
    ],
    icon: Ship,
  },
  {
    // Port / Anchor
    keywords: ['anchor', 'ancre', 'port', 'dock'],
    icon: Anchor,
  },
  {
    // Rail / Train
    keywords: [
      'rail', 'train', 'railway', 'railroad', 'subway', 'metro',
      'ferroviaire', 'tgv', 'métro', 'tramway', 'tram', 'rer',
    ],
    icon: Train,
  },
  {
    // Bus / Coach
    keywords: [
      'bus', 'coach', 'shuttle', 'minibus',
      'autocar', 'autobus', 'navette',
    ],
    icon: Bus,
  },
  {
    // Motorcycle / Scooter
    keywords: [
      'moto', 'motorcycle', 'scooter', 'motorbike', 'two-wheel',
      'motocyclette', 'deux-roues', 'deux roues',
    ],
    icon: Bike,
  },
  {
    // Bicycle / Cycle
    keywords: [
      'bike', 'bicycle', 'cycling', 'cycle',
      'vélo', 'velo', 'bicyclette', 'cycliste',
    ],
    icon: Bike,
  },
  {
    // Electric / E-vehicle
    keywords: ['electric', 'e-bike', 'scooter électrique', 'trottinette', 'électrique', 'electrique'],
    icon: Zap,
  },
  {
    // Truck / Heavy vehicle
    keywords: [
      'truck', 'lorry', 'freight', 'cargo truck', 'semi', 'trailer',
      'camion', 'camionnette', 'remorque', 'poids lourd', 'fret routier', 'utilitaire',
    ],
    icon: Truck,
  },
  {
    // Ground / Road — catch-all for generic ground transport
    keywords: [
      'ground', 'road', 'land', 'surface',
      'terrestre', 'routier', 'route',
    ],
    icon: Truck,
  },
  {
    // Car / Light vehicle
    keywords: [
      'car', 'vehicle', 'auto', 'sedan', 'suv',
      'voiture', 'véhicule', 'vehicule', 'berline',
    ],
    icon: Car,
  },
  {
    // Tractor / Agricultural
    keywords: ['tractor', 'tracteur', 'agricole', 'agricultural'],
    icon: Tractor,
  },
  {
    // Forklift / Warehouse
    keywords: ['forklift', 'chariot', 'élévateur', 'elevateur'],
    icon: Forklift,
  },
  {
    // Cable car / Funicular
    keywords: ['cable', 'câble', 'téléphérique', 'telepherique', 'funicular', 'funiculaire'],
    icon: Cable,
  },
  {
    // On foot / Walking courier
    keywords: [
      'foot', 'walk', 'walking', 'pedestrian', 'courier on foot',
      'piéton', 'pieton', 'pied', 'marche', 'coursier',
    ],
    icon: PersonStanding,
  },
];

export function getTransportModeIcon(name: string): ElementType {
  const lower = name.toLowerCase();
  for (const { keywords, icon } of RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
  }
  return Waypoints;
}
