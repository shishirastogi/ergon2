# Ergon — AI Working Guide

> Read this before touching any part of the codebase (database, backend, or frontend). It sets the conventions and working style every model should follow, regardless of which file (`ergon-database.md`, `ergon-backend.md`, `ergon-frontend.md`) it's actively building from.

## 1. Project Context

Ergon is a real, in-use tool — a client, quote, invoice, and profitability manager built by a freelance designer for their own studio. Not a tutorial or demo project. Code quality, correctness, and security matter more than speed of output.

## 2. File Map

- `ergon-database.md` — schema and setup (build first)
- `ergon-backend.md` — API and business logic (build second)
- `ergon-frontend.md` — screens, flows, and UI direction (build third)
- `ergon-design.md` — design tokens and component patterns (reference continuously while building frontend)
- `ergon-skills.md` — model-specific working instructions (Gemini 3.7 Flash)

## 3. Coding Conventions

- **Naming:** camelCase for JS/TS variables and functions, PascalCase for React components and Prisma models, kebab-case for file names except component files (match component name)
- **File structure (backend):** `routes/`, `services/` (business logic separate from route handlers), `middleware/`, `prisma/`
- **File structure (frontend):** `components/` (reusable, presentational), `screens/` or `pages/` (route-level), `hooks/`, `lib/` (API client, utilities)
- **Comments:** explain *why*, not *what* — don't narrate obvious code; do comment any non-obvious business rule (tax logic, status transitions)
- **Money:** always `Decimal` in the schema, always formatted consistently in the UI (2 decimal places, currency symbol from a single shared formatting utility — don't hand-format currency in multiple places)
- **Dates:** store in UTC, format for display in a single shared utility, be explicit about timezone assumptions in comments where it matters (due dates, overdue calculation)

## 4. Error Handling

- Backend: never leak stack traces or raw DB errors to the client — catch, log server-side, return the standard `{ error: { message, code } }` shape
- Frontend: every API call needs a loading state and an error state shown to the user — no silent failures, no infinite spinners
- Validate on both ends: frontend for UX (immediate feedback), backend for security (never trust the client)

## 5. Git / Change Hygiene

- Small, scoped commits per feature or fix — not one giant commit per file
- Commit messages describe the change and why, e.g. `Add server-side tax recalculation on quote save` not `update quote.js`
- After each meaningful milestone, summarize what changed and what's left — don't silently build large chunks of the app without checking in

## 6. Testing Expectations

- Backend: at minimum, manually verify each route against realistic data (not just empty/happy-path requests) — test the full client → project → quote → invoice → paid flow end to end before considering a milestone done
- Money/tax logic specifically needs deliberate test cases: zero-tax, partial payment, overdue calculation, quote-to-invoice line item copying
- Frontend: verify each screen against the actual backend response shape, not a mocked/assumed one

## 7. Cross-File Coordination Rules

- If backend work requires a schema change not covered in `ergon-database.md`, update that file's intent and flag the change — don't silently drift the schema out of sync with its documentation
- If frontend work reveals the backend response shape differs from what `ergon-frontend.md` assumes, flag the mismatch rather than quietly working around it
- Every model working on this project should treat `ergon-design.md` as non-negotiable for anything visual — no ad hoc styling decisions outside those tokens

## 8. When Uncertain

Ask rather than guess on:
- Any tax/GST calculation detail (flag for real-world verification, don't invent a rule)
- Any architectural decision not already specified (which library, which pattern) in the relevant build file
- Any point where following the spec exactly would produce a worse result than a small deviation — flag the tension, don't silently deviate
