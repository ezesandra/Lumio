import { prisma } from "@/lib/prisma";
import { XPAction, Tier } from "@prisma/client";

const XP_VALUES: Record<XPAction, number> = {
  UPLOAD: 50,
  QUIZ_COMPLETE: 30,
  FLASHCARD_COMPLETE: 20,
  DAILY_LOGIN: 10,
  STREAK_7_DAY: 100,
  STREAK_30_DAY: 500,
};

/**
 * Awards XP to a user and updates their streak if applicable.
 * @param userId - The ID of the user.
 * @param action - The action triggering the XP award.
 */
export async function awardXP(userId: string, action: XPAction) {
  const xpAmount = XP_VALUES[action];

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { lastStudyDate: true, streakCount: true, subscriptionTier: true },
    });

    if (!user) return;

    let newStreak = user.streakCount;
    let newLastStudyDate = user.lastStudyDate;

    // Gamification features like streaks are active for PREMIUM users, 
    // but we can award XP to everyone to encourage upgrades.
    
    // Check if this is the first study action of the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastStudy = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
    if (lastStudy) lastStudy.setHours(0, 0, 0, 0);

    if (!lastStudy || lastStudy.getTime() < today.getTime()) {
      // First action today
      if (lastStudy && today.getTime() - lastStudy.getTime() === 86400000) {
        // Consecutive day
        newStreak += 1;
      } else if (!lastStudy || today.getTime() - lastStudy.getTime() > 86400000) {
        // Missed a day, reset streak
        newStreak = 1;
      }
      newLastStudyDate = new Date();
    }

    await tx.user.update({
      where: { id: userId },
      data: { 
        xpTotal: { increment: xpAmount },
        streakCount: newStreak,
        lastStudyDate: newLastStudyDate,
      },
    });

    await tx.xPLog.create({
      data: { userId, action, xpAwarded: xpAmount },
    });

    // Handle milestones
    if (newStreak === 7 && (!lastStudy || lastStudy.getTime() < today.getTime())) {
      await tx.user.update({
        where: { id: userId },
        data: { xpTotal: { increment: XP_VALUES.STREAK_7_DAY } },
      });
      await tx.xPLog.create({
        data: { userId, action: "STREAK_7_DAY", xpAwarded: XP_VALUES.STREAK_7_DAY },
      });
    }

    if (newStreak === 30 && (!lastStudy || lastStudy.getTime() < today.getTime())) {
      await tx.user.update({
        where: { id: userId },
        data: { xpTotal: { increment: XP_VALUES.STREAK_30_DAY } },
      });
      await tx.xPLog.create({
        data: { userId, action: "STREAK_30_DAY", xpAwarded: XP_VALUES.STREAK_30_DAY },
      });
    }
  });
}
