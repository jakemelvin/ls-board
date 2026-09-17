import { expect, test, type Route } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test('an invalid company website never opens an application error page', async ({ page }) => {
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/delivery/auth/login') {
      await json(route, { token: 'super-admin-company-url-token', userId: 1, role: 'SUPER_ADMIN', username: 'admin' });
      return;
    }

    if (url.pathname === '/api/delivery/companies') {
      await json(route, {
        content: [{
          id: 12,
          name: 'Legacy Logistics',
          phone: '+237690000000',
          companyUrl: 'legacy-logistics',
          country: { countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' },
          city: 'Douala',
          approved: true,
          exploitable: true,
        }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 15,
      });
      return;
    }

    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json(route, { unreadCount: 0 });
      return;
    }

    await json(route, {});
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');

  await page.getByRole('button', { name: /Entreprises|Companies/ }).click();
  await expect(page.getByText('Legacy Logistics').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[data-testid="company-website-unavailable"]:visible')).toBeVisible();
  await expect(page.getByRole('link', { name: /legacy-logistics/i })).toHaveCount(0);
  await expect(page).toHaveURL('/');
});
