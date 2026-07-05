"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { signupAction } from "./actions";

const inputStyle: React.CSSProperties = {
  minHeight: 50,
  width: "100%",
  borderRadius: 8,
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#d0d5dd",
  background: "#fff",
  color: "#101928",
  fontSize: "0.875rem",
  padding: "0 16px",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const inputFocusedStyle: React.CSSProperties = {
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
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "10vh 16px 24px",
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

const googleBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  height: 50,
  borderRadius: 8,
  border: "1px solid #d0d5dd",
  background: "#fff",
  color: "#344054",
  fontFamily: "var(--font-family-base)",
  fontSize: "0.875rem",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 0.2s",
  padding: "0 16px",
  boxSizing: "border-box",
};

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [googleHover, setGoogleHover] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const togglePassword = () => setShowPassword((prev) => !prev);

  const EMAIL_REGEX = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i;
  const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  const passwordReqs = [
    { label: "password must be minimum of 8 characters", test: (v: string) => v.length >= 8 },
    { label: "must contain an uppercase", test: (v: string) => /[A-Z]/.test(v) },
    { label: "must contain a number", test: (v: string) => /\d/.test(v) },
    { label: "must contain a special character", test: (v: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) },
  ];

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const getInputStyle = (name: string, hasError?: string): React.CSSProperties => ({
    ...inputStyle,
    ...(focusedField === name ? inputFocusedStyle : {}),
    ...(hasError ? { borderColor: "#e53e3e" } : {}),
  });

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocusedField(e.target.name);
    setFieldErrors((prev) => {
      if (!prev[e.target.name]) return prev;
      const next = { ...prev };
      delete next[e.target.name];
      return next;
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFocusedField(null);
    const rt = e.relatedTarget as HTMLElement | null;
    if (rt?.closest?.("a")) return;
    if (!value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [name]: "Field cannot be empty" }));
    } else if (name === "email" && !EMAIL_REGEX.test(value)) {
      setFieldErrors((prev) => ({ ...prev, email: "Invalid email address" }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const errors: Record<string, string> = {};
    for (const field of ["name", "email", "password"]) {
      if (!formData.get(field)?.toString().trim()) {
        errors[field] = "Field cannot be empty";
      }
    }
    const email = formData.get("email") as string;
    if (!errors.email && email && !EMAIL_REGEX.test(email)) {
      errors.email = "Invalid email address";
    }
    const pw = formData.get("password") as string;
    if (!errors.password && pw && !PASSWORD_REGEX.test(pw)) {
      errors.password = "Meet all requirements below";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    startTransition(async () => {
      const result = await signupAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        const res = await signIn("credentials", {
          email: formData.get("email"),
          password: formData.get("password"),
          redirect: false,
        });
        
        if (res?.ok) {
          router.push("/onboarding");
        } else {
          router.push("/login");
        }
      }
    });
  };

  return (
    <div style={pageStyle}>
      <style>{`input::placeholder { color: #98a2b3; }`}</style>
      <div style={formWrapperStyle}>
        <Link href="/" style={{ display: "flex", justifyContent: "center", marginBottom: 48, textDecoration: "none" }}>
          <span style={{ fontFamily: "var(--font-family-display)", fontSize: "1.75rem", fontWeight: 800, color: "#7c3aed" }}>Lumio</span>
        </Link>

        <h1 style={{ textAlign: "center", fontFamily: "var(--font-family-display)", fontSize: "1.5rem", fontWeight: 700, color: "#101928", marginBottom: 4 }}>Create Account</h1>
        <p style={{ textAlign: "center", color: "#667185", fontSize: "0.875rem", marginBottom: 40, marginTop: 8 }}>Enter your credentials to create your account</p>

        {errorParam && !error && (
          <div style={{ color: "#e53e3e", fontSize: "0.875rem", textAlign: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(229,62,62,0.1)", borderRadius: 8 }}>
            Authentication failed: {errorParam}
          </div>
        )}

        {error && (
          <div style={{ color: "#e53e3e", fontSize: "0.875rem", textAlign: "center", marginBottom: 16, padding: "8px 12px", background: "rgba(229,62,62,0.1)", borderRadius: 8 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name</label>
            <input
              ref={nameRef}
              name="name"
              type="text"
              placeholder="Enter your full name"
              required
              disabled={isPending}
              style={getInputStyle("name", fieldErrors.name)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            {fieldErrors.name && <span style={{ color: "#e53e3e", fontSize: "0.75rem", marginTop: 4 }}>{fieldErrors.name}</span>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email address"
              required
              disabled={isPending}
              style={getInputStyle("email", fieldErrors.email)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            {fieldErrors.email && <span style={{ color: "#e53e3e", fontSize: "0.75rem", marginTop: 4 }}>{fieldErrors.email}</span>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="new-password"
                required
                disabled={isPending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...getInputStyle("password", fieldErrors.password), paddingRight: 44 }}
                onFocus={handleFocus}
                onBlur={handleBlur}
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
            {password.length > 0 && !passwordReqs.every((r) => r.test(password)) && (
              <span style={{ color: "#e53e3e", fontSize: "0.75rem", marginTop: 4 }}>
                {passwordReqs.find((r) => !r.test(password))?.label}
              </span>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <Button type="submit" disabled={isPending} style={{ width: "100%", height: 50, fontSize: "0.9rem" }}>
              {isPending ? "Creating account..." : "Create Account"}
            </Button>
          </div>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#e4e7ec" }} />
          <span style={{ color: "#98a2b3", fontSize: "0.8rem", whiteSpace: "nowrap" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#e4e7ec" }} />
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/upload" })}
          onMouseEnter={() => setGoogleHover(true)}
          onMouseLeave={() => setGoogleHover(false)}
          style={{ ...googleBtnStyle, background: googleHover ? "#f5f5f5" : "#fff" }}
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
          Already have an account?{" "}
          <Link href="/login" style={linkStyle}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
