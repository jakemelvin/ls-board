import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('collector can pay any shipment visible in their collection scope', async ({ page }) => {
  test.setTimeout(60_000);
  let paymentBody = '';
  let ownShipmentPaid = false;

  const ownShipment = () => ({
    id: 701,
    reference: 'SHP-701',
    createdByUserId: 4,
    createdBy: 'marc.collecteur',
    companyId: 9,
    companyName: 'Sendam Express',
    priority: 'STANDARD',
    status: ownShipmentPaid ? 'AWAITING_DROP_OFF' : 'CREATED',
    paymentStatus: ownShipmentPaid ? 'PAYMENT_AT_COLLECTION_POINT' : 'UNPAID',
    transactionStatus: ownShipmentPaid ? 'PLATFORM_FEE_PAID' : 'INITIATED',
    feeAmount: 500,
    price: 10500,
    sender: { fullName: 'Alice Sender' },
    receiver: { fullName: 'Bob Receiver' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const otherShipment = {
    id: 702,
    reference: 'SHP-702',
    createdByUserId: 99,
    createdBy: 'hulk.collecteur',
    companyId: 9,
    companyName: 'Sendam Express',
    priority: 'STANDARD',
    status: 'CREATED',
    paymentStatus: 'UNPAID',
    transactionStatus: 'INITIATED',
    feeAmount: 500,
    price: 8500,
    sender: { fullName: 'Other Sender' },
    receiver: { fullName: 'Other Receiver' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK',
        token: 'collector-payment-token',
        userId: 4,
        role: 'COLLECTOR',
        firstName: 'Marc',
        lastName: 'Collecteur',
        username: 'marc.collecteur',
      });
      return;
    }

    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }

    if (url.pathname === '/api/delivery/shipments' && request.method() === 'GET') {
      await json({
        content: [ownShipment(), otherShipment],
        totalPages: 1,
        totalElements: 2,
        number: 0,
        size: 20,
        first: true,
        last: true,
        empty: false,
      });
      return;
    }

    if (url.pathname === '/api/delivery/shipments/701') {
      await json(ownShipment());
      return;
    }

    if (url.pathname === '/api/delivery/shipments/702') {
      await json(otherShipment);
      return;
    }

    if (url.pathname === '/api/delivery/payments/config') {
      await json({ localCurrency: 'XAF', providers: ['MTN', 'ORANGE'] });
      return;
    }

    if (url.pathname === '/api/delivery/payments/MTN/shipments/701') {
      paymentBody = request.postData() ?? '';
      ownShipmentPaid = true;
      await json({
        id: 1,
        reference: 'PAY-701-MTN',
        provider: 'MTN',
        purpose: 'SHIPMENT',
        status: 'SUCCEEDED',
        shipmentId: 701,
        transactionStatus: 'PLATFORM_FEE_PAID',
        amount: 500,
        currency: 'XAF',
      });
      return;
    }

    await json({});
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('marc.collecteur');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Colis|Parcel management/ }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Colis|Parcel management/ }).click();
    const referenceHeader = page.getByRole('columnheader', { name: /Reference/ });
    const actionsHeader = page.getByRole('columnheader', { name: /Actions/ });
    await expect(referenceHeader).toHaveCSS('position', 'sticky');
    await expect(referenceHeader).toHaveCSS('left', '0px');
    await expect(actionsHeader).toHaveCSS('position', 'sticky');
    await expect(actionsHeader).toHaveCSS('right', '0px');
  }

  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  if (isMobile) {
    await page.getByRole('button', { name: /Voir details|View details/i }).first().click();
  } else {
    await page.getByRole('button', { name: /#701 detail|detail.*#701/i }).click();
  }
  await expect(page.getByText(/Frais plateforme en attente|Platform fee pending/)).toBeVisible();
  await page.getByRole('button', { name: /Payer les frais plateforme|Pay platform fee/ }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Régler les frais plateforme|Pay the platform fee/)).toBeVisible();
  await dialog.getByPlaceholder(/237690000000/).fill('237690123456');
  await dialog.getByRole('button', { name: /Initier le paiement|Start payment/ }).click();

  await expect.poll(() => paymentBody).toContain('237690123456');
  await expect(page.getByText(/Frais plateforme en attente|Platform fee pending/)).toHaveCount(0);

  await page.getByRole('button', { name: /Retour a la liste|Back to.*list/i }).click();
  if (isMobile) {
    await page.getByRole('button', { name: /Voir details|View details/i }).nth(1).click();
  } else {
    await page.getByRole('button', { name: /#702 detail|detail.*#702/i }).click();
  }
  await expect(page.getByText(/Frais plateforme en attente|Platform fee pending/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Payer les frais plateforme|Pay platform fee/ })).toBeVisible();
});
