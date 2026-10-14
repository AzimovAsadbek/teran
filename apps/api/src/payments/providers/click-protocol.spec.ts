import { createHash } from 'node:crypto';
import type { ClickSettings } from '../payment-config.js';
import {
  clickPaymentUrl,
  clickSignature,
  isClickSignatureValid,
  parseClickRequest,
} from './click-protocol.js';

const settings: ClickSettings = {
  serviceId: '12345',
  merchantId: '67890',
  secretKey: 'unit-test-secret',
};

const prepareBody = {
  click_trans_id: '2100000001',
  service_id: '12345',
  click_paydoc_id: '3100000001',
  merchant_trans_id: 'TRN-7K4Q2M9X',
  amount: '85000.00',
  action: '0',
  error: '0',
  error_note: 'Success',
  sign_time: '2026-10-14 12:00:00',
  sign_string: '',
};

function md5(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

describe('Click SHOP API protocol', () => {
  it('signs Prepare as md5(click_trans_id service_id SECRET merchant_trans_id amount action sign_time)', () => {
    const request = parseClickRequest({ ...prepareBody, sign_string: 'a'.repeat(32) }, false);
    expect(request).not.toBeNull();
    expect(clickSignature(request!, settings.secretKey)).toBe(
      md5('210000000112345unit-test-secretTRN-7K4Q2M9X85000.0002026-10-14 12:00:00'),
    );
  });

  it('includes merchant_prepare_id in the Complete signature', () => {
    const request = parseClickRequest(
      { ...prepareBody, action: '1', merchant_prepare_id: '17', sign_string: 'a'.repeat(32) },
      true,
    );
    expect(clickSignature(request!, settings.secretKey)).toBe(
      md5('210000000112345unit-test-secretTRN-7K4Q2M9X1785000.0012026-10-14 12:00:00'),
    );
  });

  it('verifies the signature over the exact received strings', () => {
    const signed = {
      ...prepareBody,
      sign_string: md5('210000000112345unit-test-secretTRN-7K4Q2M9X85000.0002026-10-14 12:00:00'),
    };
    expect(isClickSignatureValid(parseClickRequest(signed, false)!, settings)).toBe(true);
    // The same amount written differently is a different signature: nothing is re-formatted.
    expect(
      isClickSignatureValid(parseClickRequest({ ...signed, amount: '85000' }, false)!, settings),
    ).toBe(false);
    expect(
      isClickSignatureValid(parseClickRequest(signed, false)!, { ...settings, secretKey: 'other' }),
    ).toBe(false);
  });

  it('rejects malformed requests', () => {
    expect(parseClickRequest({ ...prepareBody, sign_string: 'x' }, false)).toBeNull();
    expect(
      parseClickRequest({ ...prepareBody, amount: '1e5', sign_string: 'a'.repeat(32) }, false),
    ).toBeNull();
    expect(
      parseClickRequest({ ...prepareBody, action: '1', sign_string: 'a'.repeat(32) }, true),
    ).toBeNull(); // Complete without merchant_prepare_id
    expect(parseClickRequest(null, false)).toBeNull();
  });

  it('builds the hosted payment link with the order number as transaction_param', () => {
    const url = new URL(
      clickPaymentUrl(settings, {
        orderNumber: 'TRN-7K4Q2M9X',
        amount: '85000.00',
        returnUrl: 'https://teran.example/payments/return/abc',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://my.click.uz/services/pay');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      service_id: '12345',
      merchant_id: '67890',
      amount: '85000.00',
      transaction_param: 'TRN-7K4Q2M9X',
      return_url: 'https://teran.example/payments/return/abc',
    });
  });
});
