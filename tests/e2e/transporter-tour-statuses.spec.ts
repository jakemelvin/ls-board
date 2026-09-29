import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('sendam_locale', 'fr'));

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        token: 'transporter-tour-token',
        userId: 7,
        companyId: 1,
        role: 'TRANSPORTER',
        firstName: 'Paul',
        lastName: 'Transporteur',
      });
      return;
    }

    if (url.pathname === '/api/delivery/users/me/company') {
      await json({ id: 1, name: 'Express Delivery' });
      return;
    }

    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }

    if (url.pathname === '/api/delivery/shipments/transmission/transporters/in-transit-shipments') {
      await json({
        content: [
          {
            shipmentId: 42,
            reference: 'SHP-42',
            destinationCollectionPointName: 'Akwa',
            senderFullName: 'Alice',
            receiverFullName: 'Bob',
            status: 'IN_TRANSIT',
            priority: 'STANDARD',
            createdAt: '2026-09-01T10:00:00Z',
          },
        ],
        totalPages: 1,
        totalElements: 1,
      });
      return;
    }

    if (
      url.pathname === '/api/delivery/shipments/transport-groups' ||
      url.pathname === '/api/delivery/shipments/destination-deposits/transporters/requests'
    ) {
      await json({ content: [], totalPages: 1, totalElements: 0 });
      return;
    }

    await json({});
  });
});

test('the transporter tour renders a translated shipment status', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/Nom d'utilisateur|Identifiant|Username/).fill('paul');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign In/i }).click();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('navigation').getByRole('button', { name: /Menu/ }).click();
  }
  await page.getByRole('button', { name: /Ma tournée|My route/ }).click();

  await expect(page.getByText('En transit', { exact: true })).toBeVisible();
  await expect(page.getByText('parcelManagement.statuses.IN_TRANSIT')).toHaveCount(0);
});
