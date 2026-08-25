'use client';

import { Waypoints } from 'lucide-react';
import { CompanyGuard } from '@/components/company/company-shared';
import { CatalogAssignmentManager } from '@/components/company/catalog-assignment-manager';
import {
  getTransportModes,
  getCompanyTransportModes,
  addCompanyTransportMode,
  removeCompanyTransportMode,
} from '@/lib/company/api';
import { getTransportModeIcon } from '@/lib/transport-mode-icons';
import { useTranslation } from '@/lib/i18n';

export function TransportModesManagement() {
  const { t } = useTranslation('dashboard');

  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CatalogAssignmentManager
          companyId={companyId}
          title={t('catalogAssignments.transportModes.title')}
          subtitle={t('catalogAssignments.transportModes.subtitle', { values: { company: company.name } })}
          itemLabel={t('catalog.itemLabels.transportMode')}
          icon={Waypoints}
          getItemIcon={(item) => getTransportModeIcon(item.name)}
          loadCatalog={getTransportModes}
          loadAssigned={async (token, id) =>
            (await getCompanyTransportModes(token, id)).transportModes
          }
          add={addCompanyTransportMode}
          remove={removeCompanyTransportMode}
          getRemovalConfirmation={(item) => ({
            title: t('catalogAssignments.transportModes.confirmDeactivate.title'),
            description: t('catalogAssignments.transportModes.confirmDeactivate.description', { values: { name: item.name } }),
            confirmLabel: t('catalogAssignments.transportModes.confirmDeactivate.action'),
            destructive: true,
          })}
        />
      )}
    </CompanyGuard>
  );
}
