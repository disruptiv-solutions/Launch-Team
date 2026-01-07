import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

export type Document = {
  id: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sessionId?: string;
  agent?: string;
};

const DOCUMENTS_COLLECTION = 'documents';

/**
 * Create a new document
 */
export const createDocument = async (
  title: string,
  content: string,
  sessionId?: string,
  agent?: string
): Promise<string> => {
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  
  const documentData: Document = {
    id: docId,
    title,
    content,
    createdAt: now,
    updatedAt: now,
    sessionId,
    agent,
  };

  await setDoc(doc(db, DOCUMENTS_COLLECTION, docId), documentData);
  return docId;
};

/**
 * Get a document by ID
 */
export const getDocument = async (docId: string): Promise<Document | null> => {
  const docRef = doc(db, DOCUMENTS_COLLECTION, docId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docSnap.data() as Document;
};

/**
 * Get all documents (sorted by updatedAt desc)
 */
export const getAllDocuments = async (maxResults: number = 100): Promise<Document[]> => {
  const q = query(
    collection(db, DOCUMENTS_COLLECTION),
    orderBy('updatedAt', 'desc'),
    limit(maxResults)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Document);
};

/**
 * Delete a document
 */
export const deleteDocument = async (docId: string): Promise<void> => {
  const docRef = doc(db, DOCUMENTS_COLLECTION, docId);
  await deleteDoc(docRef);
};
