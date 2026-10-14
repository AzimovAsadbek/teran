import type { PaymeSettings } from '../payment-config.js';
import {
  PaymeError,
  isPaymeAddress,
  isPaymeAuthorized,
  paymeCheckoutUrl,
  paymeError,
  paymeInteger,
} from './payme-protocol.js';

const settings: PaymeSettings = {
  merchantId: '587f72c72cac0d162c722ae2',
  key: 'test-cashbox-key-for-unit-tests',
  login: 'Paycom',
  checkoutUrl: 'https://checkout.paycom.uz',
  checkIp: true,
};

describe('Payme protocol', () => {
  it('accepts only Basic auth with the configured login and cashbox key', () => {
    const header = `Basic ${Buffer.from('Paycom:test-cashbox-key-for-unit-tests').toString('base64')}`;
    expect(isPaymeAuthorized(header, settings)).toBe(true);
    expect(isPaymeAuthorized(header.replace('Basic', 'Bearer'), settings)).toBe(false);
    expect(
      isPaymeAuthorized(`Basic ${Buffer.from('Paycom:wrong').toString('base64')}`, settings),
    ).toBe(false);
    expect(isPaymeAuthorized(undefined, settings)).toBe(false);
  });

  it("accepts calls only from Payme's documented range 185.234.113.1-15", () => {
    expect(isPaymeAddress('185.234.113.1')).toBe(true);
    expect(isPaymeAddress('::ffff:185.234.113.15')).toBe(true);
    expect(isPaymeAddress('185.234.113.16')).toBe(false);
    expect(isPaymeAddress('185.234.113.0')).toBe(false);
    expect(isPaymeAddress('127.0.0.1')).toBe(false);
    expect(isPaymeAddress(undefined)).toBe(false);
  });

  it('builds the GET checkout link as base64 of semicolon-separated parameters', () => {
    const url = paymeCheckoutUrl(settings, {
      orderNumber: 'TRN-7K4Q2M9X',
      amountTiyin: 8_500_000n,
      locale: 'ru',
      returnUrl: 'https://teran.example/ru/payments/return/abc',
    });
    expect(url.startsWith('https://checkout.paycom.uz/')).toBe(true);
    const decoded = Buffer.from(
      url.slice('https://checkout.paycom.uz/'.length),
      'base64',
    ).toString();
    expect(decoded).toBe(
      'm=587f72c72cac0d162c722ae2;ac.order_id=TRN-7K4Q2M9X;a=8500000;l=ru;c=https://teran.example/ru/payments/return/abc',
    );
  });

  it('matches the encoding of the example in the Payme documentation', () => {
    // https://developer.help.paycom.uz/initsializatsiya-platezhey/otpravka-cheka-po-metodu-get
    expect(Buffer.from('m=587f72c72cac0d162c722ae2;ac.order_id=197;a=500').toString('base64')).toBe(
      'bT01ODdmNzJjNzJjYWMwZDE2MmM3MjJhZTI7YWMub3JkZXJfaWQ9MTk3O2E9NTAw',
    );
  });

  it('answers errors as JSON-RPC objects with localised messages', () => {
    const response = paymeError(7, new PaymeError(-31050, 'order_id'));
    expect(response).toMatchObject({
      jsonrpc: '2.0',
      id: 7,
      error: { code: -31050, data: 'order_id' },
    });
    expect(Object.keys(response.error?.message ?? {}).sort()).toEqual(['en', 'ru', 'uz']);
  });

  it('accepts only positive safe integers for amounts and times', () => {
    expect(paymeInteger(500)).toBe(500n);
    expect(paymeInteger(0)).toBeNull();
    expect(paymeInteger(1.5)).toBeNull();
    expect(paymeInteger('500')).toBeNull();
  });
});
