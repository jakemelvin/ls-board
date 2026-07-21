import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('shipment creation follows API dependencies and links a platform recipient', async ({ page }) => {
  test.setTimeout(60_000);
  const pngPixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const requestedUrls: string[] = [];
  let createBody = '';

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requestedUrls.push(`${request.method()} ${url.pathname}${url.search}`);

    const json = async (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK',
        token: 'shipment-flow-token',
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

    if (url.pathname === '/api/delivery/payments/config') {
      await json({ localCurrency: 'XAF', providers: ['MTN', 'ORANGE'] });
      return;
    }

    if (url.pathname === '/api/delivery/shipments' && request.method() === 'GET') {
      await json({
        content: [], totalPages: 0, totalElements: 0, number: 0, size: 20,
        first: true, last: true, empty: true,
      });
      return;
    }

    if (url.pathname === '/api/countries/operational-served') {
      await json([
        { countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' },
        { countryId: 2, countryName: 'Gabon', countryCode: 241, isoCode: 'GA' },
      ]);
      return;
    }

    if (url.pathname === '/api/delivery/parcel-types') {
      await json([
        { id: 10, name: 'Document', systemDefined: true },
        { id: 20, name: 'Colis', systemDefined: true },
      ]);
      return;
    }

    if (url.pathname === '/api/cities/countries/1/operational-served') {
      await json([{ cityId: 11, cityName: 'Douala', countryId: 1, countryName: 'Cameroun' }]);
      return;
    }

    if (url.pathname === '/api/cities/countries/2/operational-served') {
      await json([{ cityId: 22, cityName: 'Libreville', countryId: 2, countryName: 'Gabon' }]);
      return;
    }

    if (url.pathname === '/api/delivery/shipments/creation/transport-modes') {
      await json([{ transportModeId: 5, transportModeName: 'Avion', companyCount: 1 }]);
      return;
    }

    if (url.pathname === '/api/delivery/shipments/creation/companies') {
      await json([{
        companyId: 9,
        companyName: 'Sendam Express',
        originCollectionPointCount: 1,
        destinationCollectionPointCount: 1,
        deliveredShipmentCount: 245,
        reviews: { reviewCount: 18, averageRating: 4.8 },
        pricings: [{ parcelTypeId: 10, parcelTypeName: 'Document' }],
      }]);
      return;
    }

    if (url.pathname === '/api/delivery/shipments/creation/companies/9/collection-points') {
      await json({
        companyId: 9,
        companyName: 'Sendam Express',
        originCollectionPoints: [{ id: 101, name: 'Akwa', address: 'Boulevard de la Liberté', cityName: 'Douala' }],
        destinationCollectionPoints: [{ id: 202, name: 'Centre-ville', address: 'Bord de mer', cityName: 'Libreville' }],
      });
      return;
    }

    if (url.pathname === '/api/delivery/users/search') {
      await json([{
        id: 77,
        firstName: 'Marie',
        lastName: 'Destinataire',
        username: 'marie237',
        phone: '237690000222',
        address: 'Libreville centre',
        status: 'ACTIVE',
        role: 'CLIENT',
      }]);
      return;
    }

    if (url.pathname === '/api/delivery/shipments/simulate-price') {
      await json({
        companyName: 'Sendam Express',
        transportModeName: 'Avion',
        parcelTypeName: 'Document',
        priority: 'EXPRESS',
        totalCompanyPrice: 10000,
        expressSurchargeAmount: 1500,
        feeAmount: 500,
        platformAmountBeforeDiscount: 500,
        collectionPointAmountToPay: 11500,
        paymentCollectionMode: 'COLLECTION_POINT',
        insuranceAmount: 0,
        discountAmount: 0,
        totalToPay: 12000,
        expectedPaymentStatus: 'UNPAID',
      });
      return;
    }

    if (url.pathname === '/api/delivery/shipments' && request.method() === 'POST') {
      createBody = request.postData() ?? '';
      await json({
        id: 900,
        reference: 'SHP-900',
        createdByUserId: 4,
        companyId: 9,
        companyName: 'Sendam Express',
        priority: 'EXPRESS',
        status: 'CREATED',
        feeAmount: 500,
        price: 12000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
  }

  await page.getByRole('button', { name: /Nouveau shipment/ }).click();
  await expect(page.getByRole('heading', { name: /Créer un shipment|Create a shipment/ })).toBeVisible();

  await page.getByLabel(/Pays d’origine|Origin country/).selectOption('1');
  await page.getByLabel(/Ville d’origine|Origin city/).selectOption('11');
  await page.getByLabel(/Pays de destination|Destination country/).selectOption('2');
  await page.getByLabel(/Ville de destination|Destination city/).selectOption('22');
  await page.getByRole('button', { name: /Continuer|Continue/ }).click();

  await page.getByRole('button', { name: /Avion/ }).click();
  await page.getByRole('button', { name: /Sendam Express/ }).click();

  const companyRequest = requestedUrls.find((entry) => entry.includes('/shipments/creation/companies?'));
  expect(companyRequest).toContain('transportModeId=5');
  expect(companyRequest).not.toContain('parcelTypeId');

  await page.getByRole('button', { name: /Continuer|Continue/ }).click();
  await expect(page.getByRole('button', { name: /^Document/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Colis$/ })).toHaveCount(0);
  await page.getByRole('button', { name: /^Document/ }).click();
  await page.getByRole('button', { name: /Express.*prioritaire|Express.*Priority/ }).click();
  await page.getByLabel(/Point de dépôt|Drop-off point/).selectOption('101');
  await page.getByLabel(/Point de retrait|Pickup point/).selectOption('202');

  const addPhotosButton = page.getByRole('button', { name: /Ajouter des photos|Add photos/ });
  const firstFileChooserPromise = page.waitForEvent('filechooser');
  await addPhotosButton.click();
  const firstFileChooser = await firstFileChooserPromise;
  await firstFileChooser.setFiles({
    name: 'parcel-1.png',
    mimeType: 'image/png',
    buffer: pngPixel,
  });
  await expect(page.getByText(/1\/4 photo/)).toBeVisible();
  await expect(addPhotosButton).toBeFocused();
  const firstPreview = page.getByRole('img', { name: /parcel-1\.png/ });
  await expect(firstPreview).toBeVisible();
  const previewBox = await firstPreview.boundingBox();
  expect(previewBox?.height).toBeLessThan(300);

  const secondFileChooserPromise = page.waitForEvent('filechooser');
  await addPhotosButton.click();
  const secondFileChooser = await secondFileChooserPromise;
  await secondFileChooser.setFiles(
    Array.from({ length: 4 }, (_, index) => ({
      name: `parcel-${index + 2}.png`,
      mimeType: 'image/png',
      buffer: pngPixel,
    })),
  );
  await expect(page.getByText(/4\/4 photo/)).toBeVisible();
  await expect(page.getByText(/maximum 4 photos|no more than 4 photos/).first()).toBeVisible();
  await page.getByRole('button', { name: /Continuer|Continue/ }).click();

  await page.getByLabel(/Nom complet|Full name/).first().fill('Marc Collecteur');
  await page.getByLabel(/Téléphone.*WhatsApp|Phone.*WhatsApp/).first().fill('237690000111');
  const identityInputs = page.getByLabel(/Numéro de pièce d’identité|Identity document number/);
  await expect(identityInputs).toHaveCount(2);
  await expect(identityInputs.first()).toHaveAttribute('required', '');
  await expect(identityInputs.first()).toHaveAttribute('placeholder', /CNI 123456789|ID 123456789/);
  await identityInputs.first().fill('CNI-SENDER-001');
  await page.getByRole('button', { name: /Utilisateur SENDAMhub|SENDAMhub user/ }).click();
  await page.getByLabel(/Nom d’utilisateur ou téléphone|Username or phone/).fill('marie');
  await page.getByRole('option', { name: /Marie Destinataire/ }).click();
  await expect(page.getByText(/@marie237/)).toBeVisible();
  await identityInputs.nth(1).fill('CNI-RECEIVER-002');
  await page.getByRole('button', { name: /Continuer|Continue/ }).click();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: /Calculer le tarif|Calculate price/ }).click();
  await expect(page.getByText(/12.?000/).first()).toBeVisible();
  await expect(page.getByText(/A regler au point|Pay at collection point/)).toBeVisible();
  await expect(page.getByText(/collecteur encaissera|collector then collects/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Créer sans payer|Create without paying/ })).toBeVisible();
  await page.getByRole('button', { name: /Créer et payer les frais|Create and pay the fee/ }).click();

  const paymentDialog = page.getByRole('dialog');
  await expect(paymentDialog.getByText(/Régler les frais plateforme|Pay the platform fee/)).toBeVisible();
  await expect(paymentDialog.getByRole('radio', { name: /MTN Mobile Money/ })).toBeVisible();
  await expect(paymentDialog.getByRole('radio', { name: /Orange Money/ })).toBeVisible();
  await paymentDialog.getByRole('button', { name: /Payer plus tard|Pay later/ }).click();
  await expect(page.getByRole('heading', { name: /Shipment #900/ })).toBeVisible();
  expect(createBody).toContain('"receiverUserId":77');
  expect((createBody.match(/name="parcelPhotos"/g) ?? []).length).toBe(4);
});
