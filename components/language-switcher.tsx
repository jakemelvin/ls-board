'use client'

import { Check, Languages } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { locales, type Locale, useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const LANGUAGE_OPTIONS: Array<{
  locale: Locale
  shortLabel: string
  translationKey: 'language.english' | 'language.french'
}> = [
  {
    locale: 'fr',
    shortLabel: 'FR',
    translationKey: 'language.french',
  },
  {
    locale: 'en',
    shortLabel: 'EN',
    translationKey: 'language.english',
  },
]

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation('common')

  const currentLanguage =
    LANGUAGE_OPTIONS.find((option) => option.locale === locale) ?? LANGUAGE_OPTIONS[0]

  const handleLocaleChange = (nextLocale: Locale) => {
    if (locales.includes(nextLocale) && nextLocale !== locale) {
      setLocale(nextLocale)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-9 gap-2 px-2.5 sm:px-3', className)}
          aria-label={t('language.change')}
          title={t('language.change')}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-semibold">{currentLanguage.shortLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = option.locale === locale

          return (
            <DropdownMenuItem
              key={option.locale}
              onClick={() => handleLocaleChange(option.locale)}
              className="justify-between"
            >
              <span>{t(option.translationKey)}</span>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
