import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import type { AdminMediaItem, MediaItemDto, Paginated, UserRole } from '@teran/contracts';
import { MediaFilmsService } from '../src/admin/media-films.service.js';
import { planFilm } from '../src/media/video-plan.js';
import { findVideoTools, probeFilm } from '../src/media/video-tools.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import { TEST_PASSWORD, createUser, resetDatabase } from './helpers/fixtures.js';
import { testImage, uploadFilm, waitForFilm } from './helpers/publishing.js';
import { TEST_ENV } from './test-env.js';

/*
 * iPhone films posted through the admin API and made ready by ffmpeg (ADR-062). The films are
 * made by apps/api/scripts/make-iphone-films.swift as an iPhone writes them (QuickTime, HEVC in
 * HLG or H.264, upright ones stored on their side, AAC sound, the place in the header and in a
 * timed track); `safari-upright.mov` is what Safari hands a page for the first one.
 *
 * The suite needs ffmpeg and ffprobe (FFMPEG_PATH and FFPROBE_PATH, or on the PATH). CI installs
 * them; where they are missing it is skipped, saying so.
 */

const API = '/api/v1';
const UPLOADS = TEST_ENV.UPLOADS_DIR!;
const WORK = join(UPLOADS, '.processing');
const PLACE = '+41.0000+071.0000';

const film = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
/** The e2e tests' reel: an upright H.264 + AAC MP4 with fast start, as every browser plays it. */
const reel = () =>
  readFileSync(new URL('../../../e2e/tests/support/fixtures/reel.mp4', import.meta.url));

const tools = await findVideoTools(
  process.env.FFMPEG_PATH ?? 'ffmpeg',
  process.env.FFPROBE_PATH ?? 'ffprobe',
);
if (!tools) {
  if (process.env.CI) throw new Error('The film suite needs ffmpeg and ffprobe');
  console.warn('films.int-spec: no ffmpeg/ffprobe here, so the iPhone film tests are skipped');
}

/** Every file under a folder (none when it does not exist). */
function filesUnder(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/** The top-level boxes of an MP4, in order (fast start: the index before the pictures). */
function topLevelBoxes(file: Buffer): string[] {
  const types: string[] = [];
  for (let offset = 0; offset + 8 <= file.length;) {
    let size = file.readUInt32BE(offset);
    if (size === 1) size = Number(file.readBigUInt64BE(offset + 8));
    if (size === 0) size = file.length - offset;
    types.push(file.toString('latin1', offset + 4, offset + 8));
    if (size < 8) break;
    offset += size;
  }
  return types;
}

describe.skipIf(!tools)(
  'iPhone films made ready for the site (ADR-062)',
  () => {
    let ctx: TestApp;

    beforeAll(async () => {
      ctx = await createTestApp();
    });

    afterAll(async () => {
      await ctx.close();
    });

    beforeEach(async () => {
      await resetDatabase(ctx.prisma);
    });

    const server = () => ctx.app.getHttpServer();

    async function signedIn(role: UserRole = 'MANAGER') {
      const user = await createUser(ctx.prisma, role);
      const agent = request.agent(server());
      await agent
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      return agent;
    }

    async function item(agent: request.Agent, kind: 'VIDEO' | 'SHORT', title = 'Bugʻ') {
      return (
        await agent
          .post(`${API}/admin/media`)
          .send({
            kind,
            status: 'DRAFT',
            isFeatured: kind === 'SHORT',
            videoDurationSeconds: null,
            translations: { uz: { title }, ru: null, en: null },
          })
          .expect(201)
      ).body as AdminMediaItem;
    }

    /** The stored film: its bytes, and what ffprobe reads in it. */
    async function stored(kept: AdminMediaItem) {
      expect(kept.video?.src).toMatch(/^\/uploads\/media\/.+\/video\.mp4$/);
      const path = join(UPLOADS, kept.video!.src.replace(/^\/uploads\//, ''));
      const probe = await probeFilm(tools!, path, 'mov');
      expect(probe).not.toBeNull();
      return { path, bytes: readFileSync(path), probe: probe! };
    }

    async function made(id: string): Promise<unknown> {
      const entry = await ctx.prisma.auditLog.findFirstOrThrow({
        where: { action: 'media.video', entityId: id },
        orderBy: { createdAt: 'desc' },
      });
      return (entry.metadata as { made?: unknown }).made;
    }

    /** Waits until the work folder is empty: the worker is done with everything it was given. */
    async function settled() {
      const until = Date.now() + 30_000;
      while (existsSync(WORK) && readdirSync(WORK).length > 0) {
        if (Date.now() > until)
          throw new Error(`Still in the work folder: ${readdirSync(WORK).join(', ')}`);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    it('converts an iPhone camera film (HEVC, HDR, upright) to an upright H.264 MP4 with its sound and without the place', async () => {
      const admin = await signedIn();
      const short = await item(admin, 'SHORT');
      const handed = await uploadFilm(admin, short.id, film('iphone-hevc-upright.mov'));
      expect(handed.status).toBe(202);
      // On its way: waiting its turn, or already taken by the worker.
      expect(['waiting', 'working']).toContain((handed.body as AdminMediaItem).videoJob?.state);

      const kept = await waitForFilm(admin, short.id);
      expect(kept.videoJob).toBeNull();
      expect(kept.video).toMatchObject({ type: 'video/mp4', hasAudio: true });
      expect(kept.videoDurationSeconds).toBe(2);
      expect(await made(short.id)).toBe('convert');

      const { bytes, probe } = await stored(kept);
      const [picture, sound, ...others] = probe.streams ?? [];
      expect(others).toEqual([]);
      expect(picture).toMatchObject({
        codec_name: 'h264',
        pix_fmt: 'yuv420p',
        width: 360,
        height: 640,
        color_transfer: 'bt709',
      });
      // Turned upright in its pictures: nothing left for the player to rotate.
      expect(planFilm(probe, 'mp4')).toMatchObject({
        action: 'keep',
        facts: { width: 360, height: 640, hasAudio: true },
      });
      expect(picture?.side_data_list ?? []).not.toContainEqual(
        expect.objectContaining({ side_data_type: 'Display Matrix' }),
      );
      expect(sound).toMatchObject({ codec_type: 'audio', codec_name: 'aac' });
      expect(topLevelBoxes(bytes).indexOf('moov')).toBeLessThan(
        topLevelBoxes(bytes).indexOf('mdat'),
      );
      expect(bytes.includes(PLACE)).toBe(false);
      expect(bytes.includes('iPhone 15 Pro')).toBe(false);
      // The upload and the work files are gone.
      await settled();
    });

    it('copies what Safari hands over (H.264 in a QuickTime film) into an MP4 without re-encoding it', async () => {
      const admin = await signedIn();
      const short = await item(admin, 'SHORT');
      const source = film('safari-upright.mov');
      expect((await uploadFilm(admin, short.id, source)).status).toBe(202);

      const kept = await waitForFilm(admin, short.id);
      expect(kept.video).toMatchObject({ type: 'video/mp4', hasAudio: true });
      expect(await made(short.id)).toBe('remux');
      const { bytes, probe } = await stored(kept);
      expect(probe.streams?.map((stream) => stream.codec_type)).toEqual(['video', 'audio']);
      expect(planFilm(probe, 'mp4')).toMatchObject({
        action: 'keep',
        facts: { width: 360, height: 640 },
      });
      // The same pictures, only moved: about the size of the QuickTime film, its index first.
      expect(Math.abs(bytes.length - source.length)).toBeLessThan(source.length * 0.1);
      expect(topLevelBoxes(bytes).slice(0, 2)).toEqual(['ftyp', 'moov']);
      expect(bytes.includes(PLACE)).toBe(false);
    });

    it('keeps the display rotation of an upright H.264 camera film it copies', async () => {
      const admin = await signedIn();
      const short = await item(admin, 'SHORT');
      expect((await uploadFilm(admin, short.id, film('iphone-h264-upright.mov'))).status).toBe(202);

      const kept = await waitForFilm(admin, short.id);
      expect(await made(short.id)).toBe('remux');
      const { probe } = await stored(kept);
      // Stored on its side, shown upright: a browser turns it by its matrix.
      expect(probe.streams?.[0]).toMatchObject({ width: 640, height: 360 });
      expect(planFilm(probe, 'mp4')).toMatchObject({
        action: 'keep',
        facts: { width: 360, height: 640 },
      });
    });

    it('keeps an MP4 that every browser plays exactly as it was uploaded', async () => {
      const admin = await signedIn();
      const short = await item(admin, 'SHORT');
      const source = reel();
      expect((await uploadFilm(admin, short.id, source)).status).toBe(202);

      const kept = await waitForFilm(admin, short.id);
      expect(await made(short.id)).toBe('keep');
      const { bytes } = await stored(kept);
      const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
      expect(hash(bytes)).toBe(hash(source));
      expect(kept.video).toMatchObject({ bytes: source.length, hasAudio: true });
    });

    it('may be published while it is made ready, takes its cover from the film, then shows on the site', async () => {
      const admin = await signedIn();
      const video = await item(admin, 'VIDEO', 'Choy bogʻi');
      const handed = await uploadFilm(admin, video.id, film('iphone-hevc-landscape.mov'), {
        poster: true,
      });
      expect(handed.status).toBe(202);
      // A film on its way counts as uploaded, and so does the cover it will give (ADR-062).
      const publish = await admin.put(`${API}/admin/media/${video.id}`).send({
        kind: 'VIDEO',
        status: 'PUBLISHED',
        isFeatured: false,
        videoDurationSeconds: null,
        translations: { uz: { title: 'Choy bogʻi' }, ru: null, en: null },
      });
      // Unless it is ready already, when the item has both anyway.
      expect(publish.status).toBe(200);

      const kept = await waitForFilm(admin, video.id);
      expect(kept.status).toBe('PUBLISHED');
      expect(kept.image).toMatchObject({ width: 640, height: 360 });
      expect(kept.image?.widths).toEqual([320, 480, 640]);
      const visible = (
        await request(server()).get(`${API}/content/media?locale=uz&kind=VIDEO`).expect(200)
      ).body as Paginated<MediaItemDto>;
      expect(visible.items.map((entry) => entry.id)).toEqual([video.id]);
      expect(visible.items[0]?.video).toMatchObject({
        type: 'video/mp4',
        durationSeconds: 2,
        hasAudio: true,
      });
    });

    it('refuses what is not a film, and a film published on its way goes back to a draft', async () => {
      const admin = await signedIn();
      const video = await item(admin, 'VIDEO');
      await admin
        .post(`${API}/admin/media/${video.id}/image`)
        .attach('file', await testImage(400, 9), {
          filename: 'poster.png',
          contentType: 'image/png',
        })
        .expect(201);
      // As the composer leaves it: published while its film waits (made here, so nothing races).
      await ctx.prisma.mediaItem.update({ where: { id: video.id }, data: { status: 'PUBLISHED' } });
      const films = ctx.app.get(MediaFilmsService);
      const uploadId = 'not-a-film-000000000001';
      mkdirSync(WORK, { recursive: true });
      writeFileSync(films.sourcePath(uploadId), Buffer.from('<html>not a film</html>'.padEnd(512)));
      await ctx.prisma.mediaVideoJob.create({
        data: { mediaItemId: video.id, uploadId, bytes: 512 },
      });
      films.kick();

      const refused = await waitForFilm(admin, video.id);
      expect(refused.videoJob).toEqual({
        state: 'failed',
        percent: null,
        reason: 'unsupported_video',
      });
      expect(refused.status).toBe('DRAFT');
      expect(refused.readiness.ready).toBe(false);
      expect(existsSync(films.sourcePath(uploadId))).toBe(false);
      const audit = await ctx.prisma.auditLog.findFirstOrThrow({
        where: { action: 'media.video.refused', entityId: video.id },
      });
      expect(audit.metadata).toEqual({ reason: 'unsupported_video' });
    });

    it('lets a newer upload replace a film on its way, and a deleted item take its film along', async () => {
      const admin = await signedIn();
      const short = await item(admin, 'SHORT');
      expect((await uploadFilm(admin, short.id, film('iphone-hevc-upright.mov'))).status).toBe(202);
      expect((await uploadFilm(admin, short.id, film('safari-upright.mov'))).status).toBe(202);
      const kept = await waitForFilm(admin, short.id);
      expect(await made(short.id)).toBe('remux');
      await settled();
      // Only the newer film is kept: no other file is left under the item.
      expect(filesUnder(join(UPLOADS, 'media', short.id))).toEqual([
        join(UPLOADS, kept.video!.src.replace(/^\/uploads\//, '')),
      ]);

      const doomed = await item(admin, 'SHORT', 'Oʻchiriladi');
      expect((await uploadFilm(admin, doomed.id, film('iphone-hevc-upright.mov'))).status).toBe(
        202,
      );
      await admin.delete(`${API}/admin/media/${doomed.id}`).expect(204);
      await settled();
      expect(filesUnder(join(UPLOADS, 'media', doomed.id))).toEqual([]);
      expect(await ctx.prisma.mediaVideoJob.count()).toBe(0);
    });

    it('goes on after a restart with a film it was making ready', async () => {
      const admin = await signedIn();
      const short = await item(admin, 'SHORT');
      const films = ctx.app.get(MediaFilmsService);
      const uploadId = 'left-by-a-restart-00001';
      mkdirSync(WORK, { recursive: true });
      writeFileSync(films.sourcePath(uploadId), film('iphone-h264-upright.mov'));
      // The process that took it stopped long ago, mid-way.
      await ctx.prisma.mediaVideoJob.create({
        data: { mediaItemId: short.id, uploadId, bytes: 1, state: 'WORKING', percent: 40 },
      });
      await ctx.prisma
        .$executeRaw`UPDATE "MediaVideoJob" SET "updatedAt" = now() - interval '10 minutes'`;
      films.kick();

      const kept = await waitForFilm(admin, short.id);
      expect(kept.video).toMatchObject({ type: 'video/mp4', hasAudio: true });
      expect(await made(short.id)).toBe('remux');
      await settled();
    });
  },
  // Each film goes through ffprobe and ffmpeg (on a busy machine, a few seconds each).
  90_000,
);
