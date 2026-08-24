# Ergon — Backend Build Prompt

> Hand this file to your AI coding tool for backend work. Assumes the database (see `ergon-database.md`) is already set up with Prisma and PostgreSQL running. This is being built for real production use in a working freelance studio — prioritize correctness and security over speed of delivery.

## 1. Stack

- **Runtime/Framework:** Node.js + Express
- **Database access:** Prisma Client (schema defined in `ergon-database.md`)
- **Auth:** JWT-based session auth, single studio-owner account for MVP
- **PDF generation:** for invoice/quote export (e.g. pdf-lib or similar Node-friendly library)
- **Password hashing:** bcrypt or argon2 — never store plaintext passwords

## 2. What This API Serves

The backend for Ergon, a client/quote/invoice/profitability management app for a freelance studio. It will be consumed by a React web frontend and an Android APK (same frontend, wrapped via Capacitor) — so the API should be a clean, versionless-for-now REST API with no assumptions baked in about which client is calling it.

## 3. API Routes (build in this order)

```
POST   /api/auth/signup
POST   /api/auth/login

GET    /api/clients
POST   /api/clients
GET    /api/clients/:id
PUT    /api/clients/:id
DELETE /api/clients/:id

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id

GET    /api/quotes
POST   /api/quotes
GET    /api/quotes/:id
POST   /api/quotes/:id/convert-to-invoice

GET    /api/invoices
GET    /api/invoices/:id
GET    /api/invoices/:id/pdf
POST   /api/invoices/:id/mark-paid

GET    /api/dashboard/profitability
```

## 4. Core Business Logic Requirements

- **Tax/total calculation happens server-side, always.** When a quote or invoice is created or updated, recompute the total from line items × quantities + tax rate on the server — never trust a total sent from the client, even if it matches what the frontend displayed.
- **Quote → Invoice conversion:** copy the quote's line items onto the new invoice at conversion time (don't just reference the quote), so if the quote is ever edited later, historical invoices remain unchanged. Mark the source quote as `APPROVED` and link `invoice.quoteId` back to it.
- **Payment status logic:** `mark-paid` should support full and partial payments — a partial payment sets status to `PARTIAL`, not `PAID`. An invoice past its `dueDate` with no `paidDate` should be treated as `OVERDUE` (compute this on read, or via a scheduled job — either is fine for MVP, just be consistent).
- **Profitability dashboard endpoint:** aggregate, per client and per project, `revenue = sum(invoice.total where status = PAID)` against `hoursLogged`, returning a computed `revenuePerHour`. Also return overall totals (gross revenue this period, outstanding amount, most/least profitable client) — the frontend dashboard depends on this shape, so keep the response structure stable once defined and document it inline in the route handler.
- **GST/tax correctness:** this handles real invoices for a India-based freelancer — implement tax calculation clearly and comment the logic, and explicitly flag in a code comment that the exact GST treatment (rate, inclusive vs. exclusive pricing, reverse charge scenarios) should be verified with a real accountant before this touches actual client billing.

## 5. Security Requirements (non-negotiable)

- Hash all passwords with bcrypt or argon2 — never plaintext, never reversible encryption
- Validate every request body server-side (types, required fields, sane ranges) — don't rely on frontend validation as the only gate
- All routes except `/api/auth/*` require a valid JWT — reject unauthenticated requests with 401, don't fail open
- Sanitize anything that goes into the generated PDF or is rendered back to the client to avoid injection issues
- Never log full request bodies containing passwords or tokens

## 6. Response Shape Convention

Keep responses consistent and predictable so the frontend can rely on a single pattern:

```json
// Success
{ "data": { ... } }

// Error
{ "error": { "message": "string", "code": "string" } }
```

Use this shape across every route — the frontend prompt assumes it.

## 7. Non-Functional Requirements

- Single-tenant, low-traffic tool — prioritize simplicity, readability, and correctness over premature performance optimization
- Structure the codebase by resource (routes/clients.js, routes/projects.js, etc.) with a clear separation between route handlers and business logic (a `services/` layer), so logic is testable independent of Express
- Include basic error handling middleware that catches unhandled errors and returns the standard error shape above instead of leaking stack traces

## 8. Working Instructions for the AI

1. Confirm the Prisma schema and seed data from `ergon-database.md` are in place and queryable before writing any routes
2. Build and test auth first (signup/login, JWT issuance and verification middleware)
3. Build clients → projects → quotes → invoices in that order, since each depends on the previous existing
4. Build the profitability dashboard endpoint last, once real quote/invoice data exists to aggregate
5. After each resource is built, note the exact request/response shape used, so the frontend prompt's assumptions can be checked against what was actually built
6. Do not introduce additional libraries or change the response shape convention without flagging it first
7. Flag any GST/tax logic assumption that needs real-world verification rather than silently guessing

## 9. Definition of Done

- Every route in Section 3 works end-to-end against the real database, tested with realistic data (not just happy-path empty requests)
- A full flow works via API calls alone (no frontend needed to verify): create client → create project → create quote → convert to invoice → mark paid → see it reflected in the profitability endpoint
- No password, token, or full request body appears in logs
