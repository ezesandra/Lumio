"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { saveQuizAttempt, regenerateQuizAction } from "../actions";
import { X, ClipboardList, CheckCircle, PenLine, Mic, Loader2, Layers } from "lucide-react";
import styles from "./page.module.css";
import uploadStyles from "../../upload/page.module.css";

const testFormats = [
  { value: "multiple-choice", label: "Multiple Choice", description: "Check what you know in seconds", icon: ClipboardList },
  { value: "multiple-true-false", label: "True or False", description: "Separate facts from misconceptions", icon: CheckCircle },
  { value: "essay", label: "Essay", description: "Explore ideas and express understanding", icon: PenLine },
];

const questionOptions = [5, 10, 15, 20, 25, 30, 35, 40];

type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Props = { documentId: string; documentTitle: string; questions: Question[] };

export function QuizSession({ documentId, documentTitle, questions }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [completed, setCompleted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [testFormat, setTestFormat] = useState("multiple-choice");
  const [questionCount, setQuestionCount] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [showExplanations, setShowExplanations] = useState<Record<number, boolean>>({});

  if (!questions || questions.length === 0) return <div>No quiz questions available.</div>;

  const toggleExplanation = (idx: number) => {
    setShowExplanations(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getCorrectIndex = (q: any) => {
    let correctIdx = q.correctIndex !== undefined ? Number(q.correctIndex) : -1;
    if (Number.isNaN(correctIdx) || correctIdx === -1) {
      let ca = q.correctAnswer || q.answer || q.correct_answer;
      if (ca !== undefined) {
        ca = String(ca).trim();
        const upperCa = ca.toUpperCase();
        if (upperCa === "A" || upperCa === "OPTION A" || upperCa === "OPTION 1") correctIdx = 0;
        else if (upperCa === "B" || upperCa === "OPTION B" || upperCa === "OPTION 2") correctIdx = 1;
        else if (upperCa === "C" || upperCa === "OPTION C" || upperCa === "OPTION 3") correctIdx = 2;
        else if (upperCa === "D" || upperCa === "OPTION D" || upperCa === "OPTION 4") correctIdx = 3;
        else if (!Number.isNaN(Number(ca))) correctIdx = Number(ca);
        else {
          const matchingIndex = q.options.findIndex((opt: string) => opt === ca || opt.startsWith(ca));
          correctIdx = matchingIndex !== -1 ? matchingIndex : -1;
        }
      }
    }
    return correctIdx;
  };

  const handleSelect = (questionIndex: number, optionIndex: number) => {
    if (completed) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleRegenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await regenerateQuizAction(documentId, testFormat, questionCount);
      if (res.error) {
        setError(res.error);
        setShowSettings(false);
      } else {
        router.refresh(); // Will trigger processing view since status goes to PROCESSING
      }
    });
  };

  const calculateScore = () => {
    let s = 0;
    questions.forEach((q, idx) => {
      const correctIdx = getCorrectIndex(q);
      console.log(`Question ${idx} correct index resolved to: ${correctIdx}, User answered: ${answers[idx]}`);
      if (answers[idx] === correctIdx) s++;
    });
    return s;
  };

  const handleFinish = async () => {
    const finalScore = calculateScore();
    setCompleted(true);
    await saveQuizAttempt(documentId, finalScore, questions.length);
  };

  if (completed && !reviewMode) {
    const finalScore = calculateScore();
    const percentage = finalScore / questions.length;
    let feedback = "Good effort!";
    if (percentage === 1) feedback = "Excellent performance!";
    else if (percentage >= 0.8) feedback = "Great job!";
    else if (percentage >= 0.6) feedback = "Good work, keep it up!";
    else feedback = "Let's give this another try!";

    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--spacing-12) 0" }}>
        <Card style={{ maxWidth: 480, width: "100%", textAlign: "center", padding: "var(--spacing-8)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--spacing-4)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-brand-subtle)", color: "var(--color-brand)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--spacing-2)" }}>
            <CheckCircle size={32} />
          </div>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Quiz Completed
          </span>
          <h2 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", color: "var(--color-text-primary)", margin: 0 }}>
            {documentTitle}
          </h2>
          <div style={{ fontSize: "3rem", fontWeight: 700, color: "var(--color-brand)", margin: "var(--spacing-2) 0" }}>
            {finalScore} <span style={{ fontSize: "var(--font-size-lg)", color: "var(--color-text-secondary)", fontWeight: 500 }}>/ {questions.length}</span>
          </div>
          <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-primary)", fontWeight: 500, marginBottom: "var(--spacing-4)" }}>
            {feedback}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-3)", width: "100%" }}>
            <Button onClick={() => setReviewMode(true)} variant="secondary" size="lg" style={{ width: "100%" }}>
              Review Answers
            </Button>
            <Button onClick={() => setShowSettings(true)} size="lg" style={{ width: "100%" }}>
              New Quiz
            </Button>
          </div>
        </Card>
        
        {showSettings && (
          <div className={uploadStyles.overlay} onClick={() => setShowSettings(false)}>
            <div className={uploadStyles.pickerCard} style={{ padding: "var(--spacing-6)" }} onClick={(e) => e.stopPropagation()}>
              <div className={uploadStyles.pickerCardHeader} style={{ padding: 0, marginBottom: "var(--spacing-6)" }}>
                <h2 className={uploadStyles.pickerCardTitle}>Generate New Quiz</h2>
                <button type="button" className={uploadStyles.pickerCardClose} onClick={() => setShowSettings(false)}>
                  <X size={20} />
                </button>
              </div>
              
              <div className={uploadStyles.modeContentFields}>
                <div className={uploadStyles.fieldGroup}>
                  <label className={uploadStyles.fieldLabel}>Test Format</label>
                  <button
                    type="button"
                    className={`${uploadStyles.formatInput} ${testFormat ? uploadStyles.formatInputFilled : ""}`}
                    onClick={() => { setShowFormatPicker(true); setShowQuestionPicker(false); }}
                    disabled={isPending}
                  >
                    <span>{testFormats.find(f => f.value === testFormat)?.label || "Select a test format"}</span>
                  </button>
                </div>

                <div className={uploadStyles.fieldGroup}>
                  <label className={uploadStyles.fieldLabel}>Number of Questions</label>
                  <button
                    type="button"
                    className={`${uploadStyles.formatInput} ${uploadStyles.formatInputFilled}`}
                    onClick={() => { setShowQuestionPicker(true); setShowFormatPicker(false); }}
                    disabled={isPending}
                  >
                    <span>{questionCount} questions</span>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: "var(--spacing-6)" }}>
                <button type="button" onClick={handleRegenerate} disabled={isPending} className={uploadStyles.submitBtn}>
                  {isPending ? (
                    <>
                      <Loader2 size={16} className={uploadStyles.spinner} />
                      Generating...
                    </>
                  ) : "Generate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showFormatPicker && (
          <div className={uploadStyles.overlay} onClick={() => setShowFormatPicker(false)}>
            <div className={uploadStyles.pickerCard} onClick={(e) => e.stopPropagation()}>
              <div className={uploadStyles.pickerCardHeader}>
                <h2 className={uploadStyles.pickerCardTitle}>Select Test Format</h2>
                <button type="button" className={uploadStyles.pickerCardClose} onClick={() => setShowFormatPicker(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className={uploadStyles.pickerCardList}>
                {testFormats.map((fmt) => {
                  const Icon = fmt.icon;
                  const isActive = testFormat === fmt.value;
                  return (
                    <button
                      key={fmt.value}
                      type="button"
                      className={`${uploadStyles.pickerCardItem} ${isActive ? uploadStyles.pickerCardItemActive : ""}`}
                      onClick={() => {
                        setTestFormat(fmt.value);
                        setShowFormatPicker(false);
                      }}
                    >
                      <div className={`${uploadStyles.pickerCardItemIcon} ${isActive ? uploadStyles.pickerCardItemIconActive : ""}`}>
                        <Icon size={22} />
                      </div>
                      <div className={uploadStyles.pickerCardItemContent}>
                        <span className={uploadStyles.pickerCardItemLabel}>{fmt.label}</span>
                        <span className={uploadStyles.pickerCardItemDesc}>{fmt.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {showQuestionPicker && (
          <div className={uploadStyles.overlay} onClick={() => setShowQuestionPicker(false)}>
            <div className={uploadStyles.qPickerCard} onClick={(e) => e.stopPropagation()}>
              <div className={uploadStyles.pickerCardHeader}>
                <h2 className={uploadStyles.pickerCardTitle}>Number of Questions</h2>
                <button type="button" className={uploadStyles.pickerCardClose} onClick={() => setShowQuestionPicker(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className={uploadStyles.qPickerCardList}>
                {questionOptions.map((n) => (
                  <label key={n} className={`${uploadStyles.qPickerCardItem} ${questionCount === n ? uploadStyles.qPickerCardItemActive : ""}`}>
                    <input
                      type="radio"
                      name="questionPick"
                      className={uploadStyles.qPickerCardRadio}
                      checked={questionCount === n}
                      onChange={() => {
                        setQuestionCount(n);
                        setShowQuestionPicker(false);
                      }}
                    />
                    <span className={uploadStyles.qPickerCardRadioMark} />
                    <span>{n}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && (
        <div className={uploadStyles.error} style={{ marginBottom: "var(--spacing-4)" }}>
          {error}
        </div>
      )}
      <div className={styles.controls} style={{ marginTop: 0, marginBottom: "var(--spacing-6)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-md)", fontWeight: "bold" }}>
          Answer all questions to finish the quiz
        </span>
        <div style={{ display: "flex", gap: "var(--spacing-3)" }}>
          {reviewMode ? (
            <Button variant="secondary" onClick={() => setReviewMode(false)}>
              Back to Results
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowSettings(true)}>
                New Quiz
              </Button>
              <Button onClick={handleFinish} disabled={Object.keys(answers).length === 0}>
                Submit
              </Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.gridContainer}>
        {questions.map((question, qIdx) => {
          const selectedOption = answers[qIdx];
          const isAnswered = selectedOption !== undefined;
          const correctIdx = getCorrectIndex(question);

          return (
            <Card key={question.id || qIdx} className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", display: "block", marginBottom: "var(--spacing-2)" }}>
                  Question {qIdx + 1}
                </span>
                <h2 className={styles.questionText}>{question.question}</h2>
              </div>

              <div className={styles.options}>
                {question.options.map((option, idx) => {
                  let stateClass = "";
                  if (completed && reviewMode) {
                    if (idx === correctIdx) stateClass = styles.correct;
                    else if (idx === selectedOption) stateClass = styles.incorrect;
                  } else {
                    stateClass = idx === selectedOption ? styles.selected : "";
                  }

                  return (
                    <button
                      key={idx}
                      className={`${styles.option} ${stateClass}`}
                      onClick={() => handleSelect(qIdx, idx)}
                      disabled={completed}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {completed && reviewMode && question.explanation && (
                <div style={{ marginTop: "var(--spacing-4)" }}>
                  <button 
                    onClick={() => toggleExplanation(qIdx)}
                    style={{ background: "transparent", border: "none", color: "var(--color-brand)", fontWeight: 600, cursor: "pointer", padding: 0 }}
                  >
                    {showExplanations[qIdx] ? "Hide explanation" : "Show explanation"}
                  </button>
                  
                  {showExplanations[qIdx] && (
                    <div className={styles.explanation} style={{ marginTop: "var(--spacing-2)", padding: "var(--spacing-3)", background: "var(--color-surface-hover)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                      <span style={{ fontWeight: "bold" }}>Explanation:</span> {question.explanation}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      
      <div className={styles.controls} style={{ marginTop: "var(--spacing-8)", justifyContent: "center", display: "flex", gap: "var(--spacing-4)" }}>
        {reviewMode ? (
          <Button onClick={() => setReviewMode(false)} size="lg">
            Back to Results
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setShowSettings(true)} size="lg">
              New Quiz
            </Button>
            <Button onClick={handleFinish} disabled={Object.keys(answers).length === 0} size="lg">
              Submit
            </Button>
          </>
        )}
      </div>

      {showSettings && (
        <div className={uploadStyles.overlay} onClick={() => setShowSettings(false)}>
          <div className={uploadStyles.pickerCard} style={{ padding: "var(--spacing-6)" }} onClick={(e) => e.stopPropagation()}>
            <div className={uploadStyles.pickerCardHeader} style={{ padding: 0, marginBottom: "var(--spacing-6)" }}>
              <h2 className={uploadStyles.pickerCardTitle}>Generate New Quiz</h2>
              <button type="button" className={uploadStyles.pickerCardClose} onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={uploadStyles.modeContentFields}>
              <div className={uploadStyles.fieldGroup}>
                <label className={uploadStyles.fieldLabel}>Test Format</label>
                <button
                  type="button"
                  className={`${uploadStyles.formatInput} ${testFormat ? uploadStyles.formatInputFilled : ""}`}
                  onClick={() => { setShowFormatPicker(true); setShowQuestionPicker(false); }}
                  disabled={isPending}
                >
                  <span>{testFormats.find(f => f.value === testFormat)?.label || "Select a test format"}</span>
                </button>
              </div>

              <div className={uploadStyles.fieldGroup}>
                <label className={uploadStyles.fieldLabel}>Number of Questions</label>
                <button
                  type="button"
                  className={`${uploadStyles.formatInput} ${uploadStyles.formatInputFilled}`}
                  onClick={() => { setShowQuestionPicker(true); setShowFormatPicker(false); }}
                  disabled={isPending}
                >
                  <span>{questionCount} questions</span>
                </button>
              </div>
            </div>

            <div style={{ marginTop: "var(--spacing-6)" }}>
              <button type="button" onClick={handleRegenerate} disabled={isPending} className={uploadStyles.submitBtn}>
                {isPending ? (
                  <>
                    <Loader2 size={16} className={uploadStyles.spinner} />
                    Generating...
                  </>
                ) : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFormatPicker && (
        <div className={uploadStyles.overlay} onClick={() => setShowFormatPicker(false)}>
          <div className={uploadStyles.pickerCard} onClick={(e) => e.stopPropagation()}>
            <div className={uploadStyles.pickerCardHeader}>
              <h2 className={uploadStyles.pickerCardTitle}>Select Test Format</h2>
              <button type="button" className={uploadStyles.pickerCardClose} onClick={() => setShowFormatPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={uploadStyles.pickerCardList}>
              {testFormats.map((fmt) => {
                const Icon = fmt.icon;
                const isActive = testFormat === fmt.value;
                return (
                  <button
                    key={fmt.value}
                    type="button"
                    className={`${uploadStyles.pickerCardItem} ${isActive ? uploadStyles.pickerCardItemActive : ""}`}
                    onClick={() => {
                      setTestFormat(fmt.value);
                      setShowFormatPicker(false);
                    }}
                  >
                    <div className={`${uploadStyles.pickerCardItemIcon} ${isActive ? uploadStyles.pickerCardItemIconActive : ""}`}>
                      <Icon size={22} />
                    </div>
                    <div className={uploadStyles.pickerCardItemContent}>
                      <span className={uploadStyles.pickerCardItemLabel}>{fmt.label}</span>
                      <span className={uploadStyles.pickerCardItemDesc}>{fmt.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showQuestionPicker && (
        <div className={uploadStyles.overlay} onClick={() => setShowQuestionPicker(false)}>
          <div className={uploadStyles.qPickerCard} onClick={(e) => e.stopPropagation()}>
            <div className={uploadStyles.pickerCardHeader}>
              <h2 className={uploadStyles.pickerCardTitle}>Number of Questions</h2>
              <button type="button" className={uploadStyles.pickerCardClose} onClick={() => setShowQuestionPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={uploadStyles.qPickerCardList}>
              {questionOptions.map((n) => (
                <label key={n} className={`${uploadStyles.qPickerCardItem} ${questionCount === n ? uploadStyles.qPickerCardItemActive : ""}`}>
                  <input
                    type="radio"
                    name="questionPick"
                    className={uploadStyles.qPickerCardRadio}
                    checked={questionCount === n}
                    onChange={() => {
                      setQuestionCount(n);
                      setShowQuestionPicker(false);
                    }}
                  />
                  <span className={uploadStyles.qPickerCardRadioMark} />
                  <span>{n}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
