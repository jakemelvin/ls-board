import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({ token: 'super-admin-token', userId: 1, role: 'SUPER_ADMIN' });
      return;
    }

    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }

    if (url.pathname === '/api/countries') {
      await json([{ countryId: 1, countryName: 'Cameroun' }]);
      return;
    }

    if (url.pathname === '/api/delivery/shipment-fees') {
      await json([{ id: 1, originCountryId: 1, originCountryName: 'Cameroun', amount: 500, active: true }]);
      return;
    }

    if (url.pathname === '/api/delivery/promo-codes') {
      await json([{ id: 2, code: 'LIVEPROMO', discountType: 'FIXED_AMOUNT', discountValue: 500, active: true }]);
      return;
    }

    if (url.pathname === '/api/delivery/payment-modes') {
      await json([{ id: 3, name: 'MOBILE MONEY', active: true, systemDefined: true }]);
      return;
    }

    await json({});
  });
});

test('platform finance refresh fetches fresh data for fees, promos, and payment modes', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('super-admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign In/i }).click();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^(Finance|Finance plateforme|Platform finance)$/i })
      .click();
  } else {
    await page.getByRole('complementary').getByRole('button', { name: /Finance plateforme|Platform finance/i }).click();
  }

  await expect(page.getByText(/Frais configurés|Configured fees/i)).toBeVisible();

  for (const [tab, endpoint, expectedValue] of [
    [/Frais d'expédition|Shipment fees/i, '/api/delivery/shipment-fees', /Frais configurés|Configured fees/i],
    [/Codes promo|Promo codes/i, '/api/delivery/promo-codes', 'LIVEPROMO'],
    [/Modes de paiement|Payment modes/i, '/api/delivery/payment-modes', 'MOBILE MONEY'],
  ] as const) {
    await page.getByRole('button', { name: tab }).click();
    await expect(page.getByText(expectedValue, { exact: typeof expectedValue === 'string' }).first()).toBeVisible();
    const refreshRequest = page.waitForRequest(
      (request) => request.method() === 'GET' && new URL(request.url()).pathname === endpoint,
    );
    await page.getByRole('button', { name: /Actualiser|Refresh/ }).click();
    await refreshRequest;
  }
});
