import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

export type AgentPrompt = {
  agentId: string;
  prompt: string;
  updatedAt: Timestamp;
  updatedBy?: string;
};

const AGENT_PROMPTS_COLLECTION = 'agent_prompts';

/**
 * Get a prompt for a specific agent
 */
export const getAgentPrompt = async (agentId: string): Promise<string | null> => {
  const docRef = doc(db, AGENT_PROMPTS_COLLECTION, agentId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data() as AgentPrompt;
  return data.prompt;
};

/**
 * Get all agent prompts
 */
export const getAllAgentPrompts = async (): Promise<Record<string, string>> => {
  const querySnapshot = await getDocs(collection(db, AGENT_PROMPTS_COLLECTION));
  const prompts: Record<string, string> = {};
  
  querySnapshot.docs.forEach((doc) => {
    const data = doc.data() as AgentPrompt;
    prompts[data.agentId] = data.prompt;
  });
  
  return prompts;
};

/**
 * Save or update an agent prompt
 */
export const saveAgentPrompt = async (
  agentId: string,
  prompt: string
): Promise<void> => {
  const docRef = doc(db, AGENT_PROMPTS_COLLECTION, agentId);
  await setDoc(docRef, {
    agentId,
    prompt,
    updatedAt: Timestamp.now(),
  }, { merge: true });
};
