---
trigger: always_on
---

# Code Style Rules — Lumio

## Language & Compiler

- TypeScript **strict mode** is always enabled — `"strict": true` in `tsconfig.json`
- No `any` type anywhere — use `unknown` and narrow, or define a proper type
- No implicit `any` — every function parameter and return type must be explicitly typed
- Prefer `type` over `interface` for most object shapes — `type` is immutable by default and enforces stricter narrowing
- Use `interface` when: (a) extending a third-party type (e.g. `Session` from NextAuth), (b) declaration merging is required, or (c) the shape is a public API contract that may be extended downstream
- When in doubt, use `type`

---

## Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `QuizCard.tsx` |
| Files (lib/utils) | camelCase | `gamification.ts` |
| React components | PascalCase | `FlashcardDeck` |
| Functions | camelCase | `awardXP()` |
| Variables | camelCase | `subscriptionTier` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE_FREE` |
| Prisma models | PascalCase | `QuizAttempt` |
| Database columns (Prisma schema) | snake_case | `subscription_tier` |
| Database columns (TypeScript code) | camelCase | `subscriptionTier` |
| API routes | kebab-case | `/api/study/generate` |
| CSS classes (modules) | camelCase | `styles.studyCard` |
| Env variables | SCREAMING_SNAKE | `FLUTTERWAVE_SECRET_KEY` |

---

## File Structure Per Component

Every component file follows this order:

```tsx
// 1. Imports — external libraries first, then internal
import { useState } from "react"
import type { Document } from "@/types"

// 2. Types / interfaces local to this file
type Props = {
  document: Document
  onComplete: (score: number) => void
}

// 3. Component
export function QuizSession({ document, onComplete }: Props) {
  // 4. Hooks
  // 5. Derived state / computed values
  // 6. Handlers
  // 7. JSX return
}
```

---

## React & Next.js Patterns

- Prefer **Server Components** by default — only add `"use client"` when interactivity or browser APIs are required
- Never fetch data inside Client Components — pass data down as props from Server Components or use Server Actions
- Use **Next.js Server Actions** for form submissions and mutations where appropriate
- All API route handlers export named functions: `GET`, `POST`, `PATCH`, `DELETE`
- Always return typed `NextResponse` from API routes

```ts
// Good
export async function POST(req: Request): Promise<NextResponse> {
  ...
  return NextResponse.json({ success: true }, { status: 201 })
}
```

---

## Validation — Zod

- **Every** API route input is validated with a Zod schema before touching the database
- **Every** dynamic route param is validated before use
- Define schemas in the route file or in a co-located `schema.ts`

```ts
import { z } from "zod"

const uploadSchema = z.object({
  topicTag: z.string().min(1).max(100),
  studyGoal: z.string().min(1).max(200),
})

const parsed = uploadSchema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
}
```

---

## Error Handling

- All API routes are wrapped in try/catch — never let unhandled exceptions reach the client
- Return structured error responses: `{ error: string, code?: string }`
- Use HTTP status codes correctly: `400` bad input, `401` unauthenticated, `403` forbidden (wrong tier), `404` not found, `500` server error
- Log errors server-side; never expose stack traces or internal messages to the client

```ts
try {
  ...
} catch (error) {
  console.error("[upload/POST]", error)
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
}
```

---

## Database — Prisma

- Always use Prisma's typed client — never write raw SQL unless absolutely necessary
- Select only the fields you need — never `findMany()` without a `select` or `where`
- Validate input with Zod **before** any Prisma call
- Use transactions (`prisma.$transaction`) for operations that must succeed or fail together

```ts
// Good — select only needed fields
const document = await prisma.document.findUnique({
  where: { id: documentId },
  select: { id: true, userId: true, status: true, topicTag: true },
})
```

---

## Imports

- Use absolute imports with `@/` alias for all internal modules
- Group imports: external → internal lib → types → styles
- No barrel files (`index.ts` re-exports) unless the module is a public API — exceptions: `types/index.ts` (shared types entry point) and `components/ui/index.ts` (component library entry point)

```ts
// External
import { getServerSession } from "next-auth"

// Internal lib
import { awardXP } from "@/lib/gamification"
import { LIMITS, type TierKey } from "@/lib/limits"

// Types
import type { Tier } from "@/types"
```

---

## Comments & Documentation

- Functions in `lib/` must have a JSDoc comment explaining purpose, params, and return
- Complex business logic (tier gating, XP awards, streak logic) must have inline comments
- No commented-out code committed to the repo
- TODO comments must include a ticket or issue reference: `// TODO [LUM-42]: implement retry logic`

---

## Formatting

- Prettier is the formatter — no manual formatting debates
- ESLint enforces the above rules — no warnings are acceptable in CI
- Imports sorted automatically via `@trivago/prettier-plugin-sort-imports`
- Tailwind classes sorted via `prettier-plugin-tailwindcss`

---

## CSS & Styling

- **CSS Modules** (co-located `*.module.css`) are the only styling approach — no global class collisions
- **No Tailwind CSS** — all styling uses CSS Modules with token-driven `var(--*)` values
- Extract repeated patterns into reusable component primitives in `components/ui/`
- Responsive design uses `@media (min-width: ...)` queries inside CSS Modules
- Dark mode uses `[data-theme="dark"]` selector in `tokens/colors.css` — component CSS never references light/dark values directly

---

## Testing Conventions

| Aspect | Convention |
|---|---|
| Framework | Vitest |
| Component tests | Vitest + Testing Library (`@testing-library/react`) |
| API route tests | Vitest + supertest |
| E2E | Playwright |
| File naming | `*.test.ts` or `*.test.tsx` co-located next to the module |
| Test data | Factories via `@/lib/__test__/factories` — never inline raw Prisma data |

- Tests follow **Arrange–Act–Assert** with blank-line separation between phases
- Mock external services (AI API, S3, Resend, Flutterwave) — never call real endpoints in unit/integration tests
- E2E tests cover: auth flow, upload → study, subscription upgrade/downgrade
- Every API route must have at minimum: success case, validation rejection, auth gating, and tier enforcement

---

## Hooks Conventions

- Custom hooks live in `hooks/` at the project root or co-located with the nearest component
- Hook names must be `use`-prefixed (`useDebounce`, `useStudyProgress`)
- Hooks that interact with the AI API or study data go in `hooks/study/`
- Hooks that wrap subscription or payment logic go in `hooks/subscription/`
- Every custom hook must return a well-typed interface — avoid returning raw tuples

```ts
export function useStudyProgress(documentId: string): {
  summary: string | null
  flashcards: Flashcard[]
  isLoading: boolean
  error: string | null
}
```

---

## Directory Naming

| Location | Convention | Example |
|---|---|---|
| `app/` route directories | kebab-case | `verify-email/`, `reset-password/` |
| Route groups | prefixed with `()` | `(auth)`, `(dashboard)`, `(study)` |
| Dynamic segments | `[param]` | `[documentId]` |
| `components/` subdirectories | camelCase | `components/study/`, `components/ui/` |
| `lib/` files | camelCase | `lib/gamification.ts` |
| `hooks/` subdirectories | camelCase | `hooks/study/` |
| Test directories | `__tests__` or co-located | `__tests__/` within the module dir |

---

## Accessibility

- All interactive elements must have an accessible name — use `aria-label` when visible text is absent
- Form inputs must have associated `<label>` elements (not just placeholder)
- Images use `next/image` with a descriptive `alt` attribute — never `alt=""` unless decorative
- Colour is never the sole indicator of state — pair with text labels or icons
- Focus indicators must be visible (use Tailwind's `focus-visible:ring-2`)
- Interactive elements must be keyboard-operable — no click-only handlers

---

## Performance Patterns

- Use `next/image` for all local and remote images — configure remote patterns in `next.config.ts`
- Use `next/link` for client-side navigation instead of `<a>` tags for internal routes
- Dynamic imports with `next/dynamic` for heavy components (PDF viewers, chart libraries)
- Server Components by default — move interactivity to isolated client sub-trees, never wrap an entire page in `"use client"`
- Debounce rapid-fire inputs (search, filter) with a `useDebounce` hook (200ms delay)
- Avoid `useMemo` / `useCallback` by default — add only when profiling proves a performance bottleneck

---

## Server Actions vs API Routes

| Use Case | Approach |
|---|---|
| Form submissions (signup, settings, upload) | Server Action |
| Mutations requiring redirect or revalidation | Server Action |
| Third-party webhooks (Flutterwave, Resend) | API Route |
| Public/read-only data fetching | Server Component (direct DB) |
| Mobile app / external client access | API Route |
| File uploads with large payloads | API Route (stream directly to S3) |

- Server Actions are co-located in the page or component that uses them — name them after the action (`submitQuizAction`, `uploadDocumentAction`)
- API Routes are named after the resource (`GET`, `POST`, `PATCH`, `DELETE`) and placed under `app/api/`