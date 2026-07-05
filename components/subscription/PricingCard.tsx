"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./PricingTable.module.css";

export type PricingFeature = {
  label: string;
  included: boolean;
};

export type PricingCardProps = {
  name: string;
  priceAmount: string;
  pricePeriod: string;
  isPremium?: boolean;
  studyFeatures: PricingFeature[];
  limitFeatures: PricingFeature[];
  buttonText: string;
  onSelect: () => void;
};

export function PricingCard({
  name,
  priceAmount,
  pricePeriod,
  isPremium = false,
  studyFeatures,
  limitFeatures,
  buttonText,
  onSelect,
}: PricingCardProps) {
  return (
    <div className={`${styles.card} ${isPremium ? styles.cardPremium : ""}`}>
      <h3 className={styles.tierName}>{name}</h3>
      <div className={styles.priceWrapper}>
        <span className={styles.priceAmount}>{priceAmount}</span>
        <span className={styles.pricePeriod}>{pricePeriod}</span>
      </div>

      <div className={styles.featuresSection}>
        <div>
          <div className={styles.featureGroupTitle}>Study with:</div>
          <ul className={styles.featureList}>
            {studyFeatures.map((f, i) => (
              <li key={i} className={styles.featureItem}>
                {f.included ? (
                  <Check size={16} className={styles.featureIcon} />
                ) : (
                  <X size={16} className={styles.featureIconMissing} />
                )}
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className={styles.featureGroupTitle}>Plan limits:</div>
          <ul className={styles.featureList}>
            {limitFeatures.map((f, i) => (
              <li key={i} className={styles.featureItem}>
                {f.included ? (
                  <Check size={16} className={styles.featureIcon} />
                ) : (
                  <X size={16} className={styles.featureIconMissing} />
                )}
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.buttonWrapper}>
        <Button 
          variant={isPremium ? "primary" : "secondary"} 
          onClick={onSelect}
          style={{ width: "100%" }}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
