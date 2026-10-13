/**
 * Creates the first administrator account (or resets an administrator's password).
 *
 *   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='…' pnpm --filter @teran/api admin:create
 *   # production image: node dist/cli/create-admin.js
 *
 * Options:
 *   --first-name <name>   name shown in the admin (default "Admin")
 *   --reset-password      set ADMIN_PASSWORD on an existing administrator
 *   --promote             make an existing customer or manager an administrator
 *
 * The password is read from the environment and never printed. Existing accounts are only changed
 * when the matching flag is given, so the command cannot silently escalate or overwrite anyone.
 */
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { emailSchema, passwordSchema } from '@teran/contracts';
import { hashPassword } from '../auth/password.js';
import { PrismaClient } from '../generated/prisma/client.js';

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'first-name': { type: 'string', default: 'Admin' },
      'reset-password': { type: 'boolean', default: false },
      promote: { type: 'boolean', default: false },
    },
  });

  const email = emailSchema.safeParse(process.env.ADMIN_EMAIL ?? '');
  if (!email.success) fail('Set ADMIN_EMAIL to the administrator’s e-mail address.');
  const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD ?? '');
  if (!password.success) fail('Set ADMIN_PASSWORD (at least 10 characters).');
  if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set.');

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const existing = await prisma.user.findUnique({
      where: { email: email.data },
      select: { id: true, role: true },
    });

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email: email.data,
          firstName: values['first-name'],
          role: 'ADMIN',
          passwordHash: await hashPassword(password.data),
        },
        select: { id: true },
      });
      await prisma.auditLog.create({
        data: {
          action: 'staff.bootstrap',
          entityType: 'User',
          entityId: user.id,
          metadata: { email: email.data },
        },
      });
      console.log(`✓ Administrator ${email.data} created.`);
      return;
    }

    if (existing.role !== 'ADMIN' && !values.promote) {
      fail(
        `${email.data} already has a ${existing.role} account. Re-run with --promote to make it an administrator.`,
      );
    }
    if (existing.role === 'ADMIN' && !values['reset-password']) {
      console.log(
        `✓ ${email.data} is already an administrator (use --reset-password to change the password).`,
      );
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          role: 'ADMIN',
          isActive: true,
          ...(values['reset-password']
            ? {
                passwordHash: await hashPassword(password.data),
                failedLoginCount: 0,
                lockedUntil: null,
              }
            : {}),
        },
      });
      // A changed password or role must not leave older sessions signed in.
      await tx.session.deleteMany({ where: { userId: existing.id } });
      await tx.auditLog.create({
        data: {
          action:
            values.promote && existing.role !== 'ADMIN' ? 'staff.promote' : 'staff.password_reset',
          entityType: 'User',
          entityId: existing.id,
          metadata: { email: email.data, previousRole: existing.role },
        },
      });
    });
    console.log(`✓ ${email.data} updated.`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
