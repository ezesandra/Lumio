import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuizSession } from "./QuizSession";

export default async function QuizPage({ params }: { params: Promise<{ documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { documentId } = await params;
  
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { studyContent: true }
  });

  if (!document || document.userId !== session.user.id) redirect("/dashboard");

  if (document.status === "PROCESSING") {
    return <div>Processing Document...</div>;
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
      <QuizSession documentId={documentId} questions={questions} />
    </div>
  );
}
