"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { awardXP } from "@/lib/gamification";
type XPAction = "UPLOAD" | "QUIZ_COMPLETE" | "FLASHCARD_COMPLETE" | "DAILY_LOGIN" | "STREAK_7_DAY" | "STREAK_30_DAY";
import { prisma } from "@/lib/prisma";
import { LIMITS, type TierKey } from "@/lib/limits";

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

export async function checkDocumentStatus(documentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { status: "FAILED" };

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { status: true },
  });

  return { status: doc?.status || "FAILED" };
}

export async function regenerateQuizAction(documentId: string, testFormat: string, questionCount: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthorized" };

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== session.user.id) {
      return { error: "Document not found" };
    }

    const tier = session.user.subscriptionTier as TierKey;
    const limits = LIMITS[tier];

    if (questionCount > limits.questionsPerTest) {
      return { error: `Your ${tier} tier is limited to ${limits.questionsPerTest} questions per test. Please upgrade for more.` };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    let text = "";
    try {
      const { extractText } = await import("@/lib/textract");
      text = await extractText(document.fileUrl);
    } catch (err) {
      console.error("Failed to extract text during regeneration", err);
      text = "";
    }

    const { generateQuizOnly } = await import("@/lib/ai");
    generateQuizOnly(documentId, text, testFormat, questionCount).catch(console.error);

    return { success: true };
  } catch (error) {
    console.error("[regenerateQuizAction]", error);
    return { error: "Something went wrong regenerating the quiz." };
  }
}
