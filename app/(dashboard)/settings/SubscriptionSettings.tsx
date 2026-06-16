"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { initFlutterwavePayment } from "@/lib/flutterwave";

type Props = {
  userId: string;
  email: string;
  currentTier: string;
  expiresAt: Date | null;
  publicKey: string;
};

const PLANS = [
  { id: "STANDARD", name: "Standard", amount: 1500, cycle: "MONTHLY", desc: "Unlock full AI summaries and 10 tests/month" },
  { id: "PREMIUM", name: "Premium", amount: 3000, cycle: "MONTHLY", desc: "Unlimited tests, gamification, and advanced analytics" },
];

export function SubscriptionSettings({ userId, email, currentTier, expiresAt, publicKey }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = (planId: string, amount: number, cycle: string) => {
    setLoadingPlan(planId);
    
    initFlutterwavePayment({
      publicKey,
      amount,
      email,
      userId,
      plan: planId,
      billingCycle: cycle,
      onSuccess: (res) => {
        console.log("Payment successful", res);
        // Usually, the webhook handles DB updates. We can just refresh the page.
        window.location.reload();
      },
      onClose: () => {
        setLoadingPlan(null);
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-6)" }}>
      <div>
        <h3 style={{ fontSize: "var(--font-size-md)", marginBottom: "var(--spacing-2)" }}>Current Plan: <strong>{currentTier}</strong></h3>
        {expiresAt && (
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
            Renews/Expires on: {new Date(expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--spacing-4)" }}>
        {PLANS.map(plan => {
          const isCurrent = currentTier === plan.id;
          return (
            <div key={plan.id}>
              <h4 style={{ fontSize: "var(--font-size-lg)", fontFamily: "var(--font-family-display)", marginBottom: "var(--spacing-2)" }}>{plan.name}</h4>
              <p style={{ fontSize: "var(--font-size-xl)", color: "var(--color-text-primary)", fontWeight: "bold", marginBottom: "var(--spacing-4)" }}>₦{plan.amount}<span style={{ fontSize: "var(--font-size-sm)", fontWeight: "normal", color: "var(--color-text-secondary)" }}>/mo</span></p>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-6)", minHeight: "40px" }}>{plan.desc}</p>
              
              <Button 
                variant={isCurrent ? "secondary" : "primary"} 
                style={{ width: "100%" }}
                disabled={isCurrent || loadingPlan === plan.id}
                onClick={() => handleUpgrade(plan.id, plan.amount, plan.cycle)}
              >
                {isCurrent ? "Current Plan" : (loadingPlan === plan.id ? "Loading..." : "Upgrade")}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
