"use server";

import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
});

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().regex(PASSWORD_REGEX, "Password must be at least 8 characters and contain an uppercase letter, a number, and a special character."),
});

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Please provide a valid email address." };
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (user) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: `reset:${email}` },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: { identifier: `reset:${email}`, token, expires },
      });

      await sendPasswordResetEmail(email, token, user.name);
    }

    return { success: true };
  } catch (error) {
    console.error("[requestPasswordResetAction]", error);
    return { error: "Something went wrong. Please try again." };
  }
}

/**
 * Completes the password reset by validating the token and hashing the new password.
 */
export async function resetPasswordAction(formData: FormData) {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Invalid token or password must be at least 8 characters." };
  }

  const { token, password } = parsed.data;

  try {
    const record = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: { startsWith: "reset:" },
        expires: { gt: new Date() },
      },
    });

    if (!record) {
      return { error: "This reset link is invalid or has expired. Please request a new one." };
    }

    const email = record.identifier.replace("reset:", "");
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier: record.identifier, token } },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("[resetPasswordAction]", error);
    return { error: "Something went wrong. Please try again." };
  }
}
