import { db } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';

export type ProjectFileRef = {
  name: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  url: string;
};

export type ProjectDocument =
  | {
      id: string;
      type: 'text';
      title: string;
      content: string;
      createdAt: Timestamp;
      updatedAt: Timestamp;
    }
  | {
      id: string;
      type: 'file';
      title: string;
      file: ProjectFileRef;
      extractedText?: string;
      createdAt: Timestamp;
      updatedAt: Timestamp;
    };

const omitUndefinedShallow = <T extends Record<string, any>>(value: T): Partial<T> => {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
};

const normalizeTextOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const docsCol = (projectId: string) => collection(db, 'projects', projectId, 'documents');
const docRef = (projectId: string, docId: string) => doc(db, 'projects', projectId, 'documents', docId);

export const listProjectDocuments = async (projectId: string, maxResults: number = 100): Promise<ProjectDocument[]> => {
  try {
    const q = query(docsCol(projectId), orderBy('updatedAt', 'desc'), limit(maxResults));
    const qs = await getDocs(q);
    return qs.docs.map((d) => d.data() as ProjectDocument);
  } catch (error: any) {
    if (error?.code === 'failed-precondition') {
      const qs = await getDocs(docsCol(projectId));
      const docs = qs.docs.map((d) => d.data() as ProjectDocument);
      return docs.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    }
    throw error;
  }
};

export const createProjectTextDocument = async (projectId: string, params: { title: string; content: string }) => {
  const now = Timestamp.now();
  const documentId = `pdoc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const title = (params.title || '').trim();
  const content = (params.content || '').trim();
  if (!title || !content) throw new Error('title and content are required');

  const next: ProjectDocument = {
    id: documentId,
    type: 'text',
    title,
    content,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef(projectId, documentId), next as DocumentData);
  return documentId;
};

export const createProjectFileDocument = async (
  projectId: string,
  params: { title?: string; file: ProjectFileRef; extractedText?: string }
) => {
  const now = Timestamp.now();
  const documentId = `pdoc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const title = normalizeTextOrUndefined(params.title) ?? (params.file?.name || 'Uploaded file');

  const next: ProjectDocument = omitUndefinedShallow({
    id: documentId,
    type: 'file',
    title,
    file: params.file,
    extractedText: normalizeTextOrUndefined(params.extractedText),
    createdAt: now,
    updatedAt: now,
  }) as ProjectDocument;

  await setDoc(docRef(projectId, documentId), next as DocumentData);
  return documentId;
};

export const deleteProjectDocument = async (projectId: string, documentId: string): Promise<void> => {
  await deleteDoc(docRef(projectId, documentId));
};

