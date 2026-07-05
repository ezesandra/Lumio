import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

const FROM = process.env.EMAIL_FROM || "Lumio <noreply@lumio.app>";

export async function sendVerificationEmail(to: string, token: string) {
  const link = `${process.env.APP_URL || "http://localhost:3000"}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Verify your email — Lumio",
    html: `<p>Click <a href="${link}">here</a> to verify your email address.</p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string, name: string) {
  const link = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="text-align: center; margin-bottom: 8px; font-size: 24px;">RESET PASSWORD</h1>
      <h2 style="text-align: center; margin-top: 0; color: #7c3aed;">Lumio</h2>
      <p>Hello ${name},</p>
      <p>You requested a password reset on your Lumio account. Please click the button below to set a new password on your account.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${link}" style="background-color: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #667185; font-size: 14px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Reset your password — Lumio",
    html,
  });
}

export async function sendStreakReminderEmail(to: string, streakCount: number, name: string) {
  const link = `${process.env.APP_URL || "http://localhost:3000"}/dashboard`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "🔥 Don't lose your streak! — Lumio",
    html: `<p>Hi ${name || 'there'},</p>
<p>You've built up an amazing <strong>${streakCount}-day study streak</strong>! 🚀</p>
<p>But wait—you haven't studied today yet. Don't let your hard work slip away! Log in now and complete a quick study session (a quiz, flashcards, or uploading a new document) to keep your streak alive.</p>
<p><a href="${link}">Go to Dashboard</a></p>
<p>Keep up the great work!</p>`,
  });
}
export async function sendWelcomeEmail(to: string, name: string) {
  const link = `${process.env.APP_URL || "http://localhost:3000"}/dashboard`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="text-align: center; color: #7c3aed; margin-bottom: 8px; font-size: 24px;">Welcome to Lumio!</h1>
      <p>Hello ${name},</p>
      <p>We are thrilled to have you on board. Lumio is your new AI-powered study companion, designed to help you learn faster and retain more.</p>
      <p>To get started, simply upload your first document and let Lumio generate flashcards, summaries, and quizzes for you.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${link}" style="background-color: #7c3aed; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
      </div>
      <p style="color: #667185; font-size: 14px; text-align: center;">Happy learning!</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: "Welcome to Lumio! 🎉",
    html,
  });
}
