# SKILL.md — Component Builder

## Purpose

This skill defines how to build every UI component in Lumio — from primitives (buttons, inputs, cards) to complex study tools (quiz sessions, flashcard decks, XP progress bars). All components follow the design system defined in `.agent/rules/design-system.md`.

---

## When to Use This Skill

- Scaffolding a new React component from scratch
- Building study tool UIs (quiz, flashcards, summary viewer)
- Building gamification widgets (streak counter, XP bar, milestone badges)
- Building subscription and upgrade UI (plan cards, limit banners)
- Extending or modifying existing components

---

## Component Rules (Non-Negotiable)

- Every component is a **named export** — no default exports except for Next.js pages
- Add `"use client"` only when the component uses state, effects, or browser APIs
- All props are **explicitly typed** — no implicit `any`
- Styles live in a co-located **CSS Module** file — `ComponentName.module.css`
- All design values (colors, spacing, radius, fonts) come from `design-tokens.css` variables — never hardcoded hex or px values
- No inline styles except for truly dynamic values (e.g. progress bar width from JS)

---

## Component File Template

```
components/
  [category]/
    ComponentName.tsx
    ComponentName.module.css
```

### `ComponentName.tsx`

```tsx
// 1. Directive (only if needed)
"use client"

// 2. Imports — external first, then internal
import { useState } from "react"
import type { Document } from "@/types"
import styles from "./ComponentName.module.css"

// 3. Local types
type Props = {
  // explicit, no any
}

// 4. Component — named export
export function ComponentName({ ...props }: Props) {
  // hooks
  // handlers
  // return JSX
}
```

---

## Primitive Components

### Button (`components/ui/Button.tsx`)

```tsx
import styles from "./Button.module.css"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size    = "sm" | "md" | "lg"

type Props = {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  disabled?: boolean
  onClick?:  () => void
  children:  React.ReactNode
}

export function Button({
  variant  = "primary",
  size     = "md",
  loading  = false,
  disabled = false,
  onClick,
  children,
}: Props) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[variant]} ${styles[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      {children}
    </button>
  )
}
```

```css
/* Button.module.css */
.btn {
  display:         inline-flex;
  align-items:     center;
  gap:             var(--spacing-2);
  border-radius:   var(--radius-md);
  font-family:     var(--font-family-base);
  font-weight:     500;
  cursor:          pointer;
  transition:      background var(--transition-fast), border-color var(--transition-fast);
  border:          none;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.primary   { background: var(--color-brand);   color: var(--color-text-inverse); }
.primary:hover:not(:disabled) { background: var(--color-brand-hover); }

.secondary { background: transparent; border: 1.5px solid var(--color-border); color: var(--color-text-primary); }
.secondary:hover:not(:disabled) { border-color: var(--color-brand); color: var(--color-brand); }

.ghost  { background: transparent; color: var(--color-text-secondary); }
.ghost:hover:not(:disabled) { color: var(--color-text-primary); }

.danger { background: var(--color-error); color: var(--color-text-inverse); }

.sm { padding: var(--spacing-2) var(--spacing-4); font-size: var(--font-size-sm); }
.md { padding: var(--spacing-3) var(--spacing-6); font-size: var(--font-size-base); }
.lg { padding: var(--spacing-4) var(--spacing-8); font-size: var(--font-size-lg); }

.spinner {
  width: 1em; height: 1em;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

### Input (`components/ui/Input.tsx`)

```tsx
import styles from "./Input.module.css"

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label:    string
  error?:   string
  hint?:    string
}

export function Input({ label, error, hint, id, ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-")
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        className={`${styles.input} ${error ? styles.inputError : ""}`}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        aria-invalid={!!error}
        {...rest}
      />
      {hint  && !error && <p id={`${inputId}-hint`}  className={styles.hint}>{hint}</p>}
      {error &&           <p id={`${inputId}-error`} className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
```

---

## Study Tool Components

### Quiz Session (`components/study/QuizSession.tsx`)

```tsx
"use client"

import { useState } from "react"
import type { QuizQuestion } from "@/types"
import { Button } from "@/components/ui/Button"
import styles from "./QuizSession.module.css"

type Props = {
  questions:   QuizQuestion[]
  documentId:  string
  onComplete:  (score: number, total: number) => void
}

export function QuizSession({ questions, documentId, onComplete }: Props) {
  const [current,   setCurrent]   = useState(0)
  const [selected,  setSelected]  = useState<number | null>(null)
  const [answered,  setAnswered]  = useState(false)
  const [score,     setScore]     = useState(0)

  if (!questions.length) {
    return <p className={styles.empty}>No quiz questions available.</p>
  }

  const question = questions[current]
  const isLast   = current === questions.length - 1

  function handleSelect(index: number) {
    if (answered) return
    setSelected(index)
    setAnswered(true)
    if (index === question.correctIndex) setScore(s => s + 1)
  }

  function handleNext() {
    if (isLast) {
      onComplete(score, questions.length)
      return
    }
    setCurrent(c => c + 1)
    setSelected(null)
    setAnswered(false)
  }

  return (
    <div className={styles.session}>
      <p className={styles.progress}>{current + 1} / {questions.length}</p>
      <h2 className={styles.question}>{question.question}</h2>
      <ul className={styles.options}>
        {question.options.map((opt, i) => (
          <li key={i}>
            <button
              type="button"
              className={`
                ${styles.option}
                ${answered && i === question.correctIndex ? styles.correct : ""}
                ${answered && i === selected && i !== question.correctIndex ? styles.wrong : ""}
              `}
              onClick={() => handleSelect(i)}
              disabled={answered}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
      {answered && (
        <div className={styles.feedback} role="status">
          <p className={styles.explanation}>{question.explanation}</p>
          <Button onClick={handleNext}>{isLast ? "See Results" : "Next"}</Button>
        </div>
      )}
    </div>
  )
}
```

---

### Flashcard Deck (`components/study/FlashcardDeck.tsx`)

```tsx
"use client"

import { useState } from "react"
import type { Flashcard } from "@/types"
import { Button } from "@/components/ui/Button"
import styles from "./FlashcardDeck.module.css"

type Props = {
  flashcards: Flashcard[]
  onComplete: (total: number) => void
}

export function FlashcardDeck({ flashcards, onComplete }: Props) {
  const [index,   setIndex]   = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (!flashcards.length) {
    return <p className={styles.empty}>No flashcards available.</p>
  }

  const card   = flashcards[index]
  const isLast = index === flashcards.length - 1

  function handleNext() {
    if (isLast) { onComplete(flashcards.length); return }
    setIndex(i => i + 1)
    setFlipped(false)
  }

  return (
    <div className={styles.deck}>
      <p className={styles.progress}>{index + 1} / {flashcards.length}</p>
      <button type="button" className={`${styles.card} ${flipped ? styles.flipped : ""}`} onClick={() => setFlipped(f => !f)}>
        <div className={styles.front}><p>{card.term}</p></div>
        <div className={styles.back}><p>{card.definition}</p></div>
      </button>
      <p className={styles.hint}>Tap card to reveal</p>
      {flipped && (
        <Button onClick={handleNext}>{isLast ? "Finish" : "Next Card"}</Button>
      )}
    </div>
  )
}
```

---

## Gamification Components

### XP Bar (`components/gamification/XPBar.tsx`)

```tsx
import styles from "./XPBar.module.css"

type Props = {
  current: number
  next:    number
  label?:  string
}

export function XPBar({ current, next, label }: Props) {
  const pct = Math.min(Math.round((current / next) * 100), 100)
  return (
    <div className={styles.wrapper}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.track} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.value}>{current} XP</span>
    </div>
  )
}
```

### Streak Counter (`components/gamification/StreakCounter.tsx`)

```tsx
import styles from "./StreakCounter.module.css"

type Props = { count: number }

export function StreakCounter({ count }: Props) {
  return (
    <div className={styles.streak}>
      <svg className={styles.flame} width="24" height="24" viewBox="0 0 24 24" fill="var(--color-accent)" aria-hidden>
        <path d="M12 2C10.5 5 8 7.5 8 10c0 2.2 1.8 4 4 4s4-1.8 4-4c0-2.5-2.5-5-4-8zm0 13c-3.3 0-6 2.7-6 6h12c0-3.3-2.7-6-6-6z"/>
      </svg>
      <span className={styles.count}>{count}</span>
      <span className={styles.label}>day streak</span>
    </div>
  )
}
```

---

## Subscription Components

### Upgrade Prompt (`components/subscription/UpgradePrompt.tsx`)

```tsx
import { Button } from "@/components/ui/Button"
import styles from "./UpgradePrompt.module.css"

type Props = {
  feature:      string
  requiredPlan: "STANDARD" | "PREMIUM"
  onUpgrade:    () => void
}

export function UpgradePrompt({ feature, requiredPlan, onUpgrade }: Props) {
  return (
    <div className={styles.prompt} role="status">
      <p className={styles.message}>
        <strong>{feature}</strong> is available on the{" "}
        <strong>{requiredPlan}</strong> plan.
      </p>
      <Button variant="primary" onClick={onUpgrade}>
        Upgrade to {requiredPlan}
      </Button>
    </div>
  )
}
```

---

## Accessibility Checklist (Every Component)

- [ ] Interactive elements are keyboard-navigable (`Tab`, `Enter`, `Space`)
- [ ] Focus rings visible on all focusable elements
- [ ] Icon-only buttons have `aria-label`
- [ ] Dynamic content updates use `role="status"` or `aria-live`
- [ ] Color is never the sole indicator of state (use icons or text too)
- [ ] Form inputs have associated `<label>` elements
- [ ] Quiz options announce result to screen readers via `aria-invalid` or live region

---

## Skeleton Loading Pattern

Always use skeleton screens over spinners for content areas:

```tsx
export function DocumentCardSkeleton() {
  return (
    <div className={styles.card} aria-busy="true" aria-label="Loading document">
      <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
      <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
      <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
    </div>
  )
}
```

```css
.skeleton {
  background: linear-gradient(90deg, var(--color-surface-elevated) 25%, var(--color-border) 50%, var(--color-surface-elevated) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--radius-sm);
}
@keyframes shimmer { to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```