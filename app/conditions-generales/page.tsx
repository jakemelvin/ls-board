import type { Metadata } from 'next'

import { LegalTermsPage } from '@/components/legal-terms-page'

export const metadata: Metadata = {
  title: 'Conditions générales | SENDAMhub',
  description: "Conditions générales d'utilisation et politique de confidentialité de SENDAMhub.",
}

export default function ConditionsGeneralesPage() {
  return <LegalTermsPage />
}
