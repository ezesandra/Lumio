---
trigger: always_on
---

# Design System Rules — Lumio

## Design Philosophy

Lumio is a **habit-forming study companion** — the UI must feel motivating, clear, and rewarding. Every design decision reinforces three emotional tones:

- **Clarity** — students are stressed; the interface removes friction, not adds it
- **Energy** — gamification elements feel alive, not decorative
- **Trust** — progress, data, and payments are communicated with confidence

---

## Token Files Are the Source of Truth

Lumio has two canonical token files. **Never hardcode a value a token already covers.** Propose token changes via PR — never modify the file unilaterally.

- `tokens/colors.css` — all color values mapped to semantic CSS custom properties
- `tokens/typography.css` — font sizes, weights, line heights, font families
- `tokens/layout.css` — spacing scale, border radius, shadows, z-index, transitions

These files export CSS custom properties available globally. All agents and components must read from them.

---

## Mandatory: Use Variables, Never Raw Values

**Wrong:**
```css
color: #4F46E5;
font-size: 16px;
font-family: 'Plus Jakarta Sans', sans-serif;
padding: 24px;
border-radius: 8px;
```

**Correct:**
```css
color: var(--color-brand);
font-size: var(--font-size-base);
font-family: var(--font-family-base);
padding: var(--spacing-6);
border-radius: var(--radius-md);
```

Before writing any style value — color, size, space, or radius — check the token files first. If a variable exists for what you need, use it. If it does not exist, ask before inventing a new value.

---

## Color Tokens (`tokens/colors.css`)

All colors follow a semantic naming convention organised by role:

### Text Colors
- `--color-text-primary` — primary body text
- `--color-text-secondary` — muted text, labels, hints
- `--color-text-inverse` — text on dark or brand-colored backgrounds

### Surface Colors
- `--color-surface` — page background
- `--color-surface-elevated` — cards, modals, dropdowns
- `--color-surface-hover` — hover state for interactive surfaces

### Brand Colors
- `--color-brand` — primary brand color (CTAs, active nav, links)
- `--color-brand-hover` — hover state for brand elements
- `--color-brand-subtle` — light brand tint for backgrounds

### Accent Colors (Gamification)
- `--color-accent` — XP, streaks, milestone highlights (amber family)
- `--color-accent-light` — light tint for gamification backgrounds

### Feedback Colors
- `--color-success` — correct answers, completed sessions, active subscription
- `--color-error` — errors, wrong answers, destructive actions, failed payments
- `--color-warning` — approaching limits, streak at risk, grace period

### Border Colors
- `--color-border` — default borders and dividers
- `--color-border-focus` — focus ring on interactive elements

---

## Typography Tokens (`tokens/typography.css`)

### Font Families
- `--font-family-base` — all body copy, labels, inputs, UI text
- `--font-family-display` — headings, page titles, card headers
- `--font-family-mono` — code snippets only

### Font Size Scale

| Variable | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--font-size-xs` | 0.75rem / 12px | 400 | 1.5 | Captions, helper text |
| `--font-size-sm` | 0.875rem / 14px | 400 | 1.5 | Labels, metadata, badges |
| `--font-size-base` | 1rem / 16px | 400 | 1.5 | Body text, inputs |
| `--font-size-md` | 1.125rem / 18px | 500 | 1.4 | Subheadings, card titles |
| `--font-size-lg` | 1.5rem / 24px | 600 | 1.3 | Section headings |
| `--font-size-xl` | 2rem / 32px | 700 | 1.2 | Page titles |
| `--font-size-fluid-xl` | `clamp(1.5rem, 4vw, 2.5rem)` | 700 | 1.2 | Fluid page titles (scales with viewport) |

Font sizes are primarily `rem` values — they respect user browser settings for accessibility. Use `--font-size-fluid-xl` only for hero-level page titles where fluid scaling is desired.

---

## Spacing Scale (`tokens/layout.css`)

Use CSS custom properties for **all** spacing — margin, padding, gap. No raw pixel values.

| Variable | Value | Usage |
|---|---|---|
| `--spacing-1` | 4px | Tight gaps, icon padding |
| `--spacing-2` | 8px | Small padding, inline gaps |
| `--spacing-3` | 12px | Standard component gaps |
| `--spacing-4` | 16px | Standard component padding |
| `--spacing-6` | 24px | Card padding, section gaps |
| `--spacing-8` | 32px | Large section gaps |
| `--spacing-12` | 48px | Page margins, hero padding |
| `--spacing-16` | 64px | Hero sections, page-level spacing |

**Wrong:**
```css
padding: 24px;
gap: 12px;
margin-bottom: 32px;
```

**Correct:**
```css
padding: var(--spacing-6);
gap: var(--spacing-3);
margin-bottom: var(--spacing-8);
```

---

## Border Radius (`tokens/layout.css`)

| Variable | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badges, tags, small chips |
| `--radius-md` | 8px | Buttons, inputs, dropdowns |
| `--radius-lg` | 12px | Cards, modals, panels |
| `--radius-full` | 9999px | Pills, avatars, streak counter |

---

## Shadows (`tokens/layout.css`)

| Variable | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.06)` | Subtle depth in cards |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.08)` | Dropdowns, popovers |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modals, side panels |
| `--shadow-xl` | `0 12px 40px rgba(0,0,0,0.16)` | Full-screen overlays, toast stacks |

Access via `var(--shadow-*)` in CSS Module files.

---

## Z-Index Scale (`tokens/layout.css`)

| Variable | Value | Usage |
|---|---|---|
| `--z-dropdown` | 100 | Dropdowns, popovers |
| `--z-sticky` | 200 | Sticky nav, sidebar |
| `--z-modal-backdrop` | 300 | Modal/side-panel backdrop |
| `--z-modal` | 400 | Modals, side panels |
| `--z-toast` | 500 | Toasts, notifications |

Access via `var(--z-*)` in CSS Module files.

---

## Transitions (`tokens/layout.css`)

| Variable | Value | Usage |
|---|---|---|
| `--transition-fast` | 150ms ease | Hover states, micro-interactions |
| `--transition-normal` | 250ms ease | Page transitions, panel open/close |
| `--transition-slow` | 400ms ease | XP award animations, streak pulses |

Access via `var(--transition-*)` in CSS Module files.

---

## Styling Method

All component styles use **CSS Modules** (`.module.css` files) — no global class collisions. Co-locate the CSS Module with its component: `QuizCard.tsx` + `QuizCard.module.css`.

```css
/* QuizCard.module.css */
.card {
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
}
```

### Importing in components

```tsx
import styles from "./QuizCard.module.css"

export function QuizCard() {
  return <div className={styles.card}>...</div>
}
```

### Rules

- Always read from `var(--*)` tokens — never hardcode colours, sizes, or spacing
- Use `composes` for shared class patterns instead of duplicating declarations
- Complex animations, `@media print`, and `@keyframes` belong in CSS Modules (they cannot be expressed as utility classes)

### Prohibited

- **No Tailwind CSS** — all styling uses CSS Modules
- **No inline `style={{}}`** except for truly dynamic JS-driven values (e.g. progress bar width computed at runtime)
- **No styled-components, no Emotion, no CSS-in-JS libraries**

---

## Breakpoints — Mobile First

Lumio is **mobile-first**. Default styles target small screens. Layer in larger-screen styles with min-width breakpoints.

| Name | Min Width | Usage |
|---|---|---|
| `sm` | 640px | Large phones in landscape |
| `md` | 768px | Tablet and up |
| `lg` | 1024px | Desktop and up |
| `xl` | 1280px | Large screens |
| `2xl` | 1536px | Very wide screens |

### Responsive Patterns

Use CSS Modules with media queries for all responsive behaviour:

```css
/* CardGrid.module.css */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-4);
}

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

### Responsive Typography

Use `clamp()` for fluid type scaling on large headings:

```css
--font-size-fluid-xl: clamp(1.5rem, 4vw, 2.5rem);
```

Set in `tokens/typography.css` and exposed as `var(--font-size-fluid-xl)`. Body text (`--font-size-base`) remains fixed at `1rem` for readability.

---

## Gamification UI Rules

Gamification elements (streaks, XP, milestones) must feel rewarding and alive — not static.

- **Streak counter** — uses `--color-accent`, flame icon, bold number, `--font-family-display`
- **XP progress bar** — animated fill, uses `--color-brand`, percentage label inline
- **Milestone badges** — `--radius-full` pill, `--color-accent-light` background, icon + label
- **Quiz feedback** — `--color-success` for correct, `--color-error` for wrong; always show explanation text beneath
- **Score summary** — shown at end of session, large number in `--font-size-xl`, with contextual message

---

## Accessibility Rules

- All interactive elements are keyboard-navigable (`Tab`, `Enter`, `Space`)
- Focus rings always visible — use `--color-border-focus` — **never** `outline: none` without a replacement
- Colour contrast: minimum WCAG AA (4.5:1 for text, 3:1 for UI components)
- All icon-only buttons must have `aria-label`
- Form inputs must have an associated `<label>` element
- Color is never the sole indicator of state — always pair with an icon or text label
- **Touch targets:** All interactive elements must be a minimum of **44px tall** (buttons, nav items, quiz options, flashcard controls, icon-only buttons)

---

## Motion & Animation

- Animations must serve a purpose — never purely decorative
- Content areas use **skeleton screens**, not spinners
- `prefers-reduced-motion` must be respected — wrap non-essential animations:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

Recommended motion patterns:
- XP award: scale-up + accent glow on the XP counter
- Streak increment: flame icon pulse
- Quiz feedback: slide-in correct/incorrect banner
- Page transitions: subtle fade (`opacity`, `250ms ease`)
- Skeleton shimmer: `background-position` sweep

---

## Dark Mode

- Supported via `[data-theme="dark"]` on the root `<html>` element
- All dark-mode overrides live in `tokens/colors.css` — not in component CSS
- Component CSS Modules never reference light or dark values directly — they always use semantic `var(--color-*)` tokens, so dark mode works automatically when the theme attribute changes

---

## Icon System

- **Library:** [Lucide React](https://lucide.dev) (`lucide-react`) — open-source, consistent stroke-based icons
- All icons use `size={20}` by default (adjust per context: `16` for inline, `24` for feature icons)
- Icons inherit `currentColor` — colour is controlled via CSS Module `color` property on the parent or by passing a `className` that applies the colour from a token
- Decorative icons (purely visual, no meaning) use `aria-hidden="true"`
- Interactive icons (icon-only buttons) require `aria-label` + `aria-hidden="false"`

```tsx
import { Flame, Play } from "lucide-react"
import styles from "./StreakCounter.module.css"

// Gamification icon — colour set by parent CSS Module
<Flame className={styles.flameIcon} size={20} aria-hidden="true" />

// Interactive button with accessible label
<button aria-label="Start quiz">
  <Play size={20} />
</button>
```

```css
/* StreakCounter.module.css */
.flameIcon {
  color: var(--color-accent);
}
```

---

## Component Primitives

All reusable UI primitives live in `components/ui/` and follow consistent patterns.

### Button

Four variants, three sizes, and an icon-only modifier:

| Prop | Values |
|---|---|
| `variant` | `primary`, `secondary`, `ghost`, `danger` |
| `size` | `sm` (32px), `md` (40px default), `lg` (48px) |
| `iconOnly` | boolean — removes padding, preserves 44×44px touch target |

```css
/* Button.module.css */
.button {
  font-family: var(--font-family-base);
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}
.primary    { background: var(--color-brand); color: var(--color-text-inverse); }
.secondary  { background: var(--color-surface-elevated); color: var(--color-text-primary); }
.ghost      { background: transparent; color: var(--color-text-primary); }
.danger     { background: var(--color-error); color: var(--color-text-inverse); }
.sm         { height: 32px; padding: 0 var(--spacing-3); }
.md         { height: 40px; padding: 0 var(--spacing-4); }
.lg         { height: 48px; padding: 0 var(--spacing-6); }
.iconOnly   { padding: 0; width: 44px; }
```

### Input

| Prop | Values |
|---|---|
| `variant` | `outline` (default), `filled` |
| `size` | `sm`, `md`, `lg` |
| `error` | string — shows error border + message beneath |

```css
/* Input.module.css */
.input {
  font-family: var(--font-family-base);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 2px var(--color-border-focus);
}
.outline { background: var(--color-surface); }
.filled  { background: var(--color-surface-elevated); }
.error   { border-color: var(--color-error); }
.sm      { height: 32px; padding: 0 var(--spacing-3); }
.md      { height: 40px; padding: 0 var(--spacing-4); }
.lg      { height: 48px; padding: 0 var(--spacing-6); }
```

### Card

Used for documents, study sessions, subscription plans.

```css
/* Card.module.css */
.card {
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-sm);
}
.elevated { box-shadow: var(--shadow-md); }
```

```tsx
import styles from "./Card.module.css"

// Standard card
<div className={styles.card}>
  <h3 className="title">Document Title</h3>
  <p className="description">Description</p>
</div>
```

```css
/* co-located CSS Module */
.title {
  font-family: var(--font-family-display);
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}
.description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-2);
}
```