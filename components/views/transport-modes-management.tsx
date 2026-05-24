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

export function TransportModesManagement() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CatalogAssignmentManager
          companyId={companyId}
          title="Modes de transport"
          subtitle={`Sélectionnez les modes de transport opérés par ${company.name}.`}
          itemLabel="mode de transport"
          icon={Waypoints}
          getItemIcon={(item) => getTransportModeIcon(item.name)}
          loadCatalog={getTransportModes}
          loadAssigned={async (token, id) =>
            (await getCompanyTransportModes(token, id)).transportModes
          }
          add={addCompanyTransportMode}
          remove={removeCompanyTransportMode}
        />
      )}
    </CompanyGuard>
  );
}
