import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { PwaServiceWorkerRegister } from '@/components/pwa-service-worker-register'
import { I18nProvider } from '@/components/i18n-provider'
import './globals.css'

export const metadata: Metadata = {
  applicationName: 'SENDAMhub',
  title: 'SENDAMhub - Dashboard',
  description: 'Fast. Secure. Delivered. Plateforme SENDAMhub de gestion logistique de colis',
  generator: 'SENDAMhub',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SENDAMhub',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/brand/sendamhub-logo.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B4BA1',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className="bg-background">
      <body className="font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
        <Toaster />
        <PwaServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
