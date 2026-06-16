"use client";

import React from "react";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Study Error]", error);
  }, [error]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "400px",
      padding: "var(--spacing-8)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "3rem", marginBottom: "var(--spacing-4)" }}>📚</div>
      <h2 style={{
        fontFamily: "var(--font-family-display)",
        fontSize: "var(--font-size-lg)",
        color: "var(--color-text-primary)",
        marginBottom: "var(--spacing-2)",
      }}>
        Failed to load study content
      </h2>
      <p style={{
        color: "var(--color-text-secondary)",
        maxWidth: "400px",
        lineHeight: 1.6,
        marginBottom: "var(--spacing-6)",
      }}>
        We couldn't load this study material. It may still be processing, or an error occurred.
      </p>
      <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
        <Button onClick={reset} variant="primary">Try Again</Button>
        <Link href="/library">
          <Button variant="secondary">Back to Library</Button>
        </Link>
      </div>
    </div>
  );
}
