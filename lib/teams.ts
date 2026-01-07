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
  Timestamp,
} from 'firebase/firestore';

export type Team = {
  id: string;
  name: string;
  description?: string;
  teamLeadAgentId: string;
  subAgentIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
};

const TEAMS_COLLECTION = 'teams';

/**
 * Create a new team
 */
export const createTeam = async (
  name: string,
  teamLeadAgentId: string,
  subAgentIds: string[] = [],
  description?: string
): Promise<string> => {
  const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();

  const teamData: Team = {
    id: teamId,
    name,
    description,
    teamLeadAgentId,
    subAgentIds,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, TEAMS_COLLECTION, teamId), teamData);
  return teamId;
};

/**
 * Get a team by ID
 */
export const getTeam = async (teamId: string): Promise<Team | null> => {
  const docRef = doc(db, TEAMS_COLLECTION, teamId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as Team;
};

/**
 * Get all teams
 */
export const getAllTeams = async (): Promise<Team[]> => {
  try {
    const q = query(collection(db, TEAMS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data() as Team);
  } catch (error: any) {
    // If orderBy fails (no index), try without ordering
    if (error.code === 'failed-precondition') {
      const querySnapshot = await getDocs(collection(db, TEAMS_COLLECTION));
      const teams = querySnapshot.docs.map((doc) => doc.data() as Team);
      // Sort manually
      return teams.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
    }
    throw error;
  }
};

/**
 * Update a team
 */
export const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<void> => {
  const docRef = doc(db, TEAMS_COLLECTION, teamId);
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
 * Delete a team
 */
export const deleteTeam = async (teamId: string): Promise<void> => {
  const docRef = doc(db, TEAMS_COLLECTION, teamId);
  await deleteDoc(docRef);
};
