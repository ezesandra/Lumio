"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function updateDocumentTitle(documentId: string, title: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await prisma.document.update({
      where: { id: documentId, userId: session.user.id },
      data: { documentTitle: title },
    });
    return { success: true };
  } catch {
    return { error: "Failed to update title" };
  }
}

export async function deleteDocument(documentId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await prisma.document.delete({
      where: { id: documentId, userId: session.user.id },
    });
    return { success: true };
  } catch {
    return { error: "Failed to delete document" };
  }
}
