import type { SupportContactResponse } from './types';
import { getSafeExternalUrl } from '@/lib/external-url';

export interface SupportContactAction {
  href: string | null;
  external: boolean;
}

export function getSupportContactAction(contact: SupportContactResponse): SupportContactAction {
  const configuredAction = contact.actionUri?.trim();
  const value = contact.value.trim();

  if (contact.type === 'EMAIL') {
    return {
      href: configuredAction?.match(/^mailto:/i) ? configuredAction : value ? `mailto:${value}` : null,
      external: false,
    };
  }

  if (contact.type === 'PHONE') {
    return {
      href: configuredAction?.match(/^tel:/i) ? configuredAction : value ? `tel:${value}` : null,
      external: false,
    };
  }

  if (contact.type === 'WHATSAPP') {
    const href = getSafeExternalUrl(configuredAction) ?? (value ? `https://wa.me/${value.replace(/\D/g, '')}` : null);
    return { href, external: Boolean(href) };
  }

  const href = getSafeExternalUrl(configuredAction) ?? getSafeExternalUrl(value);
  return { href, external: Boolean(href) };
}
