import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';

export type Session = {
  id: string;
  title: string;
  messages: Message[];
  teamId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Attachment = {
  id: string;
  kind: 'image' | 'file';
  name: string;
  contentType: string;
  sizeBytes: number;
  url: string;
  storagePath: string;
};

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  attachments?: Attachment[];
  consultedAgents?: string[];
  planText?: string;
  audioUrl?: string;
  timestamp?: Timestamp;
};

const SESSIONS_COLLECTION = 'sessions';

/**
 * Create a new session
 */
export const createSession = async (title?: string, teamId?: string): Promise<string> => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  
  const sessionData: Session = {
    id: sessionId,
    title: title || `New Session ${new Date().toLocaleDateString()}`,
    messages: [],
    teamId,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), sessionData);
  return sessionId;
};

/**
 * Get a session by ID
 */
export const getSession = async (sessionId: string): Promise<Session | null> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return docSnap.data() as Session;
};

/**
 * Get all sessions (sorted by updatedAt desc)
 */
export const getAllSessions = async (maxResults: number = 50): Promise<Session[]> => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    orderBy('updatedAt', 'desc'),
    limit(maxResults)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Session);
};

/**
 * Update session messages
 */
export const updateSessionMessages = async (
  sessionId: string,
  messages: Message[]
): Promise<void> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(docRef, {
    messages,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Update session title
 */
export const updateSessionTitle = async (
  sessionId: string,
  title: string
): Promise<void> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(docRef, {
    title,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Delete a session
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await deleteDoc(docRef);
};

/**
 * Add a message to a session
 */
export const addMessageToSession = async (
  sessionId: string,
  message: Message
): Promise<void> => {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }
  
  // Firestore rejects `undefined` values — only persist attachments if present.
  const nextMessage: Message = {
    role: message.role,
    content: message.content,
    timestamp: Timestamp.now(),
    ...(typeof message.agent === 'string' && message.agent.trim()
      ? { agent: message.agent.trim() }
      : {}),
    ...(Array.isArray(message.attachments) && message.attachments.length > 0
      ? { attachments: message.attachments }
      : {}),
    ...(Array.isArray(message.consultedAgents)
      ? {
          consultedAgents: message.consultedAgents
            .filter((a) => typeof a === 'string')
            .map((a) => a.trim())
            .filter(Boolean),
        }
      : {}),
    ...(typeof message.planText === 'string' && message.planText.trim()
      ? { planText: message.planText.trim() }
      : {}),
    ...(typeof message.audioUrl === 'string' && message.audioUrl.trim()
      ? { audioUrl: message.audioUrl.trim() }
      : {}),
  };

  const updatedMessages = [...session.messages, nextMessage];
  await updateSessionMessages(sessionId, updatedMessages);
};

/**
 * Update the audio URL for a specific message in a session
 */
export const updateMessageAudioUrl = async (
  sessionId: string,
  messageIndex: number,
  audioUrl: string
): Promise<void> => {
  const session = await getSession(sessionId);
  if (!session || !session.messages[messageIndex]) {
    throw new Error(`Session ${sessionId} or message at index ${messageIndex} not found`);
  }

  const updatedMessages = [...session.messages];
  updatedMessages[messageIndex] = {
    ...updatedMessages[messageIndex],
    audioUrl,
  };

  await updateSessionMessages(sessionId, updatedMessages);
};
