"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Layers, BrainCircuit } from "lucide-react";
import styles from "./layout.module.css";

const links = [
  { href: (id: string) => `/${id}/summary`, label: "Summary", icon: FileText },
  { href: (id: string) => `/${id}/flashcards`, label: "Flashcards", icon: Layers },
  { href: (id: string) => `/${id}/quiz`, label: "Quiz", icon: BrainCircuit },
];

export default function StudyNav({ documentId }: { documentId: string }) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const href = link.href(documentId);
        const isActive = pathname === href;
        const Icon = link.icon;
        return (
          <Link
            key={href}
            href={href}
            className={`${styles.navLink} ${isActive ? styles.active : ""}`}
          >
            <Icon size={18} />
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
