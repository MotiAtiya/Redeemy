import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { deleteEntityImages } from './imageUpload';
import { normalizeTimestamp, normalizeImages, stripUndefined, buildUpdatePayload } from './firestoreUtils';
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
        return {
          ...(data as Omit<Document, 'id' | 'expirationDate' | 'createdAt' | 'updatedAt'>),
          id: d.id,
          images: normalizeImages(data.images, data.imageUrl, data.thumbnailUrl),
          expirationDate: normalizeTimestamp(data.expirationDate) ?? new Date(),
          createdAt: normalizeTimestamp(data.createdAt) ?? new Date(),
          updatedAt: normalizeTimestamp(data.updatedAt) ?? new Date(),
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
  const clean = stripUndefined({ ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const docRef = await addDoc(collection(db, DOCUMENTS_COLLECTION), clean);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

export async function updateDocument(
  id: string,
  changes: Partial<Document>
): Promise<void> {
  const docRef = doc(db, DOCUMENTS_COLLECTION, id);
  await updateDoc(docRef, buildUpdatePayload(changes as Record<string, unknown>));
}

export async function deleteDocument(id: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, DOCUMENTS_COLLECTION, id)),
    deleteEntityImages('documents', id),
  ]);
}

export async function deleteAllUserDocuments(userId: string): Promise<void> {
  const q = query(collection(db, DOCUMENTS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}
