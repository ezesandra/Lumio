"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIMITS, TierKey } from "@/lib/limits";
import { generateStudyContent } from "@/lib/ai";
import crypto from "crypto";
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

    const fileHash = crypto.randomBytes(16).toString("hex"); 
    const fileUrl = `https://mock-storage.lumio.app/uploads/${session.user.id}/${file.name}`;

    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileUrl,
        fileHash,
        fileSize: file.size,
        documentTitle: parsed.data.documentTitle,
        testFormat: parsed.data.testFormat,
        questionCount: parsed.data.questionCount,
        status: "PROCESSING",
      },
    });

    // Trigger async AI processing (fire and forget)
    generateStudyContent(document.id).catch(console.error);

    return { success: true, documentId: document.id };
  } catch (error) {
    console.error("[uploadDocumentAction]", error);
    return { error: "Something went wrong. Please try again." };
  }
}
