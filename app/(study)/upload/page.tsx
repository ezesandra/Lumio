"use client";

import React, { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Upload, FileText, X, Loader2, ClipboardList, Layers, CheckCircle, Mic, PenLine, BookOpen } from "lucide-react";
import { uploadDocumentAction } from "./actions";
import styles from "./page.module.css";

const modes = [
  { value: "quiz", label: "Quiz Mode" },
  { value: "study", label: "Study Mode" },
];

const testFormats = [
  { value: "multiple-choice", label: "Multiple Choice", description: "Check what you know in seconds", icon: ClipboardList },
  { value: "flashcard", label: "Flashcards", description: "Learn smarter with active recall", icon: Layers },
  { value: "multiple-true-false", label: "True or False", description: "Separate facts from misconceptions", icon: CheckCircle },
  { value: "oral", label: "Oral (Viva)", description: "Build confidence through spoken answers", icon: Mic, badge: "Beta" },
  { value: "essay", label: "Essay", description: "Explore ideas and express understanding", icon: PenLine },
];

const questionOptions = [5, 10, 15, 20, 25, 30, 35, 40];

const studyOptions = [
  { value: "summarize", label: "Summarize", description: "Get concise notes from your material", icon: FileText },
  { value: "simplify", label: "Simplify", description: "Understand difficult concepts faster", icon: Layers },
  { value: "ai-discussion", label: "AI Discussion", description: "Ask questions about your material", icon: Mic },
  { value: "key-concepts", label: "Key Concepts", description: "See the most important topics", icon: ClipboardList },
];

export default function UploadPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const [mode, setMode] = useState("quiz");
  const [testFormat, setTestFormat] = useState("");
  const [showFormatPicker, setShowFormatPicker] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [studyOption, setStudyOption] = useState("");
  const [showStudyPicker, setShowStudyPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (selected) {
      setFile(selected);
      setError("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0] || null;
    if (dropped) {
      setFile(dropped);
      setError("");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    if (mode === "quiz" && !testFormat) {
      setError("Please select a test format.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadDocumentAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success && result.documentId) {
        router.push(`/${result.documentId}/summary`);
      }
    });
  };

  const selectedFormat = testFormats.find((f) => f.value === testFormat);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>New Document</h1>
          <div className={styles.modeToggle}>
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`${styles.modeBtn} ${mode === m.value ? styles.modeBtnActive : ""}`}
                onClick={() => setMode(m.value)}
              >
                {m.value === "study" && <BookOpen size={16} />}
                {m.value === "quiz" && <ClipboardList size={16} />}
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.container}>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formBody}>
            <div
              className={`${styles.dropzone} ${isDragOver ? styles.dropzoneActive : ""} ${file ? styles.dropzoneHasFile : ""}`}
              onClick={() => !file && inputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.pptx,.txt"
                style={{ display: "none" }}
                onChange={handleFileChange}
                disabled={isPending}
              />

              {file ? (
                <div className={styles.filePreview}>
                  <div className={styles.filePreviewIcon}>
                    <FileText size={28} />
                  </div>
                  <div className={styles.filePreviewInfo}>
                    <span className={styles.filePreviewName}>{file.name}</span>
                    <span className={styles.filePreviewSize}>
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.fileRemove}
                    onClick={(e) => { e.stopPropagation(); setFile(null); setError(""); }}
                    disabled={isPending}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <p className={styles.dropzoneText}>
                    Upload your material here
                  </p>
                  <p className={styles.dropzoneHint}>
                    Max size: 300mb pdf, docx, pptx, ppt, png, jpg, txt
                  </p>
                  <button
                    type="button"
                    className={styles.browseBtn}
                    onClick={() => inputRef.current?.click()}
                    disabled={isPending}
                  >
                    Browse files
                  </button>
                </>
              )}
            </div>

            <Input
              label="Document Title"
              name="documentTitle"
              placeholder="Enter a title for your document"
              size="sm"
              required
              disabled={isPending}
            />

            <input type="hidden" name="mode" value={mode} />

            <div className={styles.modeContent}>
              {mode === "study" && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Study Made Easy</label>
                  <button
                    type="button"
                    className={`${styles.formatInput} ${studyOption ? styles.formatInputFilled : ""}`}
                    onClick={() => setShowStudyPicker(true)}
                    disabled={isPending}
                  >
                    <span>{studyOption ? studyOptions.find((o) => o.value === studyOption)?.label : "Select an option"}</span>
                  </button>
                  <input type="hidden" name="studyMadeEasy" value={studyOption} />
                </div>
              )}

              {mode === "quiz" && (
                <div className={styles.modeContentFields}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Test Format</label>
                    <button
                      type="button"
                      className={`${styles.formatInput} ${selectedFormat ? styles.formatInputFilled : ""}`}
                      onClick={() => setShowFormatPicker(true)}
                      disabled={isPending}
                    >
                      <span>{selectedFormat ? selectedFormat.label : "Select a test format"}</span>
                    </button>
                    <input type="hidden" name="testFormat" value={testFormat} />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Number of Questions</label>
                    <button
                      type="button"
                      className={`${styles.formatInput} ${styles.formatInputFilled}`}
                      onClick={() => setShowQuestionPicker(true)}
                      disabled={isPending}
                    >
                      <span>{questionCount} questions</span>
                    </button>
                    <input type="hidden" name="questionCount" value={questionCount} />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <button type="submit" disabled={isPending || !file || (mode === "quiz" && !testFormat)} className={styles.submitBtn}>
                {isPending ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {mode === "quiz" ? "Generate Quiz" : "Generate Study Material"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>

      {showQuestionPicker && (
        <div className={styles.overlay} onClick={() => setShowQuestionPicker(false)}>
          <div className={styles.qPickerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pickerCardHeader}>
              <h2 className={styles.pickerCardTitle}>Number of Questions</h2>
              <button
                type="button"
                className={styles.pickerCardClose}
                onClick={() => setShowQuestionPicker(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.qPickerCardList}>
              {questionOptions.map((n) => (
                <label key={n} className={`${styles.qPickerCardItem} ${questionCount === n ? styles.qPickerCardItemActive : ""}`}>
                  <input
                    type="radio"
                    name="questionPick"
                    className={styles.qPickerCardRadio}
                    checked={questionCount === n}
                    onChange={() => {
                      setQuestionCount(n);
                      setShowQuestionPicker(false);
                    }}
                  />
                  <span className={styles.qPickerCardRadioMark} />
                  <span>{n}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {showStudyPicker && (
        <div className={styles.overlay} onClick={() => setShowStudyPicker(false)}>
          <div className={styles.pickerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pickerCardHeader}>
              <h2 className={styles.pickerCardTitle}>Study Made Easy</h2>
              <button
                type="button"
                className={styles.pickerCardClose}
                onClick={() => setShowStudyPicker(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.pickerCardList}>
              {studyOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = studyOption === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.pickerCardItem} ${isActive ? styles.pickerCardItemActive : ""}`}
                    onClick={() => {
                      setStudyOption(opt.value);
                      setShowStudyPicker(false);
                    }}
                  >
                    <div className={`${styles.pickerCardItemIcon} ${isActive ? styles.pickerCardItemIconActive : ""}`}>
                      <Icon size={22} />
                    </div>
                    <div className={styles.pickerCardItemContent}>
                      <div className={styles.pickerCardItemLabelRow}>
                        <span className={styles.pickerCardItemLabel}>{opt.label}</span>
                      </div>
                      <span className={styles.pickerCardItemDesc}>{opt.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showFormatPicker && (
        <div className={styles.overlay} onClick={() => setShowFormatPicker(false)}>
          <div className={styles.pickerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pickerCardHeader}>
              <h2 className={styles.pickerCardTitle}>Select Test Format</h2>
              <button
                type="button"
                className={styles.pickerCardClose}
                onClick={() => setShowFormatPicker(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.pickerCardList}>
              {testFormats.map((fmt) => {
                const Icon = fmt.icon;
                const isActive = testFormat === fmt.value;
                return (
                  <button
                    key={fmt.value}
                    type="button"
                    className={`${styles.pickerCardItem} ${isActive ? styles.pickerCardItemActive : ""}`}
                    onClick={() => {
                      setTestFormat(fmt.value);
                      setShowFormatPicker(false);
                    }}
                  >
                    <div className={`${styles.pickerCardItemIcon} ${isActive ? styles.pickerCardItemIconActive : ""}`}>
                      <Icon size={22} />
                    </div>
                    <div className={styles.pickerCardItemContent}>
                      <div className={styles.pickerCardItemLabelRow}>
                        <span className={styles.pickerCardItemLabel}>{fmt.label}</span>
                        {fmt.badge && <span className={styles.pickerCardBadge}>{fmt.badge}</span>}
                      </div>
                      <span className={styles.pickerCardItemDesc}>{fmt.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
