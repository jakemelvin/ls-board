import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://dstest.easywaka.com/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/delivery/auth/login') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'support-token', userId: 1, role: 'ADMIN_COMPANY' }) });
      return;
    }
    if (url.pathname === '/api/delivery/support/contacts') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 2, type: 'WHATSAPP', title: 'WhatsApp', value: '+237 6 90 00 00 00', actionUri: 'https://wa.me/237690000000', active: true, displayOrder: 2 },
        { id: 1, type: 'EMAIL', title: 'Email support', value: 'support@sendam.test', actionUri: 'mailto:support@sendam.test', active: true, displayOrder: 1 },
      ]) });
      return;
    }
    await route.abort();
  });
});

test('eligible users can open the Support view with ordered backend contacts', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('button', { name: /Menu/ }).click();
  }
  await page.getByRole('button', { name: /^Support$/ }).click();

  await expect(page.getByRole('heading', { name: /Centre d'assistance|Support centre/ })).toBeVisible();
  const links = page.locator('main a[href]');
  await expect(links.filter({ hasText: 'Email support' })).toHaveAttribute('href', 'mailto:support@sendam.test');
  await expect(links.filter({ hasText: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/237690000000');
  await expect(links).toHaveCount(2);
  expect(await links.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')))).toEqual([
    'mailto:support@sendam.test',
    'https://wa.me/237690000000',
  ]);
});
