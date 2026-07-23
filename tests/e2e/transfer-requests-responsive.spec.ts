import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('collector pickup requests are sorted, paginated, and mobile-friendly', async ({ page }) => {
  const requestQueries: string[] = [];

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK',
        token: 'collector-transfer-token',
        userId: 7,
        role: 'COLLECTOR',
        firstName: 'Marc',
        lastName: 'Collecteur',
        username: 'marc.collecteur',
      });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname === '/api/delivery/collectors/dashboard') {
      await json({ metrics: {}, recentShipments: [], pendingRequests: [] });
      return;
    }
    if (url.pathname === '/api/delivery/shipments/transmission/collectors/requests') {
      requestQueries.push(url.search);
      await json({
        content: [{
          requestId: 42,
          originCollectionPointName: 'Point de collecte avec un nom volontairement tres long',
          transporterUsername: 'transporteur.test',
          collectorUsername: 'marc.collecteur',
          requestedShipmentCount: 3,
          embarkedShipmentCount: 0,
          pendingShipmentCount: 3,
          status: 'PENDING_COLLECTOR_APPROVAL',
          createdAt: '2026-07-20T10:30:00',
        }],
        totalPages: 2,
        totalElements: 21,
        number: Number(url.searchParams.get('page') ?? 0),
        size: 20,
        first: url.searchParams.get('page') !== '1',
        last: url.searchParams.get('page') === '1',
        empty: false,
      });
      return;
    }

    await json({ content: [], totalPages: 0, totalElements: 0 });
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('marc.collecteur');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  if (isMobile) {
    await page.getByRole('navigation').getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Demandes de prise|Pickup requests/ }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Demandes de prise|Pickup requests/ }).click();
  }

  await expect(page.getByRole('heading', { name: /Demandes de Prise en Charge/ })).toBeVisible();
  await expect(page.getByLabel(/Ordre d'affichage|Display order/)).toHaveValue('desc');
  await expect.poll(() => requestQueries.some((query) => query.includes('sort=createdAt%2Cdesc'))).toBe(true);

  await page.getByLabel(/Ordre d'affichage|Display order/).selectOption('asc');
  await expect.poll(() => requestQueries.some((query) => query.includes('sort=createdAt%2Casc'))).toBe(true);

  if (isMobile) {
    await expect(page.getByRole('article').getByText('#42')).toBeVisible();
    await expect(page.locator('table:visible')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Rejeter/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Approuver/ })).toBeVisible();
    const mainOverflowsHorizontally = await page.locator('main').evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(mainOverflowsHorizontally).toBe(false);
  } else {
    await expect(page.getByRole('table').getByText('#42')).toBeVisible();
  }

  await page.getByRole('button', { name: /^(Suivant|Next)$/ }).click();
  await expect.poll(() => requestQueries.some((query) => query.includes('page=1'))).toBe(true);
});
