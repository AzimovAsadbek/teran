import { createHash, createHmac } from 'node:crypto';
import { open } from 'node:fs/promises';
import type { ImageStore } from './image-processing.js';

/**
 * Cloudflare R2 (or any S3-compatible object storage) through its S3 API, signed with AWS
 * Signature Version 4 by hand, so no SDK is needed: the operations used are PUT (also only where
 * no object is yet), GET, HEAD, DELETE, a prefix listing and multipart uploads for large files.
 * Files are public through the bucket's public address (R2_PUBLIC_URL), which the storefront and
 * the API's picture addresses point at (ADR-043).
 */
export interface S3Config {
  /** The account's S3 endpoint, e.g. https://<account id>.r2.cloudflarestorage.com */
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** "auto" for R2. */
  region?: string;
}

const KEY_PATTERN = /^[A-Za-z0-9/_.-]+$/;
const ONE_YEAR = 'public, max-age=31536000, immutable';
/**
 * A large file goes up in parts of this size (R2 wants every part but the last the same size, of
 * at least 5 MiB); one part is in memory at a time.
 */
export const MULTIPART_PART_BYTES = 16 * 1024 * 1024;

function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

/** RFC 3986 encoding, as Signature Version 4 wants it (encodeURIComponent leaves !'()* alone). */
function encode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export interface SignedRequest {
  url: string;
  headers: Record<string, string>;
}

/**
 * Signs one S3 request (Signature Version 4, the payload hashed). `path` is the URL path below
 * the endpoint, already split into raw segments; `now` is for tests.
 */
export function signS3Request(
  config: Pick<S3Config, 'endpoint' | 'accessKeyId' | 'secretAccessKey' | 'region'>,
  request: {
    method: string;
    path: string[];
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: Buffer | string;
  },
  now: Date = new Date(),
  service = 's3',
): SignedRequest {
  const endpoint = new URL(config.endpoint);
  const region = config.region ?? 'auto';
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const payloadHash = sha256(request.body ?? '');
  const canonicalPath = `/${request.path.map(encode).join('/')}`;
  const query = Object.entries(request.query ?? {})
    .map(([key, value]) => [encode(key), encode(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const headers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(request.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
    ),
    host: endpoint.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names
    .map((name) => `${name}:${headers[name]!.trim().replace(/\s+/g, ' ')}\n`)
    .join('');
  const signedHeaders = names.join(';');
  const canonicalRequest = [
    request.method,
    canonicalPath,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, day), region), service),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  // The host header is set by fetch itself.
  const sent = Object.fromEntries(Object.entries(headers).filter(([name]) => name !== 'host'));
  return {
    url: `${endpoint.origin}${canonicalPath}${query ? `?${query}` : ''}`,
    headers: {
      ...sent,
      authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

async function send(
  config: S3Config,
  request: {
    method: 'GET' | 'HEAD' | 'PUT' | 'POST' | 'DELETE';
    key?: string;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: Buffer;
  },
  timeoutMs = 60_000,
): Promise<Response> {
  const path = [config.bucket, ...(request.key ? request.key.split('/') : [])];
  const signed = signS3Request(config, { ...request, path });
  return fetch(signed.url, {
    method: request.method,
    headers: signed.headers,
    body: request.body ? new Uint8Array(request.body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function check(response: Response, what: string): Promise<Response> {
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    throw new Error(`R2 ${what} failed: HTTP ${response.status} ${detail}`);
  }
  return response;
}

/** Every key below a prefix (ListObjectsV2, a page of up to 1000 at a time). */
export async function listKeys(config: S3Config, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const query: Record<string, string> = { 'list-type': '2', prefix };
    if (token) query['continuation-token'] = token;
    const response = await check(await send(config, { method: 'GET', query }), 'list');
    const xml = await response.text();
    for (const match of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(unescapeXml(match[1]!));
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1]
      : undefined;
  } while (token);
  return keys;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Stores a file at `key` (public, cached for a year: keys are random and never reused). */
export async function putObject(
  config: S3Config,
  key: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  if (!KEY_PATTERN.test(key)) throw new Error(`Refusing an unsafe key: ${key}`);
  await check(
    await send(
      config,
      {
        method: 'PUT',
        key,
        body: data,
        headers: { 'content-type': contentType, 'cache-control': ONE_YEAR },
      },
      // Films are tens of megabytes.
      300_000,
    ),
    `put ${key}`,
  );
}

/**
 * Stores a file at `key` only if no object is there (a conditional PUT, `If-None-Match: *`), so an
 * existing object is never replaced, even one written at the same moment: false when one was.
 */
export async function putObjectIfAbsent(
  config: S3Config,
  key: string,
  data: Buffer,
  contentType: string,
): Promise<boolean> {
  if (!KEY_PATTERN.test(key)) throw new Error(`Refusing an unsafe key: ${key}`);
  const response = await send(config, {
    method: 'PUT',
    key,
    body: data,
    headers: { 'content-type': contentType, 'cache-control': ONE_YEAR, 'if-none-match': '*' },
  });
  // 412 Precondition Failed: the object exists. (A 409 means another write to it is under way:
  // an error like any other, so a later run looks again.)
  if (response.status === 412) return false;
  await check(response, `put ${key}`);
  return true;
}

/** Whether an object is stored at `key` (HEAD). */
export async function objectExists(config: S3Config, key: string): Promise<boolean> {
  if (!KEY_PATTERN.test(key)) throw new Error(`Refusing an unsafe key: ${key}`);
  const response = await send(config, { method: 'HEAD', key });
  if (response.status === 404) return false;
  await check(response, `head ${key}`);
  return true;
}

/**
 * Stores a file from disk at `key`: in one request up to MULTIPART_PART_BYTES, else as a multipart
 * upload read from the file part by part (a film of any size never sits in memory whole). A failed
 * upload is aborted, so the bucket keeps no stray parts.
 */
export async function putObjectFromFile(
  config: S3Config,
  key: string,
  path: string,
  contentType: string,
): Promise<void> {
  if (!KEY_PATTERN.test(key)) throw new Error(`Refusing an unsafe key: ${key}`);
  const file = await open(path, 'r');
  try {
    const { size } = await file.stat();
    const readPart = async (offset: number, length: number) => {
      const part = Buffer.alloc(length);
      const { bytesRead } = await file.read(part, 0, length, offset);
      if (bytesRead !== length) throw new Error(`Short read of ${path} at ${offset}`);
      return part;
    };
    if (size <= MULTIPART_PART_BYTES) {
      await putObject(config, key, await readPart(0, size), contentType);
      return;
    }
    const created = await check(
      await send(config, {
        method: 'POST',
        key,
        query: { uploads: '' },
        headers: { 'content-type': contentType, 'cache-control': ONE_YEAR },
      }),
      `start ${key}`,
    );
    const uploadId = /<UploadId>([^<]+)<\/UploadId>/.exec(await created.text())?.[1];
    if (!uploadId) throw new Error(`R2 start ${key} failed: no upload id`);
    try {
      const etags: string[] = [];
      for (let offset = 0; offset < size; offset += MULTIPART_PART_BYTES) {
        const body = await readPart(offset, Math.min(MULTIPART_PART_BYTES, size - offset));
        const query = { partNumber: String(etags.length + 1), uploadId };
        const response = await check(
          await send(config, { method: 'PUT', key, query, body }, 300_000),
          `part ${etags.length + 1} of ${key}`,
        );
        const etag = response.headers.get('etag');
        if (!etag) throw new Error(`R2 part ${etags.length + 1} of ${key}: no ETag`);
        etags.push(etag);
      }
      const parts = etags
        .map(
          (etag, index) => `<Part><PartNumber>${index + 1}</PartNumber><ETag>${etag}</ETag></Part>`,
        )
        .join('');
      await check(
        await send(config, {
          method: 'POST',
          key,
          query: { uploadId },
          headers: { 'content-type': 'application/xml' },
          body: Buffer.from(`<CompleteMultipartUpload>${parts}</CompleteMultipartUpload>`),
        }),
        `complete ${key}`,
      );
    } catch (error) {
      await send(config, { method: 'DELETE', key, query: { uploadId } }).catch(() => undefined);
      throw error;
    }
  } finally {
    await file.close();
  }
}

export function r2Store(config: S3Config): ImageStore {
  const keyOf = (storageKey: string, fileName: string) => `${storageKey}/${fileName}`;
  const valid = (storageKey: string, fileName: string) =>
    KEY_PATTERN.test(storageKey) && /^[a-z0-9]+\.[a-z0-9]+$/.test(fileName);
  return {
    async save(storageKey, width, data) {
      await putObject(config, keyOf(storageKey, `${width}.webp`), data, 'image/webp');
    },
    async saveFile(storageKey, fileName, data, contentType) {
      await putObject(config, keyOf(storageKey, fileName), data, contentType);
    },
    async saveFileFrom(storageKey, fileName, path, contentType) {
      await putObjectFromFile(config, keyOf(storageKey, fileName), path, contentType);
    },
    async read(storageKey, fileName) {
      if (!valid(storageKey, fileName)) return null;
      const response = await send(config, { method: 'GET', key: keyOf(storageKey, fileName) });
      if (response.status === 404) return null;
      await check(response, 'read');
      return Buffer.from(await response.arrayBuffer());
    },
    async exists(storageKey, fileName) {
      if (!valid(storageKey, fileName)) return false;
      return objectExists(config, keyOf(storageKey, fileName));
    },
    async saveNew(storageKey, fileName, data, contentType) {
      if (!valid(storageKey, fileName)) {
        throw new Error(`Refusing an unsafe file name: ${storageKey}/${fileName}`);
      }
      return putObjectIfAbsent(config, keyOf(storageKey, fileName), data, contentType);
    },
    async remove(storageKey) {
      if (!KEY_PATTERN.test(storageKey)) return;
      for (const key of await listKeys(config, `${storageKey}/`)) {
        await check(await send(config, { method: 'DELETE', key }), `delete ${key}`);
      }
    },
  };
}
