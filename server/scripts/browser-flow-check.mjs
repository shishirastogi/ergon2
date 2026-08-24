// Replicates the exact browser flow: signup/login via :5173 (vite proxy),
// then fire every request the Dashboard makes with the returned token.
const base = 'http://localhost:5173';
(async () => {
  const email = `flow${Date.now()}@ergon.app`;
  const password = 'FlowTest123!';

  const signup = await fetch(base + '/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Flow', studioName: 'Flow Studio' }),
  }).then((r) => r.json());
  console.log('signup:', signup.data ? 'OK' : JSON.stringify(signup.error));
  let token = signup.data?.token;

  // simulate reload: login instead
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  console.log('login:', login.data ? 'OK' : JSON.stringify(login.error));
  token = login.data?.token;

  const H = { Authorization: 'Bearer ' + token };
  const endpoints = [
    '/api/dashboard/profitability',
    '/api/clients',
    '/api/projects',
    '/api/quotes',
    '/api/invoices',
  ];
  for (const ep of endpoints) {
    const r = await fetch(base + ep, { headers: H });
    const text = r.status === 200 ? 'ok' : (await r.text()).slice(0, 120);
    console.log(ep.padEnd(32), r.status, text);
  }
})().catch((e) => console.log('ERR', e.message));
