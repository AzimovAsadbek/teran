import { Injectable, Logger } from '@nestjs/common';
import type {
  contactInquirySchema,
  newsletterSubscribeSchema,
  wholesaleInquirySchema,
} from '@teran/contracts';
import type { z } from 'zod';
import { generateToken, sha256 } from '../common/crypto.js';
import { ApiException } from '../common/errors/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

type ContactInput = z.output<typeof contactInquirySchema>;
type WholesaleInput = z.output<typeof wholesaleInquirySchema>;
type SubscribeInput = z.output<typeof newsletterSubscribeSchema>;

/**
 * Public form submissions. Bots that fill the hidden honeypot field get the same "accepted"
 * response as real visitors, but nothing is stored.
 */
@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createContact(input: ContactInput): Promise<void> {
    if (input.website) return;
    const inquiry = await this.prisma.contactInquiry.create({
      data: {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        subject: input.subject ?? null,
        message: input.message,
        locale: input.locale,
      },
      select: { id: true },
    });
    this.logger.log({ inquiryId: inquiry.id }, 'Contact inquiry received');
  }

  async createWholesale(input: WholesaleInput): Promise<void> {
    if (input.website) return;
    const inquiry = await this.prisma.wholesaleInquiry.create({
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        phone: input.phone,
        email: input.email ?? null,
        businessType: input.businessType,
        regionCode: input.regionCode ?? null,
        city: input.city ?? null,
        monthlyVolume: input.monthlyVolume ?? null,
        message: input.message ?? null,
        locale: input.locale,
      },
      select: { id: true },
    });
    this.logger.log({ inquiryId: inquiry.id }, 'Wholesale inquiry received');
  }

  /** Same response for new, repeated and re-activated subscriptions: reveals nothing about the list. */
  async subscribe(input: SubscribeInput): Promise<void> {
    if (input.website) return;
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: input.email },
    });
    if (existing?.status === 'SUBSCRIBED') return;
    if (existing) {
      await this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: 'SUBSCRIBED',
          subscribedAt: new Date(),
          unsubscribedAt: null,
          locale: input.locale,
        },
      });
      return;
    }
    await this.prisma.newsletterSubscriber.create({
      data: {
        email: input.email,
        locale: input.locale,
        source: input.source ?? null,
        unsubscribeTokenHash: sha256(generateToken()),
      },
    });
  }

  async unsubscribe(token: string): Promise<void> {
    const result = await this.prisma.newsletterSubscriber.updateMany({
      where: { unsubscribeTokenHash: sha256(token), status: 'SUBSCRIBED' },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
    if (result.count === 0) {
      const known = await this.prisma.newsletterSubscriber.count({
        where: { unsubscribeTokenHash: sha256(token) },
      });
      if (known === 0) throw ApiException.badRequest('INVALID_TOKEN', 'This link is invalid');
    }
  }
}
