---
trigger: always_on
---

# Security Rules — Lumio

## Core Principles

1. **Never trust the client** — all authorization and tier checks happen server-side
2. **Validate everything** — every input is validated with Zod before touching the DB or AI pipeline
   - **SQL injection** is prevented by Prisma's parameterised queries — raw SQL is never used (see `code-style.md`)
3. **Least privilege** — users can only read and modify their own data
4. **Delegate sensitive operations** — payments handled entirely by Flutterwave, never raw card data on our server
5. **No secrets in code** — all credentials live in environment variables, never committed

---

## Authentication

- Authentication is handled by **NextAuth.js** — see `authentication.md` for full rules
- Every API route and Server Action that touches user data must verify the session:

```ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

- Session tokens are **httpOnly, Secure, SameSite=Lax** cookies — never stored in localStorage
- JWT secrets rotate on deploy — `NEXTAUTH_SECRET` must be a strong random value (min 32 chars)
- JWT tokens expire after **30 days** — the `maxAge` option in NextAuth controls this
- On password change, all existing sessions are invalidated via the `tokenVersion` field on the User model (see `authentication.md`)

---

## Authorization — Tier & Ownership Checks

Every protected action requires **two checks**, in this order:

1. **Ownership** — does this resource belong to the authenticated user?
2. **Tier** — does the user's active subscription permit this action?

```ts
// 1. Ownership check
const document = await prisma.document.findUnique({ where: { id: documentId } })
if (!document || document.userId !== session.user.id) {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}

// 2. Tier check
import { LIMITS, type TierKey } from "@/lib/limits"

const tier   = session.user.subscriptionTier as TierKey
const limits = LIMITS[tier]

const monthlyCount = await prisma.document.count({
  where: {
    userId: session.user.id,
    createdAt: { gte: startOfMonth(new Date()) },
  },
})

if (monthlyCount >= limits.practiceTestsPerMonth) {
  return NextResponse.json({ error: "Plan limit reached" }, { status: 403 })
}
```

- **Never** use client-passed tier values — always read from the database session
- Tier is re-validated on every gated request — not cached on the client

---

## Input Validation

- All API route bodies and query params are validated with **Zod** before any processing
- All dynamic route params (e.g. `documentId`) are validated as non-empty strings or UUIDs
- Reject unknown fields — use `z.object({}).strict()` where appropriate

```ts
const schema = z.object({
  topicTag: z.string().min(1).max(100).trim(),
  studyGoal: z.string().min(1).max(200).trim(),
}).strict()

const result = schema.safeParse(await req.json())
if (!result.success) {
  return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
}
```

---

## File Uploads

- Validate **before** processing:
  - Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX), `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX), `image/jpeg`, `image/png`, `image/webp`, `text/plain`
  - File size checked against the user's tier limit **before** upload begins
- Files are streamed directly to cloud storage — never written to the app server filesystem
- Each file is stored under a **per-user path**: `uploads/{userId}/{uuid}-{filename}`
- File URLs are **not publicly guessable** — use signed/presigned URLs for access
- Raw file content is removed from memory after AI processing completes
- Uploaded materials are **never shared between users** — ownership enforced at storage and DB level
- Duplicate detection uses `SHA-256` content hash — computed server-side, not trusted from client

---

## Password Handling

- Passwords are hashed with **bcrypt** at a minimum of **12 salt rounds** before storage
- Plain-text passwords are never logged, stored, or transmitted after the initial hash
- Password reset tokens are generated with `crypto.randomBytes(32)` — not Math.random
- Reset tokens expire after **1 hour** and are single-use (deleted on successful reset)

---

## Payments (Flutterwave)

- **No raw card data** ever touches Lumio's server — Flutterwave handles all PCI-sensitive operations
- Flutterwave webhook payloads are verified using `FLUTTERWAVE_WEBHOOK_SECRET` before processing:

```ts
import crypto from "crypto"

function verifyFlutterwaveWebhook(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.FLUTTERWAVE_WEBHOOK_SECRET!)
    .update(payload)
    .digest("hex")
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
```

- Subscription status is **only updated** after a verified webhook event — never from client-side callbacks
- `payment_reference` values are stored but treated as opaque strings — never parsed for logic
- See `subscription.md` for full payment flow rules

---

## Environment Variables

- All secrets live in `.env.local` (development) and Vercel environment settings (production)
- `.env.local` is in `.gitignore` — **never committed**
- A `.env.example` file (no real values) is committed to document required variables
- Required variables are validated at startup using a Zod schema in `lib/env.ts`

```ts
import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  FLUTTERWAVE_SECRET_KEY: z.string().min(1),
  FLUTTERWAVE_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  AI_API_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)
```

---

## Data Privacy & XSS Prevention

- Users can delete their account — this triggers deletion of all personal data and uploaded files
- Uploaded materials are not used to train AI models — processing is request-scoped only
- Email addresses are never exposed in API responses beyond the authenticated user's own session
- HTTPS is enforced across all endpoints — HTTP requests are redirected
- **XSS prevention:** Next.js auto-escapes dynamic values in JSX by default — never use `dangerouslySetInnerHTML` on user-generated content (document summaries, study goals, AI output). If HTML rendering is unavoidable, sanitise through a library like DOMPurify on the client and validate the output server-side

---

## Error Handling

- Stack traces and internal error messages are **never** sent to the client
- Server-side errors are logged with context (route, userId if available) but without sensitive data
- All error responses follow the same shape: `{ error: string, code?: string }`
- `500` errors are caught globally — unhandled promise rejections are treated as bugs

---

## Rate Limiting

- Auth endpoints (login, signup, password reset): **5 attempts per IP per 15-minute window** — prevents credential brute-forcing
- File upload endpoints: **10 uploads per user per minute** — prevents storage abuse
- Rate limiting is enforced at the API route level using `lib/rate-limit.ts` (in-memory `Map<string, { count, reset }>` for single-instance; Redis-backed for multi-instance Vercel deployments)
- Exceeded rate limits return `429 Too Many Requests` with a `Retry-After` header (seconds until reset)
- Global API rate limit: **60 requests per user per minute** across all non-auth endpoints

---

## CORS

- The API origin is restricted to the app's own deployment URL — no wildcard `Access-Control-Allow-Origin`
- CORS is configured in `next.config.ts` or via Vercel's `vercel.json` headers
- For mobile app access, specific trusted origins are added to an allowlist — never opened to all origins

```ts
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.APP_URL! },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ]
  },
}
```

---

## Security Headers

Every response should include these headers (set in `next.config.ts` or Vercel `vercel.json`):

| Header | Value | Purpose |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Enforce HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restrict unused browser features |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self'` | Mitigate XSS and data injection |

The CSP is intentionally permissive (`'unsafe-inline'` for styles, `https:` for images/connections) to accommodate CSS Modules and cloud-stored content. Tighten as the app matures.

---

## Dependency Security

- Run `npm audit` in CI — builds fail on vulnerabilities with severity `high` or `critical`
- Dependabot (or equivalent) is enabled on the repository — automated PRs for vulnerable dependencies
- Pin exact versions in `package.json` for production dependencies — no range (`^` or `~`) for critical packages
- Review all new dependencies for maintenance status, download counts, and security history before adding
- Prisma and Next.js are kept on the latest stable minor — patch updates are applied automatically via Renovate/Dependabot