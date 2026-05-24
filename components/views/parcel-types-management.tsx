'use client';

import { Package } from 'lucide-react';
import { CompanyGuard } from '@/components/company/company-shared';
import { CatalogAssignmentManager } from '@/components/company/catalog-assignment-manager';
import {
  getParcelTypes,
  getCompanyParcelTypes,
  addCompanyParcelType,
  removeCompanyParcelType,
} from '@/lib/company/api';

export function ParcelTypesManagement() {
  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CatalogAssignmentManager
          companyId={companyId}
          title="Types de colis"
          subtitle={`Sélectionnez les types de colis pris en charge par ${company.name}.`}
          itemLabel="type de colis"
          icon={Package}
          loadCatalog={getParcelTypes}
          loadAssigned={async (token, id) => (await getCompanyParcelTypes(token, id)).parcelTypes}
          add={addCompanyParcelType}
          remove={removeCompanyParcelType}
        />
      )}
    </CompanyGuard>
  );
}
