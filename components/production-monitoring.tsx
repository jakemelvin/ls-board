'use client'

import { useEffect } from 'react'
import { track } from '@vercel/analytics'

const MAX_EVENTS_PER_PAGE = 5

/** Reports only aggregate client-error signals; error text and user data never leave the browser. */
export function ProductionMonitoring() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return

    let sentEvents = 0
    const report = (source: 'error' | 'unhandled_rejection') => {
      if (sentEvents >= MAX_EVENTS_PER_PAGE) return
      sentEvents += 1
      track('client_error', { source })
    }

    const onError = () => report('error')
    const onUnhandledRejection = () => report('unhandled_rejection')

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
