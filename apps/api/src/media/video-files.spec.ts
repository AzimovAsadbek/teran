import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectVideoFile } from './video-files.js';

/** A box: 32-bit size, four-character type, content. */
function box(type: string, ...content: Buffer[]): Buffer {
  const body = Buffer.concat(content);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(body.length + 8, 0);
  header.write(type, 4, 'latin1');
  return Buffer.concat([header, body]);
}

/** The same box with a 64-bit size (as for pictures over 4 GB). */
function largeBox(type: string, content: Buffer): Buffer {
  const header = Buffer.alloc(16);
  header.writeUInt32BE(1, 0);
  header.write(type, 4, 'latin1');
  header.writeBigUInt64BE(BigInt(content.length + 16), 8);
  return Buffer.concat([header, content]);
}

const ftyp = box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1'));
const moov = (seconds: number, sound: boolean) => {
  const mvhd = Buffer.alloc(100);
  mvhd.writeUInt32BE(1000, 12);
  mvhd.writeUInt32BE(seconds * 1000, 16);
  const trak = (handler: string) =>
    box('trak', box('mdia', box('hdlr', Buffer.alloc(8), Buffer.from(handler, 'latin1'))));
  return box('moov', box('mvhd', mvhd), trak('vide'), ...(sound ? [trak('soun')] : []));
};

describe('inspectVideoFile (films read from disk, ADR-061)', () => {
  let directory: string;
  const write = (name: string, data: Buffer) => {
    const path = join(directory, name);
    writeFileSync(path, data);
    return path;
  };

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'film-'));
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('finds an MP4 index after its pictures, without reading the pictures', async () => {
    const path = write(
      'late.mp4',
      Buffer.concat([ftyp, box('mdat', Buffer.alloc(3 * 1024 * 1024)), moov(95, true)]),
    );
    expect(await inspectVideoFile(path)).toEqual({
      type: 'video/mp4',
      bytes: 3 * 1024 * 1024 + 8 + ftyp.length + moov(95, true).length,
      hasAudio: true,
      durationSeconds: 95,
    });
  });

  it('steps over boxes with 64-bit sizes, and an index at the start', async () => {
    const path = write(
      'large-box.mp4',
      Buffer.concat([ftyp, largeBox('free', Buffer.alloc(100)), moov(30, false), box('mdat')]),
    );
    expect(await inspectVideoFile(path)).toMatchObject({
      hasAudio: false,
      durationSeconds: 30,
    });
  });

  it('keeps a film without an index, saying nothing of its length or sound', async () => {
    const path = write('no-index.mp4', Buffer.concat([ftyp, box('mdat', Buffer.alloc(64))]));
    expect(await inspectVideoFile(path)).toMatchObject({
      type: 'video/mp4',
      hasAudio: false,
      durationSeconds: null,
    });
  });

  it('refuses what is not an MP4 or WebM', async () => {
    const quicktime = box('ftyp', Buffer.from('qt  \0\0\x02\0qt  ', 'latin1'));
    expect(
      await inspectVideoFile(write('clip.mov', Buffer.concat([quicktime, moov(5, true)]))),
    ).toBeNull();
    expect(await inspectVideoFile(write('page.html', Buffer.from('<html>'.padEnd(80))))).toBeNull();
    expect(await inspectVideoFile(write('empty.mp4', Buffer.alloc(0)))).toBeNull();
  });
});
