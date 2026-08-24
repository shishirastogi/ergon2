/**
 * Test fixture: a mini "Google" JWKS server + ID token minter.
 * Serves an RSA public key at http://localhost:9099/certs and writes signed
 * test tokens (valid + attack variants) to tokens.json for oauth-test.ps1.
 *
 * Used ONLY to exercise the OAuth verification path in tests; production uses
 * the real https://www.googleapis.com/oauth2/v3/certs endpoint.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { generateKeyPairSync } from 'node:crypto';
import { SignJWT, exportJWK } from 'jose';
import { writeFileSync } from 'node:fs';

const PORT = 9099;
const CLIENT_ID = 'test-client-id';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = 'test-key-1';
publicJwk.alg = 'RS256';
publicJwk.use = 'sig';

async function mint(claims) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1', typ: 'JWT' })
    .setIssuedAt(claims.iat ?? now)
    .setExpirationTime(claims.exp ?? now + 3600)
    .sign(privateKey);
}

const base = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  sub: 'google-sub-123456',
  email: 'oauth.user@ergon.app',
  email_verified: true,
  name: 'OAuth User',
};

const tokens = {
  valid: await mint(base),
  badAudience: await mint({ ...base, aud: 'someone-elses-app' }),
  expired: await mint({ ...base, exp: now() - 3600 }),
  unverifiedEmail: await mint({ ...base, email_verified: false }),
  wrongIssuer: await mint({ ...base, iss: 'https://evil.example.com' }),
  secondUser: await mint({ ...base, email: 'oauth.second@ergon.app', sub: 'google-sub-789' }),
};

writeFileSync(new URL('./oauth-tokens.json', import.meta.url), JSON.stringify(tokens, null, 2));

http
  .createServer((req, res) => {
    if (req.url === '/certs') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }
    res.statusCode = 404;
    res.end();
  })
  .listen(PORT, () => console.log(`fixture JWKS on :${PORT}`));

function now() {
  return Math.floor(Date.now() / 1000);
}

// Keep alive until killed by the orchestrator.
setInterval(() => {}, 60_000);
