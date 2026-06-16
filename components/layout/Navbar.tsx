"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, Upload, FileText, Clock, BookOpen, BarChart3, Settings, LogOut, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./Navbar.module.css";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "New Document", icon: Upload },
  { href: "/library", label: "All Documents", icon: FileText },
  { href: "/recent", label: "Recent Documents", icon: Clock },
];

const learningNav = [
  { href: "/study-plan", label: "Study Plan", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAuth = pathname === "/login" || pathname === "/signup" || pathname === "/reset-password" || pathname.startsWith("/verify-email");

  if (isAuth || pathname === "/onboarding") return null;

  if (isLanding && status !== "authenticated") {
    return (
      <header className={styles.landingHeader}>
        <div className={styles.pill}>
          <Link href="/" className={styles.logo}>
            <Sparkles size={20} />
            Lumio
          </Link>
          <nav className={styles.pillNav}>
            <a href="#features" className={styles.pillLink}>Features</a>
            <a href="#pricing" className={styles.pillLink}>Pricing</a>
            <a href="#faq" className={styles.pillLink}>FAQ</a>
          </nav>
          <div className={styles.pillActions}>
            <Link href="/login" className={styles.pillLink}>Log In</Link>
            <Link href="/signup" className={styles.pillSignup}>Get Started</Link>
          </div>
        </div>
      </header>
    );
  }

  if (status === "authenticated") {
    const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";

    return (
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logo}>
            <Sparkles size={22} />
            Lumio
          </Link>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.sidebarSectionLabel}>Main</div>
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}

          <div className={styles.sidebarDivider} />

          <div className={styles.sidebarSectionLabel}>Learning</div>
          {learningNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`${styles.sidebarLink} ${isActive ? styles.sidebarLinkActive : ""}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarUser}>
            <div className={styles.sidebarAvatar}>
              <User size={16} />
            </div>
            <div className={styles.sidebarUserInfo}>
              <span className={styles.sidebarUserName}>{userName}</span>
            </div>
          </div>
          <Link
            href="/settings"
            className={`${styles.sidebarLink} ${pathname === "/settings" ? styles.sidebarLinkActive : ""}`}
          >
            <Settings size={18} />
            Settings
          </Link>
          <button
            className={styles.sidebarLogout}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>
    );
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <Sparkles size={22} />
          Lumio
        </Link>
        <div className={styles.actions}>
          <Link href="/login">
            <Button variant="ghost" size="sm">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">Sign Up</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
