import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PaymentConfig } from '../payment-config.js';
import { receiptUrl } from '../fiscal.js';

const endpoint = 'https://api.click.uz/v2/merchant/payment/ofd_data';
const leaseMs = 90_000;
const maxChecks = 96;

/** A lost POST response is reconciled by payment ID using GET, including after a process restart. */
@Injectable()
export class ClickFiscalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: PaymentConfig,
  ) {}

  async processDue(now = new Date()): Promise<void> {
    const click = this.config.click;
    const userId = this.config.clickUserId;
    if (!click || !userId) return;
    const jobs = await this.prisma.clickTransaction.findMany({
      where: { fiscalState: { in: ['QUEUED', 'CHECKING'] }, fiscalNextAt: { lte: now } },
      select: {
        prepareId: true,
        clickTransId: true,
        paymentId: true,
        fiscalState: true,
        fiscalChecks: true,
        payment: { select: { fiscalPayload: true } },
      },
      orderBy: { fiscalNextAt: 'asc' },
      take: 20,
    });
    for (const job of jobs) {
      const check = job.fiscalChecks + 1;
      const lease = await this.prisma.clickTransaction.updateMany({
        where: {
          prepareId: job.prepareId,
          fiscalState: job.fiscalState,
          fiscalChecks: job.fiscalChecks,
          fiscalNextAt: { lte: now },
        },
        data: {
          fiscalState: 'CHECKING',
          fiscalChecks: check,
          fiscalNextAt: new Date(Date.now() + leaseMs),
        },
      });
      if (!lease.count) continue;
      const timestamp = String(Math.floor(Date.now() / 1000));
      const digest = createHash('sha1')
        .update(timestamp + click.secretKey)
        .digest('hex');
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Auth: `${userId}:${digest}:${timestamp}`,
      };
      const id = job.clickTransId.toString();
      const claimed = {
        prepareId: job.prepareId,
        fiscalChecks: check,
        fiscalState: 'CHECKING' as const,
      };
      let reason = 'QR_PENDING';
      let rejected = false;
      try {
        if (job.fiscalState === 'QUEUED') {
          const payload = job.payment.fiscalPayload;
          if (
            !payload ||
            Array.isArray(payload) ||
            typeof payload !== 'object' ||
            payload.service_id !== Number(click.serviceId)
          ) {
            rejected = true;
            reason = 'CONFIG_MISMATCH';
          } else {
            // CLICK uses a JSON long for payment_id, including values beyond JS safe integers.
            const body = `{"payment_id":${id},${JSON.stringify(payload).slice(1)}`;
            const response = await fetch(endpoint + '/submit_items', {
              method: 'POST',
              headers,
              body,
              redirect: 'error',
              signal: AbortSignal.timeout(7000),
            });
            const result = (await response.json()) as { error_code?: number };
            if (response.ok && typeof result.error_code === 'number' && result.error_code !== 0) {
              reason = 'CLICK_' + result.error_code;
              // A prior receipt can exist even when a submission is rejected. Check it before review.
            }
          }
        } else {
          const response = await fetch(`${endpoint}/${click.serviceId}/${id}`, {
            headers,
            redirect: 'error',
            signal: AbortSignal.timeout(7000),
          });
          if (response.ok) {
            // Keep the numeric provider ID exact even for 64-bit IDs.
            const data = JSON.parse(
              await response.text(),
              (key, value: unknown, context?: { source?: string }) =>
                key === 'paymentId' && typeof value === 'number'
                  ? (context?.source ?? String(value))
                  : value,
            ) as { paymentId?: string; qrCodeURL?: string };
            const url = typeof data.qrCodeURL === 'string' ? receiptUrl(data.qrCodeURL) : null;
            if (data.paymentId === id && url) {
              await this.prisma.$transaction(async (tx) => {
                const finished = await tx.clickTransaction.updateMany({
                  where: claimed,
                  data: { fiscalState: 'COMPLETE', fiscalNextAt: null, fiscalError: null },
                });
                if (!finished.count) return;
                const key = { paymentId: job.paymentId, operation: 'PERFORM' as const };
                const receipt = {
                  receiptId: id,
                  statusCode: 0,
                  message: 'accepted',
                  receiptUrl: url,
                };
                await tx.fiscalReceipt.upsert({
                  where: { paymentId_operation: key },
                  create: { ...key, ...receipt },
                  update: receipt,
                });
              });
              continue;
            }
          }
        }
      } catch {
        reason = 'PROVIDER_UNREACHABLE';
      }
      const review = rejected || check >= maxChecks;
      await this.prisma.clickTransaction.updateMany({
        where: claimed,
        data: {
          fiscalState: review ? 'REVIEW' : 'CHECKING',
          fiscalError: reason,
          fiscalNextAt: review ? null : new Date(Date.now() + Math.min(check * 60_000, 900_000)),
        },
      });
    }
  }
}
