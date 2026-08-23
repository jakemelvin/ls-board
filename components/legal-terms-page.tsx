'use client'

import { ShieldCheck, UserRoundCheck } from 'lucide-react'

import { SendamLogo } from '@/components/sendam-logo'
import { useTranslation } from '@/lib/i18n'

const TERMS_SECTIONS = [
  ['service', 2], ['partners', 3], ['users', 2], ['financial', 2],
] as const
const PRIVACY_SECTIONS = [
  ['collection', 4], ['usage', 4], ['sharing', 3],
] as const

type Section = (typeof TERMS_SECTIONS)[number] | (typeof PRIVACY_SECTIONS)[number]

function LegalSection({ section }: { section: Section }) {
  const { t } = useTranslation('legal')
  const [key, paragraphs] = section
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <h3 className="text-base font-bold leading-snug text-foreground sm:text-lg">{t(`sections.${key}.title`)}</h3>
      <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground sm:text-[0.9375rem]">
        {Array.from({ length: paragraphs }, (_, index) => <p key={index}>{t(`sections.${key}.p${index + 1}`)}</p>)}
      </div>
    </section>
  )
}

export function LegalTermsPage() {
  const { t } = useTranslation('legal')
  return (
    <main className="h-dvh overflow-y-auto overscroll-y-contain bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-18 max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <SendamLogo className="scale-90 origin-left sm:scale-100" />
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-3xl border border-primary/25 bg-primary/10 p-6 sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">{t('eyebrow')}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{t('subtitle')}</p>
        </div>
        <div className="mt-10 space-y-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><UserRoundCheck className="h-5 w-5" aria-hidden /></span><h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{t('terms')}</h2></div>
          {TERMS_SECTIONS.map((section) => <LegalSection key={section[0]} section={section} />)}
        </div>
        <div className="mt-12 space-y-5">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success"><ShieldCheck className="h-5 w-5" aria-hidden /></span><h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{t('privacy')}</h2></div>
          {PRIVACY_SECTIONS.map((section) => <LegalSection key={section[0]} section={section} />)}
        </div>
      </div>
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">{t('footer', { values: { year: new Date().getFullYear() } })}</footer>
    </main>
  )
}
