import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { createTestApp, type TestApp } from './helpers/app.js';
import { TEST_ENV } from './test-env.js';

// The API as deployed with its files in Cloudflare R2 (never contacted here: nothing is uploaded).
vi.hoisted(() => {
  Object.assign(process.env, {
    R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    R2_ACCESS_KEY_ID: 'r2-test-access-key-0123456789',
    R2_SECRET_ACCESS_KEY: 'r2-test-secret-key-0123456789-abcdefghijkl',
    R2_BUCKET: 'teran-media',
    R2_PUBLIC_URL: 'https://media.teran.test/',
  });
});

describe('/uploads with the files in R2', () => {
  let ctx: TestApp;
  const server = () => ctx.app.getHttpServer();
  const key = 'media/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/AbCdEfGhIjKl';

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('sends an address the volume does not hold to the same key in the bucket', async () => {
    const moved = await request(server()).get(`/uploads/${key}/640.webp`).expect(301);
    expect(moved.headers.location).toBe(`https://media.teran.test/${key}/640.webp`);
    await request(server()).head(`/uploads/${key}/video.mp4`).expect(301);
  });

  it('still serves what the volume holds, and refuses anything that is not a stored file', async () => {
    const local = join(TEST_ENV.UPLOADS_DIR!, 'legacy', 'kept');
    mkdirSync(local, { recursive: true });
    writeFileSync(join(local, 'note.txt'), 'kept on the volume');
    const kept = await request(server()).get('/uploads/legacy/kept/note.txt').expect(200);
    expect(kept.text).toBe('kept on the volume');

    // Only a stored file's address is sent on: not a bare name, not an encoded `..`, not a POST.
    await request(server()).get(`/uploads/${key}/no-extension`).expect(404);
    const traversal = await request(server()).get('/uploads/media/%2E%2E/secret.txt');
    expect(traversal.status).not.toBe(301);
    await request(server()).post(`/uploads/${key}/640.webp`).expect(404);
  });
});
