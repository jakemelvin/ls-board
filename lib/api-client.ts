import { redirectToLoginAfterAuthFailure } from '@/lib/auth/session';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// React can mount an effect more than once in development and several widgets can
// legitimately ask for the same resource at the same time. Share only requests
// that are currently in flight: unlike a response cache, this cannot serve stale
// business data after a mutation or an explicit refresh.
const inFlightGetRequests = new Map<string, Promise<unknown>>();
const cachedGetResponses = new Map<string, { expiresAt: number; value: unknown }>();
let responseCacheVersion = 0;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();

  if (method !== 'GET') {
    return executeRequest<T>(path, init, token);
  }

  const requestKey = `${token ?? ''}\u0000${path}`;
  const existingRequest = inFlightGetRequests.get(requestKey) as Promise<T> | undefined;
  if (existingRequest) {
    return existingRequest;
  }

  const pendingRequest = executeRequest<T>(path, init, token);
  inFlightGetRequests.set(requestKey, pendingRequest);

  void pendingRequest
    .finally(() => {
      if (inFlightGetRequests.get(requestKey) === pendingRequest) {
        inFlightGetRequests.delete(requestKey);
      }
    })
    .catch(() => undefined);

  return pendingRequest;
}

function cachedRequest<T>(
  path: string,
  token: string | null | undefined,
  ttlMs: number,
): Promise<T> {
  const requestKey = `${token ?? ''}\u0000${path}`;
  const cached = cachedGetResponses.get(requestKey);

  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.value as T);
  }

  if (cached) {
    cachedGetResponses.delete(requestKey);
  }

  const cacheVersionAtRequestStart = responseCacheVersion;
  return request<T>(path, { method: 'GET' }, token).then((value) => {
    if (responseCacheVersion === cacheVersionAtRequestStart) {
      cachedGetResponses.set(requestKey, { expiresAt: Date.now() + ttlMs, value });
    }
    return value;
  });
}

async function executeRequest<T>(
  path: string,
  init: RequestInit,
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = `Erreur ${response.status}`;
    try {
      const json = JSON.parse(text) as { message?: string; error?: string };
      message = json.message ?? json.error ?? message;
    } catch {
      if (text) message = text;
    }
    if (token && isAuthFailure(response.status)) {
      redirectToLoginAfterAuthFailure();
    }

    throw new ApiError(response.status, message);
  }

  const text = await response.text();
  if ((init.method ?? 'GET').toUpperCase() !== 'GET') {
    responseCacheVersion += 1;
    cachedGetResponses.clear();
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function isAuthFailure(status: number) {
  return status === 401 || status === 403;
}

export const apiClient = {
  get: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: 'GET' }, token),

  getCached: <T>(path: string, token?: string | null, ttlMs = 5 * 60_000) =>
    cachedRequest<T>(path, token, ttlMs),

  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),

  postForm: <T>(path: string, formData: FormData, token?: string | null) =>
    request<T>(path, { method: 'POST', body: formData }, token),

  putForm: <T>(path: string, formData: FormData, token?: string | null) =>
    request<T>(path, { method: 'PUT', body: formData }, token),

  put: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(
      path,
      { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined },
      token,
    ),

  patch: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(
      path,
      { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined },
      token,
    ),

  delete: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: 'DELETE' }, token),
};
