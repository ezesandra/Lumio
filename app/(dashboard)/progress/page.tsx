import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, Flame, Crown } from "lucide-react";
import { StreakCommitment } from "@/components/gamification/StreakCommitment";

export default async function ProgressPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xpTotal: true, streakCount: true, subscriptionTier: true, targetStreak: true },
  });

  const quizStats = await prisma.quizAttempt.aggregate({
    where: { userId: session.user.id },
    _sum: { score: true },
    _count: true,
  });

  const tierLabel = user?.subscriptionTier
    ? { FREE: "Free", STANDARD: "Standard", PREMIUM: "Premium" }[user.subscriptionTier]
    : "Free";

  const stats = [
    { value: `${user?.streakCount ?? 0}`, label: "Day Streak", icon: Flame, color: "var(--color-accent)" },
    { value: `${quizStats._sum?.score ?? 0}`, label: "Quiz Points", icon: BarChart3, color: "var(--color-success)" },
    { value: "Current Plan", label: tierLabel, icon: Crown, color: "var(--color-primary)" },
  ];

  return (
    <main style={{ padding: "var(--spacing-8) var(--spacing-6)", maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-lg)", fontWeight: 700, margin: "0 0 8px" }}>
          Progress
        </h1>
        <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
          Track your learning journey and achievements.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            style={{
              padding: "24px",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "12px",
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 8, background: `${stat.color}1a`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <StreakCommitment 
        currentStreak={user?.streakCount ?? 0} 
        targetStreak={user?.targetStreak ?? null} 
      />
    </main>
  );
}
