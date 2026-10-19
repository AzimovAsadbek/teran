import { signS3Request } from './r2-store.js';

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
