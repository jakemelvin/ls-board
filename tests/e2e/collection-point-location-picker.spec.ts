import { expect, test, type Locator, type Page } from '@playwright/test';

const IS_MOBILE = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;

const API_ORIGIN = 'https://dstest.easywaka.com';

const CITY = {
  cityId: 1,
  cityName: 'Douala',
  countryId: 47,
  countryName: 'Cameroun',
};

const ZONE = {
  id: 1,
  name: 'Centre-ville',
  city: { cityName: 'Douala', countryId: 47 },
};

const STORED_POINT = {
  id: 9,
  reference: 'CP-9',
  name: 'Agence Yaounde',
  city: { cityId: 2, cityName: 'Yaounde', countryId: 47, countryName: 'Cameroun' },
  zone: { id: 1, name: 'Centre-ville', city: { cityName: 'Douala', countryId: 47 } },
  address: 'Yaounde, Cameroun',
  phone: '+237 6 99 00 00 00',
  latitude: 3.8667,
  longitude: 11.5167,
  openingHours: [
    { dayOfWeek: 'MONDAY', closed: false, openingTime: '08:00', closingTime: '18:00' },
  ],
  manuallyClosed: false,
  mobileAvailability: true,
  active: true,
  maxCapacity: 100,
  capacityUnit: 'KG',
  openNow: true,
  availabilityStatus: 'OPEN',
  availabilityMessage: 'Ouvert maintenant',
};

let collectionPoints: unknown[] = [];

test.beforeEach(async ({ page }) => {
  collectionPoints = [];

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK',
        token: 'picker-token',
        userId: 2,
        companyId: 1,
        role: 'ADMIN_COMPANY',
        firstName: 'Alice',
        lastName: 'Admin',
        username: 'alice.admin',
      });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname === '/api/delivery/users/me/company') {
      await json({ id: 1, name: 'Express Delivery' });
      return;
    }
    if (url.pathname === '/api/cities') {
      await json([CITY]);
      return;
    }
    if (url.pathname === '/api/delivery/companies/1/zones') {
      await json([ZONE]);
      return;
    }
    if (url.pathname === '/api/delivery/companies/1/collection-points') {
      if (route.request().method() === 'POST') {
        const payload = readPayload(route.request().postData() ?? '');
        await json({ ...STORED_POINT, ...payload, id: 12, reference: 'CP-12' });
        return;
      }

      await json(collectionPoints);
      return;
    }
    if (url.pathname === '/api/delivery/companies/1/employees') {
      await json([]);
      return;
    }

    await json({ content: [], totalPages: 0, totalElements: 0 });
  });
});

function readPayload(body: string) {
  const jsonText = body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1);
  return JSON.parse(jsonText) as Record<string, unknown>;
}

async function signInAndOpenCollectionPoints(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Nom d'utilisateur|Identifiant|Username/).fill('alice.admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  const sectionButton = /Points de collecte|Gestion territoriale|Territory management|Collection points/;

  if (IS_MOBILE(page)) {
    await page.getByRole('navigation').getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: sectionButton }).click();
  } else {
    await page.getByRole('complementary').getByRole('button', { name: sectionButton }).click();
  }

  await expect(
    page.getByRole('heading', { name: /Zones et points de collecte|Collection zones and points/ }),
  ).toBeVisible();
}

async function waitForMap(page: Page) {
  const map = page.getByRole('dialog').locator('.leaflet-container');
  await expect(map).toBeVisible();
  await expect(map.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15_000 });

  return map;
}

async function openPointDialog(page: Page) {
  await signInAndOpenCollectionPoints(page);
  await page.getByRole('button', { name: /Nouveau point|New point/ }).click();
  await expect(
    page.getByRole('dialog', { name: /Créer un point de collecte|Create a collection point/ }),
  ).toBeVisible();

  return waitForMap(page);
}

async function readMap(map: Locator) {
  return map.evaluate((container) => {
    const rect = container.getBoundingClientRect();
    const marker = container.querySelector('.leaflet-marker-icon');
    const markerRect = marker?.getBoundingClientRect();
    const tiles = Array.from(container.querySelectorAll<HTMLImageElement>('img.leaflet-tile'));

    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      tileUrls: tiles.map((tile) => tile.getAttribute('src') ?? ''),
      markerCount: container.querySelectorAll('.leaflet-marker-icon').length,
      brokenMarkerImageCount: container.querySelectorAll('img.leaflet-marker-icon').length,
      markerSize: markerRect ? { width: markerRect.width, height: markerRect.height } : null,
      markerFill: container.querySelector('.leaflet-marker-icon path')
        ? getComputedStyle(container.querySelector('.leaflet-marker-icon path')!).fill
        : null,
      markerCenter: markerRect
        ? {
            x: markerRect.left + markerRect.width / 2 - rect.left,
            y: markerRect.top + markerRect.height / 2 - rect.top,
          }
        : null,
      mapPaneTransform: getComputedStyle(container.querySelector('.leaflet-map-pane')!).transform,
    };
  });
}

/**
 * Leaflet only listens for mouse and keyboard events and relies on the browser to
 * turn a touch into a click, so Playwright's mouse events are what exercise it in
 * both the desktop and the touch-emulated projects.
 */
async function placePoint(map: Locator, x: number, y: number) {
  await map.click({ position: { x, y } });
}

test('location picker starts empty, then places the pin where the user clicks', async ({
  page,
}) => {
  const map = await openPointDialog(page);

  // 1. No position yet: no marker, and the map must not sit on the (0, 0) point.
  const initial = await readMap(map);
  await expect(
    page.getByText(/Aucun emplacement sélectionné|No location selected/),
  ).toBeVisible();
  await expect(
    page.getByText(/Coordonnées non définies|Coordinates not set/),
  ).toBeVisible();
  expect(initial.markerCount).toBe(0);
  expect(initial.width).toBeGreaterThan(200);
  expect(initial.height).toBeGreaterThan(150);
  expect(initial.tileUrls.length).toBeGreaterThan(0);
  initial.tileUrls.forEach((url) => {
    expect(url).toContain('/13/');
    expect(url).not.toContain('/16383/16383.png');
  });

  // 2. Clicking places a visible pin exactly under the cursor.
  await placePoint(map, 60, 60);
  await expect(page.getByText(/Emplacement sélectionné|Location selected/)).toBeVisible();
  await expect(page.getByText(/Aucun emplacement sélectionné|No location selected/)).toHaveCount(0);

  const afterClick = await readMap(map);
  expect(afterClick.markerCount).toBe(1);
  expect(afterClick.brokenMarkerImageCount).toBe(0);
  expect(afterClick.markerSize).toEqual({ width: 32, height: 44 });
  // The pin is drawn with the theme tokens, so it is never a broken image.
  expect(afterClick.markerFill).not.toBe('rgb(0, 0, 0)');
  expect(Math.abs((afterClick.markerCenter?.x ?? 0) - 60)).toBeLessThanOrEqual(4);
  expect(Math.abs((afterClick.markerCenter?.y ?? 0) - 40)).toBeLessThanOrEqual(4);
  await expect(page.getByText(/Coordonnées non définies|Coordinates not set/)).toHaveCount(0);

  // 3. A second click moves the pin there instead of recentring the map.
  await placePoint(map, 300, 150);

  const afterSecondClick = await readMap(map);
  expect(Math.abs((afterSecondClick.markerCenter?.x ?? 0) - 300)).toBeLessThanOrEqual(4);
  expect(Math.abs((afterSecondClick.markerCenter?.y ?? 0) - 130)).toBeLessThanOrEqual(4);
  expect(afterSecondClick.brokenMarkerImageCount).toBe(0);
});

test('location picker opens an existing point on its own position', async ({ page }) => {
  collectionPoints = [STORED_POINT];

  await signInAndOpenCollectionPoints(page);
  await page.getByRole('button', { name: /^Modifier$|^Edit$/ }).first().click();
  await expect(
    page.getByRole('dialog', { name: /Modifier le point de collecte|Edit the collection point/ }),
  ).toBeVisible();

  const map = await waitForMap(page);

  await expect(page.getByText('3.866700, 11.516700')).toBeVisible();

  const state = await readMap(map);
  expect(state.markerCount).toBe(1);
  // The map is centred on the stored position, so the pin sits in the middle.
  expect(Math.abs((state.markerCenter?.x ?? 0) - state.width / 2)).toBeLessThanOrEqual(4);
  expect(Math.abs((state.markerCenter?.y ?? 0) - (state.height / 2 - 20))).toBeLessThanOrEqual(4);
  expect(state.tileUrls.length).toBeGreaterThan(0);
  state.tileUrls.forEach((url) => {
    expect(url).toContain('/16/');
    expect(url).not.toContain('/32768/32768.png');
  });
});

test('the position picked on the map is sent when creating the point', async ({ page }) => {
  const map = await openPointDialog(page);
  const dialog = page.getByRole('dialog');

  await dialog
    .getByPlaceholder(/Agence Bonamoussadi|Bonamoussadi agency/)
    .fill('Agence Test');
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: /Centre-ville/ }).click();
  await dialog
    .getByPlaceholder(/Rue, quartier, repère\.\.\.|Street, district, landmark\.\.\./)
    .fill('Rue des tests');
  await dialog.getByPlaceholder('+237 6 90 00 00 00').fill('+237 6 90 11 22 33');
  await dialog.locator('input[type="number"]').first().fill('100');

  await placePoint(map, 150, 90);

  const readout = (await dialog.locator('p.font-mono').last().textContent()) ?? '';
  const [expectedLatitude, expectedLongitude] = readout.split(',').map((value) => Number(value));
  expect(Number.isFinite(expectedLatitude)).toBe(true);
  expect(Number.isFinite(expectedLongitude)).toBe(true);

  const createRequest = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/collection-points'),
  );
  await dialog.getByRole('button', { name: /Créer le point|Create point/ }).click();

  const payload = readPayload((await createRequest).postData() ?? '');
  expect(payload.latitude).toBeCloseTo(expectedLatitude, 4);
  expect(payload.longitude).toBeCloseTo(expectedLongitude, 4);
  await expect(
    page.getByText(/Point de collecte créé|Collection point created/),
  ).toBeVisible();
});

test('the management view is fully translated in French', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('sendam_locale', 'fr'));
  collectionPoints = [STORED_POINT];

  await signInAndOpenCollectionPoints(page);

  // A missing key falls back to the raw key, so the raw prefix must never leak.
  expect(await page.locator('main').innerText()).not.toContain('collectionPointsManagement');
  await expect(page.getByRole('button', { name: 'Modifier' }).first()).toBeVisible();
  await expect(page.getByText('Horaires', { exact: true })).toBeVisible();
  await expect(page.getByText('Visible mobile')).toBeVisible();
  // Interpolated values must reach the rendered copy.
  await expect(page.getByText('Réf CP-9')).toBeVisible();
  await expect(page.getByText('1 point(s)', { exact: true })).toBeVisible();
  await expect(page.getByText('Lun 08:00-18:00')).toBeVisible();
  await expect(page.getByText(/actuellement ouverts selon les horaires/)).toBeVisible();

  await page.getByRole('button', { name: 'Nouveau point' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Créer un point de collecte' }),
  ).toBeVisible();

  expect(await page.getByRole('dialog').innerText()).not.toContain('collectionPointsManagement');
  await expect(page.getByText('Aucun emplacement sélectionné')).toBeVisible();
  await expect(page.getByText('Coordonnées non définies')).toBeVisible();
  await expect(page.getByText("Horaires d'ouverture")).toBeVisible();
  await expect(page.getByText('Position sur la carte')).toBeVisible();
});

test('location picker map can still be panned after placing the pin', async ({ page }) => {
  const map = await openPointDialog(page);

  await placePoint(map, 200, 100);
  const before = await readMap(map);
  expect(before.markerCount).toBe(1);

  await page.mouse.move(before.left + 300, before.top + 120);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(before.left + 300 - step * 12, before.top + 120 + step * 4);
  }
  await page.mouse.up();

  const after = await readMap(map);
  expect(after.mapPaneTransform).not.toBe(before.mapPaneTransform);
  expect(after.markerCount).toBe(1);
});
