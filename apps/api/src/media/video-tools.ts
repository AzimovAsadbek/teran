import { spawn } from 'node:child_process';
import { constants, setPriority } from 'node:os';
import { opening, progressPercent, type Demuxer, type Probe } from './video-plan.js';

/*
 * ffmpeg and ffprobe, run as child processes at the lowest CPU priority, so a film being converted
 * never slows the site (ADR-062). Their paths come from FFMPEG_PATH and FFPROBE_PATH; without them
 * films are kept as uploaded and only MP4 and WebM are taken (ADR-061).
 */

export interface VideoTools {
  ffmpeg: string;
  ffprobe: string;
  /** ffmpeg's version, for the start-up line. */
  version: string;
  /** zscale and tonemap are built in: HDR films get a proper tone curve (ADR-062). */
  toneMapping: boolean;
}

/** A tool's run ended badly: the last lines it wrote, for the log. */
export class VideoToolError extends Error {
  constructor(
    message: string,
    readonly detail: string,
  ) {
    super(message);
    this.name = 'VideoToolError';
  }
}

/** The last few kilobytes a process wrote: enough to say why it failed. */
function tail(text: string): string {
  return text.length > 2000 ? text.slice(-2000) : text;
}

interface Run {
  /** Called with each line on stdout. */
  onLine?: (line: string) => void;
  signal?: AbortSignal;
  /** Stops a run that writes nothing for this long. */
  quietMs?: number;
}

function run(command: string, args: string[], options: Run = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(options.signal.reason as Error);
      return;
    }
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    if (child.pid) {
      try {
        setPriority(child.pid, constants.priority.PRIORITY_LOW);
      } catch {
        // Not allowed here (or already gone): it runs at the API's priority.
      }
    }
    let stdout = '';
    let stderr = '';
    let pending = '';
    let quiet: NodeJS.Timeout | undefined;
    let ended = false;
    const stop = (error: Error) => {
      if (ended) return;
      ended = true;
      child.kill('SIGKILL');
      reject(error);
    };
    const watch = () => {
      if (!options.quietMs) return;
      clearTimeout(quiet);
      quiet = setTimeout(
        () => stop(new VideoToolError(`${command} stopped answering`, tail(stderr))),
        options.quietMs,
      );
    };
    const abort = () => stop(options.signal!.reason as Error);
    options.signal?.addEventListener('abort', abort, { once: true });
    watch();
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      watch();
      if (!options.onLine) {
        stdout += chunk;
        return;
      }
      pending += chunk;
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) options.onLine(line);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr = tail(stderr + chunk);
    });
    child.on('error', (error) => stop(error));
    child.on('close', (code, signal) => {
      clearTimeout(quiet);
      options.signal?.removeEventListener('abort', abort);
      if (ended) return;
      ended = true;
      if (code === 0) resolve(stdout);
      else reject(new VideoToolError(`${command} ended with ${code ?? signal}`, tail(stderr)));
    });
  });
}

/** The tools at these paths, or null when either does not run (a developer's machine). */
export async function findVideoTools(ffmpeg: string, ffprobe: string): Promise<VideoTools | null> {
  try {
    const [version, , filters] = await Promise.all([
      run(ffmpeg, ['-hide_banner', '-version'], { quietMs: 10_000 }),
      run(ffprobe, ['-hide_banner', '-version'], { quietMs: 10_000 }),
      run(ffmpeg, ['-hide_banner', '-filters'], { quietMs: 10_000 }),
    ]);
    const has = (name: string) => new RegExp(`^\\s*\\S+\\s+${name}\\s`, 'm').test(filters);
    return {
      ffmpeg,
      ffprobe,
      version: /version (\S+)/.exec(version)?.[1] ?? 'unknown',
      toneMapping: has('zscale') && has('tonemap'),
    };
  } catch {
    return null;
  }
}

/** What ffprobe reads in a file; null when it cannot read it (not a film, or a damaged one). */
export async function probeFilm(
  tools: VideoTools,
  path: string,
  demuxer: Demuxer,
  signal?: AbortSignal,
): Promise<Probe | null> {
  let output: string;
  try {
    output = await run(
      tools.ffprobe,
      [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        ...opening(path, demuxer),
      ],
      { signal, quietMs: 60_000 },
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
  try {
    return JSON.parse(output) as Probe;
  } catch {
    return null;
  }
}

/**
 * Runs ffmpeg, reporting how far it is (0–99) from its progress lines. A run that writes nothing
 * for five minutes is stopped (its progress comes twice a second while it works).
 */
export async function runFfmpeg(
  tools: VideoTools,
  args: string[],
  options: {
    duration?: number | null;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  await run(tools.ffmpeg, args, {
    signal: options.signal,
    quietMs: 5 * 60_000,
    onLine: (line) => {
      const percent = progressPercent(line, options.duration ?? null);
      if (percent !== null) options.onProgress?.(percent);
    },
  });
}
