import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://dstest.easywaka.com/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/delivery/auth/login') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'playwright-smoke-token',
          userId: 1,
          role: 'SUPER_ADMIN',
        }),
      });
      return;
    }

    await route.abort();
  });
});

test('login opens the dashboard shell without the in-app browser', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/Identifiant|Username/).fill('admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    const mobileNav = page.getByRole('navigation');

    await expect(mobileNav.getByRole('button', { name: /Dashboard|Tableau de bord/ })).toHaveCount(0);
    await expect(mobileNav.getByRole('button', { name: /Carte|Map/ })).toHaveCount(0);
    await expect(mobileNav.getByRole('button', { name: 'Administration' })).toBeVisible();
    await expect(mobileNav.getByRole('button', { name: /Shipments|Colis/ })).toBeVisible();
  }
});
