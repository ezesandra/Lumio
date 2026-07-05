import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
          <div style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--spacing-4)" }}>
              <div>
                <label style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Name</label>
                <div style={{ fontSize: "var(--font-size-md)", fontWeight: 500, color: "var(--color-text-primary)", marginTop: "4px" }}>{user.name}</div>
              </div>
              <div>
                <label style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Email Address</label>
                <div style={{ fontSize: "var(--font-size-md)", fontWeight: 500, color: "var(--color-text-primary)", marginTop: "4px" }}>{user.email}</div>
              </div>
              <div>
                <label style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Average Study Time</label>
                <div style={{ fontSize: "var(--font-size-md)", fontWeight: 500, color: "var(--color-text-primary)", marginTop: "4px" }}>1.5 hours / day</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-lg)", marginBottom: "var(--spacing-4)" }}>Subscription</h2>
          <div style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-6)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "var(--font-size-md)", fontWeight: 500, color: "var(--color-text-primary)" }}>Current Plan: {user.subscriptionTier}</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginTop: "4px" }}>
                {user.subscriptionExpiresAt ? `Renews on ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}` : "Free forever. Upgrade for more features."}
              </div>
            </div>
            <a href="/pricing" style={{ padding: "8px 16px", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)", fontWeight: 500, color: "var(--color-text-primary)", textDecoration: "none" }}>
              View Plans
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
