# SKILL.md — Flutterwave Integration

## Purpose

This skill handles everything related to Flutterwave payment processing in Lumio — from initialising the checkout widget on the client to verifying webhook events on the server and updating subscription state in the database.

---

## When to Use This Skill

- Adding or modifying subscription payment flows
- Implementing the Flutterwave checkout widget
- Building or updating the webhook handler
- Handling payment success, failure, renewal, or cancellation events
- Writing tests for payment flows

---

## Environment Variables Required

```env
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret
```

All three must be present. Validate at startup via `lib/env.ts`. Never expose `FLUTTERWAVE_SECRET_KEY` to the client — it is server-only.

---

## Package Installation

```bash
npm install flutterwave-react-v3
```

The Flutterwave inline JS is also available via CDN for non-React contexts:

```html
<script src="https://checkout.flutterwave.com/v3.js"></script>
```

---

## Step 1 — Pricing Config (`lib/pricing.ts`)

```ts
// lib/pricing.ts

export const PRICING = {
  STANDARD: {
    MONTHLY:   { amount: 1500,  label: "₦1,500/mo" },
    QUARTERLY: { amount: 4050,  label: "₦4,050/qtr" },
    YEARLY:    { amount: 14400, label: "₦14,400/yr" },
  },
  PREMIUM: {
    MONTHLY:   { amount: 3000,  label: "₦3,000/mo" },
    QUARTERLY: { amount: 8100,  label: "₦8,100/qtr" },
    YEARLY:    { amount: 28800, label: "₦28,800/yr" },
  },
} as const

export type PlanKey = keyof typeof PRICING
export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY"

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

---

## Step 2 — Flutterwave Client (`lib/flutterwave.ts`)

```ts
// lib/flutterwave.ts

export type FlutterwaveConfig = {
  publicKey:   string
  amount:      number
  email:       string
  userId:      string
  plan:        string
  billingCycle: string
  onSuccess:   (response: FlutterwaveResponse) => void
  onClose:     () => void
}

export type FlutterwaveResponse = {
  status:         string
  transaction_id: number
  tx_ref:         string
  flw_ref:        string
  amount:         number
  currency:       string
}

export function openFlutterwaveCheckout(config: FlutterwaveConfig) {
  const txRef = `lumio-${config.userId}-${Date.now()}`

  // @ts-expect-error — FlutterwaveCheckout injected via CDN or SDK
  FlutterwaveCheckout({
    public_key:   config.publicKey,
    tx_ref:       txRef,
    amount:       config.amount,
    currency:     "NGN",
    payment_options: "card,ussd,banktransfer",
    customer: {
      email: config.email,
    },
    meta: {
      userId:      config.userId,
      plan:        config.plan,
      billingCycle: config.billingCycle,
    },
    customizations: {
      title:       "Lumio Subscription",
      description: `${config.plan} plan — ${config.billingCycle}`,
      logo:        "https://lumio.app/logo.png",
    },
    callback: config.onSuccess,
    onclose:  config.onClose,
  })
}
```

---

## Step 3 — Checkout UI Component (`components/subscription/CheckoutButton.tsx`)

```tsx
"use client"

import { useState } from "react"
import { openFlutterwaveCheckout, type FlutterwaveResponse } from "@/lib/flutterwave"
import { PRICING, type PlanKey, type BillingCycle } from "@/lib/pricing"
import styles from "./CheckoutButton.module.css"

type Props = {
  plan:        PlanKey
  billingCycle: BillingCycle
  email:       string
  userId:      string
}

export function CheckoutButton({ plan, billingCycle, email, userId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handlePayment() {
    setLoading(true)

    openFlutterwaveCheckout({
      publicKey:    process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
      amount:       PRICING[plan][billingCycle].amount,
      email,
      userId,
      plan,
      billingCycle,
      onSuccess:    handleSuccess,
      onClose:      () => setLoading(false),
    })
  }

  async function handleSuccess(response: FlutterwaveResponse) {
    if (response.status !== "successful") {
      setLoading(false)
      return
    }

    // Notify server to verify + activate subscription
    await fetch("/api/subscription/verify", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        txRef:         response.tx_ref,
        transactionId: response.transaction_id,
        plan,
        billingCycle,
      }),
    })

    // Redirect to dashboard on success
    window.location.href = "/dashboard?subscribed=true"
  }

  return (
    <button
      className={styles.btn}
      onClick={handlePayment}
      disabled={loading}
    >
      {loading ? "Processing…" : `Upgrade to ${plan}`}
    </button>
  )
}
```

---

## Step 4 — Server-side Verification (`app/api/subscription/verify/route.ts`)

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { computeExpiryDate } from "@/lib/pricing"

const verifySchema = z.object({
  txRef:         z.string().min(1),
  transactionId: z.number().int().positive(),
  plan:          z.enum(["STANDARD", "PREMIUM"]),
  billingCycle:  z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
})

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = verifySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { txRef, transactionId, plan, billingCycle } = parsed.data

  // Check for duplicate processing
  const existing = await prisma.subscription.findFirst({
    where: { paymentReference: txRef },
  })
  if (existing) {
    return NextResponse.json({ success: true, message: "Already processed" })
  }

  // Verify transaction with Flutterwave API
  const flwRes = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      },
    }
  )
  const flwData = await flwRes.json()

  if (flwData.status !== "success" || flwData.data.status !== "successful") {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
  }

  // Calculate expiry
  const now = new Date()
  const expiresAt = computeExpiryDate(billingCycle, now)

  // Activate subscription
  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        userId:           session.user.id,
        plan,
        billingCycle,
        status:           "ACTIVE",
        paymentReference: txRef,
        startedAt:        now,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionTier:      plan,
        subscriptionExpiresAt: expiresAt,
      },
    }),
  ])

  return NextResponse.json({ success: true })
}
```

---

## Step 5 — Webhook Handler (`app/api/subscription/webhook/route.ts`)

```ts
import crypto from "crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request): Promise<NextResponse> {
  const rawBody  = await req.text()
  const signature = req.headers.get("verif-hash") ?? ""

  // 1. Verify signature
  const expected = crypto
    .createHmac("sha256", process.env.FLUTTERWAVE_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex")

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  try {
    switch (event.event) {
      case "charge.completed":
        await handleChargeCompleted(event.data)
        break
      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.data)
        break
      default:
        break // Acknowledge unknown events silently
    }
  } catch (err) {
    console.error("[webhook] processing error", err)
    // Always return 200 so Flutterwave doesn't retry infinitely
  }

  return NextResponse.json({ received: true })
}

async function handleChargeCompleted(data: any) {
  const txRef = data.tx_ref as string
  if (!txRef) return

  // Idempotency — skip if already processed
  const existing = await prisma.subscription.findFirst({
    where: { paymentReference: txRef },
  })
  if (existing) return

  // Extend or create subscription based on meta
  const userId      = data.meta?.userId
  const plan        = data.meta?.plan
  const billingCycle = data.meta?.billingCycle
  if (!userId || !plan || !billingCycle) return

  // ... same activation logic as /verify route
}

async function handleSubscriptionCancelled(data: any) {
  const txRef = data.tx_ref as string

  await prisma.subscription.updateMany({
    where: { paymentReference: txRef },
    data:  { status: "CANCELLED", cancelledAt: new Date() },
  })
}
```

---

## Error States & UI Copy

| Scenario | UI Message |
|---|---|
| Payment cancelled by user | `"Payment cancelled. Your plan has not changed."` |
| Verification failed | `"We couldn't verify your payment. Please contact support."` |
| Already subscribed | `"You already have an active subscription."` |
| Webhook signature mismatch | Log server-side, return 401, alert monitoring |

---

## Testing Checklist

- [ ] Checkout opens with correct plan amount and currency (NGN)
- [ ] `tx_ref` is unique per transaction
- [ ] Server verifies transaction ID with Flutterwave API before activating
- [ ] Duplicate `tx_ref` is rejected (idempotency)
- [ ] Webhook signature verification rejects tampered payloads
- [ ] Subscription tier updates in DB after successful payment
- [ ] Access end date shown before cancellation confirmation
- [ ] Graceful downgrade runs after `expiresAt` passes
- [ ] Flutterwave test card `5531 8866 5214 2950` triggers success flow
- [ ] Flutterwave test card `5258 5859 2266 6510` triggers failure flow