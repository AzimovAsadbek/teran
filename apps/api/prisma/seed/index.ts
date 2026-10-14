/**
 * Loads DEMONSTRATION data into the database configured by DATABASE_URL.
 *
 *   pnpm --filter @teran/api db:seed        catalogue and content (prisma db seed)
 *   pnpm --filter @teran/api db:seed:demo   the same, plus demo customers, orders, enquiries and
 *                                           newsletter subscribers (--with-activity)
 *
 * - Idempotent and non-destructive: existing records (matched by slug, code, key, order number or
 *   e-mail) are left untouched, so re-running never overwrites changes made in the admin area.
 * - Refuses to run when NODE_ENV=production unless ALLOW_DEMO_SEED=true. Demo customers and
 *   orders are only ever loaded when --with-activity is passed explicitly.
 * - To remove demo data again, see reset.ts (pnpm --filter @teran/api db:demo:reset).
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { seedActivity } from './activity.js';
import { readEmblem, seedCatalogue, uploadsDirectory } from './catalogue.js';
import { assertSeedAllowed, describeTarget } from './guard.js';
import { refreshStorefrontCache } from './storefront.js';

async function main(): Promise<void> {
  const target = assertSeedAllowed(process.env);
  const withActivity = process.argv.includes('--with-activity');
  console.log(`Loading demo data into ${describeTarget(target)}…`);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const catalogue = await seedCatalogue(prisma, {
      uploadsDir: uploadsDirectory(),
      emblem: await readEmblem(),
    });
    console.log(
      `Catalogue: ${catalogue.products} new product(s), ${catalogue.articles} new article(s).`,
    );

    const activity = withActivity ? await seedActivity(prisma) : null;
    if (activity) {
      console.log(
        `Activity: ${activity.customers} customer(s), ${activity.orders} order(s), ` +
          `${activity.contactInquiries + activity.wholesaleInquiries} enquiry(ies), ` +
          `${activity.subscribers} subscriber(s) added.`,
      );
      for (const skipped of activity.skipped) console.warn(`  skipped ${skipped}`);
    }

    const changed =
      catalogue.products + catalogue.articles > 0 ||
      (activity !== null &&
        activity.customers +
          activity.orders +
          activity.contactInquiries +
          activity.wholesaleInquiries +
          activity.subscribers >
          0);
    if (changed) {
      await prisma.auditLog.create({
        data: {
          action: 'demo.seed',
          entityType: 'System',
          metadata: {
            catalogue: { ...catalogue },
            ...(activity ? { activity: { ...activity } } : {}),
          },
        },
      });
    }
    if (changed) console.log(await refreshStorefrontCache(process.env));
    console.log(changed ? 'Demo seed complete.' : 'Demo data already present; nothing changed.');
  } finally {
    await prisma.$disconnect();
  }
}

await main();
