export interface ScannedShipmentPayload {
  raw: string;
  reference: string;
  shipmentId?: number;
}

const REFERENCE_KEYS = ['shipmentReference', 'shipment_reference', 'reference', 'ref'];
const ID_KEYS = ['shipmentId', 'shipment_id', 'id'];

function positiveInteger(value: unknown) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readObjectValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  }
  return undefined;
}

export function normalizeShipmentReference(value: string) {
  return value.trim().toUpperCase();
}

export function parseScannedShipmentPayload(value: string): ScannedShipmentPayload | null {
  const raw = value.trim();
  if (!raw) return null;

  let reference = raw;
  let shipmentId: number | undefined;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      reference = readObjectValue(record, REFERENCE_KEYS) ?? reference;
      shipmentId = positiveInteger(readObjectValue(record, ID_KEYS));
    }
  } catch {
    // A plain reference or URL is the normal QR payload.
  }

  try {
    const url = new URL(raw);
    const queryReference = REFERENCE_KEYS.map((key) => url.searchParams.get(key)).find(Boolean)?.trim();
    const pathReference = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? '');
    reference = queryReference ?? (pathReference && !/^\d+$/.test(pathReference) ? pathReference : reference);
    shipmentId =
      shipmentId ??
      ID_KEYS.map((key) => positiveInteger(url.searchParams.get(key) ?? '')).find(Boolean);

    if (!shipmentId) {
      const shipmentPathMatch = url.pathname.match(/\/shipments?\/(\d+)(?:\/|$)/i);
      shipmentId = positiveInteger(shipmentPathMatch?.[1] ?? '');
    }
  } catch {
    // Not a URL.
  }

  shipmentId = shipmentId ?? positiveInteger(reference);

  return { raw, reference: reference.trim(), shipmentId };
}

export function inferShipmentIdFromReference(reference: string) {
  const trailingNumber = reference.match(/(?:^|[-_/])(\d+)$/)?.[1];
  return positiveInteger(trailingNumber ?? '');
}
