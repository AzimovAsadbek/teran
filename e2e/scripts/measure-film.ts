/** Run against a storefront with a published home.hero.1 film. Each profile gets a cold browser cache. */
import { chromium } from '@playwright/test';

const runs = Number(process.env.FILM_BENCH_RUNS ?? 1);
if (!Number.isSafeInteger(runs) || runs < 1)
  throw new Error('FILM_BENCH_RUNS must be a positive integer');
const browser = await chromium.launch();
const url = process.env.FILM_BENCH_URL ?? 'http://localhost:3100';
const profiles = [
  { type: '4g', label: 'local', kbps: 0, rtt: 0, saveData: false },
  { type: '3g', label: '3G', kbps: 750, rtt: 150, saveData: false },
  { type: '2g', label: '2G', kbps: 128, rtt: 350, saveData: false },
  { type: '4g', label: 'Save-Data', kbps: 750, rtt: 150, saveData: true },
];
try {
  for (let run = 1; run <= runs; run++) {
    for (const profile of profiles) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
      });
      try {
        const page = await context.newPage();
        const session = await context.newCDPSession(page);
        await session.send('Network.enable');
        await session.send('Network.setCacheDisabled', { cacheDisabled: true });
        if (profile.kbps)
          await session.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: profile.rtt,
            downloadThroughput: (profile.kbps * 1000) / 8,
            uploadThroughput: (profile.kbps * 1000) / 8,
          });
        const responses = new Map<string, { status: number; range?: string }>();
        page.on('response', (response) => {
          if (
            response.request().resourceType() === 'media' ||
            /\.(mp4|webm)(\?|$)/.test(response.url())
          )
            responses.set(response.url(), {
              status: response.status(),
              range: response.headers()['content-range'],
            });
        });
        await page.addInitScript((network) => {
          Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: Object.assign(new EventTarget(), {
              effectiveType: network.type,
              saveData: network.saveData,
            }),
          });
          const metrics = { posterMs: 0, startMs: 0, frameMs: 0, source: '' };
          Object.assign(window, { filmBenchmark: metrics });
          if (PerformanceObserver.supportedEntryTypes.includes('element')) {
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (
                  (entry as PerformanceEntry & { identifier?: string }).identifier ===
                  'teran-poster-preview'
                )
                  metrics.posterMs = entry.startTime;
              }
            }).observe({ type: 'element', buffered: true });
          }
          const watched = new WeakSet<Element>();
          function observe() {
            const img = document.querySelector<HTMLImageElement>('[data-hero-media] picture img');
            if (img && !watched.has(img)) {
              watched.add(img);
              void img
                .decode()
                .then(() =>
                  requestAnimationFrame(() => {
                    if (!metrics.posterMs) metrics.posterMs = performance.now();
                  }),
                )
                .catch(() => {});
            }
            const video = document.querySelector<HTMLVideoElement>('[data-hero-media] video');
            if (video && !watched.has(video)) {
              watched.add(video);
              video.addEventListener(
                'loadstart',
                () => {
                  metrics.startMs = performance.now();
                },
                { once: true },
              );
              video.requestVideoFrameCallback(() => {
                metrics.frameMs = performance.now();
                metrics.source = video.dataset.networkSrc || video.currentSrc;
                const download = performance.getEntriesByName(metrics.source).at(-1);
                if (download) metrics.startMs = download.startTime;
              });
            }
          }
          new MutationObserver(observe).observe(document, { childList: true, subtree: true });
        }, profile);
        await page.goto(url, { waitUntil: 'commit', timeout: 180_000 });
        const metrics = await page
          .waitForFunction(
            () => {
              const state = (
                window as Window & {
                  filmBenchmark?: {
                    posterMs: number;
                    startMs: number;
                    frameMs: number;
                    source: string;
                  };
                }
              ).filmBenchmark;
              return state?.posterMs && state.frameMs ? state : false;
            },
            undefined,
            { timeout: 240_000 },
          )
          .then((handle) => handle.jsonValue());
        if (!metrics) throw new Error('No poster or frame for ' + profile.label);
        console.log(
          JSON.stringify({
            run,
            profile: profile.label,
            kbps: profile.kbps,
            rtt: profile.rtt,
            posterMs: Math.round(metrics.posterMs),
            firstFrameMs: Math.round(metrics.frameMs),
            playbackStartupMs: Math.round(metrics.frameMs - metrics.startMs),
            file: new URL(metrics.source).pathname.split('/').at(-1),
            ...responses.get(metrics.source),
          }),
        );
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
