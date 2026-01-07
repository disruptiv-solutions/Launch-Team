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
  Timestamp,
  deleteField,
} from 'firebase/firestore';

export type Task = {
  id: string;
  sessionId: string;
  task: string;
  description?: string;
  messageIndex?: number; // Optional - only set if task was detected from a message
  completed: boolean;
  archived: boolean;
  createdAt: Timestamp;
  completedAt?: Timestamp;
};

const TASKS_COLLECTION = 'tasks';

/**
 * Create a new task
 */
export const createTask = async (
  sessionId: string,
  task: string,
  messageIndex?: number,
  description?: string
): Promise<string> => {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  
  const taskData: Task = {
    id: taskId,
    sessionId,
    task,
    completed: false,
    archived: false,
    createdAt: now,
  };

  // Firestore rejects `undefined` values — only persist optional fields when defined.
  if (typeof messageIndex === 'number') {
    taskData.messageIndex = messageIndex;
  }
  if (typeof description === 'string' && description.trim()) {
    taskData.description = description.trim();
  }

  await setDoc(doc(db, TASKS_COLLECTION, taskId), taskData);
  return taskId;
};

/**
 * Get all tasks for a session
 */
export const getSessionTasks = async (sessionId: string, includeArchived: boolean = false): Promise<Task[]> => {
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('sessionId', '==', sessionId),
    where('archived', '==', includeArchived),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data() as Task);
};

/**
 * Update a task (mark as completed, archive, etc.)
 */
export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  const updateData: any = { ...updates };
  
  if (updates.completed && !updates.completedAt) {
    updateData.completedAt = Timestamp.now();
  }

  // If unchecking a task, clear completedAt so it behaves like an active task again.
  if (updates.completed === false) {
    updateData.completedAt = deleteField();
  }
  
  await setDoc(docRef, updateData, { merge: true });
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  await deleteDoc(docRef);
};
