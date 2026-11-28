import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { verifyGoogleToken } from './identity-providers.js';

describe('Google ID token verification', () => {
  it('checks signature, issuer, audience, nonce, expiry and verified email against issuer keys', async () => {
    const pair = await generateKeyPair('RS256');
    const other = await generateKeyPair('RS256');
    const keys = createLocalJWKSet({
      keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'issuer', alg: 'RS256' }],
    });
    const claims = {
      iss: 'https://accounts.google.com',
      aud: 'teran-client',
      sub: 'google-sub',
      nonce: 'bound',
      email: 'verified@example.test',
      email_verified: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 120,
    };
    const sign = (values: Record<string, unknown>, key = pair.privateKey) =>
      new SignJWT({ ...claims, ...values })
        .setProtectedHeader({ alg: 'RS256', kid: 'issuer' })
        .sign(key);
    const check = (v: string) => verifyGoogleToken(v, keys, 'teran-client', 'bound');
    await expect(check(await sign({}))).resolves.toMatchObject({
      subject: 'google-sub',
      email: claims.email,
    });
    for (const bad of [
      { iss: 'untrusted' },
      { aud: 'other' },
      { exp: 1 },
      { nonce: 'another' },
      { email_verified: false },
      { azp: 'other' },
      { aud: ['teran-client', 'other'] },
    ]) {
      await expect(check(await sign(bad))).rejects.toThrow();
    }
    await expect(check(await sign({}, other.privateKey))).rejects.toThrow();
  });
});
