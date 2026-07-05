"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { awardXPAction } from "../actions";
import styles from "./page.module.css";

type Flashcard = { id: string; front: string; back: string };

export function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!cards || cards.length === 0) return <div>No flashcards available.</div>;

  const handleNext = async () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      setCompleted(true);
      await awardXPAction("FLASHCARD_COMPLETE");
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  if (completed) {
    return (
      <div className={styles.completed}>
        <h2>Deck Completed!</h2>
        <p>Great job reviewing your flashcards.</p>
        <Button onClick={() => window.location.reload()} style={{ marginTop: "var(--spacing-4)" }}>
          Review Again
        </Button>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className={styles.container}>
      <div className={styles.scene} onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`${styles.card} ${isFlipped ? styles.isFlipped : ""}`}>
          <div className={styles.cardFace}>{card.front}</div>
          <div className={`${styles.cardFace} ${styles.cardBack}`}>{card.back}</div>
        </div>
      </div>
      <div className={styles.controls}>
        <Button variant="secondary" onClick={handlePrev} disabled={currentIndex === 0}>
          Previous
        </Button>
        <span className={styles.progress}>
          {currentIndex + 1} / {cards.length}
        </span>
        <Button onClick={handleNext}>
          {currentIndex === cards.length - 1 ? "Finish" : "Next"}
        </Button>
      </div>
    </div>
  );
}
