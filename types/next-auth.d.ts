import { DefaultSession } from "next-auth";
import { Tier } from "@prisma/client";

declare module "next-auth" {
  interface User {
    subscriptionTier: Tier;
  }

  interface Session {
    user: {
      id: string;
      subscriptionTier: Tier;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionTier: Tier;
    tierLastRefreshed?: number;
  }
}
