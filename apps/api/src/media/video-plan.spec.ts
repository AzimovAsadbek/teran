import {
  demuxerFor,
  ffmpegArguments,
  planFilm,
  posterSeconds,
  progressPercent,
  type FilmWork,
  type ProbeStream,
} from './video-plan.js';

/*
 * ffprobe's answers as it gives them for an iPhone's films (apps/api/test/fixtures), trimmed to
 * what the plan reads.
 */
const hevcHdr = (rotation?: number): ProbeStream => ({
  index: 0,
  codec_type: 'video',
  codec_name: 'hevc',
  width: 640,
  height: 360,
  pix_fmt: 'yuv420p10le',
  color_transfer: 'arib-std-b67',
  duration: '2.000000',
  disposition: { default: 1, attached_pic: 0 },
  side_data_list: [
    { side_data_type: 'DOVI configuration record' },
    ...(rotation === undefined ? [] : [{ side_data_type: 'Display Matrix', rotation }]),
  ],
});
const h264 = (index: number, rotation?: number): ProbeStream => ({
  index,
  codec_type: 'video',
  codec_name: 'h264',
  width: 640,
  height: 360,
  pix_fmt: 'yuv420p',
  color_transfer: 'bt709',
  disposition: { default: 1, attached_pic: 0 },
  ...(rotation === undefined
    ? {}
    : { side_data_list: [{ side_data_type: 'Display Matrix', rotation }] }),
});
const aac = (index: number): ProbeStream => ({
  index,
  codec_type: 'audio',
  codec_name: 'aac',
  disposition: { default: 1 },
});
/** The place, as a timed metadata track (no codec ffmpeg knows). */
const place = (index: number): ProbeStream => ({
  index,
  codec_type: 'data',
  disposition: { default: 1 },
});
const format = { duration: '2.066667' };

describe('planFilm (ADR-062)', () => {
  it('converts an iPhone camera film (HEVC, HDR, upright) to an upright H.264 film with its sound', () => {
    const plan = planFilm({ streams: [hevcHdr(-90), aac(1), place(2)], format }, 'other');
    expect(plan).toEqual({
      action: 'convert',
      video: 0,
      audio: 1,
      copyAudio: true,
      hdr: true,
      width: 360,
      height: 640,
      facts: { width: 360, height: 640, duration: 2.066667, hasAudio: true },
    });
  });

  it('copies H.264 out of a QuickTime film without re-encoding it, keeping its rotation', () => {
    const plan = planFilm({ streams: [h264(0, -90), aac(1), place(2)], format }, 'other');
    expect(plan).toMatchObject({
      action: 'remux',
      video: 0,
      audio: 1,
      copyAudio: true,
      hdr: false,
      // A copy keeps the stored size; its display rotation goes with it.
      width: 640,
      height: 360,
      facts: { width: 360, height: 640, hasAudio: true },
    });
  });

  it('finds the picture and the sound wherever they are (Safari puts the sound first)', () => {
    const plan = planFilm(
      { streams: [aac(0), { ...h264(1), width: 360, height: 640 }, place(2)], format },
      'other',
    );
    expect(plan).toMatchObject({ action: 'remux', video: 1, audio: 0 });
  });

  it('keeps an MP4 or WebM that every browser plays, as it is', () => {
    expect(planFilm({ streams: [h264(0), aac(1)], format }, 'mp4')).toEqual({
      action: 'keep',
      type: 'video/mp4',
      facts: { width: 640, height: 360, duration: 2.066667, hasAudio: true },
    });
    expect(planFilm({ streams: [h264(0, -90)], format }, 'mp4')).toMatchObject({
      action: 'keep',
      facts: { width: 360, height: 640, hasAudio: false },
    });
    const vp9: ProbeStream = { ...h264(0), codec_name: 'vp9', pix_fmt: 'yuv420p10le' };
    const opus: ProbeStream = { ...aac(1), codec_name: 'opus' };
    expect(planFilm({ streams: [vp9, opus], format }, 'webm')).toMatchObject({
      action: 'keep',
      type: 'video/webm',
    });
  });

  it('converts what not every browser plays, even in an MP4', () => {
    expect(planFilm({ streams: [hevcHdr(), aac(1)], format }, 'mp4')).toMatchObject({
      action: 'convert',
    });
    const tenBit: ProbeStream = { ...h264(0), pix_fmt: 'yuv420p10le' };
    expect(planFilm({ streams: [tenBit, aac(1)], format }, 'mp4')).toMatchObject({
      action: 'convert',
      hdr: false,
    });
    const prores: ProbeStream = { ...h264(0), codec_name: 'prores', pix_fmt: 'yuv422p10le' };
    expect(planFilm({ streams: [prores], format }, 'other')).toMatchObject({
      action: 'convert',
      audio: null,
    });
  });

  it('brings a 4K film down to Full HD on its longer side, upright or landscape', () => {
    const large = (rotation?: number): ProbeStream => ({
      ...hevcHdr(rotation),
      width: 3840,
      height: 2160,
    });
    expect(planFilm({ streams: [large()], format }, 'other')).toMatchObject({
      width: 1920,
      height: 1080,
      facts: { width: 3840, height: 2160 },
    });
    expect(planFilm({ streams: [large(90)], format }, 'other')).toMatchObject({
      width: 1080,
      height: 1920,
    });
    // Odd sizes become even (H.264 in 4:2:0 needs them).
    const odd: ProbeStream = { ...hevcHdr(), width: 1001, height: 563 };
    expect(planFilm({ streams: [odd], format }, 'other')).toMatchObject({
      width: 1002,
      height: 564,
    });
  });

  it('turns sound browsers do not play into AAC, and leaves out sound ffmpeg cannot read', () => {
    const pcm: ProbeStream = { ...aac(1), codec_name: 'pcm_s16le' };
    expect(planFilm({ streams: [h264(0), pcm], format }, 'other')).toMatchObject({
      action: 'remux',
      audio: 1,
      copyAudio: false,
    });
    const alac: ProbeStream = { ...aac(1), codec_name: 'alac' };
    expect(planFilm({ streams: [h264(0), alac], format }, 'mp4')).toMatchObject({
      action: 'remux',
      copyAudio: false,
    });
    // An iPhone 16's spatial sound beside its stereo AAC: the AAC is kept.
    const spatial: ProbeStream = { ...aac(1), codec_name: 'apac', disposition: { default: 1 } };
    const stereo: ProbeStream = { ...aac(2), disposition: { default: 0 } };
    expect(planFilm({ streams: [hevcHdr(), spatial, stereo], format }, 'other')).toMatchObject({
      audio: 2,
      copyAudio: true,
      facts: { hasAudio: true },
    });
    expect(planFilm({ streams: [hevcHdr(), spatial], format }, 'other')).toMatchObject({
      audio: null,
      facts: { hasAudio: false },
    });
  });

  it('takes the film, not its cover picture, and refuses a file without pictures', () => {
    const cover: ProbeStream = {
      index: 0,
      codec_type: 'video',
      codec_name: 'mjpeg',
      width: 3000,
      height: 3000,
      disposition: { attached_pic: 1 },
    };
    expect(planFilm({ streams: [cover, { ...h264(1) }], format }, 'mp4')).toMatchObject({
      action: 'keep',
      facts: { width: 640, height: 360 },
    });
    expect(planFilm({ streams: [aac(0)], format }, 'mp4')).toEqual({ action: 'refuse' });
    expect(planFilm({ streams: [cover] }, 'other')).toEqual({ action: 'refuse' });
    expect(planFilm({}, 'other')).toEqual({ action: 'refuse' });
  });

  it('reads rotation as older ffprobe versions give it, and an unknown length', () => {
    const tagged: ProbeStream = { ...h264(0), tags: { rotate: '90' } };
    expect(planFilm({ streams: [tagged] }, 'other')).toMatchObject({
      facts: { width: 360, height: 640, duration: null },
    });
  });
});

describe('ffmpegArguments', () => {
  const convert = planFilm(
    { streams: [{ ...hevcHdr(-90), width: 3840, height: 2160 }, aac(1), place(2)], format },
    'other',
  ) as FilmWork;
  const remux = planFilm({ streams: [aac(0), h264(1), place(2)], format }, 'other') as FilmWork;

  it('copies the picture and the sound into a fast-start MP4 without the camera metadata', () => {
    const args = ffmpegArguments(remux, '/in.source', '/out.mp4', {
      toneMapping: true,
      demuxer: 'mov',
    });
    const joined = args.join(' ');
    // Read as a QuickTime film from the local file only: ffmpeg never guesses the format.
    expect(joined).toContain(
      '-progress pipe:1 -protocol_whitelist file -f mov -i /in.source -map 0:1 -map 0:0',
    );
    expect(joined).toContain('-c:v copy');
    expect(joined).toContain('-c:a copy');
    expect(joined).not.toContain('libx264');
    expect(joined).toContain('-map_metadata -1 -map_metadata:s:v -1 -map_metadata:s:a -1');
    expect(joined).toContain('-movflags +faststart -f mp4 -y /out.mp4');
    expect(args.at(-1)).toBe('/out.mp4');
  });

  it('converts to H.264: scaled, HDR tone-mapped to BT.709, 8-bit 4:2:0, a key frame every 2 s', () => {
    const args = ffmpegArguments(convert, '/in.source', '/out.mp4', {
      toneMapping: true,
      demuxer: 'mov',
    });
    const filters = args[args.indexOf('-vf') + 1];
    expect(filters).toBe(
      'scale=1080:1920:flags=lanczos,zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,' +
        'tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,setsar=1,format=yuv420p',
    );
    const joined = args.join(' ');
    expect(joined).toContain('-c:v libx264 -preset veryfast -crf 21');
    expect(joined).toContain('-maxrate 8M -bufsize 16M -profile:v high -fpsmax 60');
    expect(joined).toContain('-force_key_frames expr:gte(t,n_forced*2)');
    expect(joined).toContain('-color_primaries bt709 -color_trc bt709 -colorspace bt709');
    // The timed place track is not taken.
    expect(joined).not.toContain('0:2');
  });

  it('only converts the colours where ffmpeg has no zscale, and re-encodes other sound', () => {
    const plan = {
      ...convert,
      width: 360,
      height: 640,
      facts: { ...convert.facts, width: 360, height: 640 },
      copyAudio: false,
    };
    const args = ffmpegArguments(plan, '/in', '/out.mp4', { toneMapping: false, demuxer: 'mov' });
    expect(args[args.indexOf('-vf') + 1]).toBe(
      'colorspace=all=bt709:iall=bt2020:fast=1,setsar=1,format=yuv420p',
    );
    expect(args.join(' ')).toContain('-c:a aac -b:a 160k -ac 2');
  });
});

describe('demuxerFor', () => {
  const head = (text: string) => Buffer.from(text.padEnd(64, '\0'), 'latin1');

  it('opens MP4 and QuickTime films with the QuickTime reader, WebM with the Matroska one', () => {
    expect(demuxerFor(head('\0\0\0\x14ftypqt  '))).toBe('mov');
    expect(demuxerFor(head('\0\0\0\x18ftypisom'))).toBe('mov');
    expect(demuxerFor(head('\0\0\0\x08wide'))).toBe('mov');
    expect(demuxerFor(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]))).toBe(
      'matroska',
    );
  });

  it('opens nothing else: a playlist that names other files is refused unread', () => {
    expect(demuxerFor(head('#EXTM3U\n#EXT-X-VERSION:3\nfile:///etc/passwd'))).toBeNull();
    expect(demuxerFor(head("ffconcat version 1.0\nfile '/etc/passwd'"))).toBeNull();
    expect(demuxerFor(head('<html>'))).toBeNull();
    expect(demuxerFor(Buffer.alloc(0))).toBeNull();
  });
});

describe('progress and cover', () => {
  it('reads how far ffmpeg is from its progress lines', () => {
    expect(progressPercent('out_time_us=1033333', 2.066667)).toBe(49);
    expect(progressPercent('out_time_ms=2066667', 2.066667)).toBe(99);
    expect(progressPercent('out_time_us=0', 10)).toBe(0);
    expect(progressPercent('frame=12', 10)).toBeNull();
    expect(progressPercent('out_time_us=1000000', null)).toBeNull();
  });

  it('refuses pictures larger than 8K rather than decoding them', () => {
    const huge: ProbeStream = { ...h264(0), width: 16384, height: 16384 };
    expect(planFilm({ streams: [huge], format }, 'mp4')).toEqual({ action: 'refuse' });
  });

  it('takes a cover a third of the way in, at most a second', () => {
    expect(posterSeconds(2.4)).toBeCloseTo(0.8);
    expect(posterSeconds(95)).toBe(1);
    expect(posterSeconds(null)).toBe(0);
  });
});
