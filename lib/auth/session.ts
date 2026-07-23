export const AUTH_COOKIE = 'sendam_auth_token';
export const AUTH_EXPIRED_EVENT = 'sendam:auth-expired';
export const AUTH_STORAGE_KEY = 'sendam-auth';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const MAX_TIMEOUT_DELAY = 2_147_483_647;

export function getTokenExpirationTime(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const parsedPayload = JSON.parse(atob(paddedPayload)) as { exp?: unknown };

    return typeof parsedPayload.exp === 'number' && Number.isFinite(parsedPayload.exp)
      ? parsedPayload.exp * 1_000
      : null;
  } catch {
    // Some test environments and legacy backends use opaque access tokens.
    // Their validity can only be determined from the API response.
    return null;
  }
}

export function isTokenExpired(token: string, now = Date.now()) {
  const expirationTime = getTokenExpirationTime(token);
  return expirationTime !== null && expirationTime <= now;
}

export function scheduleTokenExpiration(
  token: string,
  onExpired: () => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const expirationTime = getTokenExpirationTime(token);
  if (expirationTime === null) return () => undefined;

  let timeoutId: number | undefined;

  const armTimer = () => {
    const remainingTime = expirationTime - Date.now();
    if (remainingTime <= 0) {
      onExpired();
      return;
    }

    timeoutId = window.setTimeout(
      armTimer,
      Math.min(remainingTime, MAX_TIMEOUT_DELAY),
    );
  };

  armTimer();

  return () => {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  };
}

export function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export function clearPersistedAuthSession() {
  clearAuthCookie();

  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      state: {
        token: '',
        userId: 0,
        role: 'CLIENT',
      },
      version: 0,
    }),
  );
}

export function redirectToLoginAfterAuthFailure() {
  if (typeof window === 'undefined') return;

  clearPersistedAuthSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (window.location.pathname === '/login') return;

  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('reason', 'session-expired');
  if (currentPath && currentPath !== '/') {
    loginUrl.searchParams.set('from', currentPath);
  }

  window.location.assign(loginUrl.toString());
}
