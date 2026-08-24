# Ergon — Frontend Build Prompt

> Hand this file to your AI coding tool for frontend work. Assumes the backend API (see `ergon-backend.md`) exposes the routes and response shape described below — build against that contract. If the deployed backend differs from what's documented here, confirm the real shape before building each screen rather than guessing.

## 1. Stack

- **Framework:** React + Tailwind CSS
- **APK packaging:** Capacitor (wraps this same React web app as an installable Android app — do not build a separate React Native codebase)
- **Charts:** Chart.js or Recharts for the profitability dashboard

## 2. What This App Is

Ergon — a client, quote, invoice, and profitability management app for a solo freelance studio. It's used for real daily work by a working freelance designer, so it needs to actually be pleasant and fast to use, not just functional. Ships as a responsive web app and an Android APK from the same codebase.

## 3. API Contract (backend already built to this shape — build against it)

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

Response shape convention used by every route:
```json
// Success
{ "data": { ... } }

// Error
{ "error": { "message": "string", "code": "string" } }
```

Auth: all routes except `/api/auth/*` require a JWT in the request header — store the token securely on login and attach it to every subsequent request; handle 401 by redirecting to login.

## 4. UI Direction — Match This Reference Style Exactly

This app should closely follow a specific reference dashboard aesthetic: light, airy, data-forward, subtly playful fintech-dashboard style. Not a generic admin template.

**Layout & structure:**
- Light neutral gray page background (not pure white), with white/near-white rounded cards floating on top — clear separation via soft shadow, not hard borders
- Large, consistent card corner radius (soft, pillowy — roughly 20–24px) across every card, button, and input
- Top nav bar: logo + wordmark on the left, horizontal text nav links, current section shown as a solid dark rounded pill (not underline or color change)
- Large, bold, oversized page title (e.g. "Overview") in a heavy sans-serif as the dominant visual anchor
- Multi-column card grid: one dominant wide card (main chart) alongside narrower side cards for key single-metric stats
- Date-range selector as a light rounded pill/dropdown near the top right

**Typography & color:**
- Clean, modern grotesk-style sans-serif throughout (headings very bold/heavy, body medium weight)
- Big black numbers for hero stats — always the boldest, highest-contrast element on a card
- Muted gray for secondary/inactive labels, full black for the active/highlighted metric
- A distinct accent color per data series/category (blue, green, pink, etc.) — color consistently groups related data across bars, lines, and badges
- Small pill-shaped badges/tooltips (white background, soft shadow, rounded-full) for extra detail on hover/tap

**Charts & data visualization:**
- Bar/funnel charts use a diagonal hatched/striped fill for inactive/comparison bars, with the focused bar shown as a solid gradient fill (light to saturated, top to bottom)
- Small rounded-pill value labels floating just above each bar
- Line/area charts use a soft color fill under a bold colored line, on a subtle gridline background
- A "dot grid"/waffle-style mini-visualization (small rounded squares, varying shade) as an alternative to bars for compact stats
- Every chart card has a small circular "•••" more-options button in its top-right corner

**Signature elements:**
- A floating "AI assistant" input bar docked at the bottom of the main dashboard chart card — soft blue-tinted background, sparkle icon, placeholder like "What would you like to explore next?" — wire this to something real: let the studio owner type a question like "what's my most profitable client this quarter" and compute an answer from the dashboard data, not just decorative
- One card breaks the light theme with a bold gradient background (warm orange-to-blue diagonal) and large white text, used for a single hero stat/insight (e.g. "Profit Margin: 42%")
- Progress/comparison bars as rounded horizontal pill bars filled with a diagonal stripe pattern in that metric's accent color

**Mobile/APK:** stack the card grid into a single column but keep the exact same card style, radius, color coding, and typography — reflow, don't simplify.

**Never compromise:** the real financial numbers must always stay bold, high-contrast, and unambiguous — the playfulness lives in shape, color, and chart style, never in the numbers themselves.

Build a design token set (color palette, spacing scale, border-radius scale, type scale) before building any screen, and apply it consistently.

## 5. Screens to Build (in this order)

1. **Login/Signup**
2. **Client list + detail** — list view with status filter (lead/active/past), detail view showing linked projects
3. **Project pipeline** — list or kanban across lead → quote sent → in progress → revisions → delivered → paid
4. **Quote creation/detail** — line item builder, live-computed total (display only — real total always comes from the server response after save), send/approve actions
5. **Invoice detail + PDF export** — payment status, due date, "mark paid" action, download/share PDF
6. **Dashboard/Overview** — the primary screen matching Section 4's reference style closely: gross revenue, outstanding amount, profitability chart, most/least profitable client, the AI query bar

## 6. Non-Functional Requirements

- **Mobile-first for key flows:** viewing project status, approving a quote, checking payment status must feel natural one-handed on the APK — don't just shrink a desktop layout
- **Never trust client-side totals as final** — always display what the server returns as the source of truth after any save, even if you compute a live preview while editing
- **Offline tolerance:** viewing recently loaded data should degrade gracefully without a connection; full offline-first sync is a stretch goal, not required for MVP

## 7. Capacitor/APK Packaging

- Build and verify the full web app first — don't debug web and APK issues simultaneously
- Once core flows work in the browser, add Capacitor, configure the Android platform, and test the build on a real device or emulator
- Pay particular attention to: touch target sizes (buttons/cards should be comfortably tappable, not just clickable), safe-area insets on notched devices, and that the floating AI-input bar and bottom nav (if any) don't overlap on smaller screens

## 8. Working Instructions for the AI

1. Set up the design token set (Section 4) before building any screen
2. Build screens in the order listed in Section 5
3. Build against the API contract in Section 3 — if the real backend response differs, flag it rather than silently adapting without noting the mismatch
4. After each screen, note what was built and what's left, rather than building the entire app silently in one pass
5. Add Capacitor/APK packaging only after the web app's core flows are working end to end

## 9. Definition of Done

- Every screen in Section 5 is built and functional against the real backend (not mocked data)
- The dashboard visually matches the reference style described in Section 4
- The Android APK builds successfully via Capacitor and the core flows (view projects, approve/send quote, check payment status) work on a real device
