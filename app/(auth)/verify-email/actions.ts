"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
});

export async function resendVerificationAction(email: string) {
  try {
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    await sendVerificationEmail(email, token);

    return { success: true };
  } catch (error) {
    console.error("[resendVerificationAction]", error);
    return { error: "Failed to send verification email." };
  }
}

/**
 * Verifies the email token and marks the user's email as verified.
 */
export async function verifyEmailAction(formData: FormData) {
  const parsed = schema.safeParse({ token: formData.get("token") });
  if (!parsed.success) return { error: "Invalid token." };

  const { token } = parsed.data;

  try {
    const record = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: { gt: new Date() },
        // Ensure identifier does NOT start with "reset:" so we only match email tokens
        NOT: { identifier: { startsWith: "reset:" } },
      },
    });

    if (!record) {
      return { error: "This verification link is invalid or has expired. Please request a new one." };
    }

    const email = record.identifier;

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier: email, token } },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("[verifyEmailAction]", error);
    return { error: "Something went wrong. Please try again." };
  }
}
