"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./StudyPlanModal.module.css";
import { StudyPlan } from "./StudyPlanCard";

interface StudyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: StudyPlan) => void;
  initialData?: StudyPlan | null;
}

export function StudyPlanModal({ isOpen, onClose, onSave, initialData }: StudyPlanModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [documentId, setDocumentId] = useState("");
  
  const [documents, setDocuments] = useState<{id: string, documentTitle: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset or populate fields
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || "");
        setDate(new Date(initialData.date).toISOString().split('T')[0]);
        setStartTime(initialData.startTime);
        setEndTime(initialData.endTime);
        setDocumentId(initialData.documentId || "");
      } else {
        setTitle("");
        setDescription("");
        setDate(new Date().toISOString().split('T')[0]);
        setStartTime("09:00");
        setEndTime("10:00");
        setDocumentId("");
      }

      // Fetch documents for the dropdown
      setLoading(true);
      fetch("/api/documents")
        .then(r => r.json())
        .then(data => setDocuments(data.documents || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
        title,
        description: description || undefined,
        date,
        startTime,
        endTime,
        documentId: documentId || null,
      };

      const url = initialData ? `/api/study-plan/${initialData.id}` : "/api/study-plan";
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save plan");
      }

      const data = await res.json();
      onSave(data.plan);
      onClose();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{initialData ? "Edit Study Session" : "New Study Session"}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Title</label>
              <input 
                required 
                className={styles.input} 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g., Biology Chapter 4 Review"
              />
            </div>
            
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Date</label>
                <input 
                  required 
                  type="date" 
                  className={styles.input} 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Start Time</label>
                <input 
                  required 
                  type="time" 
                  className={styles.input} 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)} 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>End Time</label>
                <input 
                  required 
                  type="time" 
                  className={styles.input} 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)} 
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Related Document (Optional)</label>
              <select 
                className={styles.select} 
                value={documentId} 
                onChange={e => setDocumentId(e.target.value)}
                disabled={loading}
              >
                <option value="">None</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.documentTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description (Optional)</label>
              <textarea 
                className={styles.textarea} 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="What exactly do you want to cover?"
              />
            </div>
          </div>
          
          <div className={styles.footer}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Session"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
