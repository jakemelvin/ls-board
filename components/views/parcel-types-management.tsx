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
import { useTranslation } from '@/lib/i18n';

export function ParcelTypesManagement() {
  const { t } = useTranslation('dashboard');

  return (
    <CompanyGuard>
      {({ companyId, company }) => (
        <CatalogAssignmentManager
          companyId={companyId}
          title={t('catalogAssignments.parcelTypes.title')}
          subtitle={t('catalogAssignments.parcelTypes.subtitle', { values: { company: company.name } })}
          itemLabel={t('catalog.itemLabels.parcelType')}
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
