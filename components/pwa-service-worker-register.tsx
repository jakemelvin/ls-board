'use client';

import { useEffect } from 'react';

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const canRegister = process.env.NODE_ENV === 'production' || isLocalhost;

    if (!canRegister) {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration can fail in restricted previews; the app remains usable without offline support.
      });
    });
  }, []);

  return null;
}
