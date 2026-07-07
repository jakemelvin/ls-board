const CACHE_VERSION = 'sendam-pwa-v4';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/brand/sendamhub-logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-icon.png',
  '/icon-light-32x32.png',
  '/icon-dark-32x32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  if (requestUrl.pathname.startsWith('/locales/')) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/', clone));
          return response;
        })
        .catch(() => caches.match('/').then((cachedResponse) => cachedResponse || caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const clone = response.clone();
        caches.open(APP_SHELL_CACHE).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  const fallbackTitle = 'SENDAMhub';
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || fallbackTitle;
  const options = {
    body: notification.body || data.body || data.message,
    icon: '/icon-512.png',
    badge: '/icon-light-32x32.png',
    data: {
      url: data.url || data.click_action || '/',
      ...data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => client.url === targetUrl);
      if (matchingClient) {
        return matchingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
