# Ergon — Schema Deviations from `ergon-database.md`

Per the coordination note in `ergon-database.md` §7 ("flag it rather than
silently modifying"), every change made to the starting-point schema is listed
here. **All fields, enums and relationships from the original doc are intact**
— deviations are additive (new columns) or renames required by the frontend API
contract (`src/types/index.ts`), which is the consumer this database serves.

## 1. Added columns (frontend contract requires them persisted)

| Model   | Column        | Type / Default          | Why                                                                 |
| ------- | ------------- | ----------------------- | ------------------------------------------------------------------- |
| User    | `studioName`  | String?                 | Signup form sends it; shown as wordmark in UI                       |
| User    | `updatedAt`   | DateTime @updatedAt     | Frontend `User`-adjacent flows expect freshness metadata            |
| Client  | `company`     | String?                 | Frontend Client type + seed data use company                        |
| Project | `notes`       | String?                 | Frontend Project.notes                                              |
| Project | `startDate`   | DateTime?               | Frontend Project.startDate ('YYYY-MM-DD')                           |
| Project | `deadline`    | DateTime?               | Frontend Project.deadline                                           |
| Quote   | `quoteNumber` | String @unique          | Human-readable numbering (QUO-2026-001); generated server-side      |
| Quote   | `clientId`    | String (denormalized)   | Frontend reads quote.clientId directly; derived server-side from project — never trusted from requests |
| Quote   | `subtotal`    | Decimal(12,2)           | Frontend displays subtotal + taxAmount + total                      |
| Quote   | `taxAmount`   | Decimal(12,2)           | Stored computed tax (server-side only)                              |
| Quote   | `notes`       | String?                 | Frontend Quote.notes                                                |
| Quote   | `validUntil`  | DateTime?               | Frontend Quote.validUntil                                           |
| Invoice | `invoiceNumber` | String @unique        | INV-2026-001 numbering; generated server-side                       |
| Invoice | `clientId`    | String (denormalized)   | Same rationale as quotes                                            |
| Invoice | `issueDate`   | DateTime @default(now())| Frontend Invoice.issueDate                                          |
| Invoice | `subtotal` / `taxAmount` / `taxRate` | Decimal | Replaces spec's single `amount`+`tax` pair to match frontend math display |
| Invoice | `amountPaid`  | Decimal(12,2) default 0 | Required for PARTIAL payment tracking (spec §4 mark-paid logic)     |
| Invoice | `notes`       | String?                 | Copied from quote at conversion                                     |
| LineItem | `position`   | Int default 0           | Preserves user-defined line ordering                                |

## 2. Renames vs the base schema (flagged, mapped in serializers)

| Base doc field      | Final field   | Reason                                                     |
| ------------------- | ------------- | ---------------------------------------------------------- |
| Invoice.`paidDate`  | kept as `paidDate` in DB | Exposed as `paidAt` in API responses (frontend key). DB column unchanged from spec. |
| Invoice.`amount`/`tax` | `subtotal`/`taxAmount` (+ stored `total`) | Frontend computes/displays subtotal·taxRate separately |

## 3. Precision decisions

- Money: `Decimal(12,2)` everywhere (`quotedAmount`, `subtotal`, `taxAmount`, `total`, `unitPrice`, `amountPaid`)
- `taxRate`: `Decimal(6,4)` storing a **fraction** (0.18 = 18%) — matches the frontend convention exactly
- `hoursLogged`: `Decimal(8,2)`
- All money arithmetic uses Prisma's Decimal (no floats anywhere server-side)

## 4. Cascade policy (spec §5 decision)

- Deleting a **Client with PAID invoices → blocked (409)** in the service layer;
  otherwise client delete cascades Projects → Quotes/Invoices → LineItems via
  schema-level `onDelete: Cascade`.
- Deleting a converted Quote sets `Invoice.quoteId` to NULL (`SetNull`) rather
  than destroying the invoice.

## 5. Indexes

- Spec-required: `@@index([createdAt])` on Invoice and Project ✅
- Added for query patterns: FK indexes (`userId`, `clientId`, `projectId`,
  `quoteId`, `invoiceId`), status lookups, and `Invoice.dueDate` (overdue scans)

## 6. Operational notes

- Table names snake_plural via `@@map`; columns stay camelCase (Prisma default)
- `datasource directUrl` added: Neon's main URL goes through PgBouncer
  (transaction mode); migrations need the unpooled endpoint when reachable.
  On networks where the direct endpoint is blocked, both may point at the pooler.
- **Interactive Prisma transactions are NOT used** — they break under
  transaction-mode pooling (P2028). Correctness relies on atomic statements +
  unique constraints instead (see quoteService.js).
