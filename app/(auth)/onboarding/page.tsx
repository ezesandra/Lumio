"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { completeOnboardingAction } from "./actions";
import styles from "./page.module.css";

type Step = "welcome" | "upload" | "subjects";

const steps: { key: Step; title: string }[] = [
  { key: "welcome", title: "Welcome" },
  { key: "upload", title: "Upload" },
  { key: "subjects", title: "Subjects" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [isPending, setIsPending] = useState(false);

  const currentIndex = steps.findIndex((s) => s.key === step);

  async function handleFinish() {
    setIsPending(true);
    await completeOnboardingAction();
    router.push("/upload");
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.progress}>
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`${styles.dot} ${i <= currentIndex ? styles.dotActive : ""}`} />
              {i < steps.length - 1 && (
                <div className={`${styles.line} ${i < currentIndex ? styles.lineActive : ""}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card className={styles.card}>
          {step === "welcome" && (
            <div className={styles.content}>
              <div className={styles.illustration}>
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="56" stroke="var(--color-brand)" strokeWidth="2" fill="var(--color-brand-subtle)" opacity="0.3" />
                  <circle cx="60" cy="60" r="40" stroke="var(--color-brand)" strokeWidth="2" fill="var(--color-brand-subtle)" opacity="0.5" />
                  <circle cx="60" cy="60" r="24" fill="var(--color-brand)" />
                  <text x="60" y="66" textAnchor="middle" fill="var(--color-text-inverse)" fontSize="20" fontWeight="700" fontFamily="var(--font-family-display)">L</text>
                </svg>
              </div>
              <h1 className={styles.title}>Welcome to Lumio</h1>
              <p className={styles.description}>
                Your AI-powered study companion. Upload any document and instantly get
                summaries, flashcards, and quizzes to accelerate your learning.
              </p>
              <div className={styles.features}>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>📄</span>
                  <span>Upload PDFs, notes, and more</span>
                </div>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>✨</span>
                  <span>AI-generated summaries</span>
                </div>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>🃏</span>
                  <span>Interactive flashcards & quizzes</span>
                </div>
              </div>
            </div>
          )}

          {step === "upload" && (
            <div className={styles.content}>
              <div className={styles.illustration}>
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <rect x="20" y="30" width="80" height="60" rx="8" stroke="var(--color-brand)" strokeWidth="2" fill="var(--color-brand-subtle)" opacity="0.4" />
                  <path d="M60 50L60 80M60 50L48 62M60 50L72 62" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="30" y="40" width="60" height="4" rx="2" fill="var(--color-brand)" opacity="0.3" />
                  <rect x="30" y="48" width="40" height="3" rx="1.5" fill="var(--color-brand)" opacity="0.2" />
                </svg>
              </div>
              <h1 className={styles.title}>Upload Your First Document</h1>
              <p className={styles.description}>
                Drop any study material — lecture slides, research papers, notes, or
                book chapters. Lumio supports PDF, text, and common document formats.
              </p>
              <div className={styles.tips}>
                <p className={styles.tipTitle}>Pro tip:</p>
                <p className={styles.tipText}>
                  For best results, upload documents with clear headings and structured
                  content. The AI works best with well-organized materials.
                </p>
              </div>
            </div>
          )}

          {step === "subjects" && (
            <div className={styles.content}>
              <div className={styles.illustration}>
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <rect x="20" y="20" width="35" height="45" rx="4" stroke="var(--color-brand)" strokeWidth="2" fill="var(--color-brand-subtle)" opacity="0.5" />
                  <rect x="65" y="35" width="35" height="45" rx="4" stroke="var(--color-brand)" strokeWidth="2" fill="var(--color-brand-subtle)" opacity="0.5" />
                  <rect x="42" y="30" width="35" height="45" rx="4" stroke="var(--color-accent)" strokeWidth="2" fill="var(--color-accent-light)" opacity="0.5" />
                  <line x1="52" y1="45" x2="67" y2="45" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="52" y1="52" x2="67" y2="52" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="52" y1="59" x2="60" y2="59" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className={styles.title}>Pick Your Subjects</h1>
              <p className={styles.description}>
                Tell Lumio what you're studying and we'll tailor the experience. From
                computer science to literature — we've got you covered.
              </p>
              <div className={styles.subjects}>
                <span className={styles.pill}>Computer Science</span>
                <span className={styles.pill}>Mathematics</span>
                <span className={styles.pill}>Biology</span>
                <span className={styles.pill}>History</span>
                <span className={styles.pill}>Literature</span>
                <span className={styles.pill}>Physics</span>
                <span className={styles.pill}>Chemistry</span>
                <span className={styles.pill}>+ many more</span>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                onClick={() => setStep(steps[currentIndex - 1].key)}
                disabled={isPending}

              >
                Back
              </Button>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
              {currentIndex < steps.length - 1 && (
                <Button
                  variant="ghost"
                  onClick={handleFinish}
                  disabled={isPending}
  
                >
                  Skip
                </Button>
              )}
              {currentIndex < steps.length - 1 ? (
                <Button
                  size="lg"
                  onClick={() => setStep(steps[currentIndex + 1].key)}
  
                >
                  Next
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleFinish}
                  disabled={isPending}
  
                >
                  {isPending ? "Setting up..." : "Go to Dashboard"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
