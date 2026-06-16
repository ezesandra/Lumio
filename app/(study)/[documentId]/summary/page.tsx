import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookOpenText, MessageCircleCode, Video, Sparkles, Lock } from "lucide-react";

export default async function SummaryPage({ params }: { params: Promise<{ documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { documentId } = await params;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { studyContent: true }
  });

  if (!document || document.userId !== session.user.id) redirect("/dashboard");

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

  const tier = session.user.subscriptionTier;
  const canSeeYouTube = tier === "STANDARD" || tier === "PREMIUM";
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

      <section style={sectionStyle}>
        <div style={headingRow}>
          <div style={{ ...iconBox, background: "hsla(0, 0%, 0%, 0.04)", color: "var(--color-text-secondary)" }}>
            <Video size={20} />
          </div>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-lg)", color: "var(--color-text-primary)", margin: 0 }}>Recommended Videos</h2>
        </div>
        {canSeeYouTube ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--spacing-4)" }}>
            {youtubeLinks?.map((vid, idx) => (
              <Card key={idx} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-4)" }}>
                <img
                  src={vid.thumbnailUrl}
                  alt={vid.title}
                  style={{
                    width: 140,
                    height: 80,
                    borderRadius: "var(--radius-md)",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: 600, marginBottom: "var(--spacing-1)", color: "var(--color-text-primary)" }}>
                    {vid.title}
                  </h3>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-2)" }}>
                    {vid.channelName}
                  </p>
                  <a href={vid.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm">Watch Video</Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card style={{ textAlign: "center", padding: "var(--spacing-8)" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto var(--spacing-3)", borderRadius: "var(--radius-full)", background: "var(--color-surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
              <Lock size={22} />
            </div>
            <p style={{ marginBottom: "var(--spacing-1)", fontWeight: 600, color: "var(--color-text-primary)" }}>
              Unlock Video Recommendations
            </p>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-4)", maxWidth: 320, margin: "0 auto var(--spacing-4)" }}>
              Upgrade your plan to get AI-curated video recommendations tailored to your study material.
            </p>
            <Button variant="primary">Upgrade Plan</Button>
          </Card>
        )}
      </section>
    </div>
  );
}
