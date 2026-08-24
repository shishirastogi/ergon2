const base = 'http://localhost:4000';
(async () => {
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@ergonstudio.design', password: 'ergon-demo-2026' }),
  }).then((r) => r.json());
  if (!login.data) { console.log('LOGIN:', JSON.stringify(login.error || login)); return; }
  const H = { Authorization: 'Bearer ' + login.data.token };
  const counts = {};
  const [cl, pr, q, inv, st] = await Promise.all([
    fetch(base + '/api/clients', { headers: H }).then((r) => r.json()),
    fetch(base + '/api/projects', { headers: H }).then((r) => r.json()),
    fetch(base + '/api/quotes', { headers: H }).then((r) => r.json()),
    fetch(base + '/api/invoices', { headers: H }).then((r) => r.json()),
    fetch(base + '/api/studios', { headers: H }).then((r) => r.json()),
  ]);
  console.log('clients:', cl.data?.length ?? cl.error?.message);
  console.log('projects:', pr.data?.length ?? pr.error?.message);
  console.log('quotes:', q.data?.length ?? q.error?.message);
  console.log('invoices:', inv.data?.length ?? inv.error?.message);
  console.log('studios:', Array.isArray(st.data) ? st.data.length : st.error?.message);
  const d = await fetch(base + '/api/dashboard/profitability', { headers: H }).then((r) => r.json());
  console.log('dashboard grossRevenue:', d.data?.grossRevenue);
})().catch((e) => console.log('ERR', e.message));
