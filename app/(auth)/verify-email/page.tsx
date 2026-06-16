"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { verifyEmailAction } from "./actions";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string };
}) {
  const { token, email } = searchParams ?? {};
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  async function handleVerify(t: string) {
    setStatus("loading");
    const formData = new FormData();
    formData.append("token", t);
    const result = await verifyEmailAction(formData);
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setStatus("success");
      setMessage("Your email has been verified! You can now log in to Lumio.");
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color-surface)",
    padding: "var(--spacing-6)",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: "440px",
    background: "var(--color-surface-elevated)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--spacing-8)",
    boxShadow: "var(--shadow-lg)",
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", marginBottom: "var(--spacing-4)" }}>
          Email Verification
        </h1>

        {token ? (
          <>
            {status === "loading" && (
              <p style={{ color: "var(--color-text-secondary)" }}>Verifying your email address...</p>
            )}
            {status === "success" && (
              <>
                <p style={{ color: "hsl(142, 71%, 30%)", marginBottom: "var(--spacing-6)", padding: "var(--spacing-4)", background: "hsl(142, 71%, 95%)", borderRadius: "var(--radius-md)" }}>
                  {message}
                </p>
                  <Link href="/onboarding">
                  <Button variant="primary" style={{ width: "100%" }}>Continue to Onboarding</Button>
                </Link>
              </>
            )}
            {status === "error" && (
              <>
                <p style={{ color: "var(--color-error)", marginBottom: "var(--spacing-6)", padding: "var(--spacing-4)", background: "hsl(0, 71%, 95%)", borderRadius: "var(--radius-md)" }}>
                  {message}
                </p>
                <Link href="/login">
                  <Button variant="secondary" style={{ width: "100%" }}>Back to Login</Button>
                </Link>
              </>
            )}
          </>
        ) : (
          <>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--spacing-6)", lineHeight: 1.6 }}>
              We sent a verification link to <strong>{email ?? "your email address"}</strong>.
              Check your inbox and click the link to activate your account.
            </p>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              Already verified?{" "}
              <Link href="/login" style={{ color: "var(--color-brand)" }}>Log In</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
