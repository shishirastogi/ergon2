const base = 'http://localhost:4000';
(async () => {
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@ergonstudio.design', password: 'ergon-demo-2026' }),
  }).then((r) => r.json());
  if (!login.data) { console.log('LOGIN FAIL', JSON.stringify(login).slice(0, 200)); return; }
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + login.data.token };

  const projects = (await fetch(base + '/api/projects', { headers: H }).then((r) => r.json())).data;
  const proj = projects.find((p) => p.stage === 'LEAD') || projects[0];
  console.log('project:', proj.title, '(' + proj.stage + ')');

  // 1) ad-hoc invoice creation w/ poisoned money values
  const res = await fetch(base + '/api/invoices', {
    method: 'POST', headers: H,
    body: JSON.stringify({
      projectId: proj.id, subtotal: 1, taxAmount: 2, total: 999999, status: 'PAID',
      taxRate: 0.18, amountPaid: 500,
      lineItems: [
        { description: 'Consulting sprint', quantity: 3, unitRate: 1500 },
        { description: 'Asset pack license', quantity: 1, unitRate: 450 },
      ],
    }),
  }).then((r) => r.json());
  const inv = res.data;
  console.log('invoice created:', inv ? res.status : JSON.stringify(res.error));
  if (inv) {
    // items: 3x1500 + 1x450 = 4950; tax .18 => 891; total 5841; paid 500 -> PARTIAL
    console.log('subtotal:', inv.subtotal, '(exp 4950) | total:', inv.total, '(exp 5841) | status:', inv.status, '(exp PARTIAL)');
    console.log('number:', inv.invoiceNumber, '| remaining:', inv.remainingBalance, '(exp 5341)');
    const pdf = await fetch(base + '/api/invoices/' + inv.id + '/pdf', { headers: { Authorization: H.Authorization } });
    const buf = Buffer.from(await pdf.arrayBuffer());
    console.log('pdf:', pdf.status, 'magic:', buf.slice(0, 4).toString());
  }

  // 2) create a draft quote then EDIT it with poisoned values
  const q = await fetch(base + '/api/quotes', {
    method: 'POST', headers: H,
    body: JSON.stringify({
      projectId: proj.id, taxRate: 0.08, status: 'DRAFT',
      lineItems: [{ description: 'Initial scope', quantity: 1, unitRate: 1000 }],
    }),
  }).then((r) => r.json());
  console.log('quote created:', q.data?.quoteNumber, 'total:', q.data?.total, '(exp 1080)');

  const up = await fetch(base + '/api/quotes/' + q.data.id, {
    method: 'PUT', headers: H,
    body: JSON.stringify({
      taxRate: 0.18, total: 777777,
      lineItems: [
        { description: 'Revised scope A', quantity: 2, unitRate: 2500 },
        { description: 'Rush fee', quantity: 1, unitRate: 400 },
      ],
    }),
  }).then((r) => r.json());
  console.log('quote updated:', up.data ? 'total ' + up.data.total + ' (exp 6372), taxAmount ' + up.data.taxAmount + ' (exp 972)' : JSON.stringify(up.error));

  // 3) convert then try editing again -> expect 409
  const conv = await fetch(base + '/api/quotes/' + q.data.id + '/convert-to-invoice', {
    method: 'POST', headers: H, body: '{}',
  }).then((r) => r.json());
  console.log('converted:', conv.data?.invoiceNumber || conv.error?.message);
  const lock = await fetch(base + '/api/quotes/' + q.data.id, {
    method: 'PUT', headers: H, body: JSON.stringify({ notes: 'hack' }),
  });
  console.log('edit after convert -> HTTP', lock.status, '(expect 409)');
})().catch((e) => console.log('ERR', e.message));
