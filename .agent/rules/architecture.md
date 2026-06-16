---
trigger: always_on
---

# Architecture Rules — Lumio

## Overview

Lumio is a full-stack AI-powered study companion built on Next.js (App Router). The architecture follows a server-first pattern — heavy logic lives in Server Components and API Route Handlers, the client receives only what it needs to render.

---

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js (App Router) | SSR, routing, API routes |
| Language | TypeScript (strict) | Type safety across all layers |
| Database | PostgreSQL | Relational data — users, docs, subs, XP |
| ORM | Prisma | Type-safe queries, schema management |
| Auth | NextAuth.js | Email + social login, session handling |
| File Storage | S3-compatible (cloud) | Secure per-user file storage |
| AI Processing | Third-party AI API | Summaries, flashcards, quizzes |
| Email | Resend | Transactional + notification emails |
| Payments | Flutterwave | Subscription billing, renewals, webhooks |
| Deployment | Vercel | CI/CD, edge functions, global CDN |

---

## Folder Structure

```
lumio/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   ├── verify-email/
│   │   └── reset-password/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── library/
│   │   └── settings/
│   ├── (study)/
│   │   ├── upload/
│   │   ├── [documentId]/
│   │   │   ├── summary/
│   │   │   ├── flashcards/
│   │   │   └── quiz/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── upload/
│   │   ├── study/
│   │   │   ├── generate/
│   │   │   └── [documentId]/
│   │   ├── subscription/
│   │   │   ├── create/
│   │   │   ├── cancel/
│   │   │   └── webhook/
│   │   └── gamification/
│   │       ├── xp/
│   │       └── streak/
│   └── layout.tsx
├── components/
│   ├── ui/              # Primitive components (buttons, inputs, cards)
│   ├── study/           # Study tool components (quiz, flashcard, summary)
│   ├── gamification/    # Streak, XP, progress widgets
│   ├── subscription/    # Plan cards, upgrade prompts, billing UI
│   └── layout/          # Navbar, sidebar, shell
├── lib/
│   ├── ai.ts            # AI API client + processing logic
│   ├── storage.ts       # S3 file upload helpers
│   ├── flutterwave.ts   # Flutterwave payment client
│   ├── email.ts         # Resend email helpers
│   ├── gamification.ts  # XP award + streak update logic
│   ├── limits.ts        # Tier-based limit config (no hardcoding)
│   └── utils.ts         # Shared utility functions
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── types/
│   └── index.ts         # Shared TypeScript types and enums
├── .agent/
│   └── rules/           # Agent context files (this folder)
├── .env.local
├── AGENTS.md
└── README.md
```

---

## Routing Conventions

- Route groups `(auth)`, `(dashboard)`, `(study)` separate concerns without affecting URL paths
- All dashboard and study routes are protected via NextAuth middleware
- API routes live under `app/api/` and follow REST conventions
- Dynamic segments use `[documentId]`, `[planId]` etc. — always validated with Zod before use

---

## Data Flow

```
Client → Server Component / API Route
       → Zod validation
       → Prisma (PostgreSQL)
       → Response
```

For AI-powered features:

```
Client uploads file
→ API Route: validate file type + size against tier
→ Store file in cloud storage
→ Create Document record (status: PROCESSING)
→ Trigger async AI processing job
→ AI API returns structured content
→ Store StudyContent record (status: READY)
→ Client polls or receives push notification
```

---

## Async Processing

- AI document processing is always async — never block the HTTP response
- Return a `{ status: "processing", documentId }` response immediately after upload
- Client polls `GET /api/study/[documentId]` for status updates
- On failure: retry once automatically, then set status to `FAILED` and notify the user

---

## State Management

- Server Components are the default — data fetching, authentication checks, and content rendering happen on the server
- Client-side state is limited to UI interactions: form input, modal open/close, animation state
- For client-side server-state sync, use a lightweight fetcher (native `fetch` in `useEffect` or a minimal wrapper) — no global state library
- URL search params are the source of truth for filter, sort, and pagination state
- Avoid prop drilling deeper than 2 levels — colocate state or lift to the nearest shared Server Component

---

## Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit / Integration | Vitest | Utility functions, Prisma queries, Zod schemas, gamification logic |
| Component | Vitest + Testing Library | UI components in isolation |
| API / Integration | Vitest + supertest | API route handlers with mocked Prisma |
| E2E | Playwright | Critical user flows: upload → study, auth, subscription flow |

- Test files live co-located with the module being tested (`*.test.ts` next to source)
- Prisma is mocked at the integration level — real queries are tested against a test database via `prisma migrate reset`
- API route tests validate Zod rejection, auth gating, and tier enforcement
- E2E tests run against a staging deployment on Vercel preview branches

---

## Error Handling

- API routes return a consistent error shape: `{ error: string, code: string, details?: unknown }`
- HTTP status codes follow standard conventions: 400 (validation), 401 (auth), 403 (tier/access), 404 (not found), 409 (duplicate), 429 (rate limit), 500 (server error)
- Server Components throw errors that are caught by the nearest `error.tsx` boundary
- Client-side mutations wrap fetch calls in try/catch and surface user-friendly toast messages
- Logging is structured (JSON) and tagged with request ID, userId, and action name for traceability

---

## Monitoring & Observability

- **Error tracking:** Sentry captures all unhandled exceptions and API 500s
- **Performance:** Vercel Analytics tracks Web Vitals (LCP, CLS, INP) and route-level timing
- **Custom metrics:** AI processing duration, upload-to-ready latency, quiz completion rate, streak engagement
- **Logging:** Console-based structured JSON in development; shipped to a log drain (e.g. Axiom, Logtail) in production
- **Uptime:** Vercel Status Dashboard + external health check pinging `GET /api/health` every 60s

---

## Security Patterns

- Rate limiting on auth routes (5 attempts per IP per minute) and API routes (60 req/min per user) via Vercel Edge Middleware or a `lib/rate-limit.ts` helper
- CORS is locked to the app's own origin — no wildcard allowances
- CSRF protection via Next.js built-in server action tokens (not applicable for API routes using Bearer/session auth)
- All uploaded files are scanned for MIME type mismatch before cloud storage write
- User data deletion on account closure cascades to all related records (documents, study content, XP logs)
- Password reset tokens expire after 15 minutes
- Flutterwave webhook endpoint validates the `verify-hash` header before processing any event

---

## Webhook Handling

- Flutterwave webhooks are received at `POST /api/subscription/webhook`
- Each webhook event is validated against the `FLUTTERWAVE_WEBHOOK_SECRET` before processing
- Webhook handlers are **idempotent** — the Flutterwave transaction reference (`txRef`) is checked against the `Subscription.paymentReference` field before applying any state change
- Accepted events: `charge.completed`, `subscription.cancelled`, `payment.failed`
- Failed webhook processing logs the error and returns a `500` — Flutterwave will retry up to 3 times
- No user-facing action depends synchronously on a webhook; subscription state is also refreshed on dashboard load

---

## Local Development

- **Database:** Docker Compose runs a local PostgreSQL instance on port 5432
- **AI API:** A mock server (`lib/__mocks__/ai.ts`) returns canned responses so development does not require API credits
- **File Storage:** Use `lib/storage-local.ts` backed by the local filesystem in development (swap imports via `STORAGE_DRIVER=local`)
- **Email:** Resend is put in test mode — emails are captured in a local log file instead of delivered
- **Payments:** Flutterwave test cards are used; webhooks can be triggered via Flutterwave's webhook tester or by `curl`-ing the local webhook endpoint with a test payload
- **Env file:** `.env.local.example` documents every variable with a placeholder — copy to `.env.local` and fill in credentials
- **Seeding:** `prisma/seed.ts` creates a demo user on each tier for manual testing

---

## Internationalization (i18n)

- Primary market is Nigeria — default locale is `en-NG` with British English spelling conventions
- Translations are stored as JSON in `messages/{locale}.json` and loaded via a minimal runtime (no heavy i18n framework)
- Dynamic segments for locale (`/en/dashboard`, `/ha/dashboard`) are **not** implemented in v1 — locale is determined by browser `Accept-Language` header and user preference in settings
- Currency formatting always uses `₦` (NGN) — prices are stored and displayed in Naira only
- Date formatting uses `en-NG` locale (DD/MM/YYYY) across the app

---

## API Versioning

- All current API routes live under `/api/` with **no version prefix** (v1 implicit)
- When a breaking change is required, mount the new version at `/api/v2/...` and maintain backward compatibility for one release cycle
- Old routes are deprecated via a `Sunset` response header and removed after two weeks
- Internal routes (used only by Server Components, never called from the client) are exempt from versioning

---

## Environment Variables

```env
# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# File Storage
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

# AI API
AI_API_KEY=
AI_API_URL=

# YouTube Data API
YOUTUBE_API_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@lumio.app

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_SECRET=
```

---

## Key Constraints

- TypeScript strict mode is **always on** — no `any`, no implicit `any`
- All database operations are preceded by Zod validation
- Feature limits are **config-driven** (see `lib/limits.ts`, exported as `LIMITS`) — never hardcoded in components or API routes
- Subscription tier is **always validated server-side** — never trust client-passed tier values
- Uploaded files are never stored on the app server — always streamed directly to cloud storage
- Raw uploaded materials are deleted from processing memory after AI content is generated
- Duplicate uploads are detected by filename + content hash (`fileHash`) before processing — redirect to existing document if matched
- AI content generation requires a minimum content threshold; if the extracted text is too short, show a clear warning and skip quiz/flashcard generation
- YouTube section loads independently — never block AI content if the YouTube API is unavailable; hide the section gracefully
- Streak and XP logic only executes for Premium users — gated server-side before any gamification mutation
- All XP events are logged to the `XPLog` table for audit and analytics
- Streak resets to zero if a full calendar day is missed without any study action