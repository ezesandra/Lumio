"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { requestPasswordResetAction, resetPasswordAction } from "./actions";

const inputStyle: React.CSSProperties = {
  minHeight: 50,
  width: "100%",
  borderRadius: 8,
  border: "1px solid #d0d5dd",
  background: "#fff",
  color: "#101928",
  fontSize: "0.875rem",
  padding: "0 16px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const inputFocusStyle: React.CSSProperties = {
  borderColor: "#7c3aed",
  boxShadow: "0 0 0 1px #7c3aed",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  marginBottom: 8,
  color: "#344054",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  position: "relative",
  boxSizing: "border-box",
  background: "#fff",
};

const formWrapperStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 450,
  position: "relative",
  zIndex: 1,
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  marginTop: 24,
  color: "#667185",
  fontSize: "0.875rem",
};

const linkStyle: React.CSSProperties = {
  color: "#7c3aed",
  textDecoration: "none",
  fontWeight: 500,
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams?.token;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const formData = new FormData();
    formData.set("email", email);
    const result = await requestPasswordResetAction(formData);
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setStatus("success");
      setMessage("If an account exists with that email, you'll receive a reset link shortly.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const formData = new FormData();
    formData.set("token", token || "");
    formData.set("password", password);
    const result = await resetPasswordAction(formData);
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setStatus("success");
      setMessage("Your password has been reset successfully. You can now log in.");
    }
  };

  return (
    <div style={pageStyle}>
      <style>{`input::placeholder { color: #98a2b3; }`}</style>
      <div style={formWrapperStyle}>
        <Link href="/" style={{ display: "flex", justifyContent: "center", marginBottom: 48, textDecoration: "none" }}>
          <span style={{ fontFamily: "var(--font-family-display)", fontSize: "1.75rem", fontWeight: 800, color: "#7c3aed" }}>Lumio</span>
        </Link>

        {token ? (
          <>
            <h1 style={{ textAlign: "center", fontFamily: "var(--font-family-display)", fontSize: "1.5rem", fontWeight: 700, color: "#101928", marginBottom: 4 }}>Set New Password</h1>
            <p style={{ textAlign: "center", color: "#667185", fontSize: "0.875rem", marginBottom: 40, marginTop: 8 }}>Choose a strong password of at least 8 characters.</p>

            {status === "error" && (
              <div style={{ color: "#e53e3e", fontSize: "0.875rem", textAlign: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(229,62,62,0.1)", borderRadius: 8 }}>
                {message}
              </div>
            )}
            {status === "success" ? (
              <div>
                <div style={{ color: "#2f855a", fontSize: "0.875rem", textAlign: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(47,133,90,0.1)", borderRadius: 8 }}>
                  {message}
                </div>
                <div style={footerStyle}>
                  <Link href="/login" style={linkStyle}>Back to Login</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>New Password</label>
                  <input
                    type="password"
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <Button type="submit" disabled={status === "loading"} style={{ width: "100%", height: 50, fontSize: "0.9rem" }}>
                  {status === "loading" ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}
          </>
        ) : (
          <>
            <h1 style={{ textAlign: "center", fontFamily: "var(--font-family-display)", fontSize: "1.5rem", fontWeight: 700, color: "#101928", marginBottom: 4 }}>Reset Password</h1>
            <p style={{ textAlign: "center", color: "#667185", fontSize: "0.875rem", marginBottom: 40, marginTop: 8 }}>Enter your email and we&apos;ll send you a reset link.</p>

            {status === "error" && (
              <div style={{ color: "#e53e3e", fontSize: "0.875rem", textAlign: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(229,62,62,0.1)", borderRadius: 8 }}>
                {message}
              </div>
            )}
            {status === "success" ? (
              <div style={{ color: "#2f855a", fontSize: "0.875rem", textAlign: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(47,133,90,0.1)", borderRadius: 8 }}>
                {message}
              </div>
            ) : (
              <form onSubmit={handleRequestReset} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <Button type="submit" disabled={status === "loading"} style={{ width: "100%", height: 50, fontSize: "0.9rem" }}>
                  {status === "loading" ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}
            <div style={footerStyle}>
              <Link href="/login" style={linkStyle}>Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
