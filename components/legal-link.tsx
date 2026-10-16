'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'

import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export const LEGAL_TERMS_PATH = '/conditions-generales'

interface LegalLinkProps {
  className?: string
  showIcon?: boolean
}

// Ouvert dans un nouvel onglet pour ne jamais faire perdre une saisie en cours
// (inscription multi-étapes, profil, etc.) ni la session du dashboard.
export function LegalLink({ className, showIcon = false }: LegalLinkProps) {
  const { t } = useTranslation('common')

  return (
    <Link
      href={LEGAL_TERMS_PATH}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm font-medium underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      {showIcon && <FileText className="h-4 w-4 shrink-0" aria-hidden />}
      {t('legalLink.label')}
      <span className="sr-only">{t('legalLink.newTab')}</span>
    </Link>
  )
}
