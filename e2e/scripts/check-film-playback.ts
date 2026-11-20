/** Exercise a published home hero over HTTPS. Its mobile film needs at least two renditions. */
import assert from 'node:assert/strict';
import { firefox, webkit } from '@playwright/test';

const url = process.env.FILM_BENCH_URL;
if (!url) throw new Error('Set FILM_BENCH_URL to a storefront with a published home hero');
const ignoreHTTPSErrors = process.env.E2E_IGNORE_HTTPS_ERRORS === 'true';

for (const [engine, type] of Object.entries({ webkit, firefox })) {
  const browser = await type.launch();
  try {
    let original = '';
    for (const scenario of ['unreported', 'stalled', 'Save-Data'] as const) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        ignoreHTTPSErrors,
      });
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      try {
        const page = await context.newPage();
        await page.addInitScript((saveData) => {
          Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: saveData
              ? Object.assign(new EventTarget(), { saveData, effectiveType: '4g' })
              : undefined,
          });
        }, scenario === 'Save-Data');
        if (scenario === 'stalled') {
          await page.route(
            (candidate) => candidate.href === original,
            async (route) => {
              await gate;
              await route.continue().catch(() => {});
            },
          );
        }
        await page.goto(url, { waitUntil: 'commit' });
        await page.waitForFunction(
          () => {
            const poster = document.querySelector<HTMLImageElement>(
              '[data-hero-media] picture img',
            );
            return poster?.complete && poster.naturalWidth > 0;
          },
          undefined,
          { timeout: 30_000 },
        );
        const firstFrame = () => {
          const video = document.querySelector<HTMLVideoElement>('teran-hero-film video');
          return video && !video.paused && video.currentTime > 0.2 && video.style.opacity === '1';
        };
        try {
          await page.waitForFunction(firstFrame, undefined, { timeout: 10_000 });
        } catch {
          await page.keyboard.press('Shift');
          await page.waitForFunction(firstFrame, undefined, { timeout: 20_000 });
        }
        const result = await page.locator('teran-hero-film').evaluate((hero) => {
          type Clip = { src: string; sources: { src: string }[] };
          const clips = JSON.parse((hero as HTMLElement).dataset.clips!) as {
            wide: Clip;
            mobile?: Clip;
          };
          const selected = clips.mobile || clips.wide;
          return {
            playing: hero.querySelector('video')!.dataset.networkSrc!,
            smallest: new URL(selected.sources[0]?.src ?? selected.src, document.baseURI).href,
          };
        });
        if (scenario === 'unreported') {
          original = result.playing;
          assert.notEqual(
            original,
            result.smallest,
            'Publish distinct normal and small hero renditions',
          );
        } else {
          assert.equal(result.playing, result.smallest);
        }
        console.log(JSON.stringify({ engine, scenario, file: new URL(result.playing).pathname }));
      } finally {
        release();
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
