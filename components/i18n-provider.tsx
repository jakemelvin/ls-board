'use client'

import type { ReactNode } from 'react'

import { I18nProvider as I18nClientProvider } from '@/lib/i18n'

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nClientProvider>{children}</I18nClientProvider>
}
