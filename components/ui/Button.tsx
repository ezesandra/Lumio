import React from "react";
import styles from "./Button.module.css";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  iconOnly = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    iconOnly ? styles.iconOnly : styles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={props.type || "button"} className={classes} {...props}>
      {children}
    </button>
  );
}
