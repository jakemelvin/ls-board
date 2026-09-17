/**
 * Returns an URL that browsers can safely open in a new tab.
 *
 * Backend records created before URL validation can still contain a slug such
 * as "my-company". Passing that value directly to an anchor makes the browser
 * treat it as an application-relative route, which can open a Next.js error
 * page instead of the intended external website.
 */
export function getSafeExternalUrl(value?: string | null): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
