import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          allowDangerousEmailAccountLinking: true,
          profile(profile) {
            return {
              id: profile.sub,
              name: profile.name,
              email: profile.email,
              subscriptionTier: "FREE",
              onboardingCompleted: false,
              // Omit image because it's not in the Prisma User schema
            }
          }
        })]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            emailVerified: true,
            subscriptionTier: true,
            onboardingCompleted: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          subscriptionTier: user.subscriptionTier,
          onboardingCompleted: user.onboardingCompleted,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update") {
        if (session?.onboardingCompleted !== undefined) token.onboardingCompleted = session.onboardingCompleted;
        if (session?.subscriptionTier !== undefined) token.subscriptionTier = session.subscriptionTier;
      }

      if (user) {
        token.id = user.id;
        token.subscriptionTier = user.subscriptionTier;
        token.onboardingCompleted = (user as any).onboardingCompleted ?? false;
        token.tierLastRefreshed = Date.now();
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { subscriptionTier: true, onboardingCompleted: true },
        });
        if (dbUser) {
          token.subscriptionTier = dbUser.subscriptionTier;
          token.onboardingCompleted = dbUser.onboardingCompleted;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.subscriptionTier = token.subscriptionTier as any;
        session.user.onboardingCompleted = token.onboardingCompleted as boolean;
      }
      return session;
    },
  },
};
