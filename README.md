# Ergon
https://ergon.shishirexe.com/

Freelance studio management app — track clients, projects, quotes and invoices, and see profitability at a glance. Ships as a responsive web app (Firebase Hosting) and an Android app (Capacitor).

## What it does

- **Clients** — manage leads, active clients and past clients with computed totals (billed, outstanding) per client
- **Projects pipeline** — group work under clients, track stage, quoted amount and hours logged
- **Quotes & Invoices** — line items with quantity × rate + tax; totals are always recomputed server-side. Invoice status (incl. automatic OVERDUE) is computed from due date and remaining balance
- **Dashboard analytics** — revenue/payments funnel, client retention steps, activity waffle grid, currency switching
- **Multi-studio** — switch between studios; data is scoped per studio
- **Auth** — email/password (bcrypt + JWT) with optional Google Sign-In (ID-token flow) and optional Neon Auth (Managed Better Auth)
- **PDF export** — client-side invoice PDFs (jsPDF) plus server-side generation (pdf-lib); share directly from Android via the Share plugin

## Core tech

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Charts | Recharts |
| Icons | lucide-react |
| Mobile | Capacitor 6 (Android shell, StatusBar, Share) |
| Backend | Node.js ≥18, Express |
| ORM / DB | Prisma 6 + PostgreSQL (Neon serverless Postgres) |
| Auth | jsonwebtoken, bcryptjs, jose (Google ID tokens / Neon Auth) |
| PDF | jsPDF (web), pdf-lib (server) |
| Hosting | Firebase Hosting + Firebase Functions (`/api/**` rewrite), Secret Manager for secrets |

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐
│  Web (Vite SPA) │     │  Android (Capacitor) │
└────────┬────────┘     └──────────┬───────────┘
         │        REST /api/*      │
         └──────────┬──────────────┘
                    ▼
      ┌───────────────────────────┐
      │ Express API               │
      │ routes → services →       │
      │ serializers → Prisma      │
      └────────────┬──────────────┘
                   ▼
        PostgreSQL (Neon / local pg 17)
```

Conventions:

- Every response is `{ "data": ... }` or `{ "error": { message, code } }`
- All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <jwt>`
- Money math and status derivation happen only on the server
- Rate limiting on auth endpoints; secrets never live in code (see `server/.env.example`)

## Getting started

### Backend

```bash
cd server
npm install
npx prisma migrate deploy   # apply schema
npx prisma db seed          # demo data: alex@ergonstudio.design / ergon-demo-2026
npm run dev                 # http://localhost:4000
```

Configure environment via `server/dev.env` (copy structure from `server/.env.example`):
`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`, optional `GOOGLE_CLIENT_ID` / `NEON_AUTH_BASE_URL`.

A portable PostgreSQL 17 lives in `.pgsql/` for fully offline development (`scripts/pg-start.ps1`).

### Frontend

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # type-check + production bundle to dist/
```

### Android

```bash
npm run build
npx cap sync android
# open android/ in Android Studio, or:
cd android && ./gradlew assembleDebug
```

## Deployment

Firebase Hosting serves the built SPA from `dist/` and rewrites `/api/**` to the Express app running as a Firebase Function:

```bash
npm run build
firebase deploy --only hosting,functions
```

Runtime secrets (DB URL, JWT secret) are provided by Secret Manager in production — never committed.
