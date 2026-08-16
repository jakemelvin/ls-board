'use client';

import { useState } from 'react';
import { Boxes, PackageOpen, Waypoints } from 'lucide-react';

import { CatalogCrudManager } from '@/components/company/catalog-crud-manager';
import { useTranslation } from '@/lib/i18n';
import {
  createParcelType,
  createTransportMode,
  deleteParcelType,
  deleteTransportMode,
  getParcelTypes,
  getTransportModes,
  updateParcelType,
  updateTransportMode,
} from '@/lib/company/api';
import { getTransportModeIcon } from '@/lib/transport-mode-icons';
import { cn } from '@/lib/utils';
import { PickupParcelTypesManagement } from '@/components/views/pickup-parcel-types-management';

type CatalogTab = 'parcel-types' | 'transport-modes' | 'pickup-parcel-types';

const TABS: { id: CatalogTab; labelKey: string; icon: React.ElementType }[] = [
  { id: 'parcel-types', labelKey: 'catalog.tabs.parcelTypes', icon: Boxes },
  { id: 'transport-modes', labelKey: 'catalog.tabs.transportModes', icon: Waypoints },
  { id: 'pickup-parcel-types', labelKey: 'shell.sections.pickupParcelTypes', icon: PackageOpen },
];

export function CatalogManagement() {
  const { t } = useTranslation('dashboard');
  const [tab, setTab] = useState<CatalogTab>('parcel-types');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t('catalog.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('catalog.subtitle')}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-secondary p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, labelKey, icon: Icon }) => (
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
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tab === 'pickup-parcel-types' ? (
        <PickupParcelTypesManagement />
      ) : tab === 'parcel-types' ? (
        <CatalogCrudManager
          title={t('catalog.tabs.parcelTypes')}
          subtitle={t('catalog.common.globalCatalogSubtitle')}
          itemLabel={t('catalog.itemLabels.parcelType')}
          icon={Boxes}
          load={getParcelTypes}
          create={createParcelType}
          update={updateParcelType}
          remove={deleteParcelType}
        />
      ) : (
        <CatalogCrudManager
          title={t('catalog.tabs.transportModes')}
          subtitle={t('catalog.common.globalCatalogSubtitle')}
          itemLabel={t('catalog.itemLabels.transportMode')}
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
