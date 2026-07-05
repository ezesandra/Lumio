"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Upload, FileText, Clock, BookOpen, BarChart3, Settings, LogOut, Sparkles, User, Menu, File, ChevronUp, ChevronDown, Crown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSidebar } from "./SidebarContext";
import styles from "./Navbar.module.css";

const mainNav = [
  { href: "/upload", label: "New Document", icon: Upload },
  { href: "/library", label: "All Documents", icon: FileText },
];

const learningNav = [
  { href: "/study-plan", label: "Study Plan", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: BarChart3 },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isLanding = pathname === "/";
  const isAuth = pathname === "/login" || pathname === "/signup" || pathname === "/reset-password" || pathname.startsWith("/verify-email");

  if (isAuth || pathname === "/onboarding") return null;

  if (isLanding) {
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
            {status === "authenticated" ? (
              <Link href="/library" className={styles.pillSignup}>Get Started</Link>
            ) : (
              <>
                <Link href="/login" className={styles.pillLink}>Log In</Link>
                <Link href="/signup" className={styles.pillSignup}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  if (status === "authenticated") {
    const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "User";

    return (
      <>
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarCollapsed : ""}`}>
        <div className={styles.sidebarHeader}>
          <button
            type="button"
            className={styles.sidebarToggle}
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <Link href="/library" className={styles.logo}>
            <Sparkles size={22} />
            <span className={styles.sidebarLogoText}>Lumio</span>
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

          <DocumentDropdown sidebarOpen={sidebarOpen} />

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
          <button 
            className={styles.sidebarUserButton} 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className={styles.sidebarUser}>
              <div className={styles.sidebarAvatar}>
                <User size={16} />
              </div>
              <div className={styles.sidebarUserInfo}>
                <span className={styles.sidebarUserName}>{userName}</span>
              </div>
            </div>
          </button>
          
          {userMenuOpen && (
            <div className={styles.userPopover}>
              <div className={styles.popoverHeader}>
                <span className={styles.popoverEmail}>{session?.user?.email}</span>
              </div>
              <div className={styles.popoverDivider} />
              <Link
                href="/settings"
                className={styles.popoverLink}
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings size={16} />
                Settings
              </Link>
              <Link
                href="/subscription"
                className={styles.popoverLink}
                onClick={() => setUserMenuOpen(false)}
              >
                <Crown size={16} />
                Manage Subscription
              </Link>
            </div>
          )}
          
          <button
            className={styles.sidebarLogout}
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {showLogoutConfirm && (
        <div className={styles.logoutOverlay}>
          <div className={styles.logoutModal}>
            <h3 className={styles.logoutTitle}>Log Out</h3>
            <p className={styles.logoutText}>Are you sure you want to log out of your account?</p>
            <div className={styles.logoutActions}>
              <button 
                className={styles.logoutCancel} 
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.logoutConfirm} 
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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

interface DocumentItem {
  id: string;
  documentTitle: string;
  status: string;
}

function DocumentDropdown({ sidebarOpen }: { sidebarOpen: boolean }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchDocs = () => {
      setLoading(true);
      fetch("/api/documents")
        .then((r) => r.json())
        .then((data) => setDocuments(data.documents ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    fetchDocs();

    window.addEventListener("lumio:document-deleted", fetchDocs);
    window.addEventListener("lumio:document-updated", fetchDocs);

    return () => {
      window.removeEventListener("lumio:document-deleted", fetchDocs);
      window.removeEventListener("lumio:document-updated", fetchDocs);
    };
  }, []);



  return (
    <div className={styles.sidebarSection}>
      <div className={styles.sidebarSectionLabel}>
        <Clock size={14} />
        Recent Documents
      </div>
      <div className={styles.recentList}>
        {loading && documents.length === 0 && <div className={styles.recentItem}>Loading...</div>}
        {!loading && documents.length === 0 && <div className={styles.recentItem}>No documents yet</div>}
        {documents.slice(0, 5).map((doc) => {
          const docActive = pathname === `/${doc.id}/summary`;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => router.push(`/${doc.id}/summary`)}
              className={`${styles.recentItem} ${styles.recentItemButton} ${docActive ? styles.recentItemActive : ""}`}
            >
              <File size={14} />
              <span className={styles.recentItemTitle}>{doc.documentTitle || "Untitled"}</span>

            </button>
          );
        })}
      </div>
    </div>
  );
}
