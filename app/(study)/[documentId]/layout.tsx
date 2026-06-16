import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import StudyNav from "./StudyNav";
import styles from "./layout.module.css";

const statusIcons = {
  READY: CheckCircle2,
  PROCESSING: Clock,
  FAILED: AlertCircle,
};

const statusColors = {
  READY: "var(--color-success)",
  PROCESSING: "var(--color-accent)",
  FAILED: "var(--color-error)",
};

export default async function StudyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ documentId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { documentId } = await params;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true, status: true, documentTitle: true },
  });

  if (!document || document.userId !== session.user.id) {
    redirect("/dashboard");
  }

  const StatusIcon = statusIcons[document.status as keyof typeof statusIcons] || Clock;

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.docTitle}>{document.documentTitle}</h2>
          <span className={styles.docStatus} style={{ color: statusColors[document.status as keyof typeof statusColors] || "var(--color-text-secondary)" }}>
            <StatusIcon size={12} />
            {document.status}
          </span>
        </div>
        <StudyNav documentId={documentId} />
      </aside>
      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
