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
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';

export type Summary = {
  id: string;
  sessionId: string;
  summary: string;
  messageIndex: number; // Index of the last message when this summary was generated
  createdAt: Timestamp;
};

const SUMMARIES_COLLECTION = 'summaries';

/**
 * Create a new summary
 */
export const createSummary = async (
  sessionId: string,
  summary: string,
  messageIndex: number
): Promise<string> => {
  const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  
  const summaryData: Summary = {
    id: summaryId,
    sessionId,
    summary,
    messageIndex,
    createdAt: now,
  };

  await setDoc(doc(db, SUMMARIES_COLLECTION, summaryId), summaryData);
  return summaryId;
};

/**
 * Get all summaries for a session (sorted by messageIndex ascending)
 */
export const getSessionSummaries = async (sessionId: string): Promise<Summary[]> => {
  const q = query(
    collection(db, SUMMARIES_COLLECTION),
    where('sessionId', '==', sessionId),
    orderBy('messageIndex', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Summary);
};

/**
 * Get a summary by ID
 */
export const getSummary = async (summaryId: string): Promise<Summary | null> => {
  const docRef = doc(db, SUMMARIES_COLLECTION, summaryId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docSnap.data() as Summary;
};

/**
 * Delete all summaries for a session
 */
export const deleteSessionSummaries = async (sessionId: string): Promise<void> => {
  const summaries = await getSessionSummaries(sessionId);
  const deletePromises = summaries.map((summary) => {
    const docRef = doc(db, SUMMARIES_COLLECTION, summary.id);
    return deleteDoc(docRef);
  });
  await Promise.all(deletePromises);
};
