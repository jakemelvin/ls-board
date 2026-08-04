import { expect, test } from '@playwright/test';
import {
  inferShipmentIdFromReference,
  parseScannedShipmentPayload,
} from '../../lib/shipments/qr';

test('extracts a shipment reference from supported QR payloads', () => {
  expect(parseScannedShipmentPayload('SHP-2026-07001')).toEqual({
    raw: 'SHP-2026-07001',
    reference: 'SHP-2026-07001',
    shipmentId: undefined,
  });
  expect(
    parseScannedShipmentPayload(
      'https://sendamhub.com/shipments/7001?reference=SHP-2026-07001',
    ),
  ).toMatchObject({ reference: 'SHP-2026-07001', shipmentId: 7001 });
  expect(parseScannedShipmentPayload('{"shipmentId":701,"shipmentReference":"SHP-701-SECURE"}'))
    .toMatchObject({ reference: 'SHP-701-SECURE', shipmentId: 701 });
  expect(inferShipmentIdFromReference('SHP-2026-07001')).toBe(7001);
});
