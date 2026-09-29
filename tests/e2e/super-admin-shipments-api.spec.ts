import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/delivery/**', async (route) => {
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

    if (url.pathname === '/api/delivery/shipments') {
      await json({
        content: [
          {
            id: 42,
            reference: 'SHP-LIVE-001',
            code: 'LIVE-42',
            companyId: 9,
            companyName: 'Entreprise réelle',
            priority: 'STANDARD',
            status: 'IN_TRANSIT',
            sender: { fullName: 'Alice' },
            receiver: { fullName: 'Bob' },
            createdAt: '2026-09-28T10:00:00Z',
            updatedAt: '2026-09-28T10:00:00Z',
          },
        ],
        totalPages: 1,
        totalElements: 1,
        number: 0,
        size: 8,
      });
      return;
    }

    await json({});
  });
});

test('platform shipments load and refresh from the shipment API', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('super-admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign In/i }).click();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('navigation').getByRole('button', { name: /Shipments|Colis/ }).click();
  } else {
    await page.getByRole('complementary').getByRole('button', { name: /Shipments plateforme|Platform shipments/ }).click();
  }

  await expect
    .poll(async () =>
      page.getByText('SHP-LIVE-001', { exact: true }).evaluateAll((elements) =>
        elements.some((element) => {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }),
      ),
    )
    .toBe(true);
  await expect(page.getByText('SHP-2026-07001')).toHaveCount(0);

  const refreshRequest = page.waitForRequest(
    (request) => request.method() === 'GET' && new URL(request.url()).pathname === '/api/delivery/shipments',
  );
  await page.getByRole('button', { name: /Actualiser|Refresh/ }).click();
  await refreshRequest;
});
