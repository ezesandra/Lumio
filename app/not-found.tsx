import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "calc(100vh - 64px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--spacing-6)",
      background: "var(--color-surface)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "5rem", fontFamily: "var(--font-family-display)", color: "var(--color-brand)", marginBottom: "var(--spacing-4)" }}>
        404
      </div>
      <h1 style={{
        fontFamily: "var(--font-family-display)",
        fontSize: "var(--font-size-xl)",
        color: "var(--color-text-primary)",
        marginBottom: "var(--spacing-2)",
      }}>
        Page Not Found
      </h1>
      <p style={{
        color: "var(--color-text-secondary)",
        fontSize: "var(--font-size-md)",
        maxWidth: "400px",
        lineHeight: 1.6,
        marginBottom: "var(--spacing-8)",
      }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/dashboard">
        <Button variant="primary">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
