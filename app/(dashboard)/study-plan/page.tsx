"use client";

import React, { useState, useEffect } from "react";
import { Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";
import { StudyPlanCard, StudyPlan } from "@/components/study/StudyPlanCard";
import { StudyPlanModal } from "@/components/study/StudyPlanModal";

export default function StudyPlanPage() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/study-plan");
      const data = await res.json();
      if (res.ok && data.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenNew = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: StudyPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = (savedPlan: StudyPlan) => {
    // Optimistically update the list
    if (editingPlan) {
      setPlans(prev => prev.map(p => p.id === savedPlan.id ? savedPlan : p).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } else {
      setPlans(prev => [...prev, savedPlan].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Study Plan</h1>
          <p className={styles.subtitle}>Schedule your learning sessions and set reminders.</p>
        </div>
        <Button variant="primary" onClick={handleOpenNew}>
          New Session
        </Button>
      </header>

      {loading ? (
        <div className={styles.loading}>Loading study plans...</div>
      ) : plans.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarDays size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>No Study Sessions Scheduled</h2>
          <p className={styles.emptyDesc}>
            Stay on top of your learning by scheduling blocks of time to review your documents and flashcards.
          </p>
          <Button variant="secondary" onClick={handleOpenNew}>
            Create your first session
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {plans.map(plan => (
            <StudyPlanCard 
              key={plan.id} 
              plan={plan} 
              onEdit={handleOpenEdit} 
              onDelete={handleDelete} 
            />
          ))}
        </div>
      )}

      <StudyPlanModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave}
        initialData={editingPlan}
      />
    </div>
  );
}
