'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import defaultCommon from '@/public/locales/fr/common.json'
import defaultDashboard from '@/public/locales/fr/dashboard.json'
import defaultLogin from '@/public/locales/fr/login.json'
import defaultPending from '@/public/locales/fr/pending.json'
import defaultRegister from '@/public/locales/fr/register.json'
import englishCommon from '@/public/locales/en/common.json'
import englishDashboard from '@/public/locales/en/dashboard.json'
import englishLogin from '@/public/locales/en/login.json'
import englishPending from '@/public/locales/en/pending.json'
import englishRegister from '@/public/locales/en/register.json'

import { defaultLocale, defaultNamespace, fallbackNamespace, locales, namespaces } from './settings'
import type { Locale, Namespace } from './settings'

type TranslationValue = string | Record<string, TranslationValue>
type TranslationFile = Record<string, TranslationValue>
type TranslationResources = Partial<Record<Namespace, TranslationFile>>
type TranslationValues = Record<string, number | string>

type TranslateOptions = {
  defaultValue?: string
  ns?: Namespace
  values?: TranslationValues
}

type I18nContextValue = {
  isReady: boolean
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, options?: TranslateOptions) => string
}

const STORAGE_KEY = 'sendam_locale'
const I18N_ASSET_VERSION = '2026-06-14-announcements-api'

const bundledResources: Record<Locale, TranslationResources> = {
  fr: {
    common: defaultCommon as TranslationFile,
    dashboard: defaultDashboard as TranslationFile,
    login: defaultLogin as TranslationFile,
    pending: defaultPending as TranslationFile,
    register: defaultRegister as TranslationFile,
  },
  en: {
    common: englishCommon as TranslationFile,
    dashboard: englishDashboard as TranslationFile,
    login: englishLogin as TranslationFile,
    pending: englishPending as TranslationFile,
    register: englishRegister as TranslationFile,
  },
}

const I18nContext = createContext<I18nContextValue | null>(null)

function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale)
}

function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale
  }

  const storedLocale = window.localStorage.getItem(STORAGE_KEY)

  if (isLocale(storedLocale)) {
    return storedLocale
  }

  const navigatorLocale = window.navigator.language.split('-')[0]

  return isLocale(navigatorLocale) ? navigatorLocale : defaultLocale
}

function readNestedValue(file: TranslationFile | undefined, key: string): string | undefined {
  const value = key.split('.').reduce<TranslationValue | undefined>((currentValue, part) => {
    if (!currentValue || typeof currentValue === 'string') {
      return undefined
    }

    return currentValue[part]
  }, file)

  return typeof value === 'string' ? value : undefined
}

function interpolate(value: string, values?: TranslationValues) {
  if (!values) {
    return value
  }

  return Object.entries(values).reduce(
    (message, [key, replacement]) => message.replaceAll(`{{${key}}}`, String(replacement)),
    value,
  )
}

function getBundledResources(locale: Locale): TranslationResources {
  return bundledResources[locale] ?? bundledResources[defaultLocale]
}

async function loadLocaleResources(locale: Locale) {
  const settledEntries = await Promise.allSettled(
    namespaces.map(async (namespace) => {
      const response = await fetch(
        `/locales/${locale}/${namespace}.json?v=${I18N_ASSET_VERSION}`,
        { cache: 'no-store' },
      )

      if (!response.ok) {
        throw new Error(`Unable to load ${locale}/${namespace} translations`)
      }

      return [namespace, (await response.json()) as TranslationFile] as const
    }),
  )

  return Object.fromEntries(
    settledEntries
      .filter((entry): entry is PromiseFulfilledResult<readonly [Namespace, TranslationFile]> =>
        entry.status === 'fulfilled',
      )
      .map((entry) => entry.value),
  ) as TranslationResources
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [resources, setResources] = useState<TranslationResources>(getBundledResources(defaultLocale))
  const [fallbackResources, setFallbackResources] = useState<TranslationResources>(
    getBundledResources(defaultLocale),
  )
  const [isReady, setIsReady] = useState(true)

  useEffect(() => {
    setLocaleState(getBrowserLocale())
  }, [])

  useEffect(() => {
    let isCurrent = true
    const bundledLocaleResources = getBundledResources(locale)
    const bundledFallbackResources = getBundledResources(defaultLocale)

    setResources(bundledLocaleResources)
    setFallbackResources(bundledFallbackResources)
    document.documentElement.lang = locale
    setIsReady(false)

    async function loadResources() {
      try {
        const [localeResources, defaultLocaleResources] = await Promise.all([
          loadLocaleResources(locale),
          locale === defaultLocale ? Promise.resolve({}) : loadLocaleResources(defaultLocale),
        ])

        if (!isCurrent) {
          return
        }

        setResources({
          ...bundledLocaleResources,
          ...localeResources,
        })
        setFallbackResources({
          ...bundledFallbackResources,
          ...defaultLocaleResources,
        })
      } catch {
        if (!isCurrent) {
          return
        }

        setResources(bundledLocaleResources)
        setFallbackResources(bundledFallbackResources)
      } finally {
        if (isCurrent) {
          setIsReady(true)
        }
      }
    }

    void loadResources()

    return () => {
      isCurrent = false
    }
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, nextLocale)
    setLocaleState(nextLocale)
  }, [])

  const t = useCallback(
    (key: string, options?: TranslateOptions) => {
      const namespace = options?.ns ?? defaultNamespace
      const value =
        readNestedValue(resources[namespace], key) ??
        readNestedValue(resources[fallbackNamespace], key) ??
        readNestedValue(fallbackResources[namespace], key) ??
        readNestedValue(fallbackResources[fallbackNamespace], key) ??
        options?.defaultValue ??
        key

      return interpolate(value, options?.values)
    },
    [fallbackResources, resources],
  )

  const value = useMemo(
    () => ({
      isReady,
      locale,
      setLocale,
      t,
    }),
    [isReady, locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider')
  }

  return context
}

export function useTranslation(namespace: Namespace = defaultNamespace) {
  const i18n = useI18n()

  const t = useCallback(
    (key: string, options?: Omit<TranslateOptions, 'ns'>) =>
      i18n.t(key, {
        ...options,
        ns: namespace,
      }),
    [i18n, namespace],
  )

  return {
    ...i18n,
    t,
  }
}
