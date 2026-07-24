import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('collector receives an unpaid collection-point shipment only after physical payment', async ({ page }) => {
  let validatedBody = '';
  let platformPaymentBody = '';
  let feePendingShipmentPaid = false;
  const receptionSorts: string[] = [];

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

    if (url.pathname === '/api/delivery/shipments/reception' && request.method() === 'GET') {
      receptionSorts.push(url.searchParams.get('sort') ?? '');
      await json({
        content: [
          {
            shipmentId: 701,
            companyName: 'Sendam Express',
            senderFullName: 'Alice Client',
            receiverFullName: 'Bob Destinataire',
            originCollectionPointName: 'Akwa',
            destinationCollectionPointName: 'Centre-ville',
            parcelTypeName: 'Document',
            transportModeName: 'Avion',
            priority: 'STANDARD',
            status: 'AWAITING_DROP_OFF',
            paymentStatus: 'UNPAID',
            transactionStatus: 'PLATFORM_FEE_PAID',
            companyPrice: 10000,
            feeAmount: 500,
            price: 10500,
            createdAt: new Date().toISOString(),
          },
          {
            shipmentId: 702,
            companyName: 'Sendam Express',
            senderFullName: 'Fee Pending',
            receiverFullName: 'Receiver',
            status: 'CREATED',
            paymentStatus: 'UNPAID',
            transactionStatus: feePendingShipmentPaid ? 'PLATFORM_FEE_PAID' : 'INITIATED',
            companyPrice: 8000,
            feeAmount: 500,
            price: 8500,
            createdAt: new Date().toISOString(),
          },
        ],
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

    if (url.pathname === '/api/delivery/payments/config') {
      await json({ localCurrency: 'XAF', providers: ['MTN', 'ORANGE'] });
      return;
    }

    if (url.pathname === '/api/delivery/payments/MTN/shipments/702') {
      platformPaymentBody = request.postData() ?? '';
      feePendingShipmentPaid = true;
      await json({
        id: 2,
        reference: 'PAY-702-MTN',
        provider: 'MTN',
        purpose: 'SHIPMENT',
        status: 'SUCCEEDED',
        shipmentId: 702,
        transactionStatus: 'PLATFORM_FEE_PAID',
        amount: 500,
        currency: 'XAF',
      });
      return;
    }

    if (url.pathname === '/api/delivery/shipments/reception/701/validate') {
      validatedBody = request.postData() ?? '';
      await json({
        actionId: 1,
        shipmentId: 701,
        actionType: 'VALIDATED',
        currentShipmentStatus: 'READY_FOR_TRANSPORT',
        transactionStatus: 'COMPLETED',
        note: 'Paiement au point enregistre et colis receptionne.',
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
    await page.getByRole('dialog').getByRole('button', { name: /ception/i }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /ception/i }).click();
  }

  await expect.poll(() => receptionSorts).toContain('createdAt,desc');
  await page.getByLabel(/Ordre d'affichage|Display order/).selectOption('asc');
  await expect.poll(() => receptionSorts).toContain('createdAt,asc');

  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  const collectionSurface = isMobile ? page.getByRole('article') : page.getByRole('row');
  const cashShipmentSurface = collectionSurface.filter({ hasText: 'Alice Client' });
  const feePendingSurface = collectionSurface.filter({ hasText: 'Fee Pending' });

  await expect(cashShipmentSurface.getByText(/A encaisser sur place|Collect on site/)).toBeVisible();
  await expect(feePendingSurface.getByRole('button', { name: /Payer les frais plateforme|Pay platform fee/ })).toBeVisible();

  if (isMobile) {
    await expect(page.locator('table:visible')).toHaveCount(0);
    const mainOverflowsHorizontally = await page.locator('main').evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(mainOverflowsHorizontally).toBe(false);
  }

  await feePendingSurface.getByRole('button', { name: /Payer les frais plateforme|Pay platform fee/ }).click();
  const paymentDialog = page.getByRole('dialog');
  await paymentDialog.getByPlaceholder(/237690000000/).fill('237690123456');
  await paymentDialog.getByRole('button', { name: /Initier le paiement|Start payment/ }).click();
  await expect.poll(() => platformPaymentBody).toContain('237690123456');
  await paymentDialog.getByRole('button', { name: /Fermer|Close/, exact: true }).first().click();
  await expect(feePendingSurface.getByText(/A encaisser sur place|Collect on site/)).toBeVisible();

  await cashShipmentSurface.getByRole('button', { name: /Encaisser et receptionner|Collect and receive/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/10.?000/).first()).toBeVisible();
  await dialog.getByPlaceholder(/Reference presente|Reference present/).fill('SHP-701-SECURE');
  await dialog.getByRole('checkbox', { name: /deposant|depositor/i }).check();
  await dialog.getByRole('checkbox', { name: /physique du colis|physical.*parcel/i }).check();

  const validateButton = dialog.getByRole('button', { name: /Valider la reception|Validate reception/ });
  await expect(validateButton).toBeDisabled();
  await dialog.getByRole('checkbox', { name: /encaissement physique|physical collection/i }).check();
  await expect(validateButton).toBeEnabled();
  await validateButton.click();

  await expect(dialog).toBeHidden();
  expect(validatedBody).toContain('SHP-701-SECURE');
});
