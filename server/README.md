# Ergon Backend API

Express + Prisma + PostgreSQL (Neon cloud) backend for Ergon — client, quote,
invoice and profitability management for a freelance studio.

## Run

```bash
cd server
npm install
npx prisma migrate deploy   # apply schema
npx prisma db seed          # demo data: alex@ergonstudio.design / ergon-demo-2026
npm run dev                 # http://localhost:4000
```

Environment lives in `server/.env`:
- `DATABASE_URL` — Neon **pooled** connection string (+ `pgbouncer=true&connect_timeout=15`)
- `DIRECT_URL` — unpooled endpoint for migrations (may equal pooled when blocked)
- `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, `BCRYPT_ROUNDS`
- `NEON_AUTH_BASE_URL` — Auth Base URL from Neon Console → Auth → Configuration.
  When set, passwords are managed by Neon Auth (Managed Better Auth) and users
  sync into the `neon_auth.user` table; local bcrypt is used when empty.
- `NEON_AUTH_ORIGIN` — trusted origin sent with server-to-server calls
  (default `http://localhost:5173`; must match a domain trusted in the console)
- `GOOGLE_CLIENT_ID` — optional; enables `/api/auth/google` ID-token sign-in

## Conventions

- Every response: `{ "data": ... }` on success, `{ "error": { "message", "code" } }` on failure
- All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <jwt>`
- Totals are ALWAYS recomputed server-side from line items × quantity + taxRate;
  any `total` sent by a client is ignored
- Invoice status is computed on read: past `dueDate` + remaining balance ⇒ OVERDUE

## Routes & shapes

### Auth
```
POST /api/auth/signup  { email, password(≥8), name?, studioName? }
                       → 201 { data: { token, user: { id,email,name,studioName } } }
POST /api/auth/login   { email, password } → { data: { token, user } }
```

### Clients
```
GET    /api/clients    → { data: Client[] }   // each with projects[], totalBilled,
                                              // outstandingBalance (computed on read)
POST   /api/clients    { name, company?, email?, phone?, notes?, status?: LEAD|ACTIVE|PAST }
GET    /api/clients/:id → { data: Client }
PUT    /api/clients/:id (partial body)
DELETE /api/clients/:id → blocked 409 if PAID invoices exist; else cascades
```

### Projects
```
GET  /api/projects     → { data: Project[] }  // nested quotes[] + invoices[]
POST /api/projects     { clientId, title, stage|status?, quotedAmount?, hoursLogged?,
                         notes?, startDate? 'YYYY-MM-DD', deadline? }
GET  /api/projects/:id
PUT  /api/projects/:id
DELETE /api/projects/:id                      // cascades
```
Project status values: `LEAD QUOTE_SENT IN_PROGRESS REVISIONS DELIVERED PAID`
(exposed as both `stage` and `status`; DB column is `status`).

### Quotes
```
GET  /api/quotes       → { data: Quote[] }
POST /api/quotes       { projectId, lineItems:[{description,quantity,unitRate}] (≥1),
                         taxRate? fraction-of-1 (0.18 = 18%), status?: DRAFT|SENT,
                         notes?, validUntil? }
GET  /api/quotes/:id
POST /api/quotes/:id/convert-to-invoice { dueDate? }   // defaults Net-30
```
Quote shape: `{ id, quoteNumber, projectId, clientId, project?, client?, status,
lineItems:[{description,quantity,unitRate,total}], subtotal, taxRate, taxAmount,
total, notes, validUntil, invoiceId?, createdAt, updatedAt }`.

Conversion duplicates line items onto the invoice (audit-safe), recomputes
totals server-side, marks the quote APPROVED and links `invoice.quoteId`.
Double conversion → 409.

### Invoices
```
GET  /api/invoices        → { data: Invoice[] }
GET  /api/invoices/:id    → { data: Invoice }
GET  /api/invoices/:id/pdf → binary application/pdf
POST /api/invoices/:id/mark-paid { amount? }   // omit amount = pay remaining in full
```
Invoice shape adds: `issueDate 'YYYY-MM-DD'`, `dueDate`, `amountPaid`,
`remainingBalance`, `paidAt?` (ISO). Partial payment ⇒ `PARTIAL`;
full payment stamps `paidAt`. Overpayment is clamped; paying a settled
invoice → 400.

### Dashboard
```
GET /api/dashboard/profitability?from=YYYY-MM-DD&to=YYYY-MM-DD
```
Returns the frontend `ProfitabilityDashboard` contract (grossRevenue,
paidAmount, outstandingAmount, overdueAmount, funnel, retentionTrend,
activityMatrix, categories, heroMetric, clientProfitability) PLUS backend-spec
extensions documented inline in `src/services/dashboardService.js`:
per-client/per-project revenue vs hoursLogged with revenuePerHour, and
most/least profitable clients.

## Architecture

```
src/
├── index.js            entrypoint + graceful shutdown
├── app.js              express assembly (cors, json, logging w/o bodies, routes)
├── config.js           env loading (cloud DB w/ local fallback)
├── db.js               Prisma singleton
├── middleware/         auth (JWT, fail-closed), central error handler
├── serializers/        DB row → stable API shapes (frontend contract)
├── services/           ALL business logic (auth, clients, projects, quotes,
│                       invoices, dashboard, pdf) — Express-independent
├── utils/              money math (Decimal-only), validation, sanitization
└── routes/             thin HTTP adapters over services
scripts/e2e-test.ps1    full-flow API test (33 assertions)
SCHEMA_DEVIATIONS.md    every schema change vs ergon-database.md, flagged
```

## ⚠️ GST/tax caveat

Tax math is `taxAmount = subtotal × taxRate` (tax-exclusive pricing).
**Place-of-supply rules, CGST/SGST vs IGST split, reverse charge, inclusive
pricing, exemptions and HSN/SAC classification are NOT implemented.** Verify
with a real accountant before live billing in India.

## Known environment notes

- Neon free tier suspends idle computes (~5 min); first request after idle may
  take seconds (`connect_timeout=15` handles this).
- This dev machine's ISP DNS drops ~1/3 of lookups — worked around by pinning
  the Neon pooler IP in `%SystemRoot%\System32\drivers\etc\hosts`.
- Local portable PostgreSQL 17 lives in `.pgsql/` (start: `pg_ctl -D .pgsql/data start`);
  set `DATABASE_URL` to `DATABASE_URL_LOCAL` value to develop fully offline.
