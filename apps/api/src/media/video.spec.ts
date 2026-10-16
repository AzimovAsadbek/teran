import {
  CaptionsRejectedError,
  inspectStoredVideo,
  mediaPrefix,
  storeCaptions,
  storeVideo,
  videoDurationSeconds,
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
    read: () => Promise.resolve(null),
    size: () => Promise.resolve(null),
    readRange: () => Promise.resolve(null),
    remove: () => Promise.resolve(),
  };
  return { store, files };
}

/** A store holding one file that was uploaded straight to it; counts the bytes read back. */
function uploadedFile(data: Buffer | null) {
  let bytesRead = 0;
  const store: ImageStore = {
    ...memoryStore().store,
    size: () => Promise.resolve(data ? data.length : null),
    readRange: (_key, _name, start, end) => {
      if (!data) return Promise.resolve(null);
      const part = data.subarray(start, end + 1);
      bytesRead += part.length;
      return Promise.resolve(part);
    },
  };
  return { store, bytesRead: () => bytesRead };
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

describe('a video uploaded straight to the store', () => {
  const mvhd = (seconds: number) => {
    const content = Buffer.alloc(100);
    content.writeUInt32BE(1000, 12); // timescale
    content.writeUInt32BE(seconds * 1000, 16); // duration
    return box('mvhd', content);
  };
  const ftyp = () => box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1'));

  it('finds an MP4’s running time after the media data without reading the media data', async () => {
    const media = Buffer.alloc(3 * 1024 * 1024); // 3 MB of "frames"
    const file = Buffer.concat([ftyp(), box('mdat', media), box('moov', mvhd(95))]);
    const { store, bytesRead } = uploadedFile(file);
    await expect(inspectStoredVideo(store, 'media/x', 'video.mp4')).resolves.toEqual({
      type: 'video/mp4',
      bytes: file.length,
      durationSeconds: 95,
    });
    expect(bytesRead()).toBeLessThan(128 * 1024);
  });

  it('reads a WebM’s type from its first bytes and refuses other files', async () => {
    const webm = uploadedFile(ebml('webm'));
    await expect(inspectStoredVideo(webm.store, 'media/x', 'video.webm')).resolves.toMatchObject({
      type: 'video/webm',
    });
    const page = uploadedFile(Buffer.from('<html><body>not a film</body></html>'));
    await expect(inspectStoredVideo(page.store, 'media/x', 'video.mp4')).rejects.toBeInstanceOf(
      VideoRejectedError,
    );
    await expect(
      inspectStoredVideo(uploadedFile(null).store, 'media/x', 'video.mp4'),
    ).resolves.toBeNull();
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
