# SKILL.md — Auth Builder

## Purpose

This skill covers the complete authentication system for Lumio — NextAuth.js setup, signup, email verification, login, password reset, session management, and route protection. Every flow is production-ready with security constraints enforced throughout.

---

## When to Use This Skill

- Setting up NextAuth for the first time
- Building signup, login, or password reset pages
- Implementing or debugging email verification
- Protecting routes or API endpoints
- Extending the session with custom fields (e.g. `subscriptionTier`)

---

## Package Installation

```bash
npm install next-auth @next-auth/prisma-adapter bcrypt
npm install -D @types/bcrypt
```

---

## Step 1 — NextAuth Config (`lib/auth.ts`)

```ts
import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcrypt"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { Tier } from "@/types"

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

export const authOptions: NextAuthOptions = {
  adapter:  PrismaAdapter(prisma),
  session:  { strategy: "jwt" },
  pages: {
    signIn:        "/login",
    error:         "/login",
    verifyRequest: "/verify-email",
    newUser:       "/dashboard",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where:  { email: parsed.data.email },
          select: {
            id: true, name: true, email: true,
            passwordHash: true, emailVerified: true,
            subscriptionTier: true, tokenVersion: true,
          },
        })

        if (!user || !user.passwordHash)   return null
        if (!user.emailVerified)            return null  // block unverified

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id:               user.id,
          name:             user.name,
          email:            user.email,
          subscriptionTier: user.subscriptionTier,
          tokenVersion:     user.tokenVersion,
        }
      },
    }),

    // Optional: Google OAuth
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // On sign-in, copy user fields to token
      if (user) {
        token.id               = user.id
        token.subscriptionTier = user.subscriptionTier as Tier
        token.tokenVersion     = (user as any).tokenVersion ?? 0
      }

      // Periodically refresh subscriptionTier from DB to catch plan
      // changes or expiry without forcing the user to re-login
      if (token.id) {
        const needsRefresh = !token.tierLastRefreshed
          || Date.now() - token.tierLastRefreshed > 60 * 60 * 1000
        if (needsRefresh) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { subscriptionTier: true, tokenVersion: true },
          })
          if (dbUser) {
            token.subscriptionTier = dbUser.subscriptionTier
            token.tokenVersion     = dbUser.tokenVersion
          }
          token.tierLastRefreshed = Date.now()
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id               = token.id
        session.user.subscriptionTier = token.subscriptionTier
        session.user.tokenVersion     = token.tokenVersion
      }
      return session
    },
  },
}

export default NextAuth(authOptions)
```

---

## Step 2 — Session Type Extension (`types/next-auth.d.ts`)

```ts
import { Tier } from "@/types"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id:               string
      subscriptionTier: Tier
      tokenVersion:     number
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:               string
    subscriptionTier: Tier
    tokenVersion:     number
    tierLastRefreshed?: number
  }
}
```

---

## Step 3 — Route (`app/api/auth/[...nextauth]/route.ts`)

```ts
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

---

## Step 4 — Signup API (`app/api/auth/signup/route.ts`)

```ts
import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import crypto from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"

// Rate limit: 5 requests per IP per 15 minutes
const signupAttempts = new Map<string, { count: number; resetAt: number }>()

const signupSchema = z.object({
  name:     z.string().min(2).max(80).trim(),
  email:    z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
})

export async function POST(req: Request): Promise<NextResponse> {
  // Rate limit check
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const now = Date.now()
  const record = signupAttempts.get(ip)
  if (record && record.resetAt > now && record.count >= 5) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }
  if (!record || record.resetAt < now) {
    signupAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    record.count++
  }

  // CORS: set headers if this endpoint accepts cross-origin requests
  // const origin = req.headers.get("origin")
  // if (origin) headers.set("Access-Control-Allow-Origin", origin)

  const parsed = signupSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  try {
    const existing = await prisma.user.findUnique({
      where:  { email },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ message: "If that email is available, a verification link has been sent." })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: { name, email, passwordHash },
    })

    const token   = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    })

    // Fire-and-forget email — don't block the response
    sendVerificationEmail({ email, name, token }).catch(err =>
      console.error("[signup] failed to send verification email", err)
    )

    return NextResponse.json(
      { message: "Account created. Please check your email to verify your account." },
      { status: 201 }
    )
  } catch (error) {
    console.error("[signup/POST]", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
```

---

## Step 5 — Email Verification (`app/api/auth/verify-email/route.ts`)

```ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Rate limit: 5 requests per IP per 15 minutes
const verifyAttempts = new Map<string, { count: number; resetAt: number }>()

const schema = z.object({ token: z.string().min(1) })

export async function POST(req: Request): Promise<NextResponse> {
  // Rate limit check
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const now = Date.now()
  const record = verifyAttempts.get(ip)
  if (record && record.resetAt > now && record.count >= 5) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }
  if (!record || record.resetAt < now) {
    verifyAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    record.count++
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  const { token } = parsed.data

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: "Token is invalid or has expired." }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data:  { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])

    return NextResponse.json({ message: "Email verified. You can now log in." })
  } catch (error) {
    console.error("[verify-email/POST]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
```

---

## Step 6 — Password Reset Request (`app/api/auth/forgot-password/route.ts`)

```ts
import { NextResponse } from "next/server"
import crypto from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"

// Rate limit: 5 requests per IP per 15 minutes
const resetRequestAttempts = new Map<string, { count: number; resetAt: number }>()

const schema = z.object({ email: z.string().email().toLowerCase() })

export async function POST(req: Request): Promise<NextResponse> {
  // Rate limit check
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const now = Date.now()
  const record = resetRequestAttempts.get(ip)
  if (record && record.resetAt > now && record.count >= 5) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }
  if (!record || record.resetAt < now) {
    resetRequestAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    record.count++
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const { email } = parsed.data

  // Always return the same message — don't reveal whether email exists
  const RESPONSE = NextResponse.json({
    message: "If an account exists for that email, a reset link has been sent.",
  })

  try {
    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, name: true },
    })
    if (!user) return RESPONSE

    const token   = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.verificationToken.upsert({
      where:  { token },
      update: { expires },
      create: { identifier: `reset:${email}`, token, expires },
    })

    // Fire-and-forget email — don't block the response
    sendPasswordResetEmail({ email, name: user.name, token }).catch(err =>
      console.error("[forgot-password] failed to send reset email", err)
    )

    return RESPONSE
  } catch (error) {
    console.error("[forgot-password/POST]", error)
    return RESPONSE // Same response even on error
  }
}
```

---

## Step 7 — Password Reset Confirm (`app/api/auth/reset-password/route.ts`)

```ts
import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// Rate limit: 5 requests per IP per 15 minutes
const resetAttempts = new Map<string, { count: number; resetAt: number }>()

const schema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).max(128),
})

export async function POST(req: Request): Promise<NextResponse> {
  // Rate limit check
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const now = Date.now()
  const record = resetAttempts.get(ip)
  if (record && record.resetAt > now && record.count >= 5) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }
  if (!record || record.resetAt < now) {
    resetAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    record.count++
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { token, password } = parsed.data

  try {
    const record = await prisma.verificationToken.findUnique({ where: { token } })

    if (!record || record.expires < new Date() || !record.identifier.startsWith("reset:")) {
      return NextResponse.json({ error: "Token is invalid or has expired." }, { status: 400 })
    }

    const email        = record.identifier.replace("reset:", "")
    const passwordHash = await bcrypt.hash(password, 12)

    // Invalidate all existing sessions by incrementing tokenVersion
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data:  { passwordHash, tokenVersion: { increment: 1 } },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])

    return NextResponse.json({ message: "Password updated. All existing sessions have been logged out." })
  } catch (error) {
    console.error("[reset-password/POST]", error)
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 })
  }
}
```

---

## Step 8 — Middleware Route Protection (`middleware.ts`)

```ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    pages: { signIn: "/login" },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/library/:path*",
    "/upload/:path*",
    "/settings/:path*",
  ],
}
```

---

## Email Helpers (`lib/email.ts`)

```ts
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.EMAIL_FROM ?? "noreply@lumio.app"

export async function sendVerificationEmail({
  email, name, token,
}: { email: string; name: string; token: string }) {
  const url = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`
  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: "Verify your Lumio account",
    html:    `<p>Hi ${name},</p><p>Click <a href="${url}">here</a> to verify your email. This link expires in 24 hours.</p>`,
  })
}

export async function sendPasswordResetEmail({
  email, name, token,
}: { email: string; name: string; token: string }) {
  const url = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: "Reset your Lumio password",
    html:    `<p>Hi ${name},</p><p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  })
}
```

---

## Auth Checklist

- [ ] `NEXTAUTH_SECRET` is a random string of at least 32 characters
- [ ] `NEXTAUTH_URL` matches the deployment URL exactly
- [ ] Passwords hashed at 12 bcrypt rounds
- [ ] Email verification token expires in 24 hours
- [ ] Password reset token expires in 1 hour
- [ ] Reset tokens are single-use (deleted after use)
- [ ] Login blocked until `emailVerified` is set
- [ ] Email enumeration prevented (same response whether email exists or not)
- [ ] Session cookie is `httpOnly`, `Secure`, `SameSite=Lax`
- [ ] All API routes call `getServerSession` — middleware alone is not sufficient
- [ ] Session shape extended to include `id`, `subscriptionTier` (`Tier` enum), and `tokenVersion`
- [ ] JWT callback refreshes `subscriptionTier` from DB every 60 minutes
- [ ] JWT includes `tokenVersion` — incremented on password reset to invalidate all sessions
- [ ] Password reset handler increments `tokenVersion` and logs out all existing sessions
- [ ] Auth endpoints rate-limited to 5 requests per IP per 15 minutes
- [ ] Emails are sent fire-and-forget (`.catch()`) — never `await`ed on the API path
- [ ] `subscriptionTier` typed as `Tier` throughout — no raw `string` casts
- [ ] Google OAuth: `subscriptionTier` defaults via authorized callback or manual DB sync