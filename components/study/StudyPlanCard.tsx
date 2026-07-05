"use client";

import React, { useState } from "react";
import { Clock, Calendar, FileText, Trash2, Edit2, CalendarPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./StudyPlanCard.module.css";
import { getGoogleCalendarUrl } from "@/lib/calendar";

export type StudyPlan = {
  id: string;
  title: string;
  description?: string | null;
  date: string | Date;
  startTime: string;
  endTime: string;
  documentId?: string | null;
  document?: { documentTitle: string } | null;
};

interface StudyPlanCardProps {
  plan: StudyPlan;
  onEdit: (plan: StudyPlan) => void;
  onDelete: (id: string) => void;
}

export function StudyPlanCard({ plan, onEdit, onDelete }: StudyPlanCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this study session?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/study-plan/${plan.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(plan.id);
      } else {
        alert("Failed to delete study plan");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGoogleCalendar = () => {
    const url = getGoogleCalendarUrl({
      title: plan.title,
      description: plan.description,
      date: new Date(plan.date),
      startTime: plan.startTime,
      endTime: plan.endTime,
    });
    window.open(url, "_blank");
  };

  const handleDownloadICS = () => {
    window.open(`/api/study-plan/${plan.id}/ics`, "_blank");
  };

  const displayDate = new Date(plan.date).toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>{plan.title}</h3>
          <div className={styles.time}>
            <Calendar size={14} />
            <span>{displayDate}</span>
            <span style={{ margin: "0 4px", color: "var(--color-text-secondary)" }}>•</span>
            <Clock size={14} />
            <span>{plan.startTime} - {plan.endTime}</span>
          </div>
        </div>
      </div>

      {plan.description && (
        <p className={styles.description}>{plan.description}</p>
      )}

      {plan.document && (
        <div className={styles.document}>
          <FileText size={14} />
          {plan.document.documentTitle}
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={handleGoogleCalendar}>
          <CalendarPlus size={16} style={{ marginRight: 6 }} />
          Google Cal
        </Button>
        <Button variant="secondary" size="sm" onClick={handleDownloadICS}>
          <Download size={16} style={{ marginRight: 6 }} />
          .ics
        </Button>
        
        <div className={styles.spacer} />

        <button 
          className={styles.iconBtn} 
          onClick={() => onEdit(plan)}
          aria-label="Edit plan"
        >
          <Edit2 size={16} />
        </button>
        <button 
          className={`${styles.iconBtn} ${styles.iconBtnDanger}`} 
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Delete plan"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
