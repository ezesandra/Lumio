"use client";

import React from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production: Sentry.captureException(error)
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--spacing-6)",
      background: "var(--color-surface)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "4rem", marginBottom: "var(--spacing-4)" }}>⚠️</div>
      <h1 style={{
        fontFamily: "var(--font-family-display)",
        fontSize: "var(--font-size-xl)",
        color: "var(--color-text-primary)",
        marginBottom: "var(--spacing-2)",
      }}>
        Something went wrong
      </h1>
      <p style={{
        color: "var(--color-text-secondary)",
        fontSize: "var(--font-size-md)",
        maxWidth: "480px",
        lineHeight: 1.6,
        marginBottom: "var(--spacing-8)",
      }}>
        An unexpected error occurred. Our team has been notified. You can try again or return to the dashboard.
      </p>
      <div style={{ display: "flex", gap: "var(--spacing-4)" }}>
        <Button onClick={reset} variant="primary">Try Again</Button>
        <Button onClick={() => window.location.href = "/dashboard"} variant="secondary">Go to Dashboard</Button>
      </div>
    </div>
  );
}
