"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIMITS, TierKey } from "@/lib/limits";
import { generateStudyContent } from "@/lib/ai";
import { saveFile } from "@/lib/storage";
import { extractText } from "@/lib/textract";
import { z } from "zod";
import { after } from "next/server";

const testFormats = ["multiple-choice", "flashcard", "multiple-true-false", "oral", "essay"] as const;
const studyOptions = ["summarize", "simplify", "ai-discussion", "key-concepts"] as const;

const quizSchema = z.object({
  documentTitle: z.string().min(1, "Document title is required").max(200),
  mode: z.literal("quiz"),
  testFormat: z.enum(testFormats, { error: "Please select a test format" }),
  questionCount: z.coerce.number().int().min(5).max(40),
});

const studySchema = z.object({
  documentTitle: z.string().min(1, "Document title is required").max(200),
  mode: z.literal("study"),
  studyMadeEasy: z.enum(studyOptions, { error: "Please select a study option" }),
});

export async function uploadDocumentAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthorized" };

    const file = formData.get("file") as File | null;
    if (!file) return { error: "File is required" };

    const data = Object.fromEntries(formData.entries());
    const mode = data.mode;

    let parsed;
    if (mode === "study") {
      parsed = studySchema.safeParse(data);
    } else {
      parsed = quizSchema.safeParse(data);
    }

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const tier = session.user.subscriptionTier as TierKey;
    const limits = LIMITS[tier];

    if (file.size > limits.maxFileSizeBytes) {
      return { error: `File size exceeds the ${tier} tier limit of ${limits.maxFileSizeBytes / (1024 * 1024)}MB.` };
    }

    const questionCount = parsed.data.mode === "quiz" ? parsed.data.questionCount : 10;

    if (questionCount > limits.questionsPerTest) {
      return { error: `Your ${tier} tier is limited to ${limits.questionsPerTest} questions per test. Please upgrade for more.` };
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyCount = await prisma.document.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: startOfMonth },
      },
    });

    if (monthlyCount >= limits.practiceTestsPerMonth) {
      return { error: `You've reached your ${tier} plan limit of ${limits.practiceTestsPerMonth} practice tests per month. Please upgrade to continue.` };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { filePath, fileHash } = await saveFile(buffer, file.name);

    let text = "";
    try {
      text = await extractText(filePath);
    } catch {
      text = "";
    }

    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileUrl: filePath,
        fileHash,
        fileSize: file.size,
        documentTitle: parsed.data.documentTitle,
        testFormat: parsed.data.mode === "quiz" ? parsed.data.testFormat : "multiple-choice",
        questionCount,
        status: "PROCESSING",
      },
    });

    after(async () => {
      try {
        await generateStudyContent(document.id, text);
      } catch (error) {
        console.error("[uploadDocumentAction] AI generation failed:", error);
      }
    });

    return { success: true, documentId: document.id };
  } catch (error) {
    console.error("[uploadDocumentAction]", error);
    return { error: "Something went wrong. Please try again." };
  }
}
