import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transaction_id } = await req.json();
  if (!transaction_id) {
    return NextResponse.json({ error: "Missing transaction_id" }, { status: 400 });
  }

  try {
    const fwSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!fwSecret) {
      return NextResponse.json({ error: "Flutterwave configuration error" }, { status: 500 });
    }

    // Verify transaction with Flutterwave API
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${fwSecret}`,
      },
    });

    const data = await response.json();

    if (data.status !== "success" || data.data?.status !== "successful") {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const txData = data.data;
    const { tx_ref, meta } = txData;
    const plan = meta?.plan;
    const billingCycle = meta?.billingCycle;
    const userId = meta?.userId;

    if (!plan || !billingCycle || !userId) {
      return NextResponse.json({ error: "Incomplete payment metadata" }, { status: 400 });
    }

    if (userId !== session.user.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    // Idempotency check
    const existing = await prisma.subscription.findFirst({
      where: { paymentReference: tx_ref },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: "Subscription already active" });
    }

    // Create Subscription record and update User tier
    await prisma.$transaction(async (tx: any) => {
      // Cancel any existing active subscriptions for this user
      await tx.subscription.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      // Create new subscription
      const expiresAt = computeExpiryDate(billingCycle as any, new Date());
      await tx.subscription.create({
        data: {
          userId,
          plan: plan as any,
          billingCycle: billingCycle as any,
          status: "ACTIVE",
          paymentReference: tx_ref,
          startedAt: new Date(),
          expiresAt,
        },
      });

      // Update user tier
      await tx.user.update({
        where: { id: userId },
        data: { subscriptionTier: plan as any, subscriptionExpiresAt: expiresAt },
      });
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("[verify] Error verifying payment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
