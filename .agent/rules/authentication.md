---
trigger: always_on
---

# Authentication Rules — Lumio

## Technology

- **Library:** NextAuth.js (v4)
- **Adapter:** Prisma Adapter (`@next-auth/prisma-adapter`)
- **Session strategy:** JWT (stateless, httpOnly cookie)
- **Providers:** Credentials (email + password) + optional OAuth (Google)

---

## NextAuth Configuration (`lib/auth.ts`)

```ts
import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcrypt"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        // Return null for ALL failures (wrong password, unverified email,
        // nonexistent user) — never distinguish which field is wrong to
        // prevent user-enumeration attacks
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            emailVerified: true,
            subscriptionTier: true,
          },
        })

        if (!user || !user.passwordHash) return null
        if (!user.emailVerified) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          subscriptionTier: user.subscriptionTier,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.subscriptionTier = user.subscriptionTier
      }

      // Periodically refresh subscriptionTier from DB to catch plan
      // changes or expiry without forcing the user to re-login
      if (token.id) {
        const needsRefresh = !token.tierLastRefreshed
          || Date.now() - token.tierLastRefreshed > 60 * 60 * 1000
        if (needsRefresh) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { subscriptionTier: true },
          })
          if (dbUser) {
            token.subscriptionTier = dbUser.subscriptionTier
          }
          token.tierLastRefreshed = Date.now()
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.subscriptionTier = token.subscriptionTier
      }
      return session
    },
  },
}
```

---

## Password Rules

- Minimum **8 characters**, validated with Zod on signup
- Hashed with **bcrypt at 12 salt rounds** — never fewer
- Plain-text password is discarded immediately after hashing
- `passwordHash` is never included in session tokens or API responses

```ts
import bcrypt from "bcrypt"

const passwordHash = await bcrypt.hash(password, 12)
```

---

## Email Verification

- New accounts require email verification before login is permitted
- On signup: generate a `crypto.randomBytes(32).toString("hex")` token, store in `VerificationToken`, send email via Resend
- Token expires after **24 hours**
- On verification: set `emailVerified = new Date()` on the User record, delete the token
- Login is blocked (`authorize` returns `null`) if `emailVerified` is null

```ts
import crypto from "crypto"

const token = crypto.randomBytes(32).toString("hex")
const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

await prisma.verificationToken.create({
  data: { identifier: email, token, expires },
})
```

---

## Password Reset Flow

1. User requests reset → validate email exists (do **not** reveal if it doesn't)
2. Generate `crypto.randomBytes(32).toString("hex")` token
3. Store in `VerificationToken` with `identifier = "reset:{email}"` and 1-hour expiry
   > **Note:** The `"reset:"` prefix avoids collision with email-verification tokens for the same email, both stored in the `VerificationToken` table
4. Send reset link via Resend: `https://lumio.app/reset-password?token={token}`
5. On reset form submit: validate token is not expired, hash new password, update User, delete token
6. Tokens are **single-use** — deleted immediately on successful reset

---

## Route Protection

### Middleware (`middleware.ts`)

```ts
import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: { signIn: "/login" },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/library/:path*",
    "/upload/:path*",
    "/settings/:path*",
    // Study routes — `[documentId]` dynamic segment matched via `:path`
    "/:path/quiz",
    "/:path/flashcards",
    "/:path/summary",
  ],
}
```

### API Routes

Every protected API route must verify the session at the top of the handler:

```ts
const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

Never rely on middleware alone to protect API routes — middleware can be bypassed by direct fetch calls.

---

## Session Shape

Extend the default NextAuth session type in `types/next-auth.d.ts`:

```ts
import { Tier } from "@/types"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      subscriptionTier: Tier
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    subscriptionTier: Tier
    tierLastRefreshed?: number
  }
}
```

---

## Signup Flow

1. Validate input: `name`, `email`, `password` with Zod
2. Check `email` is not already registered
3. Hash password with bcrypt (12 rounds)
4. Create `User` record with `emailVerified: null`
5. Create `VerificationToken` and send verification email
6. Return success — do **not** auto-login until email is verified

---

## Security Constraints

- Session cookies: `httpOnly`, `Secure`, `SameSite=Lax`
- `NEXTAUTH_SECRET` must be a random string of at least 32 characters — validated at startup
- `NEXTAUTH_URL` must match the deployment URL exactly
- OAuth state params are validated by NextAuth automatically — do not bypass
- Account lockout: after 5 failed login attempts within 15 minutes, rate-limit the IP (see `security.md`)
- **CSRF (CredentialsProvider):** NextAuth v4's `CredentialsProvider` does not issue CSRF tokens — add a double-submit cookie check on the login endpoint or rely on same-origin checks enforced by `SameSite=Lax`
- **Session invalidation:** Changing a password **must** invalidate all existing sessions — implement by incrementing a `tokenVersion` field on the User record and checking it in the `jwt` callback against a value stored in the JWT