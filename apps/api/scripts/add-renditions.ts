/**
 * Adds the renditions stored pictures lack against the widths a new upload gets (ADR-065: 800 px,
 * for phones; ADR-067: 1080 px for page pictures, covers and the gallery), so the storefront can
 * offer them. Each is made from a wider rendition of the same
 * picture (the originals are not kept), stored beside the others only where no file is yet (an
 * existing file is never replaced, and nothing is deleted), then recorded on the picture in the
 * database. Without --apply it only lists what it would add.
 *
 *   pnpm --filter @teran/api exec tsx scripts/add-renditions.ts           # lists, changes nothing
 *   pnpm --filter @teran/api exec tsx scripts/add-renditions.ts --apply   # makes and records them
 *
 * On the server, with the tools image (database, R2 and the storefront's cache webhook come from
 * the compose file), after a backup of the database:
 *
 *   teran run --rm migrate tsx scripts/add-renditions.ts [--apply]
 *
 * Pictures are read and written where the API keeps them: Cloudflare R2 when R2_* is set, else
 * UPLOADS_DIR. A run can be repeated: a file already there is only recorded, and a picture changed
 * meanwhile is left to the next run. Recording widths keeps each row's last-change date, so the
 * sitemap's `lastmod` stays as it was.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { r2ConfigFrom } from '../src/media/image-processing.js';
import {
  addRendition,
  missingRenditions,
  recordWidths,
  storedPictures,
} from '../src/media/renditions.js';
import { seedImageStore, uploadsDirectory } from '../prisma/seed/catalogue.js';
import { databaseTarget, describeTarget } from '../prisma/seed/guard.js';
import { refreshStorefrontCache } from '../prisma/seed/storefront.js';

const apply = process.argv.includes('--apply');
const kB = (bytes: number) => `${Math.round(bytes / 1000)} kB`;

async function main(): Promise<void> {
  const r2 = r2ConfigFrom(process.env);
  const store = seedImageStore(uploadsDirectory());
  console.log(
    `Renditions missing in ${describeTarget(databaseTarget(process.env.DATABASE_URL))}, pictures in ${
      r2 ? `Cloudflare R2 (bucket ${r2.bucket})` : `the folder ${uploadsDirectory()}`
    }. ${apply ? 'Adding them.' : 'Dry run: nothing is written (--apply adds them).'}\n`,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const count = {
    pictures: 0,
    complete: 0,
    files: 0,
    unreachable: 0,
    added: 0,
    present: 0,
    bytes: 0,
  };
  const recorded: string[] = [];
  const problems: string[] = [];
  try {
    for (const entry of await storedPictures(prisma)) {
      count.pictures += 1;
      const missing = missingRenditions(entry);
      if (missing.length === 0) {
        count.complete += 1;
        continue;
      }
      const { picture } = entry;
      const parts: string[] = [];
      const ready: number[] = [];
      const unreachable = missing.filter(({ from }) => from === null).map(({ width }) => width);
      count.unreachable += unreachable.length;
      for (const { width, from } of missing) {
        if (from === null) continue;
        count.files += 1;
        try {
          if (apply) {
            const { result, bytes } = await addRendition(store, picture, { width, from });
            count[result] += 1;
            count.bytes += bytes;
            parts.push(
              result === 'added'
                ? `+ ${width} from ${from}: ${kB(bytes)}`
                : `${width} already stored`,
            );
            ready.push(width);
          } else if (await store.exists(picture.key, `${width}.webp`)) {
            count.present += 1;
            parts.push(`${width} already stored (would only be recorded)`);
          } else if (await store.exists(picture.key, `${from}.webp`)) {
            parts.push(`+ ${width} from ${from}`);
          } else {
            parts.push(`${width}: ${from}.webp is not in the store`);
            problems.push(`${entry.label}: ${picture.key}/${from}.webp is not in the store`);
          }
        } catch (error) {
          parts.push(`${width}: failed`);
          problems.push(`${entry.label}: ${(error as Error).message}`);
        }
      }
      if (unreachable.length > 0) {
        parts.push(
          `not ${unreachable.join(', ')}: no stored file is wider (a new upload would make it)`,
        );
      }
      if (ready.length > 0) {
        const widths = [...picture.widths, ...ready].sort((a, b) => a - b);
        if (await recordWidths(prisma, entry, widths)) recorded.push(entry.label);
        else problems.push(`${entry.label}: changed while this ran; run again`);
      }
      console.log(
        `  ${entry.label} (${picture.width}×${picture.height}, ${picture.key}): ${parts.join('; ')}`,
      );
    }

    console.log(
      `\n${count.pictures} pictures: ${count.complete} have every width; ${count.files} rendition(s) to make${
        count.unreachable > 0
          ? `; ${count.unreachable} other width(s) only a new upload can give (no wider file stored)`
          : ''
      }.`,
    );
    if (apply) {
      console.log(
        `${count.added} file(s) added (${kB(count.bytes)}), ${count.present} already stored; ${
          recorded.length
        } picture(s) recorded.`,
      );
      if (recorded.length > 0) {
        await prisma.auditLog.create({
          data: {
            action: 'media.renditions',
            entityType: 'System',
            metadata: { added: count.added, present: count.present, recorded: recorded.length },
          },
        });
        console.log(await refreshStorefrontCache(process.env));
      }
    } else if (count.present > 0) {
      console.log(`${count.present} of them are stored already and would only be recorded.`);
    }
    if (problems.length > 0) {
      console.log(`\nProblems (${problems.length}):`);
      for (const line of problems) console.log(`  ${line}`);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
