# Ergon — Database Setup Prompt

> Hand this file to your AI coding tool as the first step of the build. Establish the database and schema before backend or frontend work begins — both other files depend on this.

## 1. Stack

- **Database:** PostgreSQL
- **ORM:** Prisma
- Use Prisma Migrate for schema changes (not raw SQL migrations) so the schema stays version-controlled and reproducible.

## 2. Context

Ergon is a client, quote, invoice, and profitability management app for a solo freelance studio. The schema needs to support the full lifecycle: client → project → quote → invoice → payment, plus lightweight time/effort logging for profitability analysis.

## 3. Entities & Relationships

- **User** — the studio owner. Single-tenant for MVP (one user), but design the schema so `userId` foreign keys exist on top-level records now, to make multi-user support easy to add later without a rewrite.
- **Client** — belongs to User. Has many Projects.
- **Project** — belongs to Client. Has one-to-many Quotes, tracks status through a pipeline, tracks logged hours.
- **Quote** — belongs to Project. Has many LineItems. Can be converted into an Invoice (keep a reference back to the source quote).
- **Invoice** — derived from a Quote (or created directly against a Project for ad-hoc billing). Tracks payment status and dates.
- **LineItem** — belongs to a Quote (and, once converted, effectively to the resulting Invoice too — decide whether to duplicate line items onto the Invoice at conversion time so historical quotes remain unchanged if edited later; duplicating is safer for audit/history).

## 4. Prisma Schema — Starting Point

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String?
  createdAt DateTime  @default(now())
  clients   Client[]
}

model Client {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  name      String
  email     String?
  phone     String?
  status    ClientStatus @default(LEAD)
  notes     String?
  createdAt DateTime  @default(now())
  projects  Project[]
}

enum ClientStatus {
  LEAD
  ACTIVE
  PAST
}

model Project {
  id            String        @id @default(cuid())
  clientId      String
  client        Client        @relation(fields: [clientId], references: [id])
  title         String
  status        ProjectStatus @default(LEAD)
  quotedAmount  Decimal?
  hoursLogged   Decimal       @default(0)
  createdAt     DateTime      @default(now())
  quotes        Quote[]
  invoices      Invoice[]
}

enum ProjectStatus {
  LEAD
  QUOTE_SENT
  IN_PROGRESS
  REVISIONS
  DELIVERED
  PAID
}

model Quote {
  id         String      @id @default(cuid())
  projectId  String
  project    Project     @relation(fields: [projectId], references: [id])
  taxRate    Decimal     @default(0)
  total      Decimal
  status     QuoteStatus @default(DRAFT)
  createdAt  DateTime    @default(now())
  lineItems  LineItem[]
  invoice    Invoice?
}

enum QuoteStatus {
  DRAFT
  SENT
  APPROVED
  REJECTED
}

model Invoice {
  id         String        @id @default(cuid())
  projectId  String
  project    Project       @relation(fields: [projectId], references: [id])
  quoteId    String?       @unique
  quote      Quote?        @relation(fields: [quoteId], references: [id])
  amount     Decimal
  tax        Decimal
  total      Decimal
  status     InvoiceStatus @default(UNPAID)
  dueDate    DateTime?
  paidDate   DateTime?
  createdAt  DateTime      @default(now())
  lineItems  LineItem[]
}

enum InvoiceStatus {
  UNPAID
  PARTIAL
  PAID
  OVERDUE
}

model LineItem {
  id          String   @id @default(cuid())
  quoteId     String?
  quote       Quote?   @relation(fields: [quoteId], references: [id])
  invoiceId   String?
  invoice     Invoice? @relation(fields: [invoiceId], references: [id])
  description String
  quantity    Decimal  @default(1)
  unitPrice   Decimal
}
```

Adjust field types/precision as needed — use `Decimal` (not `Float`) for every money field to avoid rounding errors, this matters for real invoices.

## 5. Constraints & Integrity Rules

- Every money field (`quotedAmount`, `total`, `amount`, `tax`, `unitPrice`) must be `Decimal`, never `Float`
- `Invoice.total` and `Quote.total` should be computed and stored server-side at creation time, never trusted from client input — recompute from line items + tax rate on the backend before saving
- Cascade behavior: deleting a Client should either cascade-delete its Projects/Quotes/Invoices or be blocked if any invoices are marked PAID (decide and enforce explicitly — don't leave this to default DB behavior)
- Add a database-level `createdAt` index on `Invoice` and `Project` for efficient dashboard date-range queries

## 6. Setup Steps for the AI

1. Initialize Prisma in the project (`npx prisma init`)
2. Implement the schema above (adjust as the backend logic requires, but keep money fields as `Decimal` and keep foreign keys as described)
3. Run the initial migration (`npx prisma migrate dev --name init`)
4. Generate the Prisma client
5. Write a small seed script (`prisma/seed.ts`) with 2–3 sample clients, projects, quotes, and invoices in varied statuses — this is needed so the backend and frontend teams have real data to build against immediately, not empty tables
6. Confirm the database connects and the seed data is queryable before handing off to backend work

## 7. Notes for Coordination

The backend prompt (`ergon-backend.md`) will build its API directly against this schema — do not rename fields or change types without updating that file too. If anything in this schema needs to change once backend logic is being written, flag it rather than silently modifying the schema.
