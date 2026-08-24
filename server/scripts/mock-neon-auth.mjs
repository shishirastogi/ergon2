/**
 * Test fixture: minimal Managed Better Auth API stub for Neon Auth tests.
 * Implements POST /sign-up/email and POST /sign-in/email with realistic
 * status codes/bodies. State held in memory.
 */
import http from 'node:http';

const users = new Map(); // email -> { id, name }
const passwords = new Map(); // email -> Set<valid passwords>

http
  .createServer((req, res) => {
    if (req.method !== 'POST' || !req.url.endsWith('/email')) {
      res.statusCode = 404;
      return res.end('{}');
    }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body = {};
      try {
        body = JSON.parse(raw || '{}');
      } catch {}
      const email = String(body.email || '').toLowerCase();
      const password = String(body.password || '');
      const isSignUp = req.url.includes('/sign-up');

      if (!email || !password) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ message: 'Missing fields' }));
      }

      if (isSignUp) {
        if (users.has(email)) {
          res.statusCode = 422;
          return res.end(
            JSON.stringify({ code: 'USER_ALREADY_EXISTS', message: 'User already exists' })
          );
        }
        const user = { id: `neon_${users.size + 1}`, name: body.name ?? null };
        users.set(email, user);
        passwords.set(email, new Set([password]));
        res.statusCode = 200;
        return res.end(JSON.stringify({ token: 'stub-session-token', user }));
      }

      // sign-in: unknown user OR wrong password → same generic 401
      if (!users.has(email) || !passwords.get(email)?.has(password)) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ message: 'Invalid email or password' }));
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ token: 'stub-session-token', user: users.get(email) }));
    });
  })
  .listen(9098, () => console.log('mock neon auth on :9098'));
