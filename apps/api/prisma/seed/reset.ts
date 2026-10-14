/**
 * Guarded DEMO RESET: removes the demonstration data (remove.ts) and loads it again, catalogue
 * and activity, so a demo database returns to its initial state.
 *
 *   pnpm --filter @teran/api db:demo:reset -- --confirm=<database name> [--allow-remote]
 *
 * Refuses to run when NODE_ENV=production (no override), when --confirm does not repeat the
 * target database name, and when the database is not on this machine unless --allow-remote is
 * given. Prints the target before changing anything. Staff accounts, real customers and orders,
 * delivery methods, site settings and the audit log are kept.
 */
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedActivity } from './activity.js';
import { readEmblem, seedCatalogue, uploadsDirectory } from './catalogue.js';
import { assertResetAllowed, describeTarget } from './guard.js';
import { removeDemoData } from './remove.js';
import { refreshStorefrontCache } from './storefront.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    // `pnpm run db:demo:reset -- --confirm=…` may pass the separator through.
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
      confirm: { type: 'string' },
      'allow-remote': { type: 'boolean', default: false },
    },
  });

  let target;
  try {
    target = assertResetAllowed({
      env: process.env,
      confirm: values.confirm,
      allowRemote: values['allow-remote'],
    });
  } catch (error) {
    console.error(`✗ ${(error as Error).message}`);
    process.exit(1);
  }
  console.log(`Resetting demo data in ${describeTarget(target)}…`);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const removed = await removeDemoData(prisma, uploadsDirectory());
    console.log(
      `Removed: ${removed.products} product(s), ${removed.orders} order(s), ` +
        `${removed.customers} customer(s), ${removed.articles} article(s), ` +
        `${removed.contactInquiries + removed.wholesaleInquiries} enquiry(ies), ` +
        `${removed.subscribers} subscriber(s).`,
    );
    for (const item of removed.kept) console.warn(`  kept ${item} (still used by other products)`);

    const catalogue = await seedCatalogue(prisma, {
      uploadsDir: uploadsDirectory(),
      emblem: await readEmblem(),
    });
    const activity = await seedActivity(prisma);
    for (const skipped of activity.skipped) console.warn(`  skipped ${skipped}`);
    await prisma.auditLog.create({
      data: {
        action: 'demo.reset',
        entityType: 'System',
        metadata: {
          removed: { ...removed },
          catalogue: { ...catalogue },
          activity: { ...activity },
        },
      },
    });
    console.log(await refreshStorefrontCache(process.env));
    console.log(
      `Reloaded: ${catalogue.products} product(s), ${activity.orders} order(s), ` +
        `${activity.customers} customer(s). Demo reset complete.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
