"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import styles from "./SidebarOffset.module.css";

export function SidebarOffset({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { isOpen } = useSidebar();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAuth = pathname === "/login" || pathname === "/signup" || pathname === "/reset-password" || pathname?.startsWith("/verify-email") || pathname === "/onboarding";

  let offsetClass = styles.offsetAuthenticatedClosed;
  
  if (isLanding) {
    offsetClass = styles.offsetLanding;
  } else if (isAuth) {
    offsetClass = styles.offsetAuth;
  } else if (status === "authenticated") {
    offsetClass = isOpen ? styles.offsetAuthenticatedOpen : styles.offsetAuthenticatedClosed;
  }

  return (
    <div className={`${styles.offset} ${offsetClass}`}>
      {children}
    </div>
  );
}
