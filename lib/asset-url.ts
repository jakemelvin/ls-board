const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function resolveRemoteAssetUrl(url?: string | null) {
  if (!url) return null;

  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (!API_BASE_URL) {
    return url;
  }

  try {
    return new URL(url, API_BASE_URL).toString();
  } catch {
    return url;
  }
}
