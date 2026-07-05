import React from "react";
import { PricingTable } from "@/components/subscription/PricingTable";
import styles from "./page.module.css";
import { Aurora } from "@/components/effects/Aurora";

export const metadata = {
  title: "Pricing | Lumio",
  description: "Choose the perfect study plan to accelerate your learning.",
};

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <Aurora />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <PricingTable />
      </div>
    </main>
  );
}
