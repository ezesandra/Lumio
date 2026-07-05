"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkDocumentStatus } from "./actions";

export function AutoRefresh({ documentId }: { documentId: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await checkDocumentStatus(documentId);
      if (res.status === "READY" || res.status === "FAILED") {
        clearInterval(interval);
        router.refresh();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documentId, router]);

  return null;
}
