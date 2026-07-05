import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendStreakReminderEmail } from "@/lib/email";

export async function GET(request: Request) {
  // Verify cron secret if provided in Vercel
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Find users who have a streak > 0 and whose last study date was yesterday.
    // If they studied today, their lastStudyDate >= today.
    // If they missed a day completely, their lastStudyDate < yesterday.
    // So we precisely target lastStudyDate >= yesterday AND < today.
    const atRiskUsers = await prisma.user.findMany({
      where: {
        streakCount: { gt: 0 },
        lastStudyDate: {
          gte: yesterday,
          lt: today,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        streakCount: true,
      },
    });

    let sentCount = 0;
    for (const user of atRiskUsers) {
      if (user.email) {
        await sendStreakReminderEmail(user.email, user.streakCount, user.name);
        sentCount++;
      }
    }

    return NextResponse.json({ success: true, count: sentCount });
  } catch (error) {
    console.error("[cron/streak-reminders]", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
