"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import { updateDocumentTitle, deleteDocument } from "./actions";
import styles from "./page.module.css";

type Document = {
  id: string;
  documentTitle: string | null;
  fileName: string;
  createdAt: Date;
  status: string;
};

function formatDate(date: Date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(date);
  const day = days[d.getDay()];
  const month = months[d.getMonth()];
  const dateNum = d.getDate();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${day}, ${month} ${dateNum}, ${hours}:${minutes}${ampm}`;
}

function DocumentIcon() {
  return (
    <svg width="45" height="45" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="52" height="52" rx="10" fill="#EDE9FE" />
      <path d="M16 14C16 12.8954 16.8954 12 18 12H28L36 20V38C36 39.1046 35.1046 40 34 40H18C16.8954 40 16 39.1046 16 38V14Z" fill="#8B5CF6" />
      <path d="M28 12L36 20H30C28.8954 20 28 19.1046 28 18V12Z" fill="#7C3AED" />
      <line x1="20" y1="24" x2="32" y2="24" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="29" x2="32" y2="29" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="34" x2="27" y2="34" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function useOutsideClick(handler: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [handler]);
  return ref;
}

export function DocumentList({ documents }: { documents: Document[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return documents;
    const q = search.toLowerCase();
    return documents.filter(
      (d) =>
        (d.documentTitle || "").toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q)
    );
  }, [documents, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  async function handleSaveTitle() {
    if (!editingDoc || !editTitle.trim()) return;
    setSaving(true);
    const result = await updateDocumentTitle(editingDoc.id, editTitle.trim());
    setSaving(false);
    if (result.success) {
      setEditingDoc(null);
      window.dispatchEvent(new Event("lumio:document-updated"));
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    const result = await deleteDocument(confirmDelete.id);
    setDeleting(null);
    if (result.success) {
      setConfirmDelete(null);
      setOpenMenuId(null);
      window.dispatchEvent(new Event("lumio:document-deleted"));
      router.refresh();
    }
  }

  return (
    <div className={styles.inner}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>All Documents</h1>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by title"
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 && !documents.length && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No documents found.</p>
        </div>
      )}

      {filtered.length === 0 && documents.length > 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>No documents match your search.</p>
        </div>
      )}

      <div className={styles.grid}>
        {paged.map((doc) => (
          <div 
            key={doc.id} 
            className={styles.card}
            onClick={() => router.push(`/${doc.id}/summary`)}
          >
            <div className={styles.cardBody}>
              <DocumentIcon />
              <div className={styles.cardInfo}>
                <p className={styles.cardTitle}>
                  {doc.documentTitle || doc.fileName}
                </p>
                <p className={styles.cardDate}>
                  Created {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className={styles.menuWrapper}>
                <button
                  className={styles.menuBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === doc.id ? null : doc.id);
                  }}
                >
                  <MoreHorizontal size={18} />
                </button>
                {openMenuId === doc.id && (
                  <MenuDropdown
                    onClose={closeMenu}
                    onEdit={() => {
                      setEditTitle(doc.documentTitle || doc.fileName);
                      setEditingDoc(doc);
                      setOpenMenuId(null);
                    }}
                    onDelete={() => {
                      setConfirmDelete(doc);
                      setOpenMenuId(null);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`${styles.pageNum} ${n === page ? styles.pageNumActive : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      {editingDoc && (
        <div className={styles.overlay} onClick={() => setEditingDoc(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>New Title</h2>
            <input
              type="text"
              className={styles.modalInput}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setEditingDoc(null)}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirm}
                onClick={handleSaveTitle}
                disabled={saving || !editTitle.trim()}
              >
                {saving ? "Saving..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Delete Document ?</h2>
            <p className={styles.modalDesc}>This can't be undone</p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className={styles.modalDanger}
                onClick={handleDelete}
                disabled={deleting === confirmDelete.id}
              >
                {deleting === confirmDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuDropdown({
  onClose,
  onEdit,
  onDelete,
}: {
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const ref = useOutsideClick(onClose);
  return (
    <div className={styles.dropdown} ref={ref}>
      <button className={styles.dropdownItem} onClick={onEdit}>
        <Edit3 size={15} />
        Edit Title
      </button>
      <button className={styles.dropdownItem} onClick={onDelete}>
        <Trash2 size={15} />
        Delete Document
      </button>
    </div>
  );
}
