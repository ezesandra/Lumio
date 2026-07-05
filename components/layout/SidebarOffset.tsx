"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";

export function SidebarOffset({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { isOpen } = useSidebar();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAuth = pathname === "/login" || pathname === "/signup" || pathname === "/reset-password" || pathname?.startsWith("/verify-email");

  return (
    <div
      style={{
        paddingLeft: isLanding || isAuth ? 0 : (status === "authenticated" && isOpen ? 240 : status === "authenticated" ? 56 : 0),
        transition: "padding-left 0.25s ease",
      }}
    >
      {children}
    </div>
  );
}
