import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildPaginated,
  type adminInquiryListQuerySchema,
  type adminSimpleListQuerySchema,
  type AdminContactInquiry,
  type AdminNewsletterSubscriber,
  type AdminWholesaleInquiry,
  type inquiryUpdateSchema,
  type Locale,
  type Paginated,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { newsletterUnsubscribeToken } from '../common/crypto.js';
import { ApiException } from '../common/errors/api-exception.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { pageArgs, toCsv, type Actor } from './admin-support.js';

type InquiryQuery = z.output<typeof adminInquiryListQuerySchema>;
type SimpleQuery = z.output<typeof adminSimpleListQuerySchema>;
type InquiryUpdate = z.output<typeof inquiryUpdateSchema>;
export type InquiryKind = 'contact' | 'wholesale';

@Injectable()
export class AdminInquiriesService {
  private readonly appSecret: string;
  private readonly webOrigin: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.appSecret = config.get('APP_SECRET', { infer: true });
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true }).replace(/\/$/, '');
  }

  async contact(query: InquiryQuery): Promise<Paginated<AdminContactInquiry>> {
    const where = { status: query.status };
    const [total, rows] = await Promise.all([
      this.prisma.contactInquiry.count({ where }),
      this.prisma.contactInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query.page, query.pageSize),
      }),
    ]);
    const items = rows.map((row): AdminContactInquiry => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      locale: row.locale,
      status: row.status,
      internalNote: row.internalNote,
      createdAt: row.createdAt.toISOString(),
    }));
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  async wholesale(query: InquiryQuery): Promise<Paginated<AdminWholesaleInquiry>> {
    const where = { status: query.status };
    const [total, rows] = await Promise.all([
      this.prisma.wholesaleInquiry.count({ where }),
      this.prisma.wholesaleInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query.page, query.pageSize),
      }),
    ]);
    const items = rows.map((row): AdminWholesaleInquiry => ({
      id: row.id,
      companyName: row.companyName,
      contactName: row.contactName,
      phone: row.phone,
      email: row.email,
      businessType: row.businessType,
      regionCode: row.regionCode,
      city: row.city,
      monthlyVolume: row.monthlyVolume,
      message: row.message,
      locale: row.locale,
      status: row.status,
      internalNote: row.internalNote,
      createdAt: row.createdAt.toISOString(),
    }));
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  async update(kind: InquiryKind, id: string, input: InquiryUpdate, actor: Actor): Promise<void> {
    const data = {
      status: input.status,
      internalNote: input.internalNote ?? null,
      handledAt: input.status === 'RESOLVED' || input.status === 'SPAM' ? new Date() : null,
    };
    await this.prisma.$transaction(async (tx) => {
      const result =
        kind === 'contact'
          ? await tx.contactInquiry.updateMany({ where: { id }, data })
          : await tx.wholesaleInquiry.updateMany({ where: { id }, data });
      if (result.count === 0) throw ApiException.notFound('Inquiry not found');
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `inquiry.${kind}.update`,
          entityType: kind === 'contact' ? 'ContactInquiry' : 'WholesaleInquiry',
          entityId: id,
          metadata: { status: input.status },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
  }

  async subscribers(query: SimpleQuery): Promise<Paginated<AdminNewsletterSubscriber>> {
    const where = query.q ? { email: { contains: query.q.toLowerCase() } } : {};
    const [total, rows] = await Promise.all([
      this.prisma.newsletterSubscriber.count({ where }),
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        ...pageArgs(query.page, query.pageSize),
      }),
    ]);
    const items = rows.map((row): AdminNewsletterSubscriber => ({
      id: row.id,
      email: row.email,
      locale: row.locale,
      status: row.status,
      source: row.source,
      subscribedAt: row.subscribedAt.toISOString(),
    }));
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  /** Active subscribers with a working unsubscribe link each, for use in an e-mail tool. */
  async exportSubscribers(actor: Actor): Promise<string> {
    const rows = await this.prisma.newsletterSubscriber.findMany({
      where: { status: 'SUBSCRIBED' },
      orderBy: { subscribedAt: 'asc' },
      select: { id: true, email: true, locale: true, subscribedAt: true },
    });
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'newsletter.export',
      entityType: 'NewsletterSubscriber',
      metadata: { count: rows.length },
      ipAddress: actor.ipAddress,
    });
    return toCsv(
      ['email', 'language', 'subscribed_at', 'unsubscribe_url'],
      rows.map((row) => [
        row.email,
        row.locale,
        row.subscribedAt.toISOString(),
        this.unsubscribeUrl(row.id, row.locale),
      ]),
    );
  }

  private unsubscribeUrl(id: string, locale: Locale): string {
    const prefix = locale === 'uz' ? '' : `/${locale}`;
    const query = new URLSearchParams({
      id,
      token: newsletterUnsubscribeToken(this.appSecret, id),
    });
    return `${this.webOrigin}${prefix}/newsletter/unsubscribe?${query.toString()}`;
  }
}
