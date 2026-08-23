import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('map uses nearby and location collection-point endpoints', async ({ page }) => {
  const requestedUrls: string[] = [];

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          window.setTimeout(() => {
            success({
              coords: {
                latitude: 4.0511,
                longitude: 9.7043,
                accuracy: 20,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            } as GeolocationPosition);
          }, 12_000);
        },
      },
    });
  });

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requestedUrls.push(`${request.method()} ${url.pathname}${url.search}`);
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK', token: 'map-api-token', userId: 4, companyId: 1,
        role: 'COLLECTOR', firstName: 'Marc', lastName: 'Collecteur', username: 'marc.collecteur',
      });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname === '/api/countries/operational-served') {
      await json([{ countryId: 47, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' }]);
      return;
    }
    if (url.pathname === '/api/cities/countries/47/operational-served') {
      await json([{ cityId: 1, cityName: 'Douala', countryId: 47, countryName: 'Cameroun' }]);
      return;
    }
    if (url.pathname === '/api/delivery/collection-points/search/nearby') {
      await json([
        searchResult({ id: 2, name: 'Point Messassi', companyId: 1, companyName: 'Express Delivery', distanceKm: 7.05, latitude: 4.0511, longitude: 9.7679 }),
        searchResult({ id: 5, name: 'Agence partenaire', companyId: 9, companyName: 'WTL Services', distanceKm: 12.4, latitude: 4.071, longitude: 9.81 }),
      ]);
      return;
    }
    if (url.pathname === '/api/delivery/collection-points/search/by-location') {
      await json([
        searchResult({ id: 7, name: 'Point Bonapriso', companyId: 1, companyName: 'Express Delivery', latitude: 4.02, longitude: 9.69 }),
        searchResult({ id: 8, name: 'Point Yaounde', companyId: 2, companyName: 'Reseau Centre', latitude: 3.8667, longitude: 11.5167, cityId: 2, cityName: 'Yaounde' }),
      ]);
      return;
    }

    await json({ content: [], totalPages: 0, totalElements: 0 });
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('marc.collecteur');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('navigation').getByRole('button', { name: /Carte|Map/i }).click();
  } else {
    await page.getByRole('complementary').getByRole('button', { name: /Carte|Map/i }).click();
  }

  await expect(page.getByText(/Recherchez les points autour|Find collection points around/)).toBeVisible();
  await page.getByRole('button', { name: /Autour de moi|Near me/ }).click();
  await expect(page.getByText('Point Messassi').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Agence partenaire').first()).toBeVisible();
  await expect(page.getByText(/trie.*distance.*backend|sorted by distance by the backend/i)).toBeVisible();
  expect(requestedUrls.find((entry) => entry.includes('/search/nearby'))).toContain('latitude=4.0511');
  expect(requestedUrls.find((entry) => entry.includes('/search/nearby'))).toContain('longitude=9.7043');

  await page.getByLabel(/Pays|Country/).selectOption('47');
  await page.getByLabel(/Ville|City/).selectOption('1');
  await expect(page.getByText('Point Bonapriso').first()).toBeVisible();
  const locationRequest = requestedUrls.find((entry) => entry.includes('/search/by-location'));
  await expect(page.getByText('Point Yaounde')).not.toBeVisible();
  expect(locationRequest).toContain('countryId=47');
  expect(locationRequest).toContain('cityId=1');
});

function searchResult({
  id,
  name,
  companyId,
  companyName,
  distanceKm,
  latitude,
  longitude,
  cityId = 1,
  cityName = 'Douala',
}: {
  id: number;
  name: string;
  companyId: number;
  companyName: string;
  distanceKm?: number;
  latitude: number;
  longitude: number;
  cityId?: number;
  cityName?: string;
}) {
  return {
    companyId,
    companyName,
    sameCity: true,
    distanceKm,
    collectionPoint: {
      id,
      reference: `CP-${id}`,
      name,
      city: { cityId, cityName, countryId: 47, countryName: 'Cameroun' },
      zone: { id: 1, name: cityName, city: { cityName } },
      address: `${cityName}, Cameroun`,
      phone: '237600000000',
      latitude,
      longitude,
      openingHours: [{ dayOfWeek: 'MONDAY', closed: false, openingTime: '08:00', closingTime: '18:00' }],
      manuallyClosed: false,
      mobileAvailability: true,
      active: true,
      maxCapacity: 100,
      capacityUnit: 'KG',
      openNow: true,
      availabilityStatus: 'OPEN',
      availabilityMessage: 'Ouvert maintenant',
    },
  };
}