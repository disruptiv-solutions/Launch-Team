import { NextRequest, NextResponse } from 'next/server';
import { deleteProject, getProject, updateProject } from '@/lib/projects';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const project = await getProject(projectId);
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const body = await req.json();

    const updates: any = {};
    if (typeof body?.name === 'string') updates.name = body.name;
    if (typeof body?.description === 'string') updates.description = body.description;
    if (typeof body?.projectPrompt === 'string') updates.projectPrompt = body.projectPrompt;

    if (body?.assignment && typeof body.assignment === 'object') {
      const mode = body.assignment.mode;
      if (mode === 'team' && typeof body.assignment.teamId === 'string') {
        updates.assignment = { mode: 'team', teamId: body.assignment.teamId };
      } else if (mode === 'agent' && typeof body.assignment.agentId === 'string') {
        updates.assignment = { mode: 'agent', agentId: body.assignment.agentId };
      } else {
        return NextResponse.json({ error: 'Invalid assignment' }, { status: 400 });
      }
    }

    await updateProject(projectId, updates);
    const project = await getProject(projectId);
    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    await deleteProject(projectId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

