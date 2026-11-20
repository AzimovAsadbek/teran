import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { visualsSettingSchema } from '@teran/contracts';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedImageStore, uploadsDirectory } from '../prisma/seed/catalogue.js';
import { refreshStorefrontCache } from '../prisma/seed/storefront.js';
import { addFilmWidths, missingFilmWidths, heroPreview } from '../src/media/film-renditions.js';
import { recordVisualWidths } from '../src/media/renditions.js';
import { videoFileName } from '../src/media/image-processing.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const apply = process.argv.includes('--apply');
try {
  const row = await prisma.siteSetting.findUnique({ where: { key: 'visuals' } });
  const visuals = visualsSettingSchema.parse(row?.value ?? {});
  const store = seedImageStore(uploadsDirectory());
  let updated = 0;
  for (const [slot, media] of Object.entries(visuals)) {
    if (slot === 'home.hero.1') {
      for (const part of ['image', 'mobile'] as const) {
        const picture = media[part];
        if (!picture || picture.preview) continue;
        console.log(slot, part, 'inline poster');
        if (!apply) continue;
        const preview = await heroPreview(store, picture);
        const rows = await prisma.$executeRaw`
          UPDATE "SiteSetting" SET value = jsonb_set(value, ARRAY[${slot}, ${part}, 'preview']::text[], to_jsonb(${preview}::text))
          WHERE key = 'visuals' AND value #>> ARRAY[${slot}, ${part}, 'key']::text[] = ${picture.key}
            AND value #>> ARRAY[${slot}, ${part}, 'preview']::text[] IS NULL`;
        updated += rows;
      }
    }
    for (const part of ['video', 'mobileVideo'] as const) {
      const film = media[part];
      if (!film) continue;
      const widths = missingFilmWidths(film.width, film.widths);
      if (!widths.length) continue;
      console.log(slot, part, widths.join(', '));
      if (!apply) continue;
      await addFilmWidths(store, film.key, widths, async () => {
        const data = await store.read(film.key, videoFileName(film.type));
        if (!data) throw new Error('Missing page film for ' + slot);
        return data;
      });
      const saved = await recordVisualWidths(
        prisma,
        slot,
        part,
        film.key,
        film.widths,
        [...film.widths, ...widths].sort((a, b) => a - b),
      );
      if (!saved) throw new Error('Film changed during processing. Re-run for ' + slot);
      updated++;
    }
  }
  if (updated) console.log(await refreshStorefrontCache(process.env));
} finally {
  await prisma.$disconnect();
}
