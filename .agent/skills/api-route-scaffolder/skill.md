# SKILL.md — API Route Scaffolder

## Purpose

This skill defines how every API route in Lumio is structured, validated, and secured. It provides ready-to-use scaffolds for all major route categories — upload, study content, gamification, subscription, and auth — along with the patterns every route must follow.

---

## When to Use This Skill

- Creating any new `app/api/` route handler
- Adding a new endpoint to an existing route group
- Reviewing or refactoring an existing API route
- Writing tests for API routes

---

## Non-Negotiable Route Rules

1. **Session check first** — every protected route verifies `getServerSession` before any logic
2. **Zod validation second** — all request bodies and params validated before touching DB or AI
3. **Ownership check** — resource must belong to the authenticated user
4. **Tier check** — subscription tier validated server-side against `LIMITS` (see `lib/limits.ts`)
5. **Typed response** — always return `NextResponse.json(...)` with explicit HTTP status codes
6. **Try/catch everything** — no unhandled exceptions reach the client
7. **No stack traces in responses** — log server-side, return generic message to client
8. **Rate limit enforcement** — every route applies rate limiting via the shared middleware or a per-route guard (see `lib/rate-limit.ts`)
9. **CORS only on public endpoints** — auth-related routes that accept cross-origin requests must explicitly set CORS headers

---

## Route File Template

```
app/
  api/
    [resource]/
      route.ts          ← collection (GET list, POST create)
      [id]/
        route.ts        ← item (GET one, PATCH update, DELETE)
```

---

## Tier Limits (`lib/limits.ts`)

Every route that gates features by plan reads from this central config:

```ts
export const LIMITS = {
  FREE: {
    maxFileSizeBytes:    300 * 1024 * 1024,  // 300 MB
    practiceTestsPerMonth: 1,
    questionsPerTest:      40,
    gamification:          false,
    youtubeRecommendations: false,
    simplifiedExplanations: false,
    advancedAnalytics:     false,
    priorityProcessing:    false,
  },
  STANDARD: {
    maxFileSizeBytes:    500 * 1024 * 1024,  // 500 MB
    practiceTestsPerMonth: 10,
    questionsPerTest:      100,
    gamification:          false,
    youtubeRecommendations: true,
    simplifiedExplanations: true,
    advancedAnalytics:     false,
    priorityProcessing:    false,
  },
  PREMIUM: {
    maxFileSizeBytes:    1024 * 1024 * 1024,  // 1 GB
    practiceTestsPerMonth: Infinity,
    questionsPerTest:      Infinity,
    gamification:          true,
    youtubeRecommendations: true,
    simplifiedExplanations: true,
    advancedAnalytics:     true,
    priorityProcessing:    true,
  },
} as const

export type TierKey = keyof typeof LIMITS
```

### Base Scaffold

```ts
// app/api/[resource]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// ── Input Schema ─────────────────────────────────────────
const schema = z.object({
  // define fields here
})

// ── POST /api/[resource] ──────────────────────────────────
export async function POST(req: Request): Promise<NextResponse> {
  // 1. Auth
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Validate input
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // 3. Business logic + DB
  try {
    // ... prisma calls here
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("[resource/POST]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}

// ── GET /api/[resource] (paginated cursor-based) ──────────
export async function GET(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url     = new URL(req.url)
    const cursor  = url.searchParams.get("cursor")
    const take    = Math.min(Number(url.searchParams.get("take")) || 20, 100)

    const items = await prisma.[model].findMany({
      where:  { userId: session.user.id },
      take:   take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    })

    const hasMore  = items.length > take
    const data     = hasMore ? items.slice(0, take) : items
    const nextCursor = hasMore ? data[data.length - 1].id : null

    return NextResponse.json({ data, nextCursor, hasMore })
  } catch (error) {
    console.error("[resource/GET]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
```

---

## Item Route Scaffold (`app/api/[resource]/[id]/route.ts`)

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// ── Input Schema ─────────────────────────────────────────
const updateSchema = z.object({
  // define updatable fields here
})

// ── GET /api/[resource]/[id] ──────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const item = await prisma.[model].findUnique({
      where: { id: params.id },
      select: { /* ... */ },
    })

    if (!item || item.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ data: item })
  } catch (error) {
    console.error("[resource/id/GET]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}

// ── PATCH /api/[resource]/[id] ────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const existing = await prisma.[model].findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    })
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updated = await prisma.[model].update({
      where: { id: params.id },
      data:  parsed.data,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("[resource/id/PATCH]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}

// ── DELETE /api/[resource]/[id] ──────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const existing = await prisma.[model].findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    })
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.[model].delete({ where: { id: params.id } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[resource/id/DELETE]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
```

---

## Upload Route (`app/api/upload/route.ts`)

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadToStorage } from "@/lib/storage"
import { hashFile } from "@/lib/utils"
import { LIMITS, type TierKey } from "@/lib/limits"
import { processDocument } from "@/lib/process-document"

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg", "image/png", "image/webp",
  "text/plain",
])

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file      = formData.get("file") as File | null
  const topicTag  = (formData.get("topicTag") as string)?.trim()
  const studyGoal = (formData.get("studyGoal") as string)?.trim()

  if (!file || !topicTag || !studyGoal) {
    return NextResponse.json({ error: "file, topicTag, and studyGoal are required" }, { status: 400 })
  }

  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({
      error: "Unsupported file type. Please upload a PDF, DOCX, PPTX, image, or TXT file.",
    }, { status: 422 })
  }

  // 2. Validate file size against tier
  const tier   = session.user.subscriptionTier as TierKey
  const limits = LIMITS[tier]
  if (file.size > limits.maxFileSizeBytes) {
    return NextResponse.json({
      error: "File exceeds your plan's size limit. Upgrade to upload larger files.",
      upgrade: true,
    }, { status: 422 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // 3. Duplicate detection using compound unique key
    const fileHash = hashFile(buffer)
    const duplicate = await prisma.document.findUnique({
      where: { userId_fileHash: { userId: session.user.id, fileHash } },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json({
        error: "You've already uploaded this document.",
        documentId: duplicate.id,
        duplicate: true,
      }, { status: 409 })
    }

    // 4. Upload to cloud storage
    const fileUrl = await uploadToStorage(buffer, file.name, session.user.id)

    // 5. Create document record
    const document = await prisma.document.create({
      data: {
        userId:    session.user.id,
        fileName:  file.name,
        fileUrl,
        fileHash,
        fileSize:  file.size,
        topicTag,
        studyGoal,
        status:    "PROCESSING",
      },
    })

    // 6. Trigger async AI processing (non-blocking)
    processDocument(document.id).catch(err =>
      console.error("[upload] processDocument failed", err)
    )

    return NextResponse.json({ documentId: document.id, status: "processing" }, { status: 202 })
  } catch (error) {
    console.error("[upload/POST]", error)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}
```

---

## Study Content Route (`app/api/study/[documentId]/route.ts`)

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: { documentId: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { documentId } = params
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 })
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true, userId: true, status: true, topicTag: true, failureReason: true,
        studyContent: {
          select: {
            summary: true, simplifiedExplanation: true, generatedAt: true,
            // flashcards, quizQuestions, youtubeLinks fetched on demand via separate endpoints
          },
        },
      },
    })

    if (!document || document.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("[study/documentId/GET]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
```

---

## Gamification Route (`app/api/gamification/route.ts`)

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { awardXP } from "@/lib/gamification"
import { z } from "zod"
import { LIMITS, type TierKey } from "@/lib/limits"

const schema = z.object({
  action: z.enum(["UPLOAD", "QUIZ_COMPLETE", "FLASHCARD_COMPLETE", "DAILY_LOGIN"]),
})

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Gamification is Premium only
  const tier = session.user.subscriptionTier as TierKey
  if (!LIMITS[tier].gamification) {
    return NextResponse.json({ error: "Upgrade to Premium to earn XP." }, { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await awardXP(session.user.id, parsed.data.action)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[gamification/POST]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}

// ── GET /api/gamification (streak + XP summary) ──────────
export async function GET(_req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tier = session.user.subscriptionTier as TierKey
  if (!LIMITS[tier].gamification) {
    return NextResponse.json({ error: "Upgrade to Premium to see XP." }, { status: 403 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        xpTotal: true, streakCount: true, lastStudyDate: true,
        xpLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    })
    return NextResponse.json({ data: user })
  } catch (error) {
    console.error("[gamification/GET]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
```

---

## Subscription Routes

### Checkout (`app/api/subscription/checkout/route.ts`)

Creates a pending subscription record and returns the data needed for the client to open the Flutterwave payment modal.

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import crypto from "crypto"
import { PRICING } from "@/lib/pricing"

const checkoutSchema = z.object({
  plan: z.enum(["STANDARD", "PREMIUM"]),
  billingCycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
})

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body   = await req.json().catch(() => null)
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { plan, billingCycle } = parsed.data
  const pricing = PRICING[plan][billingCycle]
  const txRef = `lumio-${session.user.id}-${crypto.randomUUID()}`

  // No DB write — the subscription record is created by the webhook
  // after Flutterwave confirms payment. See subscription.md.

  return NextResponse.json({
    tx_ref:  txRef,
    amount:  pricing.amount,
    email:   session.user.email,
    plan,
    billingCycle,
  }, { status: 200 })
}
```

### Subscription Status (`app/api/subscription/route.ts`)

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const subscription = await prisma.subscription.findFirst({
      where:  { userId: session.user.id, status: { in: ["ACTIVE", "GRACE_PERIOD"] } },
      select: { plan: true, billingCycle: true, status: true, expiresAt: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    })

    const docsThisMonth = await prisma.document.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    })

    return NextResponse.json({ subscription, usage: { documentsThisMonth: docsThisMonth } })
  } catch (error) {
    console.error("[subscription/GET]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
```

### Webhook (`app/api/subscription/webhook/route.ts`)

See `subscription.md` for the full webhook handler implementation.

```ts
import { NextResponse } from "next/server"
// Full implementation in .agent/rules/subscription.md
export async function POST(req: Request) {
  // Verify Flutterwave signature
  // Handle charge.completed, subscription.cancelled
  // Idempotency check via paymentReference
  // Return 200 always
}
```

---

## HTTP Status Code Reference

| Code | When to use |
|---|---|
| `200` | Successful GET or general success |
| `201` | Resource created |
| `202` | Accepted — async processing started |
| `400` | Bad input / validation failed |
| `401` | No valid session |
| `403` | Authenticated but not permitted (wrong tier, not owner) |
| `404` | Resource not found (or hidden intentionally) |
| `409` | Conflict — duplicate resource |
| `422` | Valid request but business rule rejected (file too large, wrong type) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

---

## Route Testing Checklist

- [ ] Returns `401` when no session present
- [ ] Returns `400` on missing or invalid fields
- [ ] Returns `403` when tier does not permit the action
- [ ] Returns `404` when resource belongs to another user
- [ ] Returns `409` on duplicate upload
- [ ] Returns `202` (not `201`) for async operations
- [ ] Ownership check: resource's `userId` matches session user
- [ ] Pagination: `?cursor` and `?take` query params respected, `hasMore` + `nextCursor` returned
- [ ] GET list filtered to current user — never returns other users' data
- [ ] PATCH verifies ownership before applying updates
- [ ] DELETE verifies ownership before removing a resource
- [ ] Subscription route gates checkout creation behind valid session
- [ ] Gamification route gates XP endpoints behind Premium tier
- [ ] Try/catch wraps all DB and external calls
- [ ] Stack traces never appear in response body
- [ ] Rate limiting applied (via middleware or per-route guard)