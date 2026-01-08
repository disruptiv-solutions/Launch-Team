import { db } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import type { Attachment } from '@/lib/sessions';

export type ProjectChat = {
  id: string;
  title: string;
  messageCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ProjectChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  agent?: string;
  consultedAgents?: string[];
  planText?: string;
  createdAt: Timestamp;
};

const omitUndefinedShallow = <T extends Record<string, any>>(value: T): Partial<T> => {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
};

const normalizeTextOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const chatsCol = (projectId: string) => collection(db, 'projects', projectId, 'chats');
const chatDoc = (projectId: string, chatId: string) => doc(db, 'projects', projectId, 'chats', chatId);
const messagesCol = (projectId: string, chatId: string) =>
  collection(db, 'projects', projectId, 'chats', chatId, 'messages');
const messageDoc = (projectId: string, chatId: string, messageId: string) =>
  doc(db, 'projects', projectId, 'chats', chatId, 'messages', messageId);

export const createProjectChat = async (projectId: string, params?: { title?: string }): Promise<string> => {
  const now = Timestamp.now();
  const chatId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const title = normalizeTextOrUndefined(params?.title) ?? `New Chat ${new Date().toLocaleDateString()}`;

  const chat: ProjectChat = {
    id: chatId,
    title,
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(chatDoc(projectId, chatId), chat);
  return chatId;
};

export const getProjectChat = async (projectId: string, chatId: string): Promise<ProjectChat | null> => {
  const snap = await getDoc(chatDoc(projectId, chatId));
  if (!snap.exists()) return null;
  return snap.data() as ProjectChat;
};

export const listProjectChats = async (projectId: string, maxResults: number = 50): Promise<ProjectChat[]> => {
  try {
    const q = query(chatsCol(projectId), orderBy('updatedAt', 'desc'), limit(maxResults));
    const qs = await getDocs(q);
    return qs.docs.map((d) => d.data() as ProjectChat);
  } catch (error: any) {
    if (error?.code === 'failed-precondition') {
      const qs = await getDocs(chatsCol(projectId));
      const chats = qs.docs.map((d) => d.data() as ProjectChat);
      return chats.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    }
    throw error;
  }
};

export const deleteProjectChat = async (projectId: string, chatId: string): Promise<void> => {
  await deleteDoc(chatDoc(projectId, chatId));
};

export const listProjectChatMessages = async (
  projectId: string,
  chatId: string,
  maxResults: number = 200
): Promise<ProjectChatMessage[]> => {
  const q = query(messagesCol(projectId, chatId), orderBy('createdAt', 'asc'), limit(maxResults));
  const qs = await getDocs(q);
  return qs.docs.map((d) => d.data() as ProjectChatMessage);
};

export const addMessageToProjectChat = async (
  projectId: string,
  chatId: string,
  message: Omit<ProjectChatMessage, 'id' | 'createdAt'> & { createdAt?: Timestamp }
): Promise<string> => {
  const now = message.createdAt ?? Timestamp.now();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const next: ProjectChatMessage = omitUndefinedShallow({
    id: messageId,
    role: message.role,
    content: (message.content || '').toString(),
    createdAt: now,
    ...(Array.isArray(message.attachments) && message.attachments.length > 0 ? { attachments: message.attachments } : {}),
    ...(typeof message.agent === 'string' && message.agent.trim() ? { agent: message.agent.trim() } : {}),
    ...(Array.isArray(message.consultedAgents)
      ? {
          consultedAgents: message.consultedAgents
            .filter((a) => typeof a === 'string')
            .map((a) => a.trim())
            .filter(Boolean),
        }
      : {}),
    ...(typeof message.planText === 'string' && message.planText.trim() ? { planText: message.planText.trim() } : {}),
  }) as ProjectChatMessage;

  await setDoc(messageDoc(projectId, chatId, messageId), next as DocumentData);
  await updateDoc(chatDoc(projectId, chatId), { updatedAt: Timestamp.now(), messageCount: increment(1) });

  return messageId;
};

