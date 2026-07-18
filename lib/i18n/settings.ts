export const locales = ['fr', 'en'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'fr'

export const namespaces = ['common', 'dashboard', 'login', 'pending', 'register', 'shipment-create'] as const

export type Namespace = (typeof namespaces)[number]

export const defaultNamespace: Namespace = 'common'

export const fallbackNamespace: Namespace = 'common'
