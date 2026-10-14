import { Prisma } from '../../generated/prisma/client.js';
import type { PaymentConfig } from '../payment-config.js';
import { paymentAdapters } from './payment-provider.js';

function config(overrides: Partial<PaymentConfig>): PaymentConfig {
  return {
    mode: 'live',
    payme: null,
    click: null,
    sitePath: (locale: string, path: string) => `${locale === 'uz' ? '' : `/${locale}`}${path}`,
    ...overrides,
  } as PaymentConfig;
}

const request = {
  orderNumber: 'TRN-7K4Q2M9X',
  amount: new Prisma.Decimal('85000.00'),
  locale: 'ru' as const,
  token: 'secret-token',
  returnUrl: 'https://teran.example/ru/payments/return/secret-token',
};

describe('payment provider adapters', () => {
  it('in demo mode offers only the simulated provider, linking to the demo page', () => {
    const adapters = paymentAdapters(
      config({
        mode: 'demo',
        // Even with credentials present, demo mode never produces a real provider link.
        payme: {
          merchantId: 'm',
          key: 'k',
          login: 'Paycom',
          checkoutUrl: 'https://checkout.paycom.uz',
          checkIp: true,
        },
      }),
    );
    expect(Object.keys(adapters)).toEqual(['DEMO']);
    expect(adapters.DEMO?.simulated).toBe(true);
    expect(adapters.DEMO?.checkoutUrl(request)).toBe('/ru/payments/demo/secret-token');
  });

  it('in live mode offers only providers with credentials, with their hosted pages', () => {
    expect(paymentAdapters(config({}))).toEqual({});
    const adapters = paymentAdapters(
      config({
        payme: {
          merchantId: 'merchant',
          key: 'key',
          login: 'Paycom',
          checkoutUrl: 'https://checkout.paycom.uz',
          checkIp: true,
        },
        click: { serviceId: '1', merchantId: '2', secretKey: 'secret' },
      }),
    );
    expect(Object.keys(adapters).sort()).toEqual(['CLICK', 'PAYME']);
    expect(adapters.PAYME?.checkoutUrl(request)).toMatch(/^https:\/\/checkout\.paycom\.uz\//);
    expect(
      Buffer.from(adapters.PAYME!.checkoutUrl(request).split('/').at(-1)!, 'base64').toString(),
    ).toContain('a=8500000;');
    expect(adapters.CLICK?.checkoutUrl(request)).toMatch(
      /^https:\/\/my\.click\.uz\/services\/pay\?.*amount=85000\.00/,
    );
    expect(adapters.PAYME?.refunds).toBe('provider-callback');
    expect(adapters.CLICK?.refunds).toBe('recorded-by-staff');
  });
});
