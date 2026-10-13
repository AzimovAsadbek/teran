import { HttpStatus, Injectable } from '@nestjs/common';
import type { DeliveryMethodDto, Locale } from '@teran/contracts';
import { Prisma } from '../generated/prisma/client.js';
import { ApiException } from '../common/errors/api-exception.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import { ZERO, toMoney, toMoneyOrNull } from '../common/money.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface DeliveryQuote {
  methodId: string;
  methodName: string;
  requiresAddress: boolean;
  fee: Prisma.Decimal;
}

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(locale: Locale): Promise<DeliveryMethodDto[]> {
    const methods = await this.prisma.deliveryMethod.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { translations: { where: { locale: { in: localeChain(locale) } } } },
    });
    return methods.map((method) => {
      const translation = pickTranslation(method.translations, locale);
      return {
        code: method.code,
        name: translation?.name ?? method.code,
        description: translation?.description ?? null,
        estimate: translation?.estimate ?? null,
        price: toMoney(method.price),
        freeFromAmount: toMoneyOrNull(method.freeFromAmount),
        currency: method.currency,
        regionCodes: method.regionCodes,
        requiresAddress: method.requiresAddress,
      };
    });
  }

  /**
   * Prices delivery for a method/region/subtotal. The fee drops to zero when the subtotal reaches
   * the method's free-delivery threshold. Throws when the method is inactive or does not serve
   * the region, so a client can never choose a delivery the business does not offer.
   */
  async quote(
    methodCode: string,
    regionCode: string,
    subtotal: Prisma.Decimal,
    locale: Locale,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<DeliveryQuote> {
    const method = await tx.deliveryMethod.findFirst({
      where: { code: methodCode, isActive: true },
      include: { translations: { where: { locale: { in: localeChain(locale) } } } },
    });
    if (!method || (method.regionCodes.length > 0 && !method.regionCodes.includes(regionCode))) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'DELIVERY_METHOD_UNAVAILABLE',
        'This delivery method is not available for the selected region',
      );
    }
    const isFree =
      method.freeFromAmount !== null && subtotal.greaterThanOrEqualTo(method.freeFromAmount);
    return {
      methodId: method.id,
      methodName: pickTranslation(method.translations, locale)?.name ?? method.code,
      requiresAddress: method.requiresAddress,
      fee: isFree ? ZERO : method.price,
    };
  }

  /** Progress toward free delivery for the first active method that offers it. */
  async freeDeliveryHint(
    subtotal: Prisma.Decimal,
    locale: Locale,
  ): Promise<{ methodName: string; freeFromAmount: string; remaining: string } | null> {
    const method = await this.prisma.deliveryMethod.findFirst({
      where: { isActive: true, freeFromAmount: { not: null } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { translations: { where: { locale: { in: localeChain(locale) } } } },
    });
    if (!method?.freeFromAmount) return null;
    const remaining = Prisma.Decimal.max(ZERO, method.freeFromAmount.minus(subtotal));
    return {
      methodName: pickTranslation(method.translations, locale)?.name ?? method.code,
      freeFromAmount: toMoney(method.freeFromAmount),
      remaining: toMoney(remaining),
    };
  }
}
