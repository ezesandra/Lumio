"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIMITS, TierKey } from "@/lib/limits";
import { generateStudyContent } from "@/lib/ai";
import { saveFile } from "@/lib/storage";
import { extractText } from "@/lib/textract";
import { z } from "zod";

const testFormats = ["multiple-choice", "flashcard", "multiple-true-false", "oral", "essay"] as const;

const uploadSchema = z.object({
  documentTitle: z.string().min(1, "Document title is required").max(200),
  testFormat: z.enum(testFormats, { error: "Please select a test format" }),
  questionCount: z.coerce.number().int().min(5).max(40),
});

export async function uploadDocumentAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthorized" };

    const file = formData.get("file") as File | null;
    if (!file) return { error: "File is required" };

    const data = Object.fromEntries(formData.entries());
    const parsed = uploadSchema.safeParse(data);

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const tier = session.user.subscriptionTier as TierKey;
    const limits = LIMITS[tier];

    if (file.size > limits.maxFileSizeBytes) {
      return { error: `File size exceeds the ${tier} tier limit of ${limits.maxFileSizeBytes / (1024 * 1024)}MB.` };
    }

    if (parsed.data.questionCount > limits.questionsPerTest) {
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
        testFormat: parsed.data.testFormat,
        questionCount: parsed.data.questionCount,
        status: "PROCESSING",
      },
    });

    generateStudyContent(document.id, text).catch(console.error);

    return { success: true, documentId: document.id };
  } catch (error) {
    console.error("[uploadDocumentAction]", error);
    return { error: "Something went wrong. Please try again." };
  }
}
