"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface SelectedDocumentContextType {
  selectedDocId: string | null;
  selectDocument: (id: string | null) => void;
}

const SelectedDocumentContext = createContext<SelectedDocumentContextType>({
  selectedDocId: null,
  selectDocument: () => {},
});

export function SelectedDocumentProvider({ children }: { children: React.ReactNode }) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const selectDocument = useCallback((id: string | null) => setSelectedDocId(id), []);
  return (
    <SelectedDocumentContext.Provider value={{ selectedDocId, selectDocument }}>
      {children}
    </SelectedDocumentContext.Provider>
  );
}

export function useSelectedDocument() {
  return useContext(SelectedDocumentContext);
}
