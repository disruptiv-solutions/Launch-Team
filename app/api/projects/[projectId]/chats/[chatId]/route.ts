import { NextRequest, NextResponse } from 'next/server';
import { deleteProjectChat, getProjectChat, listProjectChatMessages } from '@/lib/projectChats';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ projectId: string; chatId: string }> }) {
  try {
    const { projectId, chatId } = await ctx.params;
    const chat = await getProjectChat(projectId, chatId);
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const includeMessages = searchParams.get('includeMessages') === '1';
    const messages = includeMessages ? await listProjectChatMessages(projectId, chatId) : undefined;

    return NextResponse.json({ chat, ...(includeMessages ? { messages } : {}) });
  } catch (error: any) {
    console.error('Error fetching project chat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ projectId: string; chatId: string }> }) {
  try {
    const { projectId, chatId } = await ctx.params;
    await deleteProjectChat(projectId, chatId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project chat:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

