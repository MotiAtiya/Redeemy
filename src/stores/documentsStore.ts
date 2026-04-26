import { create } from 'zustand';
import { type Document } from '@/types/documentTypes';

interface DocumentsState {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
}

interface DocumentsActions {
  setDocuments: (documents: Document[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addDocument: (document: Document) => void;
  removeDocument: (documentId: string) => void;
  updateDocument: (documentId: string, changes: Partial<Document>) => void;
}

type DocumentsStore = DocumentsState & DocumentsActions;

export const useDocumentsStore = create<DocumentsStore>()((set) => ({
  documents: [],
  isLoading: false,
  error: null,

  setDocuments: (documents) => set({ documents }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addDocument: (document) =>
    set((state) => ({ documents: [document, ...state.documents] })),

  removeDocument: (documentId) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== documentId),
    })),

  updateDocument: (documentId, changes) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === documentId ? { ...d, ...changes } : d,
      ),
    })),
}));
