import { db } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  type DocumentData,
  limit,
} from 'firebase/firestore';

export type ProjectAssignment =
  | { mode: 'team'; teamId: string }
  | { mode: 'agent'; agentId: string };

export type Project = {
  id: string;
  name: string;
  description?: string;
  projectPrompt?: string;
  assignment: ProjectAssignment;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const PROJECTS_COLLECTION = 'projects';

const omitUndefinedShallow = <T extends Record<string, any>>(value: T): Partial<T> => {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
};

const normalizeTextOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeTextOrEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  return value.trim();
};

export const createProject = async (params: {
  name: string;
  description?: string;
  projectPrompt?: string;
  assignment?: ProjectAssignment;
}): Promise<string> => {
  const now = Timestamp.now();
  const projectId = `project_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const name = (params.name || '').trim();
  if (!name) throw new Error('Project name is required');

  const assignment: ProjectAssignment = params.assignment ?? { mode: 'team', teamId: '' } as any;

  const projectData: Project = omitUndefinedShallow({
    id: projectId,
    name,
    description: normalizeTextOrUndefined(params.description),
    projectPrompt: normalizeTextOrUndefined(params.projectPrompt),
    assignment,
    createdAt: now,
    updatedAt: now,
  }) as Project;

  await setDoc(doc(db, PROJECTS_COLLECTION, projectId), projectData);
  return projectId;
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  const snap = await getDoc(doc(db, PROJECTS_COLLECTION, projectId));
  if (!snap.exists()) return null;
  return snap.data() as Project;
};

export const getAllProjects = async (maxResults: number = 50): Promise<Project[]> => {
  try {
    const q = query(collection(db, PROJECTS_COLLECTION), orderBy('updatedAt', 'desc'), limit(maxResults));
    const qs = await getDocs(q);
    return qs.docs.map((d) => d.data() as Project);
  } catch (error: any) {
    // If orderBy fails (no index), try without ordering
    if (error?.code === 'failed-precondition') {
      const qs = await getDocs(collection(db, PROJECTS_COLLECTION));
      const projects = qs.docs.map((d) => d.data() as Project);
      return projects.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    }
    throw error;
  }
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
  const now = Timestamp.now();
  const next: Partial<Project> = omitUndefinedShallow({
    ...updates,
    ...(typeof updates.name === 'string' ? { name: updates.name.trim() } : {}),
    ...(typeof updates.description === 'string'
      ? { description: normalizeTextOrEmptyString(updates.description) }
      : {}),
    ...(typeof updates.projectPrompt === 'string'
      ? { projectPrompt: normalizeTextOrEmptyString(updates.projectPrompt) }
      : {}),
    updatedAt: now,
  } as any) as Partial<Project>;

  await setDoc(doc(db, PROJECTS_COLLECTION, projectId), next as DocumentData, { merge: true });
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await deleteDoc(doc(db, PROJECTS_COLLECTION, projectId));
};

