"use client";

import React, { useState } from "react";
import { commitToStreak } from "@/app/(dashboard)/progress/actions";
import { Button } from "@/components/ui/Button";
import { Target, CheckCircle2 } from "lucide-react";

interface Props {
  currentStreak: number;
  targetStreak: number | null;
}

export function StreakCommitment({ currentStreak, targetStreak }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCommit = async (days: number) => {
    setLoading(true);
    setError(null);
    const result = await commitToStreak(days);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  if (targetStreak) {
    const progress = Math.min((currentStreak / targetStreak) * 100, 100);
    const completed = currentStreak >= targetStreak;

    return (
      <div style={{
        marginTop: "32px",
        padding: "24px",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        background: "var(--color-surface-elevated)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          {completed ? (
            <CheckCircle2 size={24} style={{ color: "var(--color-success)" }} />
          ) : (
            <Target size={24} style={{ color: "var(--color-brand)" }} />
          )}
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 600, margin: 0 }}>
            {completed ? "Goal Achieved!" : "Your Streak Goal"}
          </h2>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.875rem" }}>
          <span style={{ color: "var(--color-text-secondary)" }}>Progress</span>
          <span style={{ fontWeight: 600 }}>{currentStreak} / {targetStreak} Days</span>
        </div>
        
        <div style={{ height: "8px", background: "var(--color-surface-hover)", borderRadius: "4px", overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ 
            height: "100%", 
            width: `${progress}%`, 
            background: completed ? "var(--color-success)" : "var(--color-brand)",
            transition: "width 0.5s ease"
          }} />
        </div>

        {completed && (
          <div style={{ marginTop: "16px" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "12px" }}>
              Ready for your next challenge?
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button onClick={() => handleCommit(7)} disabled={loading} size="sm">Commit to 7 Days</Button>
              <Button onClick={() => handleCommit(14)} disabled={loading} size="sm">Commit to 14 Days</Button>
              <Button onClick={() => handleCommit(30)} disabled={loading} size="sm">Commit to 30 Days</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      marginTop: "32px",
      padding: "24px",
      border: "1px dashed var(--color-border)",
      borderRadius: "12px",
      background: "var(--color-surface-hover)",
      textAlign: "center"
    }}>
      <Target size={32} style={{ color: "var(--color-text-secondary)", margin: "0 auto 12px" }} />
      <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: 600, marginBottom: "8px" }}>Commit to a Streak</h2>
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "20px" }}>
        Set a goal to keep yourself motivated. How many days in a row can you study?
      </p>
      
      {error && <div style={{ color: "var(--color-error)", marginBottom: "12px", fontSize: "0.875rem" }}>{error}</div>}
      
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
        <Button onClick={() => handleCommit(7)} disabled={loading}>7 Days</Button>
        <Button onClick={() => handleCommit(14)} disabled={loading}>14 Days</Button>
        <Button onClick={() => handleCommit(30)} disabled={loading}>30 Days</Button>
      </div>
    </div>
  );
}
