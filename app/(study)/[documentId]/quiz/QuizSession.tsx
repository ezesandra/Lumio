"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveQuizAttempt } from "../actions";
import styles from "./page.module.css";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export function QuizSession({ documentId, questions }: { documentId: string; questions: Question[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  if (!questions || questions.length === 0) return <div>No quiz questions available.</div>;

  const question = questions[currentIndex];

  const handleSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedOption(index);
    setShowFeedback(true);
    if (index === question.correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      setCompleted(true);
      await saveQuizAttempt(documentId, score + (selectedOption === question.correctIndex ? 1 : 0), questions.length);
    }
  };

  if (completed) {
    return (
      <div className={styles.completed}>
        <h2>Quiz Completed!</h2>
        <div className={styles.score}>
          {score} / {questions.length}
        </div>
        <div className={styles.feedbackText} style={{ color: "var(--color-accent)", fontSize: "var(--font-size-xl)" }}>
          +30 XP
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card elevated className={styles.questionCard}>
        <div className={styles.controls} style={{ marginTop: 0, marginBottom: "var(--spacing-4)" }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>
            Score: {score}
          </span>
        </div>

        <h2 className={styles.questionText}>{question.question}</h2>

        <div className={styles.options}>
          {question.options.map((option, idx) => {
            let stateClass = "";
            if (showFeedback) {
              if (idx === question.correctIndex) stateClass = styles.correct;
              else if (idx === selectedOption) stateClass = styles.incorrect;
            } else if (idx === selectedOption) {
              stateClass = styles.selected;
            }

            return (
              <button
                key={idx}
                className={`${styles.option} ${stateClass}`}
                onClick={() => handleSelect(idx)}
                disabled={showFeedback}
              >
                {option}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className={`${styles.feedback} ${selectedOption === question.correctIndex ? styles.correct : styles.incorrect}`}>
            <div className={styles.feedbackText}>
              {selectedOption === question.correctIndex ? "Correct!" : "Incorrect"}
            </div>
            <div className={styles.explanation}>{question.explanation}</div>
          </div>
        )}

        <div className={styles.controls}>
          <div />
          <Button onClick={handleNext} disabled={!showFeedback}>
            {currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
