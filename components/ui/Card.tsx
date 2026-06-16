import React from "react";
import styles from "./Card.module.css";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ elevated, className = "", children, ...props }: CardProps) {
  return (
    <div className={`${styles.card} ${elevated ? styles.elevated : ""} ${className}`} {...props}>
      {children}
    </div>
  );
}
