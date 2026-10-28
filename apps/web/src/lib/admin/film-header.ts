/*
 * A film's shape and length read from its own header (ADR-062), for a film this browser cannot
 * play (an iPhone's HEVC in Chrome without hardware decoding, or in Firefox): the composer still
 * checks it is upright or landscape before it is sent, and the API converts it. MP4 and QuickTime
 * keep these in the movie box (`moov`), which may follow gigabytes of pictures, so the file is
 * stepped through a box header at a time and only that box is read.
 */

export interface FilmHeader {
  /** As shown: the stored picture turned by its track's display matrix. */
  width: number;
  height: number;
  /** Seconds; 0 when the file does not say. */
  duration: number;
  /** The picture's codec as the file names it (hvc1, hev1, avc1, …). */
  codec: string;
}

/** A movie box is kilobytes to a few megabytes; a larger one is not read. */
const MAX_MOOV_BYTES = 64 * 1024 * 1024;

interface Box {
  type: string;
  /** The box's content: after its header, up to its end. */
  start: number;
  end: number;
}

function fourcc(view: DataView, at: number): string {
  return String.fromCharCode(
    view.getUint8(at),
    view.getUint8(at + 1),
    view.getUint8(at + 2),
    view.getUint8(at + 3),
  );
}

/** The boxes between two offsets, each with its type and its content's start and end. */
function* boxes(view: DataView, from: number, to: number): Generator<Box> {
  let offset = from;
  while (offset + 8 <= to) {
    let size = view.getUint32(offset);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > to) return;
      size = Number(view.getBigUint64(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = to - offset;
    }
    if (size < header) return;
    yield {
      type: fourcc(view, offset + 4),
      start: offset + header,
      end: Math.min(offset + size, to),
    };
    offset += size;
  }
}

function child(view: DataView, parent: Box, type: string): Box | null {
  for (const box of boxes(view, parent.start, parent.end)) if (box.type === type) return box;
  return null;
}

/** The movie box, found by stepping over the file's top-level boxes; null when there is none. */
async function movieBox(file: Blob): Promise<DataView | null> {
  let offset = 0;
  while (offset + 8 <= file.size) {
    const head = new DataView(await file.slice(offset, offset + 16).arrayBuffer());
    if (head.byteLength < 8) return null;
    let size = head.getUint32(0);
    let header = 8;
    if (size === 1) {
      if (head.byteLength < 16) return null;
      size = Number(head.getBigUint64(8));
      header = 16;
    } else if (size === 0) {
      size = file.size - offset;
    }
    if (size < header) return null;
    if (fourcc(head, 4) === 'moov') {
      if (size > MAX_MOOV_BYTES) return null;
      return new DataView(await file.slice(offset, offset + size).arrayBuffer());
    }
    offset += size;
  }
  return null;
}

/** The size, rotation and codec of the first picture track; null without one. */
function pictureTrack(view: DataView, moov: Box) {
  for (const trak of boxes(view, moov.start, moov.end)) {
    if (trak.type !== 'trak') continue;
    const mdia = child(view, trak, 'mdia');
    const hdlr = mdia && child(view, mdia, 'hdlr');
    if (!hdlr || hdlr.end - hdlr.start < 12 || fourcc(view, hdlr.start + 8) !== 'vide') continue;
    const tkhd = child(view, trak, 'tkhd');
    if (!tkhd) continue;
    // A full box; the matrix follows the times and ids, then the width and height (16.16).
    const matrix = tkhd.start + (view.getUint8(tkhd.start) === 1 ? 52 : 40);
    if (matrix + 44 > tkhd.end) continue;
    const width = view.getUint32(matrix + 36) / 65536;
    const height = view.getUint32(matrix + 40) / 65536;
    // A quarter turn has no scale on the diagonal (a = d = 0).
    const turned = view.getInt32(matrix) === 0 && view.getInt32(matrix + 16) === 0;
    const minf = child(view, mdia, 'minf');
    const stbl = minf && child(view, minf, 'stbl');
    const stsd = stbl && child(view, stbl, 'stsd');
    const codec = stsd && stsd.start + 16 <= stsd.end ? fourcc(view, stsd.start + 12) : '';
    return { width, height, turned, codec };
  }
  return null;
}

/** The film's shape, length and codec from its header; null when it is not an MP4 or QuickTime. */
export async function readFilmHeader(file: Blob): Promise<FilmHeader | null> {
  let view: DataView | null;
  try {
    view = await movieBox(file);
  } catch {
    return null;
  }
  if (!view) return null;
  const [moov] = [...boxes(view, 0, view.byteLength)];
  if (!moov) return null;
  const track = pictureTrack(view, moov);
  if (!track || track.width <= 0 || track.height <= 0) return null;
  let duration = 0;
  const mvhd = child(view, moov, 'mvhd');
  if (mvhd) {
    const long = view.getUint8(mvhd.start) === 1;
    const at = mvhd.start + (long ? 20 : 12);
    if (at + (long ? 12 : 8) <= mvhd.end) {
      const timescale = view.getUint32(at);
      const length = long ? Number(view.getBigUint64(at + 4)) : view.getUint32(at + 4);
      if (timescale > 0) duration = length / timescale;
    }
  }
  return {
    width: Math.round(track.turned ? track.height : track.width),
    height: Math.round(track.turned ? track.width : track.height),
    duration,
    codec: track.codec,
  };
}
