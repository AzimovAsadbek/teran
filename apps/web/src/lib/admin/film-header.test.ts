// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readFilmHeader } from './film-header';

/** The iPhone films the API's tests post (apps/api/scripts/make-iphone-films.swift). */
function film(name: string): Blob {
  const bytes = readFileSync(new URL(`../../../../api/test/fixtures/${name}`, import.meta.url));
  return new Blob([bytes]);
}

describe('readFilmHeader (ADR-062)', () => {
  it('reads an upright iPhone film as upright, though its pictures are stored on their side', async () => {
    expect(await readFilmHeader(film('iphone-hevc-upright.mov'))).toEqual({
      width: 360,
      height: 640,
      duration: 2,
      codec: 'hvc1',
    });
    expect(await readFilmHeader(film('iphone-h264-upright.mov'))).toMatchObject({
      width: 360,
      height: 640,
      codec: 'avc1',
    });
  });

  it('reads a landscape film, and one Safari has already turned upright', async () => {
    expect(await readFilmHeader(film('iphone-hevc-landscape.mov'))).toMatchObject({
      width: 640,
      height: 360,
      codec: 'hvc1',
    });
    // Safari puts the sound first: the picture track is found wherever it is.
    expect(await readFilmHeader(film('safari-upright.mov'))).toMatchObject({
      width: 360,
      height: 640,
      codec: 'avc1',
    });
  });

  it('says nothing of a file that is not an MP4 or QuickTime film', async () => {
    expect(await readFilmHeader(new Blob(['<html><body>not a film</body></html>']))).toBeNull();
    expect(await readFilmHeader(new Blob([]))).toBeNull();
    // A movie box without a picture track (sound only).
    const header = (size: number, type: string) => {
      const view = new DataView(new ArrayBuffer(8));
      view.setUint32(0, size);
      for (let index = 0; index < 4; index += 1) view.setUint8(4 + index, type.charCodeAt(index));
      return new Uint8Array(view.buffer);
    };
    expect(await readFilmHeader(new Blob([header(16, 'moov'), header(8, 'trak')]))).toBeNull();
  });
});
