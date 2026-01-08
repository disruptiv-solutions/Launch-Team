import { NextRequest, NextResponse } from 'next/server';
import { createProject, getAllProjects, getProject } from '@/lib/projects';
import { getAllTeams } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await getAllProjects();
    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Reasonable default: use first team if available, else default to chief_of_staff agent.
    let assignment: any = { mode: 'agent', agentId: 'chief_of_staff' };
    try {
      const teams = await getAllTeams();
      if (teams.length > 0) assignment = { mode: 'team', teamId: teams[0].id };
    } catch {
      // Ignore—fallback to agent assignment
    }

    const projectId = await createProject({
      name,
      ...(description ? { description } : {}),
      assignment,
    });

    const project = await getProject(projectId);

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

