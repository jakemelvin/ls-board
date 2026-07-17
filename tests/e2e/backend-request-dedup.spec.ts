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
