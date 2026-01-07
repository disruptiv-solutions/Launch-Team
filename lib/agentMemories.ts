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
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

export type AgentMemory = {
  id: string;
  agentId: string;
  text: string;
  createdAt: Timestamp;
  createdBy?: string;
  source?: {
    sessionId?: string;
    messageId?: string;
  };
};

const AGENT_MEMORIES_COLLECTION = 'agent_memories';

const normalizeMemoryText = (text: string) =>
  text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const dedupeMemorySuggestions = (params: {
  suggestions: string[];
  existingMemories: string[];
  systemPrompt?: string;
  maxSuggestions: number;
}): string[] => {
  const existing = new Set(params.existingMemories.map(normalizeMemoryText));
  const normSystemPrompt = params.systemPrompt ? normalizeMemoryText(params.systemPrompt) : '';
  const out: string[] = [];
  const seen = new Set<string>();

  for (const s of params.suggestions) {
    if (out.length >= params.maxSuggestions) break;
    if (typeof s !== 'string') continue;
    const trimmed = s.trim();
    if (!trimmed) continue;
    const norm = normalizeMemoryText(trimmed);
    
    // Check against existing memories
    if (existing.has(norm)) continue;
    
    // Check against already seen in this loop
    if (seen.has(norm)) continue;
    
    // Check if it's already in the system prompt (substring match)
    if (normSystemPrompt && normSystemPrompt.includes(norm)) continue;

    seen.add(norm);
    out.push(trimmed);
  }

  return out;
};

export const listAgentMemories = async (agentId: string): Promise<AgentMemory[]> => {
  const q = query(
    collection(db, AGENT_MEMORIES_COLLECTION),
    where('agentId', '==', agentId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AgentMemory);
};

export const getAgentMemory = async (memoryId: string): Promise<AgentMemory | null> => {
  const ref = doc(db, AGENT_MEMORIES_COLLECTION, memoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as AgentMemory;
};

export const createAgentMemory = async (params: {
  agentId: string;
  text: string;
  createdBy?: string;
  source?: AgentMemory['source'];
}): Promise<string> => {
  const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const ref = doc(db, AGENT_MEMORIES_COLLECTION, memoryId);

  const memory: AgentMemory = {
    id: memoryId,
    agentId: params.agentId,
    text: params.text,
    createdAt: Timestamp.now(),
    ...(typeof params.createdBy === 'string' && params.createdBy.trim()
      ? { createdBy: params.createdBy.trim() }
      : {}),
    ...(params.source ? { source: params.source } : {}),
  };

  await setDoc(ref, memory);
  return memoryId;
};

export const updateAgentMemoryText = async (params: {
  memoryId: string;
  text: string;
}): Promise<void> => {
  const ref = doc(db, AGENT_MEMORIES_COLLECTION, params.memoryId);
  await updateDoc(ref, { text: params.text });
};

export const deleteAgentMemory = async (memoryId: string): Promise<void> => {
  const ref = doc(db, AGENT_MEMORIES_COLLECTION, memoryId);
  await deleteDoc(ref);
};

export const buildInstructionsWithMemories = (params: {
  baseInstructions: string;
  memories: { text: string }[];
}): string => {
  const cleaned = params.memories
    .map((m) => (typeof m.text === 'string' ? m.text.trim() : ''))
    .filter(Boolean);

  if (cleaned.length === 0) return params.baseInstructions;

  const section = ['[Saved memories]', ...cleaned.map((t) => `- ${t}`)].join('\n');
  return `${params.baseInstructions.trim()}\n\n${section}\n`;
};

