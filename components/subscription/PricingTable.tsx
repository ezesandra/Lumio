"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingCard, PricingFeature } from "./PricingCard";
import styles from "./PricingTable.module.css";
import { PRICING } from "@/lib/pricing";
import { useSession } from "next-auth/react";
import { initFlutterwavePayment } from "@/lib/flutterwave";

export function PricingTable() {
  const router = useRouter();
  const { data: session } = useSession();
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [verifying, setVerifying] = useState(false);

  const handleCheckout = (plan: "FREE" | "STANDARD" | "PREMIUM") => {
    if (plan === "FREE") {
      router.push("/dashboard");
      return;
    }

    if (!session?.user?.id) {
      router.push("/signup");
      return;
    }

    const amount = PRICING[plan][billingCycle].amount;
    const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK_TEST-mock-key";

    initFlutterwavePayment({
      publicKey,
      amount,
      email: session.user.email!,
      userId: session.user.id,
      plan,
      billingCycle,
      onSuccess: async (res) => {
        console.log("Payment successful", res);
        setVerifying(true);
        try {
          const verifyRes = await fetch("/api/subscription/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction_id: res.transaction_id || res.id })
          });
          if (verifyRes.ok) {
            window.location.href = "/subscription";
          } else {
            alert("Verification failed. Please contact support.");
            setVerifying(false);
          }
        } catch (e) {
          console.error(e);
          setVerifying(false);
        }
      },
      onClose: () => {
        console.log("Payment modal closed");
      }
    });
  };

  const getPrice = (plan: "STANDARD" | "PREMIUM") => {
    return PRICING[plan][billingCycle].label.split("/")[0];
  };

  const periodLabel = billingCycle === "MONTHLY" ? "/mo" : "/yr";

  // Common Study Features
  const baseStudyFeatures: PricingFeature[] = [
    { label: "Basic AI Summaries", included: true },
    { label: "Flashcards Generation", included: true },
    { label: "Practice Quizzes", included: true },
  ];

  const standardStudyFeatures: PricingFeature[] = [
    { label: "Full AI Summaries", included: true },
    { label: "Flashcards Generation", included: true },
    { label: "Practice Quizzes", included: true },
    { label: "Simplified Explanations", included: true },
    { label: "YouTube Recommendations", included: true },
  ];

  const premiumStudyFeatures: PricingFeature[] = [
    ...standardStudyFeatures,
    { label: "Advanced Analytics", included: true },
    { label: "Gamification (Streaks)", included: true },
    { label: "Priority Processing", included: true },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Ready to unlock your full potential?</h2>
        <p className={styles.subtitle}>Start free, and upgrade when you need more power to accelerate your learning.</p>
      </div>

      <div className={styles.toggleWrapper}>
        <button 
          className={`${styles.toggleButton} ${billingCycle === "MONTHLY" ? styles.toggleButtonActive : ""}`}
          onClick={() => setBillingCycle("MONTHLY")}
        >
          Monthly
        </button>
        <button 
          className={`${styles.toggleButton} ${billingCycle === "YEARLY" ? styles.toggleButtonActive : ""}`}
          onClick={() => setBillingCycle("YEARLY")}
        >
          Yearly <span className={styles.discountBadge}>Save 20%</span>
        </button>
      </div>

      {verifying && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>
          Verifying your payment...
        </div>
      )}
      <div className={styles.grid}>
        {/* FREE PLAN */}
        <PricingCard 
          name="Starter"
          priceAmount="Free"
          pricePeriod="forever"
          buttonText="Get Started"
          onSelect={() => handleCheckout("FREE")}
          studyFeatures={[
            ...baseStudyFeatures,
            { label: "Simplified Explanations", included: false },
            { label: "YouTube Recommendations", included: false },
          ]}
          limitFeatures={[
            { label: "300MB max file size", included: true },
            { label: "3 practice tests / month", included: true },
            { label: "5 questions per test", included: true },
          ]}
        />

        {/* STANDARD PLAN */}
        <PricingCard 
          name="Standard"
          priceAmount={getPrice("STANDARD")}
          pricePeriod={periodLabel}
          buttonText="Upgrade to Standard"
          onSelect={() => handleCheckout("STANDARD")}
          studyFeatures={standardStudyFeatures}
          limitFeatures={[
            { label: "500MB max file size", included: true },
            { label: "10 practice tests / month", included: true },
            { label: "100 questions per test", included: true },
          ]}
        />

        {/* PREMIUM PLAN */}
        <PricingCard 
          name="Premium"
          priceAmount={getPrice("PREMIUM")}
          pricePeriod={periodLabel}
          isPremium={true}
          buttonText="Get Premium"
          onSelect={() => handleCheckout("PREMIUM")}
          studyFeatures={premiumStudyFeatures}
          limitFeatures={[
            { label: "1GB max file size", included: true },
            { label: "Unlimited practice tests", included: true },
            { label: "Unlimited questions", included: true },
          ]}
        />
      </div>

      <div className={styles.statsSection}>
        <h3 className={styles.statsTitle}>Trusted by students everywhere</h3>
        <p className={styles.statsDesc}>Thousands of learners are boosting their grades with Lumio.</p>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>50k+</span>
            <span className={styles.statLabel}>Documents Analyzed</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>1M+</span>
            <span className={styles.statLabel}>Questions Answered</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>4.9/5</span>
            <span className={styles.statLabel}>Average Rating</span>
          </div>
        </div>
      </div>
    </div>
  );
}
