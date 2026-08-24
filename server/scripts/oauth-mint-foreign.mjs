/**
 * Mints a Google-shaped ID token signed with a key that is NOT published in
 * the fixture JWKS — proves the server rejects tokens from unknown keys.
 * Prints the token to stdout.
 */
import { generateKeyPairSync } from 'node:crypto';
import { SignJWT } from 'jose';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const now = Math.floor(Date.now() / 1000);

const token = await new SignJWT({
  iss: 'https://accounts.google.com',
  aud: 'test-client-id',
  sub: 'attacker-sub',
  email: 'oauth.user@ergon.app',
  email_verified: true,
  name: 'Attacker',
})
  .setProtectedHeader({ alg: 'RS256', kid: 'attacker-key', typ: 'JWT' })
  .setIssuedAt(now)
  .setExpirationTime(now + 3600)
  .sign(privateKey);

process.stdout.write(token);
