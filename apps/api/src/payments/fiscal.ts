import { HttpStatus } from '@nestjs/common';
import { type FiscalItem, type PaymentProviderCode } from '@teran/contracts';
import { ApiException } from '../common/errors/api-exception.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PaymentConfig } from './payment-config.js';

export const CLICK_PACKAGE_CODE_MAX = 20;

function unavailable(): never {
  throw new ApiException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'FISCAL_DATA_MISSING',
    'The order cannot be fiscalized with this payment method',
  );
}

const tiyin = (sum: Prisma.Decimal) => sum.times(100).toNumber();

export function receiptUrl(value: string | null): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'ofd.soliq.uz' &&
      !url.port &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Freeze the provider's receipt at the same commit as the payment attempt. */
export async function fiscalPayload(
  tx: Prisma.TransactionClient,
  orderId: string,
  provider: PaymentProviderCode,
  config: PaymentConfig,
): Promise<Prisma.InputJsonObject | undefined> {
  const payme = provider === 'PAYME' && config.itemizedPayme;
  const click = provider === 'CLICK' && config.itemizedClick;
  if (!payme && !click) return undefined;
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      total: true,
      currency: true,
      deliveryFee: true,
      deliveryMethodName: true,
      discountTotal: true,
      items: {
        orderBy: { id: 'asc' },
        select: {
          productName: true,
          weightGrams: true,
          unitCount: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          fiscalMxik: true,
          fiscalPackageCode: true,
          fiscalVatPercent: true,
          fiscalBarcode: true,
        },
      },
    },
  });
  const items = order.items.map((item) => {
    if (
      !item.fiscalMxik ||
      !item.fiscalPackageCode ||
      item.fiscalVatPercent === null ||
      !item.unitPrice.times(item.quantity).equals(item.lineTotal)
    )
      unavailable();
    const size = item.weightGrams
      ? ` ${item.weightGrams} g`
      : item.unitCount
        ? ` × ${item.unitCount}`
        : '';
    return {
      title: item.productName + size,
      price: tiyin(item.unitPrice),
      count: item.quantity,
      code: item.fiscalMxik,
      package_code: item.fiscalPackageCode,
      vat_percent: item.fiscalVatPercent,
      barcode: item.fiscalBarcode,
    };
  });
  const shipping = tiyin(order.deliveryFee);
  if (shipping && !order.deliveryMethodName) unavailable();
  const total = items.reduce((sum, item) => sum + item.price * item.count, shipping);
  if (
    !items.length ||
    order.currency !== 'UZS' ||
    !order.discountTotal.isZero() ||
    total !== tiyin(order.total)
  )
    unavailable();
  if (payme)
    return {
      receipt_type: 0,
      ...(shipping && order.deliveryMethodName
        ? { shipping: { title: order.deliveryMethodName, price: shipping } }
        : {}),
      items: items.map((item) => ({
        title: item.title,
        price: item.price,
        count: item.count,
        code: item.code,
        package_code: item.package_code,
        vat_percent: item.vat_percent,
      })),
    };
  const tin = config.clickCommissionTin;
  if (!tin || !config.click) unavailable();
  if (shipping && order.deliveryMethodName) {
    const delivery: FiscalItem | null = config.fiscalDelivery;
    if (!delivery) unavailable();
    items.push({
      title: order.deliveryMethodName,
      price: shipping,
      count: 1,
      code: delivery.mxik,
      package_code: delivery.packageCode,
      vat_percent: delivery.vatPercent,
      barcode: null,
    });
  }
  return {
    service_id: Number(config.click.serviceId),
    received_cash: 0,
    received_ecash: 0,
    received_card: total,
    items: items.map((item) => {
      if (item.package_code.length > CLICK_PACKAGE_CODE_MAX) unavailable();
      const gross = item.price * item.count;
      return {
        Name: Array.from(item.title).slice(0, 63).join(''),
        SPIC: item.code,
        PackageCode: item.package_code,
        GoodPrice: item.price,
        Price: gross,
        Amount: item.count * 1000,
        VATPercent: item.vat_percent,
        VAT: new Prisma.Decimal(gross)
          .times(item.vat_percent)
          .div(100 + item.vat_percent)
          .toDecimalPlaces(0)
          .toNumber(),
        ...(item.barcode?.length === 13 ? { Barcode: item.barcode } : {}),
        CommissionInfo: { TIN: tin },
      };
    }),
  };
}
