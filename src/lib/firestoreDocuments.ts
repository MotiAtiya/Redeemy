import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { deleteEntityImages } from './imageUpload';
import { type Document } from '@/types/documentTypes';
import { useDocumentsStore } from '@/stores/documentsStore';

const DOCUMENTS_COLLECTION = 'documents';

// ---------------------------------------------------------------------------
// Real-time listener
// ---------------------------------------------------------------------------

export function subscribeToDocuments(userId: string, familyId?: string | null): Unsubscribe {
  const q = familyId
    ? query(collection(db, DOCUMENTS_COLLECTION), where('familyId', '==', familyId))
    : query(collection(db, DOCUMENTS_COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const documents: Document[] = snapshot.docs.map((d) => {
        const data = d.data();
        // Normalize legacy imageUrl/thumbnailUrl into images array
        const images = data.images ?? (
          data.imageUrl
            ? [{ url: data.imageUrl, thumbnailUrl: data.thumbnailUrl ?? data.imageUrl }]
            : undefined
        );
        return {
          ...(data as Omit<Document, 'id' | 'expirationDate' | 'createdAt' | 'updatedAt'>),
          id: d.id,
          images,
          expirationDate: data.expirationDate?.toDate?.() ?? new Date(data.expirationDate),
          createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
        } as Document;
      });
      useDocumentsStore.getState().setDocuments(documents);
      useDocumentsStore.getState().setLoading(false);
    },
    (error) => {
      console.error('Documents snapshot error:', error);
      useDocumentsStore.getState().setLoading(false);
    }
  );
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createDocument(
  data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // Strip undefined — Firestore rejects undefined field values
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  const ref = await addDoc(collection(db, DOCUMENTS_COLLECTION), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(
  id: string,
  changes: Partial<Document>
): Promise<void> {
  const clean = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, id), {
    ...clean,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, DOCUMENTS_COLLECTION, id)),
    deleteEntityImages('documents', id),
  ]);
}
