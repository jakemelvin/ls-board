import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('currency preference converts amounts globally and reuses cached rates', async ({ page }) => {
  let exchangeRateRequests = 0;
  const openPlatformFinance = async () => {
    if ((page.viewportSize()?.width ?? 1280) < 768) {
      await page.getByRole('button', { name: /Menu/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: /Finance/i }).click();
    } else {
      await page.locator('aside').getByRole('button', { name: /Finance/i }).click();
    }
  };

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/exchange-rates') {
      exchangeRateRequests += 1;
      await json({
        dollarExchangeRate: 572.9659,
        euroExchangeRate: 655.957,
        refreshedAt: '2026-07-18T02:00:00.159288',
        source: 'open.er-api.com',
      });
      return;
    }
    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK', token: 'currency-test-token', userId: 1,
        role: 'SUPER_ADMIN', firstName: 'Super', lastName: 'Admin', username: 'admin',
      });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname === '/api/countries') {
      await json([{ countryId: 47, countryName: 'Cameroun' }]);
      return;
    }
    if (url.pathname === '/api/delivery/shipment-fees') {
      await json([{ id: 1, originCountryId: 47, originCountryName: 'Cameroun', amount: 655.957, active: true }]);
      return;
    }
    if (url.pathname === '/api/delivery/promo-codes' || url.pathname === '/api/delivery/payment-modes') {
      await json([]);
      return;
    }

    await json({ content: [], totalPages: 0, totalElements: 0 });
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');

  await openPlatformFinance();

  await expect(page.getByText(/FCFA\s*656|656.*XAF/)).toBeVisible();
  await page.getByRole('button', { name: /Menu du compte|Account menu/ }).click();
  await page.getByRole('menuitem', { name: /Euro \(EUR\)/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText(/1,00\s*€|€1\.00/)).toBeVisible();
  await expect.poll(() => exchangeRateRequests).toBe(1);

  await page.reload();
  await openPlatformFinance();
  await expect(page.getByText(/1,00\s*€|€1\.00/)).toBeVisible();
  await expect.poll(() => exchangeRateRequests).toBe(1);
});
