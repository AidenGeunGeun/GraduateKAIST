# Spec: UI Redesign — Warm Palette, Font Upgrade, Modern SaaS Polish

## Intent

Replace the current cold-green/zinc design system with a warm amber + mint palette, upgrade the Latin/numeric font to Plus Jakarta Sans, and add subtle card depth to achieve a modern, warm-professional SaaS look. No component logic, domain model, or layout structure changes.

## Context

Current system:
- Base neutrals: Tailwind zinc family (`#09090b` background, `#18181b` surface) — cold blue-gray tone
- Accent: `#34d399` (emerald green) — generic, cold
- Success: `#10b981` (emerald) — generic
- Font: Pretendard only (good for Korean, neutral for Latin)

Target:
- Base neutrals: Tailwind stone family — warm brown-gray tone
- Primary accent: `#DBA159` (Sunlit Clay) — warm amber for CTAs, active states, brand
- Success/fulfilled: `#D0E3CC` (Frosted Mint) — cool sage for completed requirements, privacy badge
- Font: Plus Jakarta Sans (Latin/numeric) + Pretendard (Korean) stacked
- Depth: subtle card shadows

## Color Decisions

### Semantic mapping rationale

| Token | Dark mode value | Light mode value | Usage |
|---|---|---|---|
| `--accent` | `#dba159` | `#935d1f` | Brand, CTAs, focus rings, callout pills, hover |
| `--success` | `#d0e3cc` | `#3d7a59` | Fulfilled states, privacy badge, supported badge |
| `--warning` | `#f59e0b` | `#c2730f` | In-progress, caution states |
| `--danger` | `#f87171` | `#dc2626` | Error, failed, behind |
| `--background` | `#0c0a09` | `#fafaf7` | Page background |
| `--surface` | `#1c1917` | `#ffffff` | Cards, panels |
| `--surface-soft` | `#292524` | `#f5f3ef` | Raised elements, progress track |
| `--border` | `#44403c` | `#e4e0d8` | All borders |
| `--text` | `#fafaf9` | `#1c1917` | Primary text |
| `--text-muted` | `#a8a29e` | `#78716c` | Secondary text |

**Light mode accent contrast**: `#935d1f` on `#fafaf7` ≈ 5:1 (WCAG AA pass). Verify and darken further if needed.

**Success = mint, not green**: The mint palette choice creates a clear visual identity — warm amber means "do something / achieved", cool mint means "complete / safe". These don't conflict visually.

**Warning ≠ accent**: `#f59e0b` (bright saturated amber-yellow) is visually distinct from `#dba159` (warm tan-amber) — different hue, saturation, and brightness. No confusion.

## Font Decisions

- **Install**: `@fontsource-variable/plus-jakarta-sans` (variable font, weights 200–800)
- **Stack**: `"Plus Jakarta Sans", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
- **How it works**: browser uses PJS for all Latin/numeric/symbol characters, falls back to Pretendard for Korean characters. Both fonts are self-hosted — no network requests to Google.
- **Mono**: keep `Geist_Mono` (from `next/font/google`) for code display — no change.
- **CSP**: no changes needed — fonts are self-hosted, no external font CDN URLs.

## Card Shadow

Add a themed shadow token driven by CSS variables (dark/light mode differ):

```
dark:  0 1px 3px rgba(0,0,0,0.32), 0 1px 2px rgba(0,0,0,0.16)
light: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)
```

Register as `--shadow-card-value` in `:root` and `:root.light`, then expose via `@theme inline` as `--shadow-card: var(--shadow-card-value)` so `shadow-card` works as a Tailwind utility.

## Changes Required

### 1. `package.json`

Install:
```
@fontsource-variable/plus-jakarta-sans
```

### 2. `src/app/globals.css` — full rewrite

Replace everything before the `* { box-sizing: border-box; }` rule with:

```css
@import "tailwindcss";
@import "@fontsource-variable/plus-jakarta-sans";
@import "@fontsource/pretendard/400.css";
@import "@fontsource/pretendard/500.css";
@import "@fontsource/pretendard/600.css";
@import "@fontsource/pretendard/700.css";

:root {
  color-scheme: dark;
  --background: #0c0a09;
  --surface: #1c1917;
  --surface-soft: #292524;
  --border: #44403c;
  --text: #fafaf9;
  --text-muted: #a8a29e;
  --accent: #dba159;
  --success: #d0e3cc;
  --warning: #f59e0b;
  --danger: #f87171;
  --shadow-card-value: 0 1px 3px rgba(0,0,0,0.32), 0 1px 2px rgba(0,0,0,0.16);
}

:root.light {
  color-scheme: light;
  --background: #fafaf7;
  --surface: #ffffff;
  --surface-soft: #f5f3ef;
  --border: #e4e0d8;
  --text: #1c1917;
  --text-muted: #78716c;
  --accent: #935d1f;
  --success: #3d7a59;
  --warning: #c2730f;
  --danger: #dc2626;
  --shadow-card-value: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
}

@theme inline {
  --font-sans: "Plus Jakarta Sans", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  --font-mono: var(--font-geist-mono), "SFMono-Regular", "Consolas", monospace;

  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-surface-soft: var(--surface-soft);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-text-muted: var(--text-muted);
  --color-accent: var(--accent);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);

  --shadow-card: var(--shadow-card-value);
}
```

Keep everything after `* { box-sizing: border-box; }` (html/body rules, button transitions, focus-visible, animations) — no changes to those.

### 3. `src/app/layout.tsx`

No changes required. `Geist_Mono` is imported via `next/font/google` and assigned to `--font-geist-mono`. This is consumed by `--font-mono`. PJS is loaded via `@fontsource-variable` in globals.css. The `font-sans` CSS variable picks up PJS automatically.

### 4. Add `shadow-card` to primary card shells

Add `shadow-card` to the outer wrapper class string of these components:

| File | Current class string (partial) | Change |
|---|---|---|
| `src/app/components/dashboard/StatusHero.tsx` | `rounded-xl border border-border bg-surface p-4` | add `shadow-card` |
| `src/app/components/dashboard/CategoryCard.tsx` | `rounded-xl border border-border bg-surface p-3` | add `shadow-card` |
| `src/app/components/dashboard/AuTracker.tsx` | `rounded-xl border border-border bg-surface p-3` | add `shadow-card` |
| `src/app/page.tsx` (upload card) | `rounded-2xl border border-border bg-surface p-5 sm:p-6` | add `shadow-card` |

Also scan and add `shadow-card` to any other `rounded-xl border border-border bg-surface` card shells found in:
- `src/app/components/dashboard/HssDistribution.tsx`
- `src/app/components/dashboard/GpaSection.tsx` (if present as a card)
- `src/app/components/dashboard/WhatIfSimulator.tsx`
- `src/app/components/dashboard/ProgramRequirementSection.tsx`
- `src/app/components/dashboard/WarningsPanel.tsx`

### 5. Root `AGENTS.md` — add Design System section

After the existing content (before any trailing newline), append a new `## UI Design System` section documenting:
- Color palette with exact hex values (dark + light)
- Semantic color usage rules (accent = brand/CTA, success = fulfilled/safe, warning = caution, danger = error)
- Font stack
- Card pattern (`rounded-xl border border-border bg-surface shadow-card`)
- Rule: agents MUST NOT change color tokens, font stack, or card pattern without updating this section

## Acceptance Criteria

1. `npm install` succeeds with `@fontsource-variable/plus-jakarta-sans` added
2. `npx next build` passes
3. `npx vitest run` passes (115 tests unchanged — no domain logic touched)
4. Dark mode: CTA button is warm amber, fulfilled states are mint, base surfaces are warm stone
5. Light mode: readable at WCAG AA for all semantic text colors
6. Plus Jakarta Sans is active — verify in browser DevTools that Latin characters use PJS
7. Card surfaces have visible subtle shadow in both modes
8. AGENTS.md Design System section is present and accurate

## Out of Scope

- Layout restructure
- Component logic or domain model changes
- New features or UI flows
- Adding new color variants beyond the 8 tokens
- Changing border radius values
- Typography scale changes (font sizes, weights)
- Animation changes
