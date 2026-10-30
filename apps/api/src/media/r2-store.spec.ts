import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MULTIPART_PART_BYTES,
  objectExists,
  putObjectFromFile,
  putObjectIfAbsent,
  signS3Request,
} from './r2-store.js';

/*
 * The worked examples of AWS's "Authenticating Requests: Using the Authorization Header (AWS
 * Signature Version 4)" for Amazon S3: same keys, date and requests, so the signatures must match
 * the published ones exactly.
 */
const EXAMPLE = {
  endpoint: 'https://examplebucket.s3.amazonaws.com',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
};
const DATE = new Date('2013-05-24T00:00:00Z');

function signatureOf(authorization: string | undefined): string | undefined {
  return /Signature=([0-9a-f]+)/.exec(authorization ?? '')?.[1];
}

describe('signS3Request (AWS Signature Version 4)', () => {
  it('signs a ranged GET as in the AWS example', () => {
    const signed = signS3Request(
      EXAMPLE,
      { method: 'GET', path: ['test.txt'], headers: { Range: 'bytes=0-9' } },
      DATE,
    );
    expect(signed.url).toBe('https://examplebucket.s3.amazonaws.com/test.txt');
    expect(signed.headers.authorization).toContain(
      'Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request',
    );
    expect(signed.headers.authorization).toContain(
      'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date',
    );
    expect(signatureOf(signed.headers.authorization)).toBe(
      'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
  });

  it('signs a PUT with a body, an encoded key and extra headers as in the AWS example', () => {
    const signed = signS3Request(
      EXAMPLE,
      {
        method: 'PUT',
        path: ['test$file.text'],
        headers: {
          Date: 'Fri, 24 May 2013 00:00:00 GMT',
          'x-amz-storage-class': 'REDUCED_REDUNDANCY',
        },
        body: 'Welcome to Amazon S3.',
      },
      DATE,
    );
    expect(signed.url).toBe('https://examplebucket.s3.amazonaws.com/test%24file.text');
    expect(signatureOf(signed.headers.authorization)).toBe(
      '98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd',
    );
  });

  it('signs a bucket listing with sorted query parameters as in the AWS example', () => {
    const signed = signS3Request(
      EXAMPLE,
      { method: 'GET', path: [], query: { prefix: 'J', 'max-keys': '2' } },
      DATE,
    );
    expect(signed.url).toBe('https://examplebucket.s3.amazonaws.com/?max-keys=2&prefix=J');
    expect(signatureOf(signed.headers.authorization)).toBe(
      '34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7',
    );
  });
});

describe('putObjectFromFile (films of any size, ADR-061)', () => {
  const config = {
    endpoint: 'https://account.r2.cloudflarestorage.com',
    accessKeyId: 'test-access-key-id-0000',
    secretAccessKey: 'test-secret-access-key-not-a-secret-000000',
    bucket: 'teran',
  };
  let directory: string;
  let calls: { method: string; url: URL; bytes: number; body: string }[];

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'r2-'));
    calls = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(directory, { recursive: true, force: true });
  });

  /** Answers like R2; `failPart` makes that part's upload fail. */
  function stubR2(failPart?: number) {
    vi.stubGlobal('fetch', (input: string, init: RequestInit) => {
      const url = new URL(input);
      const body = init.body ? Buffer.from(init.body as Uint8Array) : Buffer.alloc(0);
      calls.push({
        method: init.method ?? 'GET',
        url,
        bytes: body.length,
        body: body.length < 4096 ? body.toString() : '',
      });
      if (url.searchParams.has('uploads')) {
        return Promise.resolve(
          new Response(
            '<InitiateMultipartUploadResult><UploadId>u-1</UploadId></InitiateMultipartUploadResult>',
          ),
        );
      }
      const part = url.searchParams.get('partNumber');
      if (part) {
        return Promise.resolve(
          Number(part) === failPart
            ? new Response('slow down', { status: 503 })
            : new Response('', { headers: { etag: `"etag-${part}"` } }),
        );
      }
      return Promise.resolve(new Response(''));
    });
  }

  it('sends a file up to one part in a single request', async () => {
    stubR2();
    const path = join(directory, 'small.mp4');
    writeFileSync(path, Buffer.alloc(1000, 7));
    await putObjectFromFile(config, 'media/x/abc/video.mp4', path, 'video/mp4');
    expect(calls.map((call) => [call.method, call.url.pathname, call.bytes])).toEqual([
      ['PUT', '/teran/media/x/abc/video.mp4', 1000],
    ]);
  });

  it('sends a larger file as a multipart upload, part by part, then completes it in order', async () => {
    stubR2();
    const path = join(directory, 'large.mp4');
    writeFileSync(path, Buffer.alloc(MULTIPART_PART_BYTES + 10, 1));
    await putObjectFromFile(config, 'media/x/abc/video.mp4', path, 'video/mp4');
    expect(calls.map((call) => [call.method, call.url.search, call.bytes])).toEqual([
      ['POST', '?uploads=', 0],
      ['PUT', '?partNumber=1&uploadId=u-1', MULTIPART_PART_BYTES],
      ['PUT', '?partNumber=2&uploadId=u-1', 10],
      ['POST', '?uploadId=u-1', expect.any(Number)],
    ]);
    expect(calls[3]?.body).toBe(
      '<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>"etag-1"</ETag></Part>' +
        '<Part><PartNumber>2</PartNumber><ETag>"etag-2"</ETag></Part></CompleteMultipartUpload>',
    );
  });

  it('aborts the upload when a part fails, so no stray parts stay in the bucket', async () => {
    stubR2(2);
    const path = join(directory, 'large.mp4');
    writeFileSync(path, Buffer.alloc(MULTIPART_PART_BYTES + 10, 1));
    await expect(
      putObjectFromFile(config, 'media/x/abc/video.mp4', path, 'video/mp4'),
    ).rejects.toThrow(/part 2/);
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE' });
    expect(calls.at(-1)?.url.search).toBe('?uploadId=u-1');
  });
});

describe('adding a file only where none is (ADR-065)', () => {
  const config = {
    endpoint: 'https://account.r2.cloudflarestorage.com',
    accessKeyId: 'test-access-key-id-0000',
    secretAccessKey: 'test-secret-access-key-not-a-secret-000000',
    bucket: 'teran',
  };
  const key = 'visuals/x/AbCdEfGhIjKl/800.webp';
  let sent: { method: string; path: string; headers: Record<string, string> }[];

  /** Answers every request with `status`. */
  function stubR2(status: number) {
    sent = [];
    vi.stubGlobal('fetch', (input: string, init: RequestInit) => {
      sent.push({
        method: init.method ?? 'GET',
        path: new URL(input).pathname,
        headers: init.headers as Record<string, string>,
      });
      return Promise.resolve(new Response(status === 200 ? '' : 'refused', { status }));
    });
  }
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks R2 to refuse the PUT when an object is there, and says whether it was stored', async () => {
    stubR2(200);
    expect(await putObjectIfAbsent(config, key, Buffer.from('webp'), 'image/webp')).toBe(true);
    expect(sent).toEqual([
      {
        method: 'PUT',
        path: `/teran/${key}`,
        headers: expect.objectContaining({ 'if-none-match': '*', 'content-type': 'image/webp' }),
      },
    ]);
    // The condition is signed with the request, so it cannot be dropped on the way.
    expect(sent[0]!.headers.authorization).toContain('if-none-match');

    stubR2(412);
    expect(await putObjectIfAbsent(config, key, Buffer.from('webp'), 'image/webp')).toBe(false);

    stubR2(409);
    await expect(putObjectIfAbsent(config, key, Buffer.from('webp'), 'image/webp')).rejects.toThrow(
      /HTTP 409/,
    );
  });

  it('looks for an object with HEAD', async () => {
    stubR2(200);
    expect(await objectExists(config, key)).toBe(true);
    expect(sent[0]).toMatchObject({ method: 'HEAD', path: `/teran/${key}` });
    stubR2(404);
    expect(await objectExists(config, key)).toBe(false);
    stubR2(403);
    await expect(objectExists(config, key)).rejects.toThrow(/HTTP 403/);
  });
});
