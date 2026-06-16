"use client";

import { useSession } from "next-auth/react";

export function SidebarOffset({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  return (
    <div style={{ paddingLeft: status === "authenticated" ? 240 : 0 }}>
      {children}
    </div>
  );
}
