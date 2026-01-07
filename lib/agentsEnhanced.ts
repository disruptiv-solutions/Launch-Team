import { Agent, webSearchTool } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getTeam } from './teams';
import { getAgentPrompt } from './agentPrompts';

export type AgentDefinition = {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  agentType: 'team_lead' | 'sub_agent';
  tools?: string[];
  model?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const AGENTS_COLLECTION = 'agents';

/**
 * Create a new agent definition
 */
export const createAgentDefinition = async (
  name: string,
  systemPrompt: string,
  agentType: 'team_lead' | 'sub_agent',
  description?: string,
  tools?: string[],
  model?: string
): Promise<string> => {
  // Generate agentId: lowercase, replace spaces with underscores, remove special chars except underscores
  const agentId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const now = Timestamp.now();

  const agentData: AgentDefinition = {
    id: agentId,
    name,
    description,
    systemPrompt,
    agentType,
    tools: tools || [],
    model: model || 'gpt-5.2',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, AGENTS_COLLECTION, agentId), agentData);
  return agentId;
};

/**
 * Get an agent definition by ID
 */
export const getAgentDefinition = async (agentId: string): Promise<AgentDefinition | null> => {
  const docRef = doc(db, AGENTS_COLLECTION, agentId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as AgentDefinition;
};

/**
 * Get all agent definitions
 */
export const getAllAgentDefinitions = async (): Promise<AgentDefinition[]> => {
  try {
    const q = query(collection(db, AGENTS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as AgentDefinition);
  } catch (error: any) {
    // If orderBy fails (no index), try without ordering
    if (error.code === 'failed-precondition') {
      const querySnapshot = await getDocs(collection(db, AGENTS_COLLECTION));
      const agents = querySnapshot.docs.map((doc) => doc.data() as AgentDefinition);
      // Sort manually
      return agents.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
    }
    throw error;
  }
};

/**
 * Get multiple agent definitions by IDs
 */
export const getAgentDefinitionsByIds = async (agentIds: string[]): Promise<AgentDefinition[]> => {
  const agents = await Promise.all(agentIds.map((id) => getAgentDefinition(id)));
  return agents.filter((agent): agent is AgentDefinition => agent !== null);
};

/**
 * Update an agent definition
 */
export const updateAgentDefinition = async (
  agentId: string,
  updates: Partial<AgentDefinition>
): Promise<void> => {
  const docRef = doc(db, AGENTS_COLLECTION, agentId);
  await setDoc(
    docRef,
    {
      ...updates,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
};

/**
 * Convert an AgentDefinition to an OpenAI Agent instance
 */
export const buildAgentFromDefinition = (agentDef: AgentDefinition): Agent => {
  const tools = agentDef.tools?.includes('webSearch') ? [webSearchTool()] : [];
  
  return new Agent({
    name: agentDef.id,
    model: agentDef.model || 'gpt-5.2',
    instructions: agentDef.systemPrompt,
    tools,
  });
};

/**
 * Build a team agent with handoffs to sub-agents
 */
export const buildTeamAgent = async (teamId: string): Promise<Agent> => {
  const team = await getTeam(teamId);
  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }

  // Get team lead agent definition
  const teamLeadDef = await getAgentDefinition(team.teamLeadAgentId);
  if (!teamLeadDef) {
    throw new Error(`Team lead agent ${team.teamLeadAgentId} not found`);
  }

  // Get sub-agent definitions
  const subAgentDefs = await getAgentDefinitionsByIds(team.subAgentIds);

  // Build sub-agents
  const subAgents = subAgentDefs.map((def) => buildAgentFromDefinition(def));

  // Create team lead agent with handoffs
  return Agent.create({
    name: teamLeadDef.id,
    model: teamLeadDef.model || 'gpt-5.2',
    instructions: `${RECOMMENDED_PROMPT_PREFIX}\n${teamLeadDef.systemPrompt}`,
    handoffs: subAgents,
    tools: teamLeadDef.tools?.includes('webSearch') ? [webSearchTool()] : [],
  });
};
