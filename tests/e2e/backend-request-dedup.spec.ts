import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('the company dashboard sends each initial GET only once', async ({ page }) => {
  const getCounts = new Map<string, number>();

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET') {
      getCounts.set(url.pathname, (getCounts.get(url.pathname) ?? 0) + 1);
    }

    if (url.pathname === '/api/delivery/auth/login') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'OK',
          token: 'request-dedup-token',
          userId: 1,
          role: 'ADMIN_COMPANY',
          firstName: 'Alice',
          lastName: 'Admin',
          username: 'alice.admin',
        }),
      });
      return;
    }

    if (url.pathname === '/api/delivery/users/me/company') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'SENDAM Test',
          phone: '690000000',
          companyUrl: 'sendam-test',
          country: { countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' },
          city: 'Douala',
          paymentCollectionMode: 'PLATFORM',
          approved: true,
          exploitable: true,
          adminId: 1,
          adminUsername: 'alice.admin',
        }),
      });
      return;
    }

    if (url.pathname === '/api/delivery/companies/1/dashboard') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ companyId: 1 }),
      });
      return;
    }

    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unreadCount: 0 }),
      });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('alice.admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /Tableau de bord|Dashboard/ })).toBeVisible();
  await expect.poll(() => getCounts.get('/api/delivery/companies/1/dashboard') ?? 0).toBe(1);

  expect(getCounts.get('/api/delivery/users/me/company')).toBe(1);
  expect(getCounts.get('/api/delivery/companies/1/dashboard')).toBe(1);
  expect(getCounts.get('/api/delivery/notifications/unread-count')).toBe(1);
});

test('the notification composer loads only the first option page automatically', async ({ page }) => {
  const requestedUrls: string[] = [];

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    requestedUrls.push(`${url.pathname}${url.search}`);

    if (url.pathname === '/api/delivery/auth/login') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'OK',
          token: 'composer-budget-token',
          userId: 1,
          role: 'SUPER_ADMIN',
          username: 'admin',
        }),
      });
      return;
    }

    if (url.pathname === '/api/delivery/users') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [],
          totalPages: 2,
          totalElements: 101,
          number: Number(url.searchParams.get('page') ?? 0),
          size: 100,
          first: true,
          last: false,
          empty: true,
        }),
      });
      return;
    }

    if (url.pathname === '/api/delivery/companies') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [],
          totalPages: 2,
          totalElements: 101,
          number: Number(url.searchParams.get('page') ?? 0),
          size: 100,
          first: true,
          last: false,
          empty: true,
        }),
      });
      return;
    }

    if (url.pathname === '/api/countries') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }

    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unreadCount: 0 }),
      });
      return;
    }

    if (url.pathname === '/api/delivery/notifications') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [], totalPages: 0, totalElements: 0, number: 0, size: 12,
          first: true, last: true, empty: true,
        }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Notifications/ }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Notifications/ }).click();
  }

  await expect(page.getByRole('heading', { name: /Notifications/ })).toBeVisible();
  await page.getByRole('tab', { name: /Envoyer|Send/ }).click();
  await expect.poll(
    () => requestedUrls.filter((url) => url === '/api/delivery/users?page=0&size=100').length,
  ).toBe(1);
  expect(requestedUrls.some((url) => url.includes('/api/delivery/users?page=1'))).toBe(false);

  await page.getByRole('tab', { name: /Critères|Criteria/ }).click();
  await expect.poll(
    () => requestedUrls.filter((url) => url === '/api/delivery/companies?page=0&size=100').length,
  ).toBe(1);
  expect(requestedUrls.some((url) => url.includes('/api/delivery/companies?page=1'))).toBe(false);
});
