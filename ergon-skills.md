# Ergon — Skills & Capability Guide for Gemini 3.7 Flash

> This file tells you (Gemini 3.7 Flash) specifically how to use your own settings and built-in capabilities for this project. Read alongside `ergon-ai-guide.md` for general conventions — this file is only about *how* to work, not *what* to build.

## 1. Thinking Level — Set Per Task, Not Globally

You support three thinking levels (LOW, MEDIUM, HIGH — MINIMAL is not available on this model). Don't leave it on one setting for the whole project; match it to the task:

- **HIGH** — use for:
  - Any tax/GST calculation logic (`ergon-backend.md` Section 4) — this is exactly the kind of finance-adjacent, correctness-critical reasoning task worth the extra thinking budget
  - The quote → invoice conversion logic and payment-status state machine
  - The profitability dashboard aggregation query (multi-table joins, per-client/per-project math)
  - Debugging any issue that isn't immediately obvious from the error message
- **MEDIUM (default)** — use for:
  - Standard CRUD route implementation (clients, projects)
  - Most React component building once the design tokens and API contract are already defined
  - Day-to-day feature work that follows an established pattern already in the codebase
- **LOW** — use for:
  - Boilerplate (route scaffolding, repetitive component variants, straightforward styling once a pattern is established)
  - Fast iteration loops, e.g. small copy/label tweaks, minor spacing adjustments

Don't default to LOW to save time on anything touching money, auth, or data integrity — the cost of a mistake there is much higher than the cost of a slower response.

## 2. UI Generation — Use Your Design-Adherence Strength

You have strong, benchmarked design-system adherence when given a reference (screenshot, image, or full design system) — this is one of your specific strengths as of this model version. For this project:

- Treat `ergon-design.md` as the "full design system" input — apply its tokens exactly rather than approximating from memory once you've read it
- When building any screen, re-check the built component against `ergon-design.md`'s color, radius, and typography values before considering it done — don't let values drift screen to screen
- For the dashboard screen specifically, prioritize matching the reference style closely (card layout, chart treatment, hero gradient card) — this is a case where high design-parity matters for the resume/portfolio value of the project, not just functionality

## 3. Agentic / Multi-Step Work

You have improved multi-step planning and tool-calling for this kind of task. Use that deliberately rather than doing everything in one flat pass:

- Before starting a build file (database, backend, or frontend), do a short internal plan: what order will you build things in, what depends on what — then execute against that plan rather than improvising step order live
- When a task spans many files (e.g. "wire the dashboard to the profitability endpoint"), decompose it: confirm the endpoint's real response shape first, then build the frontend consumer against that confirmed shape — don't build both ends simultaneously from assumption
- Check in after each milestone (per `ergon-ai-guide.md` Section 5) rather than running the entire plan silently to completion — this project is meant to be reviewed and understood by the person building it, not just generated

## 4. Long Context — Use It for Consistency, Not Just Volume

You support a large context window. For this project, that means:

- Keep the full set of project files (`ergon-database.md`, `ergon-backend.md`, `ergon-frontend.md`, `ergon-design.md`, `ergon-ai-guide.md`) loaded together when working on any single piece, rather than working from just the one file in isolation — cross-checking against the schema and design tokens in the same context prevents drift
- When revisiting a screen or route built earlier in the session, re-read what you actually built (not what you intended to build) before extending it, to avoid contradicting earlier decisions

## 5. What Not to Rely On

- Don't assume parity with your own past outputs from a different session/context — always verify against the actual current state of the code and the actual current backend response shape, not what you remember writing
- Don't silently swap in a different library, pattern, or file structure than what's specified in the build files, even if you judge it "better" — flag the suggestion instead, per `ergon-ai-guide.md` Section 8
