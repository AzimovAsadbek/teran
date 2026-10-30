import {
  CaptionsRejectedError,
  mediaPrefix,
  storeCaptions,
  storeVideo,
  videoDurationSeconds,
  videoHasAudio,
  VideoRejectedError,
  type ImageStore,
} from './image-processing.js';

/** Keeps what would be written, instead of writing it. */
function memoryStore() {
  const files: { key: string; name: string; type: string; bytes: number }[] = [];
  const store: ImageStore = {
    save: () => Promise.resolve(),
    saveFile: (key, name, data, type) => {
      files.push({ key, name, type, bytes: data.length });
      return Promise.resolve();
    },
    saveFileFrom: () => Promise.resolve(),
    read: () => Promise.resolve(null),
    exists: () => Promise.resolve(false),
    saveNew: () => Promise.resolve(true),
    remove: () => Promise.resolve(),
  };
  return { store, files };
}

const header = (...parts: (string | number[])[]) =>
  Buffer.concat([
    ...parts.map((part) =>
      typeof part === 'string' ? Buffer.from(part, 'latin1') : Buffer.from(part),
    ),
    Buffer.alloc(48),
  ]);

/** An ISO base media file's first box ("ftyp") with the given brand. */
const isoMedia = (brand: string) => header([0, 0, 0, 0x18], 'ftyp', brand, [0, 0, 2, 0], 'isom');
/** An EBML header (Matroska family) declaring the given document type. */
const ebml = (docType: string) =>
  header([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0x82, 0x84], docType);

describe('storeVideo', () => {
  it('keeps MP4 and WebM files as they are, under the item, recognised by their first bytes', async () => {
    const { store, files } = memoryStore();
    const mp4 = await storeVideo(isoMedia('isom'), store, mediaPrefix('item-1'));
    const webm = await storeVideo(ebml('webm'), store, mediaPrefix('item-1'));
    expect([mp4.type, webm.type]).toEqual(['video/mp4', 'video/webm']);
    expect(mp4.storageKey).toMatch(/^media\/item-1\/[\w-]+$/);
    expect(mp4.storageKey).not.toBe(webm.storageKey);
    expect(files.map((file) => [file.name, file.type])).toEqual([
      ['video.mp4', 'video/mp4'],
      ['video.webm', 'video/webm'],
    ]);
  });

  it('refuses anything else, whatever it is called', async () => {
    const { store, files } = memoryStore();
    for (const input of [
      isoMedia('qt  '), // QuickTime: browsers do not all play it
      ebml('matroska'), // Matroska but not WebM
      Buffer.from('<html><body>not a film</body></html>'),
      Buffer.from([0, 0, 0, 0x18, 0x66, 0x74]), // too short to tell
    ]) {
      await expect(storeVideo(input, store, mediaPrefix('item-2'))).rejects.toBeInstanceOf(
        VideoRejectedError,
      );
    }
    expect(files).toEqual([]);
  });
});

/** A box: 32-bit size, four-character type, content. */
function box(type: string, ...content: Buffer[]): Buffer {
  const body = Buffer.concat(content);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(body.length + 8, 0);
  header.write(type, 4, 'latin1');
  return Buffer.concat([header, body]);
}

describe('video running time', () => {
  it('reads the movie header of an MP4 (version 0), wherever the moov box is', () => {
    const mvhd = Buffer.alloc(100);
    mvhd.writeUInt8(0, 0); // version
    mvhd.writeUInt32BE(1000, 12); // timescale
    mvhd.writeUInt32BE(95_400, 16); // duration: 95.4 s
    const ftyp = box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1'));
    const file = Buffer.concat([
      ftyp,
      box('mdat', Buffer.alloc(64)),
      box('moov', box('mvhd', mvhd)),
    ]);
    expect(videoDurationSeconds(file, 'video/mp4')).toBe(95);
  });

  it('reads the Segment Info duration of a WebM', () => {
    const ebml = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x82, 0x81, 0x77]);
    const duration = Buffer.alloc(8);
    duration.writeDoubleBE(12_500, 0); // 12 500 ticks of 1 ms
    const info = Buffer.concat([
      Buffer.from([0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40]), // TimecodeScale 1 000 000
      Buffer.from([0x44, 0x89, 0x88]),
      duration,
    ]);
    const infoElement = Buffer.concat([
      Buffer.from([0x15, 0x49, 0xa9, 0x66, 0x80 | info.length]),
      info,
    ]);
    const segment = Buffer.concat([
      Buffer.from([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
      infoElement,
    ]);
    expect(videoDurationSeconds(Buffer.concat([ebml, segment]), 'video/webm')).toBe(13);
  });

  it('answers null when the file does not record it', () => {
    expect(videoDurationSeconds(box('ftyp', Buffer.alloc(16)), 'video/mp4')).toBeNull();
  });
});

describe('video sound', () => {
  /** A track whose media handler is of a type ("vide", "soun"). */
  const trak = (handler: string) =>
    box(
      'trak',
      box('mdia', box('hdlr', Buffer.alloc(8), Buffer.from(handler, 'latin1'), Buffer.alloc(13))),
    );
  const ftyp = box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1'));

  it('finds an MP4 sound track, in whichever track it comes', () => {
    const film = Buffer.concat([ftyp, box('moov', box('mvhd', Buffer.alloc(100)), trak('vide'))]);
    const withSound = Buffer.concat([
      ftyp,
      box('moov', box('mvhd', Buffer.alloc(100)), trak('vide'), trak('soun')),
      box('mdat', Buffer.alloc(64)),
    ]);
    expect(videoHasAudio(film, 'video/mp4')).toBe(false);
    expect(videoHasAudio(withSound, 'video/mp4')).toBe(true);
    expect(videoHasAudio(ftyp, 'video/mp4')).toBe(false);
  });

  it('finds a WebM audio track (TrackType 2)', () => {
    const ebmlHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x82, 0x81, 0x77]);
    const entry = (type: number) => Buffer.from([0xae, 0x83, 0x83, 0x81, type]);
    const webm = (...entries: Buffer[]) => {
      const tracks = Buffer.concat(entries);
      return Buffer.concat([
        ebmlHeader,
        Buffer.from([0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
        Buffer.from([0x16, 0x54, 0xae, 0x6b, 0x80 | tracks.length]),
        tracks,
      ]);
    };
    expect(videoHasAudio(webm(entry(1)), 'video/webm')).toBe(false);
    expect(videoHasAudio(webm(entry(1), entry(2)), 'video/webm')).toBe(true);
  });

  it('is recorded when a film is stored', async () => {
    const { store } = memoryStore();
    const silent = await storeVideo(isoMedia('isom'), store, mediaPrefix('item-3'));
    expect(silent.hasAudio).toBe(false);
  });
});

describe('subtitles', () => {
  it('keeps a WebVTT file and refuses anything else', async () => {
    const { store, files } = memoryStore();
    const vtt = Buffer.from('WEBVTT\n\n00:00.000 --> 00:02.000\nSalom\n', 'utf8');
    const stored = await storeCaptions(
      vtt,
      store,
      mediaPrefix('0192f7a0-0000-7000-8000-0000000000aa'),
    );
    expect(files[0]).toMatchObject({ name: 'captions.vtt', type: 'text/vtt; charset=utf-8' });
    expect(stored.storageKey).toMatch(/^media\/0192f7a0-0000-7000-8000-0000000000aa\//);
    await expect(
      storeCaptions(Buffer.from('1\n00:00:00,000 --> 00:00:02,000\nSRT'), store, 'media/x'),
    ).rejects.toBeInstanceOf(CaptionsRejectedError);
    await expect(
      storeCaptions(Buffer.from([0xff, 0xfe, 0x00]), store, 'media/x'),
    ).rejects.toBeInstanceOf(CaptionsRejectedError);
  });
});
