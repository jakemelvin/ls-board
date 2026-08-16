'use client';

import { useEffect } from 'react';

export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.all(registrations.map((registration) => registration.unregister()));
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('sendam-pwa-'))
            .map((cacheName) => caches.delete(cacheName)),
        );
      });
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
