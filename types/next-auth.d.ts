import { DefaultSession } from "next-auth";
import { Tier } from "@prisma/client";

declare module "next-auth" {
  interface User {
    subscriptionTier: Tier;
    onboardingCompleted: boolean;
  }

  interface Session {
    user: {
      id: string;
      subscriptionTier: Tier;
      onboardingCompleted: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionTier: Tier;
    onboardingCompleted: boolean;
    tierLastRefreshed?: number;
  }
}
