import { expect, test, type Page } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test.beforeEach(({ page }) => {
  test.skip(
    (page.viewportSize()?.width ?? 1280) >= 768,
    'The global QR scanner is intentionally available from the mobile reception workflow only.',
  );
});

async function mockCollectorApi(page: Page) {
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        token: 'collector-qr-camera-token',
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

    if (url.pathname === '/api/delivery/shipments/reception') {
      await json({
        content: [],
        totalPages: 1,
        totalElements: 0,
        number: 0,
        size: 20,
        first: true,
        last: true,
        empty: true,
      });
      return;
    }

    await json({});
  });
}

async function openCollectorScanner(page: Page) {
  await mockCollectorApi(page);
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

  await page.getByRole('button', { name: /Scanner un colis|Scan a parcel/ }).click();
  return page.getByRole('dialog');
}

test('asks the browser for camera access when the QR scanner opens', async ({ page }) => {
  await page.addInitScript(() => {
    const pendingCameraRequest = new Promise<MediaStream>(() => undefined);
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: () => {
        (window as typeof window & { qrCameraRequests?: number }).qrCameraRequests =
          ((window as typeof window & { qrCameraRequests?: number }).qrCameraRequests ?? 0) + 1;
        return pendingCameraRequest;
      },
    });
  });

  const scanner = await openCollectorScanner(page);
  await scanner.getByRole('button', { name: /Activer la caméra|Enable camera/ }).click();
  await expect(scanner.getByText(/Ouverture de la caméra|Opening camera/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { qrCameraRequests?: number }).qrCameraRequests ?? 0)).toBe(1);
});

test('explains a camera permission refusal and keeps the photo fallback available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
    });
  });

  const scanner = await openCollectorScanner(page);
  await scanner.getByRole('button', { name: /Activer la caméra|Enable camera/ }).click();
  await expect(scanner.getByText(/accès à la caméra est bloqué|Camera access is blocked/)).toBeVisible();
  await expect(
    scanner.getByRole('button', { name: /Prendre ou choisir une photo|Take or choose a photo/ }),
  ).toBeEnabled();
});

test('explains that HTTPS is required before requesting the camera', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
  });

  const scanner = await openCollectorScanner(page);
  await scanner.getByRole('button', { name: /Activer la caméra|Enable camera/ }).click();
  await expect(scanner.getByText(/exige une connexion HTTPS|requires a secure HTTPS connection/)).toBeVisible();
});

test('explains when no camera device is available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: () => Promise.reject(new DOMException('No camera', 'NotFoundError')),
    });
  });

  const scanner = await openCollectorScanner(page);
  await scanner.getByRole('button', { name: /Activer la caméra|Enable camera/ }).click();
  await expect(scanner.getByText(/Aucune caméra n'est disponible|No camera is available/)).toBeVisible();
});
