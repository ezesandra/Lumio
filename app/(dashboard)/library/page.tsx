import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { FileText, Upload, CheckCircle2, Clock, AlertCircle, ArrowRight } from "lucide-react";
import styles from "./page.module.css";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const statusConfig = {
    READY: { label: "Ready", icon: CheckCircle2, color: "var(--color-success)", bg: "hsla(142, 71%, 45%, 0.1)" },
    PROCESSING: { label: "Processing", icon: Clock, color: "var(--color-accent)", bg: "hsla(38, 92%, 50%, 0.1)" },
    FAILED: { label: "Failed", icon: AlertCircle, color: "var(--color-error)", bg: "hsla(358, 68%, 43%, 0.1)" },
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Your Library</h1>
          <p className={styles.subtitle}>
            {documents.length > 0
              ? `${documents.length} study material${documents.length === 1 ? "" : "s"} in your collection`
              : "All your uploaded study materials in one place."}
          </p>
        </div>
        <Link href="/upload">
          <Button>
            <Upload size={16} />
            Upload New
          </Button>
        </Link>
      </header>

      {documents.length > 0 ? (
        <div className={styles.grid}>
          {documents.map((doc) => {
            const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.PROCESSING;
            const StatusIcon = status.icon;
            const extension = doc.fileName.split(".").pop()?.toUpperCase() || "FILE";

            return (
              <Link key={doc.id} href={`/${doc.id}/summary`} className={styles.cardLink}>
                <div className={styles.docCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.fileIcon}>
                      <FileText size={22} />
                      <span className={styles.fileExt}>{extension}</span>
                    </div>
                    <span className={styles.statusBadge} style={{ background: status.bg, color: status.color }}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.docTitle}>{doc.documentTitle}</h3>
                    <p className={styles.docName}>{doc.fileName}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.docDate}>
                      {new Date(doc.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className={styles.cardAction}>
                      <span className={styles.actionLabel}>
                        {doc.status === "READY" ? "Review Content" : "Check Status"}
                      </span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Upload size={32} />
          </div>
          <p className={styles.emptyText}>Your library is empty.</p>
          <p className={styles.emptyHint}>Upload your first document to start studying with AI.</p>
          <Link href="/upload">
            <Button variant="secondary">
              <Upload size={16} />
              Upload your first document
            </Button>
          </Link>
        </div>
      )}
    </main>
  );
}
