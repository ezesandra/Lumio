import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentList } from "./DocumentList";
import styles from "./page.module.css";

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentTitle: true,
      fileName: true,
      createdAt: true,
      status: true,
    },
  });

  return (
    <main className={styles.page}>
      <DocumentList documents={documents} />
    </main>
  );
}
