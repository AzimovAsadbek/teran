import { afterEach, describe, expect, it, vi } from 'vitest';
import { indexNowKey } from '@/lib/seo/indexnow';

const indexing = vi.hoisted(() => ({
  searchIndexing: { indexable: true } as { indexable: boolean },
}));
vi.mock('@/lib/seo/indexing', () => indexing);

const { GET } = await import('./route');
const ask = (file: string) =>
  GET(new Request(`http://localhost/${file}`), { params: Promise.resolve({ file }) });

describe('the IndexNow key file', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    indexing.searchIndexing = { indexable: true };
  });

  it('answers the key at its own address on an indexable build', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'perf-only-secret');
    const key = indexNowKey('perf-only-secret')!;

    const response = await ask(`${key}.txt`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(key);
  });

  it('answers nothing for another name, without the secret, or on a build kept out of search', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'perf-only-secret');
    const key = indexNowKey('perf-only-secret')!;
    expect((await ask(`${'0'.repeat(32)}.txt`)).status).toBe(404);

    indexing.searchIndexing = { indexable: false };
    expect((await ask(`${key}.txt`)).status).toBe(404);

    indexing.searchIndexing = { indexable: true };
    vi.stubEnv('REVALIDATE_SECRET', '');
    expect((await ask(`${key}.txt`)).status).toBe(404);
  });
});
