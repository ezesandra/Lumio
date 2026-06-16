---
trigger: always_on
---

# Subscription Rules — Lumio

## Overview

Lumio has three subscription tiers — **Free**, **Standard**, and **Premium** — with three billing cycles: Monthly, Quarterly, and Yearly. All payment processing is handled exclusively by **Flutterwave**. No raw card data ever passes through Lumio's server.

---

## Tier Definitions & Limits

All limits are stored in `lib/limits.ts` as a config object — **never hardcoded** in components or API routes.

```ts
// lib/limits.ts

export const LIMITS = {
  FREE: {
    maxFileSizeBytes:        300 * 1024 * 1024,  // 300MB
    practiceTestsPerMonth:      1,
    questionsPerTest:          40,
    aiSummary:                 "basic",
    simplifiedExplanations:    false,
    youtubeRecommendations:     false,
    advancedAnalytics:         false,
    gamification:              false,
    studyReminders:            false,
    priorityProcessing:        false,
  },
  STANDARD: {
    maxFileSizeBytes:        500 * 1024 * 1024,  // 500MB
    practiceTestsPerMonth:     10,
    questionsPerTest:          100,
    aiSummary:                 "full",
    simplifiedExplanations:    true,
    youtubeRecommendations:     true,
    advancedAnalytics:         false,
    gamification:              false,
    studyReminders:            false,
    priorityProcessing:        false,
  },
  PREMIUM: {
    maxFileSizeBytes:        1024 * 1024 * 1024, // 1GB
    practiceTestsPerMonth:    Infinity,
    questionsPerTest:         Infinity,
    aiSummary:                 "full",
    simplifiedExplanations:    true,
    youtubeRecommendations:     true,
    advancedAnalytics:         true,
    gamification:              true,
    studyReminders:            true,
    priorityProcessing:        true,
  },
} as const

export type TierKey = keyof typeof LIMITS
```

---

## Pricing

| Plan | Monthly | Quarterly (–10%) | Yearly (–20%) |
|---|---|---|---|
| Standard | ₦1,500 | ₦4,050 | ₦14,400 |
| Premium | ₦3,000 | ₦8,100 | ₦28,800 |

Prices are stored in `lib/pricing.ts` as constants. Never hardcode amounts in components.

---

## Flutterwave Integration

### Client-side Initialization

```ts
// lib/flutterwave.ts
import crypto from "crypto"

export function initFlutterwavePayment({
  publicKey,
  amount,
  currency = "NGN",
  email,
  userId,
  plan,
  billingCycle,
  onSuccess,
  onClose,
}: FlutterwavePaymentConfig) {
  const handler = FlutterwaveCheckout({
    public_key: publicKey,
    tx_ref:     `lumio-${userId}-${crypto.randomUUID()}`,
    amount,
    currency,
    customer: { email },
    meta: { userId, plan, billingCycle },
    customizations: {
      title: "Lumio Subscription",
      description: `${plan} plan — ${billingCycle}`,
      logo: "https://lumio.app/logo.png",
    },
    callback:  onSuccess,
    onclose:   onClose,
  })
  handler.openIframe()
}
```

### Webhook Handler (`app/api/subscription/webhook/route.ts`)

```ts
import crypto from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get("verif-hash") ?? ""

  // 1. Verify webhook signature
  const expected = crypto
    .createHmac("sha256", process.env.FLUTTERWAVE_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex")

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  // 2. Idempotency check — skip if this paymentReference was already processed
  if (event.data?.tx_ref) {
    const existing = await prisma.subscription.findFirst({
      where: { paymentReference: event.data.tx_ref },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ received: true })
  }

  // 3. Handle event types
  try {
    switch (event.event) {
      case "charge.completed":
        await handleChargeCompleted(event.data)
        break
      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.data)
        break
      default:
        break
    }
  } catch (err) {
    console.error("[webhook] handler error:", err)
  }

  return NextResponse.json({ received: true })
}

async function handleChargeCompleted(data: any) {
  const { meta, tx_ref, amount, currency } = data
  const { userId, plan, billingCycle } = meta

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user) return

  await prisma.$transaction(async (tx) => {
    // Cancel any existing active subscriptions for this user
    await tx.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    })

    // Create new subscription
    const expiresAt = computeExpiryDate(billingCycle, new Date())
    await tx.subscription.create({
      data: {
        userId,
        plan,
        billingCycle,
        status: "ACTIVE",
        paymentReference: tx_ref,
        startedAt: new Date(),
        expiresAt,
      },
    })

    // Update user tier
    await tx.user.update({
      where: { id: userId },
      data: { subscriptionTier: plan, subscriptionExpiresAt: expiresAt },
    })
  })

  await sendEmail({
    to: user.email,
    subject: `Your ${plan} plan is now active. Welcome to Lumio!`,
  })
}

async function handleSubscriptionCancelled(data: any) {
  const { tx_ref } = data

  const subscription = await prisma.subscription.findFirst({
    where: { paymentReference: tx_ref },
    select: { id: true, userId: true, expiresAt: true },
  })
  if (!subscription) return

  const user = await prisma.user.findUnique({
    where: { id: subscription.userId },
    select: { email: true, name: true },
  })
  if (!user) return

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  })

  await sendEmail({
    to: user.email,
    subject: `Cancelled. Access continues until ${subscription.expiresAt.toDateString()}, then moves to Free.`,
  })
}
```

**Rules:**
- Subscription status is **only updated** after a verified webhook — never from a client callback
- All webhook events are idempotent — `tx_ref` is checked against `Subscription.paymentReference` before processing
- Unrecognised event types are silently acknowledged (return 200) but not processed
- Webhook handler never throws — always returns 200 to Flutterwave; log failures internally
- All webhook payloads are logged (sanitised, no secrets) for audit debugging

---

## Pricing Configuration

```ts
// lib/pricing.ts

export const PRICING = {
  STANDARD: {
    MONTHLY:   { amount: 1500, label: "₦1,500/mo" },
    QUARTERLY: { amount: 4050, label: "₦4,050/qtr" },
    YEARLY:    { amount: 14400, label: "₦14,400/yr" },
  },
  PREMIUM: {
    MONTHLY:   { amount: 3000, label: "₦3,000/mo" },
    QUARTERLY: { amount: 8100, label: "₦8,100/qtr" },
    YEARLY:    { amount: 28800, label: "₦28,800/yr" },
  },
} as const

export function computeExpiryDate(billingCycle: BillingCycle, from: Date): Date {
  const date = new Date(from)
  switch (billingCycle) {
    case "MONTHLY":   date.setMonth(date.getMonth() + 1);  break
    case "QUARTERLY": date.setMonth(date.getMonth() + 3);  break
    case "YEARLY":    date.setFullYear(date.getFullYear() + 1); break
  }
  return date
}
```

Prices are stored in `lib/pricing.ts` as constants. Never hardcode amounts in components.

---

## Flutterwave Plan Registration

For recurring billing to work, each plan must be registered as a **Flutterwave Plan** in the Flutterwave dashboard:

1. Go to Flutterwave Dashboard → Plans → Create Plan
2. Create a plan per tier/billing-cycle combination:
   - `lumio-standard-monthly` — ₦1,500/mo
   - `lumio-standard-quarterly` — ₦4,050/qtr
   - `lumio-standard-yearly` — ₦14,400/yr
   - `lumio-premium-monthly` — ₦3,000/mo
   - `lumio-premium-quarterly` — ₦8,100/qtr
   - `lumio-premium-yearly` — ₦28,800/yr
3. Record the `plan_id` from Flutterwave and pass it in the checkout `plan` parameter for recurring billing
4. Plan IDs are stored as environment variables or in `lib/pricing.ts`

---

## Test Mode vs Production

| Environment | Flutterwave Key | Card Numbers |
|---|---|---|
| Development | Test keys from Flutterwave dashboard (`FLUTTERWAVE_PUBLIC_KEY_TEST`, `FLUTTERWAVE_SECRET_KEY_TEST`) | Flutterwave test cards (see docs) |
| Production | Live keys from Flutterwave dashboard (`FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`) | Real cards |

- The environment variable `NEXT_PUBLIC_FLUTTERWAVE_ENV` controls which key set is used (`test` vs `live`)
- Webhooks in test mode: Flutterwave provides a webhook tester in their dashboard — use ngrok to forward to your local server
- Test webhooks are processed identically to live webhooks — this catches integration bugs early
- Never process test data against the production database — use a separate staging Postgres instance

---

## Subscription Lifecycle

### Activation

1. User selects plan and billing cycle
2. Flutterwave checkout opens (client-side)
3. On payment success, Flutterwave fires `charge.completed` webhook
4. Webhook handler verifies signature and payment status
5. Create `Subscription` record with `status: ACTIVE`
6. Update `User.subscriptionTier` and `User.subscriptionExpiresAt`
7. Send activation email via Resend
8. Features unlock immediately

### Renewal

- Recurring billing handled by Flutterwave — Lumio receives `charge.completed` webhook on each renewal
- On successful renewal: extend `expiresAt`, keep `status: ACTIVE`, send renewal confirmation email
- On failed renewal: set `status: GRACE_PERIOD`, send payment failure email
- Grace period: **3 days** — if payment not recovered, downgrade to Free tier

### Cancellation

1. User initiates from account settings
2. Show access end date before confirming
3. Set `Subscription.cancelledAt = new Date()`, `status: CANCELLED`
4. Access continues until `expiresAt`
5. No further charges after cancellation
6. Send cancellation confirmation email immediately
7. On `expiresAt`: downgrade `User.subscriptionTier` to `FREE`

### Expiry & Downgrade

```ts
// lib/subscription.ts
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

const GRACE_PERIOD_DAYS = 3

export async function handleExpiredSubscriptions() {
  const now = new Date()

  // 1. Expire ACTIVE subscriptions past their end date
  const expiredActive = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    select: { id: true, userId: true },
  })

  for (const sub of expiredActive) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      })
      await tx.user.update({
        where: { id: sub.userId },
        data: { subscriptionTier: "FREE", subscriptionExpiresAt: null },
      })
    })
    await sendExpiryEmail(sub.userId)
  }

  // 2. Downgrade GRACE_PERIOD subscriptions past the 3-day grace window
  const gracePeriodEnd = new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
  const expiredGrace = await prisma.subscription.findMany({
    where: {
      status: "GRACE_PERIOD",
      updatedAt: { lte: gracePeriodEnd },
    },
    select: { id: true, userId: true },
  })

  for (const sub of expiredGrace) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      })
      await tx.user.update({
        where: { id: sub.userId },
        data: { subscriptionTier: "FREE", subscriptionExpiresAt: null },
      })
    })
    await sendExpiryEmail(sub.userId)
  }
}
```

This job runs as a Vercel Cron or scheduled function — check daily.

---

## Tier Enforcement

Every gated API action must:

1. Read `subscriptionTier` from the server-side session (never from client)
2. Load limits from `LIMITS[tier]`
3. Check current usage against the limit
4. Return `403` with an upgrade prompt if exceeded

```ts
import { LIMITS, type TierKey } from "@/lib/limits"

const tier = session.user.subscriptionTier as TierKey
const limits = LIMITS[tier]

const monthlyCount = await prisma.quizAttempt.count({
  where: {
    userId: session.user.id,
    completedAt: { gte: startOfMonth(new Date()) },
  },
})

if (monthlyCount >= limits.practiceTestsPerMonth) {
  return NextResponse.json(
    { error: "Monthly test limit reached. Upgrade to continue.", upgrade: true },
    { status: 403 }
  )
}
```

---

## Upgrade Prompts

- Free users see non-intrusive prompts when limits are hit — not before
- Prompts show the specific feature being blocked and the plan that unlocks it
- Prompt copy: `"You've reached your plan limit. Upgrade to [Standard/Premium] to continue."`
- Upgrade prompts never interrupt active study sessions — shown at session completion or on next action

---

## Email Notifications

| Trigger | Template |
|---|---|
| Subscription activated | `Your [Plan] plan is now active. Welcome to Lumio!` |
| 3 days before renewal | `Your subscription renews in 3 days. You will be charged ₦[amount] on [date].` |
| Successful renewal | `Your [Plan] subscription has been renewed. Next billing date: [date].` |
| Payment failed | `We couldn't process your payment. Update your details to keep your plan active.` |
| Subscription cancelled | `Cancelled. Access continues until [end date], then moves to Free.` |
| Subscription expired | `Your [Plan] subscription has ended. You've been moved to the Free plan.` |

All emails are sent via Resend from `noreply@lumio.app`.

---

## Constraints

- Subscription tier is **always** validated server-side — client-passed tier values are ignored
- Feature limits are **config-driven** (`lib/limits.ts`, exported as `LIMITS`) — never hardcoded in route handlers or components
- `paymentReference` is stored as an opaque string — never parsed for business logic
- All subscription state changes go through `prisma.$transaction` to maintain consistency
- Downgrade is always **graceful** — users retain access until the end of their paid period