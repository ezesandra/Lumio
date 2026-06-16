"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { awardXP } from "@/lib/gamification";
import { XPAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function awardXPAction(action: XPAction) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await awardXP(session.user.id, action);
    return { success: true };
  } catch (error) {
    console.error("[awardXPAction]", error);
    return { error: "Failed to award XP" };
  }
}

export async function saveQuizAttempt(documentId: string, score: number, totalQuestions: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        documentId,
        score,
        totalQuestions,
      }
    });

    await awardXP(session.user.id, "QUIZ_COMPLETE");

    return { success: true };
  } catch (error) {
    console.error("[saveQuizAttempt]", error);
    return { error: "Failed to save quiz attempt" };
  }
}
