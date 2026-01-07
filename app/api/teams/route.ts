import { NextRequest, NextResponse } from 'next/server';
import {
  createTeam,
  getTeam,
  getAllTeams,
  updateTeam,
  deleteTeam,
} from '@/lib/teams';

export const dynamic = 'force-dynamic';

// GET /api/teams - Get all teams or a specific team
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    if (teamId) {
      const team = await getTeam(teamId);
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json({ team });
    }

    const teams = await getAllTeams();
    return NextResponse.json({ teams });
  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/teams - Create a new team
export async function POST(req: NextRequest) {
  try {
    const { name, description, teamLeadAgentId, subAgentIds } = await req.json();

    if (!name || !teamLeadAgentId) {
      return NextResponse.json(
        { error: 'name and teamLeadAgentId are required' },
        { status: 400 }
      );
    }

    const teamId = await createTeam(name, teamLeadAgentId, subAgentIds || [], description);
    const team = await getTeam(teamId);
    return NextResponse.json({ team });
  } catch (error: any) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/teams - Update a team
export async function PUT(req: NextRequest) {
  try {
    const { teamId, ...updates } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    await updateTeam(teamId, updates);
    const team = await getTeam(teamId);
    return NextResponse.json({ team });
  } catch (error: any) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/teams - Delete a team
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    await deleteTeam(teamId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
