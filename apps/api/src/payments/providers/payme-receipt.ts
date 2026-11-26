import { z } from 'zod';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { receiptUrl } from '../fiscal.js';
import { PaymeError } from './payme-protocol.js';

const short = z.string().max(250);
const callback = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(['PERFORM', 'CANCEL']),
  fiscal_data: z.object({
    receipt_id: z
      .union([z.string().min(1).max(128), z.number().int().nonnegative()])
      .transform(String),
    status_code: z.number().int().min(-2147483648).max(2147483647),
    message: z.string().max(1000),
    terminal_id: short.nullish(),
    fiscal_sign: short.nullish(),
    qr_code_url: z.string().max(2048).nullish(),
    date: short.nullish(),
  }),
});

export async function acceptPaymeReceipt(prisma: PrismaService, params: Record<string, unknown>) {
  const parsed = callback.safeParse(params);
  if (!parsed.success)
    throw new PaymeError(-32602, parsed.error.issues[0]?.path.join('.') || 'params');
  const { id, type: operation, fiscal_data: data } = parsed.data;
  if (data.status_code === 0 && (!data.terminal_id || !data.fiscal_sign || !data.date))
    throw new PaymeError(-32602, 'fiscal_data');
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.paymeTransaction.findUnique({
      where: { paymeId: id },
      select: { paymentId: true },
    });
    if (!transaction) throw new PaymeError(-32001);
    const { paymentId } = transaction;
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId}::uuid FOR UPDATE`;
    const where = { paymentId_operation: { paymentId, operation } };
    const existing = await tx.fiscalReceipt.findUnique({ where });
    const url = receiptUrl(data.qr_code_url ?? null);
    if (existing?.statusCode === 0) {
      if (
        data.status_code === 0 &&
        (existing.receiptId !== data.receipt_id ||
          existing.terminalId !== data.terminal_id ||
          existing.fiscalSign !== data.fiscal_sign)
      )
        throw new PaymeError(-32602, 'fiscal_data.receipt_id');
      if (data.status_code === 0 && !existing.receiptUrl && url) {
        await tx.fiscalReceipt.update({ where, data: { receiptUrl: url } });
      }
      return;
    }
    const values = {
      receiptId: data.receipt_id,
      statusCode: data.status_code,
      message: data.message,
      terminalId: data.terminal_id ?? null,
      fiscalSign: data.fiscal_sign ?? null,
      receiptDate: data.date ?? null,
      receiptUrl: url,
    };
    await tx.fiscalReceipt.upsert({
      where,
      create: { paymentId, operation, ...values },
      update: values,
    });
  });
  return { success: true };
}
