import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

const FROM = process.env.EMAIL_FROM || "noreply@lumio.app";

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${process.env.APP_URL || "http://localhost:3000"}/verify-email?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Verify your email — Lumio",
    html: `<p>Click <a href="${link}">here</a> to verify your email address.</p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your password — Lumio",
    html: `<p>Click <a href="${link}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`,
  });
}
