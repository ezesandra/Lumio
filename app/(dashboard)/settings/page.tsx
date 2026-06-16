import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionSettings } from "./SubscriptionSettings";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, subscriptionTier: true, subscriptionExpiresAt: true },
  });

  if (!user) redirect("/login");

  // Read Flutterwave keys from env
  const fwPublicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK_TEST-mock-key";

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "var(--spacing-8) var(--spacing-6)" }}>
      <header style={{ marginBottom: "var(--spacing-8)" }}>
        <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", marginBottom: "var(--spacing-2)" }}>Settings</h1>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-md)" }}>Manage your account and subscription preferences.</p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
        <section>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-lg)", marginBottom: "var(--spacing-4)" }}>Account Details</h2>
          <div>
            <p style={{ marginBottom: "var(--spacing-2)" }}><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-lg)", marginBottom: "var(--spacing-4)" }}>Subscription</h2>
          <SubscriptionSettings 
            userId={session.user.id} 
            email={user.email} 
            currentTier={user.subscriptionTier} 
            expiresAt={user.subscriptionExpiresAt}
            publicKey={fwPublicKey}
          />
        </section>
      </div>
    </main>
  );
}
