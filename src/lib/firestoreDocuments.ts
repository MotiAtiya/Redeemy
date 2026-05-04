import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  deleteField,
  query,
  where,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { deleteEntityImages } from './imageUpload';
import { normalizeTimestamp, normalizeImages, stripUndefined, buildUpdatePayload, ownerQuery } from './firestoreUtils';
import { logEvent } from './eventLog';
import { type Document } from '@/types/documentTypes';
import { useDocumentsStore } from '@/stores/documentsStore';

const DOCUMENTS_COLLECTION = 'documents';

// ---------------------------------------------------------------------------
// Real-time listener
// ---------------------------------------------------------------------------

export function subscribeToDocuments(userId: string, familyId?: string | null): Unsubscribe {
  return onSnapshot(
    ownerQuery(DOCUMENTS_COLLECTION, userId, familyId),
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
  try {
    const clean = stripUndefined({ ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    const docRef = await addDoc(collection(db, DOCUMENTS_COLLECTION), clean);
    await updateDoc(docRef, { id: docRef.id });
    void logEvent('item_created', { itemCategory: 'document', itemId: docRef.id });
    return docRef.id;
  } catch (err) {
    void logEvent('firestore_write_failed', {
      itemCategory: 'document',
      metadata: { operation: 'create', errorCode: (err as { code?: string })?.code ?? 'unknown' },
    });
    throw err;
  }
}

export async function updateDocument(
  id: string,
  changes: Partial<Document>,
  options: { silent?: boolean } = {}
): Promise<void> {
  const docRef = doc(db, DOCUMENTS_COLLECTION, id);
  await updateDoc(docRef, buildUpdatePayload(changes as Record<string, unknown>));
  if (!options.silent) {
    void logEvent('item_updated', { itemCategory: 'document', itemId: id });
  }
}

/**
 * User confirmed they renewed an expired document — push the new expiration
 * date to Firestore. Emits `document_renewed` so the admin activity feed can
 * distinguish a renewal from a generic edit. (Story 19.6)
 */
export async function confirmDocumentRenewal(
  id: string,
  newExpirationDate: Date,
): Promise<void> {
  const docRef = doc(db, DOCUMENTS_COLLECTION, id);
  await updateDoc(
    docRef,
    buildUpdatePayload({ expirationDate: newExpirationDate }),
  );
  void logEvent('document_renewed', { itemCategory: 'document', itemId: id });
}

export async function deleteDocument(id: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, DOCUMENTS_COLLECTION, id)),
    deleteEntityImages('documents', id),
  ]);
  void logEvent('item_deleted', { itemCategory: 'document', itemId: id });
}

export async function deleteAllUserDocuments(userId: string): Promise<void> {
  const q = query(collection(db, DOCUMENTS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Batch-assigns familyId (and createdBy info) to all documents belonging to a user.
 * Idempotent: skips docs already correctly tagged so updatedAt isn't churned.
 */
export async function migrateDocumentsToFamily(
  userId: string,
  familyId: string,
  createdByName: string
): Promise<void> {
  const q = query(collection(db, DOCUMENTS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const toUpdate = snapshot.docs.filter((d) => {
    const data = d.data();
    return data.familyId !== familyId
      || data.createdBy !== userId
      || data.createdByName !== createdByName;
  });
  if (toUpdate.length === 0) return;

  const batch = writeBatch(db);
  toUpdate.forEach((d) => {
    batch.update(d.ref, {
      familyId,
      createdBy: userId,
      createdByName,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/**
 * Batch-removes familyId and createdBy from all documents belonging to a user.
 * Called when a user leaves a family — their documents revert to personal ownership.
 */
export async function migrateDocumentsFromFamily(
  userId: string,
  familyId?: string
): Promise<void> {
  const constraints = familyId
    ? [where('userId', '==', userId), where('familyId', '==', familyId)]
    : [where('userId', '==', userId)];
  const q = query(collection(db, DOCUMENTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, {
      familyId: deleteField(),
      createdBy: deleteField(),
      createdByName: deleteField(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
