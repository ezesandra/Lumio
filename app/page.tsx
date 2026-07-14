"use client";

import { useState } from "react";
import Link from "next/link";
import { Aurora } from "@/components/effects/Aurora";
import { PricingTable } from "@/components/subscription/PricingTable";

import styles from "./page.module.css";

const features = [
  { icon: "📄", title: "Smart Summaries", desc: "Upload any document and get concise AI-powered summaries that capture the key points in seconds." },
  { icon: "🃏", title: "Flashcard Generator", desc: "Turn your study material into interactive flashcards. Review anytime, anywhere." },
  { icon: "🧠", title: "Adaptive Quizzes", desc: "Test your knowledge with AI-generated quizzes that adapt to your progress." },
  { icon: "📊", title: "Progress Tracking", desc: "Monitor your learning journey with streaks and detailed analytics." },
  { icon: "🤖", title: "AI Chat", desc: "Ask questions about your material and get instant answers from your personal AI tutor." },
  { icon: "📱", title: "Study Anywhere", desc: "Access your materials across all your devices. Study whenever inspiration strikes." },
];

const steps = [
  { title: "Upload Your Material", desc: "Drop in PDFs, notes, or any text — Lumio handles the rest." },
  { title: "AI Processes It", desc: "Our AI analyzes your content and extracts the essential knowledge." },
  { title: "Start Studying", desc: "Dive into summaries, flashcards, and quizzes optimized for your brain." },
];


const faqs = [
  { q: "How does Lumio process my documents?", a: "Lumio uses advanced AI to analyze your uploaded materials, extracting key concepts and organizing them into structured summaries, flashcards, and quiz questions. Your data is encrypted and never shared." },
  { q: "What file formats are supported?", a: "We support PDF, DOCX, TXT, and pasted text. You can also add notes directly within the app." },
  { q: "Can I use Lumio offline?", a: "Currently Lumio requires an internet connection for AI processing, but your generated flashcards and summaries are available offline after creation." },
  { q: "Is my data private and secure?", a: "Absolutely. All documents are encrypted at rest and in transit. We never use your materials for training our models without explicit consent." },
  { q: "Can I cancel my subscription?", a: "Yes, you can cancel anytime. Your access continues until the end of your billing period." },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <Aurora />
        <div className={styles.heroBadge}>
          <span>✨</span>
          <span>AI-Powered Study Companion</span>
        </div>
        <h1 className={styles.heroTitle}>
          Learn Smarter, Not Harder
        </h1>
        <p className={styles.heroSubtitle}>
          Upload your materials and transform them into summaries, flashcards, and
          quizzes instantly. Your personal AI study partner.
        </p>
        <div className={styles.heroActions}>
          <Link href="/signup" className={`${styles.button} ${styles.primary}`}>
            Get Started
          </Link>

        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroCard}>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}>📄</div>
              <span>Upload PDFs & notes</span>
            </div>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}>🤖</div>
              <span>AI summarizes instantly</span>
            </div>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}>🧠</div>
              <span>Interactive quizzes</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricNumber}>50k+</div>
          <div className={styles.metricLabel}>Documents Analyzed</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricNumber}>1M+</div>
          <div className={styles.metricLabel}>Questions Answered</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricNumber}>4.9/5</div>
          <div className={styles.metricLabel}>Average Rating</div>
        </div>
      </div>

      <section id="features" className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>✦</span>
          <span>Features</span>
        </div>
        <h2 className={styles.sectionTitle}>Everything You Need to Study Better</h2>
        <p className={styles.sectionDesc}>
          Lumio combines the power of AI with proven learning techniques to help you
          absorb information faster and retain it longer.
        </p>
        <div className={styles.features}>
          {features.map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <div className={styles.featureTitle}>{f.title}</div>
              <div className={styles.featureDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>⚡</span>
          <span>How It Works</span>
        </div>
        <h2 className={styles.sectionTitle}>Three Simple Steps</h2>
        <p className={styles.sectionDesc}>
          Get started in minutes. No setup, no hassle — just smarter studying.
        </p>
        <div className={styles.steps}>
          {steps.map((s, i) => (
            <div key={i} className={styles.stepCard}>
              <div className={styles.stepNumber}>{i + 1}</div>
              <div className={styles.stepTitle}>{s.title}</div>
              <div className={styles.stepDesc}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className={styles.section} style={{ padding: 0 }}>
        <PricingTable />
      </section>

      <section id="faq" className={styles.section}>
        <div className={styles.sectionLabel}>
          <span>?</span>
          <span>FAQ</span>
        </div>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <p className={styles.sectionDesc}>
          Everything you need to know about Lumio.
        </p>
        <div className={styles.faqList}>
          {faqs.map((faq, i) => (
            <div key={i} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {faq.q}
                <span className={`${styles.faqArrow} ${openFaq === i ? styles.faqArrowOpen : ""}`}>
                  ▼
                </span>
              </button>
              {openFaq === i && (
                <div className={styles.faqAnswer}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to Study Smarter?</h2>
        <p className={styles.ctaDesc}>
          Join thousands of students who are already using Lumio to transform their learning.
        </p>
        <Link href="/signup" className={`${styles.button} ${styles.primary}`}>
          Get Started
        </Link>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>Lumio</div>

          <div className={styles.footerCopy}>© 2026 Lumio. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
