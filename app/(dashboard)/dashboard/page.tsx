import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Flame, Zap, Crown, Upload, ArrowRight, FileText } from "lucide-react";
import styles from "./page.module.css";

async function getDashboardData(userId: string) {
  const [user, recentDocs, totalQuizScore, xpLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true, streakCount: true, subscriptionTier: true },
    }),
    prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, documentTitle: true, fileName: true, status: true, createdAt: true },
    }),
    prisma.quizAttempt.aggregate({
      where: { userId },
      _sum: { score: true },
      _count: true,
    }),
    prisma.xPLog.count({
      where: { userId },
    }),
  ]);

  return { user, recentDocs, totalQuizScore, xpLogs };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true },
    });
    if (user && !user.onboardingCompleted) {
      redirect("/onboarding");
    }
  }
  if (!session?.user?.id) redirect("/login");

  const data = await getDashboardData(session.user.id);

  const tierLabel = data.user?.subscriptionTier
    ? { FREE: "Starter", STANDARD: "Standard", PREMIUM: "Premium" }[data.user.subscriptionTier]
    : "Starter";

  const stats = [
    {
      value: `${data.user?.streakCount ?? 0}`,
      label: "Day Streak",
      icon: Flame,
      color: "var(--color-accent)",
      gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    },
    {
      value: `${data.user?.xpTotal ?? 0}`,
      label: "Total XP",
      icon: Zap,
      color: "var(--color-brand)",
      gradient: "linear-gradient(135deg, var(--color-brand), hsl(280, 50%, 50%))",
    },
    {
      value: tierLabel,
      label: "Current Plan",
      icon: Crown,
      color: "var(--color-success)",
      gradient: "linear-gradient(135deg, #22c55e, #16a34a)",
    },
  ];

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, {session.user.name}!</h1>
          <p className={styles.subtitle}>Ready to crush your learning goals today?</p>
        </div>
        <Link href="/upload">
          <Button>
            <Upload size={16} />
            Upload Document
          </Button>
        </Link>
      </header>

      <div className={styles.grid}>
        {stats.map((stat, idx) => (
          <div key={idx} className={styles.statCard}>
            <div className={styles.statAccent} style={{ background: stat.gradient }} />
            <div className={styles.statContent}>
              <div className={styles.statIconWrap} style={{ background: `${stat.color}1a` }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <div className={styles.statValue} style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Documents</h2>
          <Link href="/library" className={styles.viewAll}>
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {data.recentDocs.length > 0 ? (
          <div className={styles.docList}>
            {data.recentDocs.map((doc) => (
              <Link key={doc.id} href={`/${doc.id}/summary`} className={styles.docRow}>
                <div className={styles.docIcon}>
                  <FileText size={18} />
                </div>
                <div className={styles.docInfo}>
                  <span className={styles.docName}>{doc.documentTitle}</span>
                  <span className={styles.docMeta}>{doc.fileName}</span>
                </div>
                <span className={`${styles.docStatus} ${styles[`status${doc.status}`]}`}>
                  <span className={styles.statusDot} />
                  {doc.status === "READY" ? "Ready" : doc.status === "PROCESSING" ? "Processing" : "Failed"}
                </span>
                <ArrowRight size={16} className={styles.docArrow} />
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Upload size={32} />
            </div>
            <p className={styles.emptyText}>You haven&apos;t uploaded any study materials yet.</p>
            <p className={styles.emptyHint}>Upload a PDF, DOCX, or PPTX to get started with AI-powered study tools.</p>
            <Link href="/upload">
              <Button variant="secondary">
                <Upload size={16} />
                Upload your first document
              </Button>
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
