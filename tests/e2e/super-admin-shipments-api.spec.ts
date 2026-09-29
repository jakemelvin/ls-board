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
      const page = Number(url.searchParams.get('page') ?? '0');
      await json({
        content: [
          {
            id: page === 0 ? 42 : 43,
            reference: page === 0 ? 'SHP-LIVE-001' : 'SHP-LIVE-002',
            code: page === 0 ? 'LIVE-42' : 'LIVE-43',
            companyId: 9,
            companyName: 'Entreprise réelle',
            priority: 'STANDARD',
            status: page === 0 ? 'IN_TRANSIT' : 'DELIVERED',
            sender: { fullName: 'Alice' },
            receiver: { fullName: 'Bob' },
            createdAt: '2026-09-28T10:00:00Z',
            updatedAt: '2026-09-28T10:00:00Z',
          },
        ],
        totalPages: 2,
        totalElements: 12,
        number: page,
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
  await expect(page.getByLabel('Displayed statuses').getByText('Page 1 / 2')).toBeVisible();

  const nextPageRequest = page.waitForRequest(
    (request) =>
      request.method() === 'GET' &&
      new URL(request.url()).pathname === '/api/delivery/shipments' &&
      new URL(request.url()).searchParams.get('page') === '1',
  );
  await page.getByTestId('pagination-next').click();
  await nextPageRequest;
  await expect(page.getByLabel('Displayed statuses').getByText('Page 2 / 2')).toBeVisible();
  await expect
    .poll(async () =>
      page.getByText('SHP-LIVE-002', { exact: true }).evaluateAll((elements) =>
        elements.some((element) => {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }),
      ),
    )
    .toBe(true);

  const refreshRequest = page.waitForRequest(
    (request) => request.method() === 'GET' && new URL(request.url()).pathname === '/api/delivery/shipments',
  );
  await page.getByRole('button', { name: /Actualiser|Refresh/ }).click();
  await refreshRequest;
});
