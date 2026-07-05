"use client";

import React, { useState, useEffect } from "react";
import { X, BookOpenText, Layers, BrainCircuit, Video, Sparkles } from "lucide-react";
import { useSelectedDocument } from "@/components/layout/SelectedDocumentContext";
import styles from "./DocumentViewer.module.css";

interface StudyContent {
  summary: string;
  simplifiedExplanation: string | null;
  flashcards: { id: string; front: string; back: string }[];
  quizQuestions: { id: string; question: string; options: string[]; correctIndex: number; explanation: string }[];
  youtubeLinks: { thumbnailUrl: string; title: string; channelName: string; url: string }[];
}

interface DocumentData {
  id: string;
  documentTitle: string;
  status: string;
  studyContent: StudyContent | null;
}

export function DocumentViewer() {
  const { selectedDocId, selectDocument } = useSelectedDocument();
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [youtubeVideos, setYoutubeVideos] = useState<any[] | null>(null);

  useEffect(() => {
    if (!selectedDocId) { setData(null); setLoadError(null); setYoutubeVideos(null); return; }
    setLoading(true);
    setLoadError(null);
    setYoutubeVideos(null);
    fetch(`/api/documents/${selectedDocId}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.document) {
          setLoadError("Unable to load document.");
          setData(null);
        } else {
          setData(res.document);
        }
      })
      .catch(() => {
        setData(null);
        setLoadError("Unable to load document.");
      })
      .finally(() => setLoading(false));
  }, [selectedDocId]);

  useEffect(() => {
    if (!data || !data.documentTitle) return;
    const cached = data.studyContent?.youtubeLinks;
    if (cached && cached.length > 0) {
      setYoutubeVideos(cached);
      return;
    }
    fetch(`/api/youtube/search?q=${encodeURIComponent(data.documentTitle + " tutorial")}`)
      .then((r) => r.json())
      .then((res) => setYoutubeVideos(res.videos ?? []))
      .catch(() => setYoutubeVideos([]));
  }, [data]);

  if (!selectedDocId) return null;

  if (!data) {
    return (
      <div className={styles.banner}>
        <div className={styles.inner}>
          <div className={styles.loading}>
            {loadError || "Loading document..."}
          </div>
        </div>
      </div>
    );
  }

  if (data.status === "PROCESSING") {
    return (
      <div className={styles.banner}>
        <div className={styles.inner}>
          <div className={styles.processing}>
            <Sparkles size={18} />
            Processing your document...
          </div>
        </div>
      </div>
    );
  }

  const content = data.studyContent;
  if (!content) {
    return (
      <div className={styles.banner}>
        <div className={styles.inner}>
          <div className={styles.header}>
            <h2 className={styles.title}>{data.documentTitle}</h2>
            <button type="button" className={styles.closeBtn} onClick={() => selectDocument(null)} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className={styles.empty}>
            {data.status === "FAILED"
              ? "This document failed to process. Please try uploading again."
              : "No study content available."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className={styles.title}>{data.documentTitle}</h2>
          <button type="button" className={styles.closeBtn} onClick={() => selectDocument(null)} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className={styles.sections}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <BookOpenText size={16} />
              Summary
            </div>
            <p className={styles.summaryText}>
              {content.summary.length > 200 ? content.summary.slice(0, 200) + "..." : content.summary}
            </p>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Layers size={16} />
              Flashcards
            </div>
            {content.flashcards.length > 0 ? (
              <div className={styles.previewList}>
                {content.flashcards.slice(0, 3).map((fc: any) => (
                  <div key={fc.id} className={styles.previewItem}>
                    <span className={styles.previewLabel}>Q:</span> {fc.front}
                  </div>
                ))}
                {content.flashcards.length > 3 && (
                  <div className={styles.more}>+{content.flashcards.length - 3} more</div>
                )}
              </div>
            ) : (
              <div className={styles.empty}>No flashcards</div>
            )}
          </div>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <BrainCircuit size={16} />
              Quiz
            </div>
            {content.quizQuestions.length > 0 ? (
              <div className={styles.previewList}>
                {content.quizQuestions.slice(0, 2).map((q: any) => (
                  <div key={q.id} className={styles.previewItem}>
                    <span className={styles.previewLabel}>Q:</span> {q.question.length > 80 ? q.question.slice(0, 80) + "..." : q.question}
                  </div>
                ))}
                {content.quizQuestions.length > 2 && (
                  <div className={styles.more}>+{content.quizQuestions.length - 2} more</div>
                )}
              </div>
            ) : (
              <div className={styles.empty}>No quiz questions</div>
            )}
          </div>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Video size={16} />
              Videos
            </div>
            {youtubeVideos && youtubeVideos.length > 0 ? (
              <div className={styles.videoList}>
                {youtubeVideos.slice(0, 3).map((vid: any, idx: number) => (
                  <a key={idx} href={vid.url} target="_blank" rel="noopener noreferrer" className={styles.videoCard}>
                    <img src={vid.thumbnailUrl} alt={vid.title} className={styles.videoThumb} />
                    <div className={styles.videoInfo}>
                      <span className={styles.videoTitle}>{vid.title}</span>
                      <span className={styles.videoChannel}>{vid.channelName}</span>
                      <span className={styles.videoCta}>Watch on YouTube</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>{youtubeVideos === null ? "Loading videos..." : "No videos"}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
