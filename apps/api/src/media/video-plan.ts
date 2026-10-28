import type { VideoType } from './image-processing.js';

/*
 * What becomes of an uploaded film (ADR-062), decided from what ffprobe reads in it. A film every
 * browser plays (H.264 in an MP4, VP8, VP9 or AV1 in a WebM) is kept as it is. An H.264 film in
 * another container (an iPhone's QuickTime .MOV, as Safari hands it over) is copied into an MP4
 * without touching its pictures. Anything else (HEVC, 10-bit H.264, ProRes) is converted to H.264
 * with AAC sound, its HDR brought to ordinary colours. The result is a fast-start MP4 with one
 * picture and one sound track and none of the camera's metadata (where it was recorded, the phone).
 */

/** What ffprobe answers (`-show_format -show_streams`), the parts read here. */
export interface ProbeStream {
  index: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  color_transfer?: string;
  duration?: string;
  disposition?: Record<string, number>;
  tags?: Record<string, string>;
  side_data_list?: { side_data_type?: string; rotation?: number | string }[];
}

export interface Probe {
  streams?: ProbeStream[];
  format?: { duration?: string };
}

/** The container, recognised by the file's first bytes (MP4 here means ISO, not QuickTime). */
export type Container = 'mp4' | 'webm' | 'other';

/** ffmpeg's reader for a film: QuickTime and MP4, or Matroska and WebM. */
export type Demuxer = 'mov' | 'matroska';

/**
 * The reader a film is opened with, from its first bytes; null for anything else, which is
 * refused unread. ffmpeg is never left to guess: formats that name further files or addresses
 * (an HLS or concat playlist) would have it read them.
 */
export function demuxerFor(head: Buffer): Demuxer | null {
  if (head.length >= 8 && QUICKTIME_BOXES.has(head.toString('latin1', 4, 8))) return 'mov';
  if (head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3) return 'matroska';
  return null;
}

/** The boxes an MP4 or QuickTime film starts with (older QuickTime films have no `ftyp`). */
const QUICKTIME_BOXES = new Set(['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip']);

export interface FilmFacts {
  /** As the film is shown: its pictures turned by its display rotation. */
  width: number;
  height: number;
  /** Seconds; null when the file does not say. */
  duration: number | null;
  hasAudio: boolean;
}

export type FilmPlan =
  | { action: 'keep'; type: VideoType; facts: FilmFacts }
  | {
      action: 'remux' | 'convert';
      /** ffprobe's stream indexes: the picture, and the sound kept (null: none). */
      video: number;
      audio: number | null;
      copyAudio: boolean;
      /** HLG or PQ (an iPhone's "HDR Video"): brought to SDR, BT.709. */
      hdr: boolean;
      /** The converted film's size (even, at most MAX_SIDE on its longer side). */
      width: number;
      height: number;
      facts: FilmFacts;
    }
  | { action: 'refuse' };

/** A plan that runs ffmpeg: a copy into an MP4, or a conversion. */
export type FilmWork = Extract<FilmPlan, { action: 'remux' | 'convert' }>;

/** The longest side of a converted film: Full HD, sharp on phones and in the gallery's viewer. */
export const MAX_SIDE = 1920;
/** Pictures larger than this on a side (8K) are refused rather than decoded. */
const MAX_INPUT_SIDE = 8192;

const EIGHT_BIT_420 = new Set(['yuv420p', 'yuvj420p']);
const PLAYED = {
  mp4: { video: ['h264'], audio: ['aac', 'mp3'] },
  webm: { video: ['vp8', 'vp9', 'av1'], audio: ['opus', 'vorbis'] },
} as const;
/** Sound ffmpeg turns into AAC; any other track (an iPhone 16's spatial APAC) is left out. */
const DECODED_AUDIO = /^(aac|mp3|mp2|alac|flac|opus|vorbis|ac3|eac3|amr_nb|amr_wb|pcm_[a-z0-9]+)$/;
const HDR_TRANSFERS = new Set(['arib-std-b67', 'smpte2084']);

function seconds(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Quarter turns of a picture's display rotation (an upright iPhone film: 1). */
export function quarterTurns(stream: ProbeStream): number {
  const matrix = stream.side_data_list?.find((data) => data.side_data_type === 'Display Matrix');
  const degrees = Number(matrix?.rotation ?? stream.tags?.rotate ?? 0);
  if (!Number.isFinite(degrees)) return 0;
  return ((Math.round(degrees / 90) % 4) + 4) % 4;
}

/** The film's picture: the largest video stream that is not a cover picture. */
function pictureStream(streams: ProbeStream[]): ProbeStream | null {
  const pictures = streams.filter(
    (stream) =>
      stream.codec_type === 'video' &&
      stream.codec_name &&
      !stream.disposition?.attached_pic &&
      (stream.width ?? 0) > 0 &&
      (stream.height ?? 0) > 0,
  );
  pictures.sort(
    (a, b) =>
      b.width! * b.height! - a.width! * a.height! ||
      (b.disposition?.default ?? 0) - (a.disposition?.default ?? 0),
  );
  return pictures[0] ?? null;
}

/** An even size at most MAX_SIDE long, in the film's proportions. */
function fitted(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const even = (value: number) => Math.max(2, Math.round((value * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

export function planFilm(probe: Probe, container: Container): FilmPlan {
  const streams = probe.streams ?? [];
  const picture = pictureStream(streams);
  if (!picture || Math.max(picture.width!, picture.height!) > MAX_INPUT_SIDE) {
    return { action: 'refuse' };
  }
  const turned = quarterTurns(picture) % 2 === 1;
  const width = turned ? picture.height! : picture.width!;
  const height = turned ? picture.width! : picture.height!;
  const duration = seconds(probe.format?.duration) ?? seconds(picture.duration);
  const sounds = streams.filter((stream) => stream.codec_type === 'audio' && stream.codec_name);
  // What a browser plays from the file as it is: the default sound track, else the first.
  const heard = sounds.find((stream) => stream.disposition?.default) ?? sounds[0] ?? null;
  const codec = picture.codec_name!;
  const eightBit = EIGHT_BIT_420.has(picture.pix_fmt ?? '');

  if (container !== 'other') {
    const played = PLAYED[container];
    if (
      (played.video as readonly string[]).includes(codec) &&
      (container === 'webm' || eightBit) &&
      (!heard || (played.audio as readonly string[]).includes(heard.codec_name!))
    ) {
      return {
        action: 'keep',
        type: container === 'mp4' ? 'video/mp4' : 'video/webm',
        facts: { width, height, duration, hasAudio: sounds.length > 0 },
      };
    }
  }

  const sound =
    sounds.find((stream) => stream.codec_name === 'aac') ??
    sounds.find((stream) => DECODED_AUDIO.test(stream.codec_name!)) ??
    null;
  const remux = codec === 'h264' && eightBit;
  return {
    action: remux ? 'remux' : 'convert',
    video: picture.index,
    audio: sound?.index ?? null,
    copyAudio: sound?.codec_name === 'aac',
    hdr: HDR_TRANSFERS.has(picture.color_transfer ?? ''),
    // A copied film keeps its size and its rotation; a converted one is turned upright first.
    ...(remux ? { width: picture.width!, height: picture.height! } : fitted(width, height)),
    facts: { width, height, duration, hasAudio: sound !== null },
  };
}

/**
 * HLG or PQ to SDR: to linear light, BT.2020 to BT.709 primaries, Hable's curve for the highlights,
 * back to BT.709 (zscale is libzimg's filter). Without it, the colours are only converted.
 */
const TONE_MAP =
  'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,' +
  'zscale=t=bt709:m=bt709:r=tv';
const COLOURS_ONLY = 'colorspace=all=bt709:iall=bt2020:fast=1';

/**
 * ffmpeg's arguments for a plan that copies or converts: progress as key=value lines on stdout,
 * nothing else unless it fails. A converted film is turned upright (ffmpeg applies the display
 * rotation before the filters), scaled, brought to SDR, encoded at a constant quality with a
 * ceiling for phones on mobile data, and given a key frame every 2 s for seeking.
 */
export function ffmpegArguments(
  plan: FilmWork,
  input: string,
  output: string,
  options: { toneMapping: boolean; demuxer: Demuxer },
): string[] {
  const args = ['-hide_banner', '-nostdin', '-loglevel', 'error', '-nostats'];
  args.push('-progress', 'pipe:1', ...opening(input, options.demuxer));
  args.push('-map', `0:${plan.video}`);
  if (plan.audio !== null) args.push('-map', `0:${plan.audio}`);
  if (plan.action === 'remux') {
    args.push('-c:v', 'copy', '-tag:v', 'avc1');
  } else {
    const filters: string[] = [];
    if (plan.width !== plan.facts.width || plan.height !== plan.facts.height) {
      filters.push(`scale=${plan.width}:${plan.height}:flags=lanczos`);
    }
    if (plan.hdr) filters.push(options.toneMapping ? TONE_MAP : COLOURS_ONLY);
    filters.push('setsar=1', 'format=yuv420p');
    args.push('-vf', filters.join(','));
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21');
    args.push('-maxrate', '8M', '-bufsize', '16M', '-profile:v', 'high', '-fpsmax', '60');
    args.push('-force_key_frames', 'expr:gte(t,n_forced*2)');
    args.push('-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709');
  }
  if (plan.audio !== null) {
    args.push(...(plan.copyAudio ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '160k', '-ac', '2']));
  }
  args.push('-map_metadata', '-1', '-map_metadata:s:v', '-1', '-map_metadata:s:a', '-1');
  args.push('-map_chapters', '-1', '-movflags', '+faststart', '-f', 'mp4', '-y', output);
  return args;
}

/** Where a film's cover is taken from when it has none: a third of the way in, at most 1 s. */
export function posterSeconds(duration: number | null): number {
  return duration ? Math.min(1, duration / 3) : 0;
}

/** How ffmpeg and ffprobe open a film: from a local file only, with the reader named. */
export function opening(input: string, demuxer: Demuxer): string[] {
  return ['-protocol_whitelist', 'file', '-f', demuxer, '-i', input];
}

/** ffmpeg's arguments for one frame of a film as a PNG, turned upright. */
export function posterArguments(
  input: string,
  demuxer: Demuxer,
  at: number,
  output: string,
): string[] {
  return [
    '-hide_banner',
    '-nostdin',
    '-loglevel',
    'error',
    '-ss',
    at.toFixed(3),
    ...opening(input, demuxer),
    '-frames:v',
    '1',
    '-an',
    '-sn',
    '-dn',
    '-f',
    'image2',
    '-c:v',
    'png',
    '-y',
    output,
  ];
}

/**
 * How far ffmpeg is, from its progress lines (`out_time_us=…`): 0–99 (100 is when it has
 * finished); null when the film's length is unknown or nothing has been encoded yet.
 */
export function progressPercent(line: string, duration: number | null): number | null {
  const match = /^out_time_(?:us|ms)=(\d+)$/.exec(line.trim());
  if (!match || !duration) return null;
  return Math.max(0, Math.min(99, Math.floor((Number(match[1]) / 1e6 / duration) * 100)));
}
