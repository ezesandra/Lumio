"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

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
  background: "var(--color-background)",
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const getInputStyle = (name: string): React.CSSProperties => ({
    ...inputStyle,
    ...(focusedField === name ? inputFocusStyle : {}),
    ...(fieldErrors[name] ? { borderColor: "#e53e3e" } : {}),
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [googleHover, setGoogleHover] = useState(false);

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "Field cannot be empty";
    if (!password.trim()) errors.password = "Field cannot be empty";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div style={pageStyle}>
      <style>{`input::placeholder { color: #98a2b3; }`}</style>
      <div style={formWrapperStyle}>
        <Link href="/" style={{ display: "flex", justifyContent: "center", marginBottom: 48, textDecoration: "none" }}>
          <span style={{ fontFamily: "var(--font-family-display)", fontSize: "1.75rem", fontWeight: 800, color: "#7c3aed" }}>Lumio</span>
        </Link>

        <h1 style={{ textAlign: "center", fontFamily: "var(--font-family-display)", fontSize: "1.5rem", fontWeight: 700, color: "#101928", marginBottom: 4 }}>Welcome Back</h1>
        <p style={{ textAlign: "center", color: "#667185", fontSize: "0.875rem", marginBottom: 40, marginTop: 8 }}>Log in to access your study materials.</p>

        {error && (
          <div style={{ color: "#e53e3e", fontSize: "0.875rem", textAlign: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(229,62,62,0.1)", borderRadius: 8 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={getInputStyle("email")}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
            {fieldErrors.email && <span style={{ color: "#e53e3e", fontSize: "0.75rem", marginTop: 4 }}>{fieldErrors.email}</span>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="off"
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ ...getInputStyle("password"), paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={togglePassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#667185", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, lineHeight: 0, WebkitTapHighlightColor: "transparent" }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && <span style={{ color: "#e53e3e", fontSize: "0.75rem", marginTop: 4 }}>{fieldErrors.password}</span>}
          </div>

          <div style={{ marginTop: 12 }}>
            <Button type="submit" disabled={loading} style={{ width: "100%", height: 50, fontSize: "0.9rem" }}>
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </div>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#e4e7ec" }} />
          <span style={{ color: "#98a2b3", fontSize: "0.8rem", whiteSpace: "nowrap" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#e4e7ec" }} />
        </div>

        <button
          onClick={() => signIn("google")}
          onMouseEnter={() => setGoogleHover(true)}
          onMouseLeave={() => setGoogleHover(false)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", height: 50, borderRadius: 8, border: "1px solid #d0d5dd",
            background: googleHover ? "#f5f5f5" : "#fff", color: "#344054", fontFamily: "var(--font-family-base)",
            fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", transition: "background 0.2s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.64-.055-1.25-.155-1.84H9v3.48h4.844a4.14 4.14 0 01-1.796 2.716v2.26h2.908C16.658 13.884 17.64 11.668 17.64 9.2z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.805.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.712H.957v2.332C2.438 15.984 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.712A5.404 5.404 0 013.636 9c0-.592.108-1.168.328-1.712V4.956H.957A9 9 0 000 9c0 1.452.348 2.828.956 4.044l3.008-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.322 0 2.508.454 3.44 1.345l2.582-2.58C13.463.892 11.426 0 9 0 5.482 0 2.438 2.016.957 4.956l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={footerStyle}>
          Can&apos;t remember your password?{" "}<Link href="/reset-password" style={linkStyle}>Reset Password</Link>
        </div>
        <div style={{ ...footerStyle, marginTop: 16 }}>
          New to Lumio?{" "}
          <Link href="/signup" style={linkStyle}>Create Account</Link>
        </div>
      </div>
    </div>
  );
}
