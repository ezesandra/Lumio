import React from "react";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuizSession } from "./QuizSession";
import { AutoRefresh } from "../AutoRefresh";

export default async function QuizPage({ params }: { params: Promise<{ documentId: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/login");
  }

  const document = await prisma.document.findUnique({
    where: { id: resolvedParams.documentId },
    include: { studyContent: true },
  });

  if (!document || document.userId !== session.user.id) {
    notFound();
  }

  if (document.status === "FAILED") {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-12) 0" }}>
        <h2>Processing Failed</h2>
        <p>{document.failureReason || "An unknown error occurred"}</p>
      </div>
    );
  }

  if (document.status === "PROCESSING") {
    return (
      <div style={{ textAlign: "center", padding: "var(--spacing-12) 0" }}>
        <AutoRefresh documentId={resolvedParams.documentId} />
        <h2>Generating Quiz...</h2>
        <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--spacing-2)" }}>
          Please wait while our AI prepares your quiz questions.
        </p>
      </div>
    );
  }

  const content = document.studyContent;
  if (!content) return <div>No study content found.</div>;

  const questions = content.quizQuestions as {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-family-display)", fontSize: "var(--font-size-xl)", marginBottom: "var(--spacing-6)" }}>Quiz</h1>
      <QuizSession documentId={resolvedParams.documentId} documentTitle={document.documentTitle} questions={questions} />
    </div>
  );
}
