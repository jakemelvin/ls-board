import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('a PLATFORM shipment presents and pays the full shipment amount', async ({ page }) => {
  const shipment = {
    id: 808,
    reference: 'SHP-808',
    companyId: 9,
    companyName: 'Sendam Express',
    priority: 'STANDARD',
    status: 'CREATED',
    paymentStatus: 'UNPAID',
    transactionStatus: 'INITIATED',
    paymentCollectionMode: 'PLATFORM',
    companyPrice: 2500,
    feeAmount: 350,
    price: 2850,
    sender: { fullName: 'Alice Sender' },
    receiver: { fullName: 'Bob Receiver' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({ message: 'OK', token: 'platform-payment-token', userId: 4, role: 'COLLECTOR', firstName: 'Marc', lastName: 'Collecteur', username: 'marc.collecteur' });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') return json({ unreadCount: 0 });
    if (url.pathname === '/api/delivery/shipments' && request.method() === 'GET') {
      return json({ content: [shipment], totalPages: 1, totalElements: 1, number: 0, size: 20, first: true, last: true, empty: false });
    }
    if (url.pathname === '/api/delivery/shipments/808') return json(shipment);
    if (url.pathname === '/api/delivery/payments/config') return json({ localCurrency: 'XAF', providers: ['PAYPAL'] });
    if (url.pathname === '/api/delivery/payments/countries') return json([]);
    if (url.pathname === '/api/delivery/payments/shipments/808/attempts') return json([]);
    if (url.pathname === '/api/delivery/shipments/808/payments/promo-code') {
      return json({ ...shipment, discountAmount: 350, transactionStatus: 'PLATFORM_FEE_PAID' });
    }
    if (url.pathname === '/api/delivery/payments/PAYPAL/shipments/808') {
      return json({ message: 'Le prestataire a refusé le paiement.' }, 400);
    }
    return json({});
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('marc.collecteur');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Colis|Parcel management/ }).click();
    await page.getByRole('button', { name: /Voir details|View details/i }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Colis|Parcel management/ }).click();
    await page.getByRole('button', { name: /#808 detail|detail.*#808/i }).click();
  }

  await page.getByRole('button', { name: /Payer la totalité du colis|Pay full shipment amount/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Régler la totalité du colis|Pay the full shipment amount/)).toBeVisible();
  await expect(dialog.getByText(/2.?850/)).toBeVisible();
  await expect(dialog.getByText(/2.?500.*prix entreprise.*350.*frais plateforme|2.?500.*company price.*350.*platform fee/)).toBeVisible();
  await expect(dialog.getByText(/frais plateforme estimés|estimated platform fee/i)).toHaveCount(0);

  await dialog.getByLabel(/Code promo|Promo code/).fill('PROMO350');
  await dialog.getByRole('button', { name: /Appliquer|Apply/ }).click();
  await expect(dialog.getByText(/2.?500/).first()).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Pay full shipment amount|Payer la totalité du colis/ })).toBeVisible();

  await dialog.getByRole('radio', { name: 'PayPal' }).click();
  await dialog.getByRole('button', { name: /Payer la totalité du colis|Pay full shipment amount/ }).click();
  await expect(dialog.getByRole('alert')).toContainText(/prestataire a refusé|provider.*refused/i);
});
