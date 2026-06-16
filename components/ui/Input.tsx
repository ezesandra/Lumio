import React from "react";
import styles from "./Input.module.css";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  variant?: "outline" | "filled";
  size?: "sm" | "md" | "lg";
  error?: string;
  rightElement?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, variant = "outline", size = "md", error, className = "", id, rightElement, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);

    const inputClasses = [
      styles.input,
      styles[variant],
      styles[size],
      error ? styles.error : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div style={{ position: "relative", width: "100%" }}>
          <input ref={ref} id={inputId} className={inputClasses} aria-invalid={!!error} style={rightElement ? { paddingRight: "var(--spacing-10)" } : undefined} {...props} />
          {rightElement && (
            <div style={{ position: "absolute", right: "var(--spacing-3)", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
              {rightElement}
            </div>
          )}
        </div>
        {error && <span className={styles.errorMessage}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
