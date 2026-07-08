# Design System: VETOnline

This document is the visual specification `/implement-frontend` and `/playwright-test` (in `aiup-fastapi-react/`)
must follow when building or verifying UI. If a screen doesn't match the tokens and patterns below, either the
implementation or this document is wrong — the same rule this project applies to business logic (`BR-xxx`) applies
here to visual design.

## Source and Intent

Visual direction taken from [telavets.com](https://www.telavets.com/) (a warm navy/gold/teal palette, Lora display
type, generous rounding) and deliberately adapted for VETOnline's actual context: an **internal, single-clinic staff
tool** (vision.md), not a consumer marketing site. The result should read as calm and efficient rather than
sales-forward — no pricing badges, no "24/7" urgency language, no marketing hero copy.

A working mockup validating this direction against six representative screens is committed at
[`design-mockup.html`](./design-mockup.html) — open it directly in a browser (it's self-contained, no build step)
before implementing a screen that isn't covered below.

## Color Tokens

Defined as CSS custom properties. Both themes are first-class — dark mode is not a naive invert (see
`docs/guidelines/architecture.md` for the general pattern of documenting deliberate decisions).

### Light (default)

| Token | Value | Role |
| :--- | :--- | :--- |
| `--bg` | `#FBF9F5` | Page background (warm off-white, not clinical stark white) |
| `--surface` | `#FFFFFF` | Cards, inputs |
| `--surface-2` | `#F3EEE4` | Recessed panels (pet cards inside owner details, pill backgrounds) |
| `--text` | `#111827` | Primary text |
| `--text-muted` | `#5B6472` | Secondary text, field labels, metadata |
| `--navy` | `#0A1D2F` | Primary dark — nav band, owner-card header, error shell |
| `--navy-ink` | `#F2EDE3` | Text/icons on navy backgrounds |
| `--gold` | `#FBCD66` | Primary accent — primary buttons, confirmation banner |
| `--gold-ink` | `#4A3708` | Text on gold backgrounds (never white-on-gold — insufficient contrast) |
| `--teal` | `#7FA6B3` | Secondary accent — secondary buttons, active states, pet-count chip |
| `--teal-ink` | `#0A1D2F` | Text on teal-tinted backgrounds |
| `--border` | `rgba(10,29,47,0.12)` | Default hairline border |
| `--border-strong` | `rgba(10,29,47,0.22)` | Hover/focus border, input borders |
| `--danger` | `#A83E28` | Validation errors, destructive states — semantic, not part of the 6-token accent identity |
| `--danger-bg` | `#FBE9E3` | Error banner/input background |
| `--success` | `#3E6B4F` | Reserved for future explicit success states beyond the confirmation banner |
| `--success-bg` | `#E8F0E9` | — |

### Dark

| Token | Value |
| :--- | :--- |
| `--bg` | `#081420` |
| `--surface` | `#0E2131` |
| `--surface-2` | `#0A1A28` |
| `--text` | `#F2EDE3` |
| `--text-muted` | `#A9B9C4` |
| `--navy` | `#050D15` |
| `--navy-ink` | `#F2EDE3` |
| `--gold` | `#FBCD66` (unchanged — gold reads correctly on dark grounds without adjustment) |
| `--gold-ink` | `#2C2004` |
| `--teal` | `#8FB6C2` |
| `--teal-ink` | `#051019` |
| `--border` | `rgba(242,237,227,0.14)` |
| `--border-strong` | `rgba(242,237,227,0.26)` |
| `--danger` | `#E38A6D` (lightened for legibility on dark) |
| `--danger-bg` | `#2B1712` |
| `--success` | `#86B698` |
| `--success-bg` | `#12241A` |

Both palettes must stay in sync — a token added to one belongs in both.

## Typography

- **Display** (`--font-display`): `'Lora', Georgia, 'Times New Roman', serif`. Weights **400** and **600** only.
  Used for page titles, section headers (`h1`/`h2`/`h3`), and pet/vet names. Used with restraint — never for body
  copy, form labels, or table data.
- **Body/UI** (`--font-body`): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`. Forms,
  nav, buttons, table/list content. No custom body webfont — this is a Chrome-only internal tool
  (requirements.md C-018), so the system stack renders identically for every user with zero load cost.

### Font hosting (implementation note)

**Self-host the two Lora weights** — do not load them from Google Fonts at runtime. Bundle
`lora-400.woff2` and `lora-600.woff2` under `frontend/src/assets/fonts/` and declare them via `@font-face` in a
global stylesheet (e.g. `frontend/src/styles/fonts.css`), the same two `@font-face` blocks already used in
`design-mockup.html` — copy them directly rather than re-generating. This keeps the frontend free of an external
runtime dependency, consistent with this project's general posture (no unnecessary third-party services during the
prototype phase — see architecture.md §0).

## Shape and Elevation

| Token | Value | Used for |
| :--- | :--- | :--- |
| `--radius-s` | `0.5rem` | Inputs |
| `--radius-m` | `0.875rem` | Cards, pet cards, confirmation/error banners |
| `--radius-l` | `1.5rem` | Owner-card, hero art panel, error shell |
| `--radius-full` | `999px` | Buttons, pills/badges, chips |
| `--shadow` | `0 4px 16px rgba(10,29,47,0.08)` (light) / `0 4px 16px rgba(0,0,0,0.35)` (dark) | Default card elevation |
| `--shadow-lg` | `0 12px 32px rgba(10,29,47,0.14)` (light) / `0 16px 40px rgba(0,0,0,0.5)` (dark) | Hover state, owner-card, error shell |

Rounding is deliberately generous (matching the reference site) — don't default to a smaller radius for "density"
reasons without updating this table first.

## Components

Exact markup/CSS patterns are in `design-mockup.html`; this section is the index of what exists so an
implementation doesn't invent a parallel pattern.

- **Buttons** — `.btn-primary` (gold fill, `--gold-ink` text — the default action per screen: Save, Add Owner,
  Book Visit), `.btn-secondary` (teal-tinted outline — secondary actions: Edit, Cancel-adjacent), `.btn-ghost`
  (borderless, muted — tertiary/low-emphasis actions), all pill-shaped (`--radius-full`). A `.btn-sm` modifier for
  in-card actions (Edit Pet, Add Visit).
- **Pills/badges** — `.pill` (muted, for a neutral tag like a "None" specialty state) and `.pill-accent` (gold-tinted
  outline, for an actual specialty or notable tag). Wide letter-spacing (`0.09em`), uppercase, small (`0.68rem`) —
  the recurring "label" treatment borrowed from the reference site's badge style.
- **Cards** — a generic `.card` base; `.vet-card`, `.pet-card`, `.owner-card` (with a navy `.owner-card-head` band)
  are specific compositions of it. Don't build a new card style per screen.
- **Form fields** — `.field` + `.input`, `.field-error` (red helper text under an invalid field), `.input-error`
  (red-tinted border/background on the invalid input itself), `.form-alert` (page-level error banner, used for e.g.
  "There was an error in creating the owner.").
- **Confirmation banner (signature element)** — `.confirm-banner`: gold left border, gold circular check icon, a
  wide-tracked `"Saved"` eyebrow label above the actual message in Lora (`"New Owner Created"`, `"Your visit has
  been booked"`, etc.). This is the **one** consistently animated element (a 0.45s ease-out entrance,
  `prefers-reduced-motion`-gated) — reserve motion for this, don't add page-load animations elsewhere. Use this
  exact pattern for every mutating use case's success notification (UC-003, UC-006, UC-007, UC-008, UC-009): same
  markup, same animation, only the message text changes.
- **Nav** — sticky navy bar, `Lora` wordmark with a small inline SVG mark (paw/cross motif, no external image —
  CSP/asset-loading constraints aside, this project has no clinic logo asset yet; use the same inline SVG until one
  exists).
- **Error shell** — centered navy card (`.error-shell`) for UC-010, reused for both the "Not Found" and "Unexpected
  Error" variants (only the heading/body text changes, not the shape).

## Accessibility and Motion

- Visible focus state on every interactive element: `outline: 2px solid var(--teal); outline-offset: 2px;` via
  `:focus-visible` — never remove the default outline without replacing it.
- Respect `prefers-reduced-motion: reduce` — collapse the confirmation-banner entrance and any other transition to
  near-zero duration.
- `font-variant-numeric: tabular-nums` on any column of digits (telephone numbers, dates in visit lists) so they
  align.

## Per-Screen Guidance

| Use Case | Primary components |
| :--- | :--- |
| UC-001 Welcome | Nav, hero split layout (headline + inline SVG art panel) |
| UC-002 Veterinarians | `.grid-vets` card grid, `.pill`/`.pill-accent`, infinite-scroll loading row |
| UC-004 Find Owners | `.search-row` + `.owner-list` of `.owner-row`, pet-count chip |
| UC-005 Owner Details | `.owner-card` with navy head band, `.pet-card` list, `.visit-list` |
| UC-003/006/007/008/009 forms | `.form-shell`, `.field`/`.input`, `.confirm-banner` on success, `.form-alert` +
  `.field-error`/`.input-error` on failure |
| UC-010 Error | `.error-shell`, reused for both A1 (Not Found) and A2 (Unexpected Error) |
| UC-011 Login | Not yet mocked — follow the form-field and button patterns above; centered on the `--navy`
  background like the error shell |

If a use case isn't listed here or in `design-mockup.html`, compose it from the components above rather than
inventing new visual patterns.
