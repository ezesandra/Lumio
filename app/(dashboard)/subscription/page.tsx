import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Check, Info } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIMITS, type TierKey } from "@/lib/limits";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

export const metadata = {
  title: "Manage Subscription | Lumio",
  description: "View your current subscription plan and limits.",
};

export default async function ManageSubscriptionPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true, subscriptionExpiresAt: true },
  });

  if (!user) redirect("/login");

  const tier = user.subscriptionTier as TierKey;
  const limits = LIMITS[tier];

  // Map the configuration to display friendly text
  const displayLimits = [
    { label: `${limits.maxFileSizeBytes / (1024 * 1024)}MB max file upload size` },
    { label: limits.practiceTestsPerMonth === Infinity ? "Unlimited practice tests" : `${limits.practiceTestsPerMonth} practice tests per month` },
    { label: limits.questionsPerTest === Infinity ? "Unlimited questions per test" : `${limits.questionsPerTest} questions per test` },
  ];

  const displayFeatures = [
    { label: limits.aiSummary === "full" ? "Full AI Summaries" : "Basic AI Summaries" },
    { label: "Flashcard Generation" },
    { label: "Practice Quizzes" },
  ];

  if (limits.simplifiedExplanations) displayFeatures.push({ label: "Simplified Explanations" });
  if (limits.youtubeRecommendations) displayFeatures.push({ label: "YouTube Recommendations" });
  if (limits.advancedAnalytics) displayFeatures.push({ label: "Advanced Analytics" });
  if (limits.gamification) displayFeatures.push({ label: "Gamification & Streaks" });

  const isFree = tier === "FREE";

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Manage Subscription</h1>
        <p className={styles.subtitle}>Review your current plan benefits and explore options to upgrade.</p>
      </header>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.planName}>{tier.charAt(0) + tier.slice(1).toLowerCase()} Plan</div>
            <div style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginTop: "4px" }}>
              {user.subscriptionExpiresAt 
                ? `Renews on ${new Date(user.subscriptionExpiresAt).toLocaleDateString()}` 
                : "Free forever."}
            </div>
          </div>
          <div className={styles.planStatus}>
            <Check size={14} /> Active
          </div>
        </div>

        <div className={styles.grid}>
          <div>
            <h3 className={styles.sectionTitle}>Your Features</h3>
            <ul className={styles.featureList}>
              {displayFeatures.map((feature, i) => (
                <li key={i} className={styles.featureItem}>
                  <Check size={16} className={styles.featureIcon} />
                  <span>{feature.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className={styles.sectionTitle}>Plan Limits</h3>
            <ul className={styles.featureList}>
              {displayLimits.map((limit, i) => (
                <li key={i} className={styles.featureItem}>
                  <Info size={16} className={styles.featureIcon} style={{ color: "var(--color-text-secondary)" }} />
                  <span>{limit.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.actionSection}>
        <div>
          <div className={styles.actionText}>Ready for more?</div>
          <div className={styles.actionSubtext}>Upgrade your plan to unlock more practice tests, higher upload limits, and advanced features.</div>
        </div>
        <Link href="/pricing">
          <Button variant="primary">
            {isFree ? "View Upgrade Plans" : "Compare All Plans"}
          </Button>
        </Link>
      </div>
    </main>
  );
}
