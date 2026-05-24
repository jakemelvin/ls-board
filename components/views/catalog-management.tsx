'use client';

import { useState } from 'react';
import { Boxes, Waypoints } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CatalogCrudManager } from '@/components/company/catalog-crud-manager';
import {
  getParcelTypes,
  createParcelType,
  updateParcelType,
  deleteParcelType,
  getTransportModes,
  createTransportMode,
  updateTransportMode,
  deleteTransportMode,
} from '@/lib/company/api';
import { getTransportModeIcon } from '@/lib/transport-mode-icons';

type CatalogTab = 'parcel-types' | 'transport-modes';

const TABS: { id: CatalogTab; label: string; icon: React.ElementType }[] = [
  { id: 'parcel-types', label: 'Types de colis', icon: Boxes },
  { id: 'transport-modes', label: 'Modes de transport', icon: Waypoints },
];

export function CatalogManagement() {
  const [tab, setTab] = useState<CatalogTab>('parcel-types');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Référentiel global des types de colis et modes de transport, proposés aux entreprises.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-secondary p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'parcel-types' ? (
        <CatalogCrudManager
          title="Types de colis"
          subtitle="Catalogue global proposé à toutes les entreprises."
          itemLabel="type de colis"
          icon={Boxes}
          load={getParcelTypes}
          create={createParcelType}
          update={updateParcelType}
          remove={deleteParcelType}
        />
      ) : (
        <CatalogCrudManager
          title="Modes de transport"
          subtitle="Catalogue global proposé à toutes les entreprises."
          itemLabel="mode de transport"
          icon={Waypoints}
          getItemIcon={(item) => getTransportModeIcon(item.name)}
          load={getTransportModes}
          create={createTransportMode}
          update={updateTransportMode}
          remove={deleteTransportMode}
        />
      )}
    </div>
  );
}
