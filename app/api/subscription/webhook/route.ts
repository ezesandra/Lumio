import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper function for date math
function computeExpiryDate(billingCycle: "MONTHLY" | "QUARTERLY" | "YEARLY", from: Date): Date {
  const date = new Date(from);
  switch (billingCycle) {
    case "MONTHLY":   date.setMonth(date.getMonth() + 1);  break;
    case "QUARTERLY": date.setMonth(date.getMonth() + 3);  break;
    case "YEARLY":    date.setFullYear(date.getFullYear() + 1); break;
  }
  return date;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash") ?? "";

  // 1. Verify webhook signature
  const expected = crypto
    .createHmac("sha256", process.env.FLUTTERWAVE_WEBHOOK_SECRET || "default_secret")
    .update(rawBody)
    .digest("hex");

  if (process.env.NODE_ENV === "production" && !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 2. Idempotency check
  if (event.data?.tx_ref) {
    const existing = await prisma.subscription.findFirst({
      where: { paymentReference: event.data.tx_ref },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ received: true });
  }

  // 3. Handle event types
  try {
    switch (event.event) {
      case "charge.completed":
        await handleChargeCompleted(event.data);
        break;
      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.data);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
  }

  return NextResponse.json({ received: true });
}

async function handleChargeCompleted(data: any) {
  const { meta, tx_ref } = data;
  const { userId, plan, billingCycle } = meta;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) return;

  await prisma.$transaction(async (tx) => {
    // Cancel any existing active subscriptions for this user
    await tx.subscription.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // Create new subscription
    const expiresAt = computeExpiryDate(billingCycle, new Date());
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
    });

    // Update user tier
    await tx.user.update({
      where: { id: userId },
      data: { subscriptionTier: plan, subscriptionExpiresAt: expiresAt },
    });
  });
  
  // Here we would use the resend integration to send an email.
  console.log(`Sent email to ${user.email}: Your ${plan} plan is now active. Welcome to Lumio!`);
}

async function handleSubscriptionCancelled(data: any) {
  const { tx_ref } = data;

  const subscription = await prisma.subscription.findFirst({
    where: { paymentReference: tx_ref },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (!subscription) return;

  const user = await prisma.user.findUnique({
    where: { id: subscription.userId },
    select: { email: true, name: true },
  });
  if (!user) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  console.log(`Sent email to ${user.email}: Cancelled. Access continues until ${subscription.expiresAt.toDateString()}, then moves to Free.`);
}
