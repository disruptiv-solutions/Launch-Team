import { NextRequest, NextResponse } from 'next/server';
import { createProjectChat, getProjectChat, listProjectChats } from '@/lib/projectChats';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const chats = await listProjectChats(projectId);
    return NextResponse.json({ chats });
  } catch (error: any) {
    console.error('Error fetching project chats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title.trim() : undefined;

    const chatId = await createProjectChat(projectId, title ? { title } : undefined);
    const chat = await getProjectChat(projectId, chatId);

    return NextResponse.json({ chat });
  } catch (error: any) {
    console.error('Error creating project chat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

