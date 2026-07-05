import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Video, Lock } from "lucide-react";
import Link from "next/link";
import { LIMITS, type TierKey } from "@/lib/limits";
export default async function VideosPage({ params }: { params: Promise<{ documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { documentId } = await params;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { studyContent: true }
  });

  if (!document || document.userId !== session.user.id) redirect("/library");

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
  const youtubeLinks = (content.youtubeLinks as any[]) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-8)" }}>
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "hsla(0, 0%, 0%, 0.04)", color: "var(--color-text-secondary)" }}>
            <Video size={20} />
          </div>
          <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", color: "var(--color-text-primary)", margin: 0 }}>Helpful Videos</h1>
        </div>

        {canSeeYouTube ? (
          youtubeLinks.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--spacing-4)" }}>
              {youtubeLinks.map((vid, idx) => (
                <Card key={idx} style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "var(--spacing-4)" }}>
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    style={{
                      width: 160,
                      height: 90,
                      borderRadius: "var(--radius-md)",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "var(--spacing-1)", color: "var(--color-text-primary)" }}>
                      {vid.title}
                    </h3>
                    <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", marginBottom: "var(--spacing-3)" }}>
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
              <p style={{ color: "var(--color-text-secondary)" }}>No helpful videos found for this document.</p>
             </Card>
          )
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
            <Link href="/pricing">
              <Button variant="primary">Upgrade Plan</Button>
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
}
