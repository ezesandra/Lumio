import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookOpenText, MessageCircleCode, Video, Sparkles, Lock, AlertCircle } from "lucide-react";
import { AutoRefresh } from "../AutoRefresh";
import { LIMITS, type TierKey } from "@/lib/limits";
export default async function SummaryPage({ params }: { params: Promise<{ documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { documentId } = await params;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { studyContent: true }
  });

  if (!document || document.userId !== session.user.id) redirect("/library");

  if (document.status === "PROCESSING") {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-16) 0" }}>
        <div style={{ width: 64, height: 64, margin: "0 auto var(--spacing-4)", borderRadius: "var(--radius-full)", background: "var(--color-brand-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={28} style={{ color: "var(--color-brand)" }} />
        </div>
        <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", marginBottom: "var(--spacing-2)" }}>Processing your document...</h1>
        <p style={{ color: "var(--color-text-secondary)", maxWidth: 400, margin: "0 auto" }}>
          Our AI is currently analyzing your document and generating study materials. This usually takes a few moments.
        </p>
        <AutoRefresh documentId={documentId} />
      </div>
    );
  }

  if (document.status === "FAILED") {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-16) 0" }}>
        <div style={{ width: 64, height: 64, margin: "0 auto var(--spacing-4)", borderRadius: "var(--radius-full)", background: "rgba(229,62,62,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AlertCircle size={28} style={{ color: "var(--color-error)" }} />
        </div>
        <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", marginBottom: "var(--spacing-2)" }}>Processing failed</h1>
        <p style={{ color: "var(--color-text-secondary)", maxWidth: 500, margin: "0 auto var(--spacing-6)" }}>
          Unfortunately, we couldn't generate study materials for your document.
        </p>
        <div style={{ color: "var(--color-error)", fontSize: "var(--font-size-sm)", padding: "12px 16px", background: "rgba(229,62,62,0.1)", borderRadius: "var(--radius-md)", display: "inline-block", maxWidth: 600, textAlign: "left", whiteSpace: "pre-wrap" }}>
          <strong>Error Details:</strong> {document.failureReason || "Unknown error"}
        </div>
      </div>
    );
  }

  const content = document.studyContent;

  if (!content) {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-16) 0" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>No study content found. Please try uploading again.</p>
      </div>
    );
  }

  const tier = session.user.subscriptionTier as TierKey;
  const canSeeYouTube = LIMITS[tier]?.youtubeRecommendations;
  const youtubeLinks = content.youtubeLinks as any[];

  const sectionStyle = {
    display: "flex",
    flexDirection: "column" as const,
    gap: "var(--spacing-4)",
  };

  const headingRow = {
    display: "flex",
    alignItems: "center",
    gap: "var(--spacing-3)",
  };

  const iconBox = {
    width: 36,
    height: 36,
    borderRadius: "var(--radius-md)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
      <section style={sectionStyle}>
        <div style={headingRow}>
          <div style={{ ...iconBox, background: "var(--color-brand-subtle)", color: "var(--color-brand)" }}>
            <BookOpenText size={20} />
          </div>
          <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", color: "var(--color-text-primary)", margin: 0 }}>Summary</h1>
        </div>
        <Card elevated>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: "var(--font-size-base)", color: "var(--color-text-primary)" }}>
            {content.summary}
          </div>
        </Card>
      </section>

      {content.simplifiedExplanation && (
        <section style={sectionStyle}>
          <div style={headingRow}>
            <div style={{ ...iconBox, background: "hsl(142, 71%, 45%, 0.1)", color: "var(--color-success)" }}>
              <MessageCircleCode size={20} />
            </div>
            <h2 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-lg)", color: "var(--color-text-primary)", margin: 0 }}>Simplified Explanation</h2>
          </div>
          <Card>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: "var(--font-size-base)", color: "var(--color-text-primary)" }}>
              {content.simplifiedExplanation}
            </div>
          </Card>
        </section>
      )}

    </div>
  );
}
