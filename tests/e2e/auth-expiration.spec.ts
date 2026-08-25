import { expect, test } from '@playwright/test';

function createJwt(expirationTimeInSeconds: number) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    exp: expirationTimeInSeconds,
  })}.signature`;
}

test('disconnects the user as soon as the access token expires', async ({ page }) => {
  // Leave enough real time for the Next.js middleware and initial dashboard render,
  // while advancing the browser clock to expiry explicitly below.
  const expirationTime = Date.now() + 5 * 60_000;
  await page.clock.install({ time: new Date(expirationTime - 30_000) });
  await page.route('https://dstest.easywaka.com/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/delivery/auth/login') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: createJwt(Math.floor(expirationTime / 1_000)),
          userId: 1,
          role: 'SUPER_ADMIN',
        }),
      });
      return;
    }

    await route.abort();
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  await expect(page).toHaveURL('/');
  await page.clock.fastForward(30_001);
  await expect(page).toHaveURL(/\/login\?reason=session-expired/, {
    timeout: 10_000,
  });

  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const persistedSession = window.localStorage.getItem('sendam-auth');
        if (!persistedSession) return null;
        return JSON.parse(persistedSession).state.token;
      });
    })
    .toBe('');

  const authCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'sendam_auth_token',
  );
  expect(authCookie).toBeUndefined();
});

test('disconnects the user when an authenticated API call returns 403', async ({
  page,
}) => {
  await page.route('https://dstest.easywaka.com/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/api/delivery/auth/login') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'opaque-token-rejected-by-api',
          userId: 1,
          role: 'SUPER_ADMIN',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: '',
    });
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  await expect(page).toHaveURL(/\/login\?reason=session-expired/, {
    timeout: 10_000,
  });

  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const persistedSession = window.localStorage.getItem('sendam-auth');
        if (!persistedSession) return null;
        return JSON.parse(persistedSession).state.token;
      });
    })
    .toBe('');

  const authCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'sendam_auth_token',
  );
  expect(authCookie).toBeUndefined();
});
