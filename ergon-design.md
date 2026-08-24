# Ergon — Design System

> Reference this file for every UI decision. It's the single source of truth for colors, type, spacing, and component styling — don't invent new values ad hoc per screen. Pairs with the reference screenshot already provided for this project.

## 1. Color Tokens

**Base surfaces**
- `--bg-page`: light neutral gray, `#F0F1F3` — the page background, never pure white
- `--bg-card`: near-white, `#FFFFFF` (or `#FAFAFA` for subtle layered cards)
- `--border-subtle`: very light gray, `#E8E9EC` — used sparingly, prefer shadow over border for separation

**Text**
- `--text-primary`: near-black, `#111111` — hero numbers, headings
- `--text-secondary`: muted gray, `#8A8D93` — inactive labels, supporting text
- `--text-inverse`: `#FFFFFF` — text on dark/gradient surfaces

**Accent palette (one per data series — apply consistently everywhere that metric appears)**
- `--accent-blue`: `#3B6FE0` — primary metric color (e.g. revenue, payments)
- `--accent-green`: `#2FBF71` — positive/growth metric (e.g. online payments, paid invoices)
- `--accent-pink`: `#E85D9A` — tertiary metric (e.g. in-store/manual, retention)
- `--accent-orange`: `#F2994A` — warning/attention metric (e.g. overdue, pending)

**Signature gradient (hero callout card only — use once per screen, not everywhere)**
- `--gradient-hero`: linear-gradient, `#F2994A` → `#3B6FE0`, diagonal (135deg)

**Semantic**
- `--status-paid`: `--accent-green`
- `--status-pending`: `--accent-blue` (or hatched blue)
- `--status-overdue`: `--accent-orange` or a dedicated red `#E0524F` if orange is already used for "pending" elsewhere on the same screen — don't reuse one color for two different statuses on the same view

## 2. Typography

- **Font family:** a clean grotesk-style sans-serif (e.g. Inter, General Sans, or system-ui as fallback) — no serif, no novelty fonts anywhere near numbers
- **Scale:**
  - Hero page title: 40–48px, weight 800 (e.g. "Overview")
  - Hero stat number: 36–44px, weight 800 (e.g. "$41.5k")
  - Card title: 18–20px, weight 700
  - Body/label text: 14–15px, weight 500
  - Secondary/muted label: 13–14px, weight 400, `--text-secondary`
- **Numbers are always the highest-contrast, boldest element on any card** — never let a label out-weigh the figure it's describing

## 3. Spacing & Layout

- Base spacing unit: 4px grid (use multiples of 4 for all padding/margin — 8, 12, 16, 24, 32)
- Card internal padding: 24px standard, 32px for hero/dashboard cards
- Grid gap between cards: 16–20px
- Page margin: 32px desktop, 16px mobile/APK

## 4. Border Radius

- Cards: 20–24px
- Buttons and inputs: 12–16px (or fully rounded/pill for primary CTAs and badges)
- Small badges/pills/tooltips: fully rounded (`9999px`)
- Keep radius consistent within a component type — don't mix a 24px card with an 8px button on the same screen

## 5. Elevation / Shadows

- Cards float on the page background via soft shadow, not borders: `box-shadow: 0 2px 12px rgba(0,0,0,0.06)`
- Hover/active states get a slightly stronger shadow, not a border color change
- The hero gradient card gets no shadow (it's already visually dominant via color)

## 6. Component Patterns

- **Primary button:** solid dark (`#111111`) or accent-colored, fully rounded, white text, generous horizontal padding (24px+) — used for the single most important action per screen ("New Quote," "Mark Paid")
- **Secondary button:** light gray fill or outline, same rounding, dark text
- **Nav active state:** solid dark rounded pill behind the active link — never underline or plain color-swap
- **Chart bars (comparison/inactive):** diagonal hatch/stripe pattern in the metric's accent color at reduced opacity
- **Chart bars (focused/active):** solid vertical gradient fill, light-to-saturated top-to-bottom, in the metric's accent color
- **Value labels on bars:** small white rounded-pill badge floating just above the bar top
- **Tooltips:** white background, soft shadow, rounded-full or large-radius rectangle, appears on hover/tap
- **Empty states:** friendly, not a bare gray box — use a simple icon/illustration plus one short encouraging line of copy

## 7. Motion

- Transitions: 150–250ms ease-out for hover/press states, 300ms for screen transitions
- Micro-celebration on "mark paid" or similar completion actions: a brief, subtle scale/checkmark animation — restrained, not confetti-heavy
- Never animate the actual number values in a way that delays reading them (e.g. no long count-up animations on financial totals — show the real number immediately, animate secondary chrome only)

## 8. Accessibility Notes

- Text/background contrast must meet WCAG AA at minimum, especially `--text-secondary` on `--bg-card`
- Color is never the only signal for status (paid/pending/overdue) — pair each accent color with a text label or icon
- Touch targets on APK/mobile: minimum 44x44px
