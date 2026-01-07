import { NextRequest, NextResponse } from 'next/server';
import {
  createAgentMemory,
  deleteAgentMemory,
  listAgentMemories,
  updateAgentMemoryText,
} from '@/lib/agentMemories';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const memories = await listAgentMemories(agentId);
    return NextResponse.json({ memories });
  } catch (error: any) {
    console.error('Error fetching agent memories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, text, source, createdBy } = await req.json();
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const id = await createAgentMemory({
      agentId,
      text: text.trim(),
      ...(typeof createdBy === 'string' ? { createdBy } : {}),
      ...(source && typeof source === 'object' ? { source } : {}),
    });

    return NextResponse.json({ id });
  } catch (error: any) {
    console.error('Error creating agent memory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { memoryId, text } = await req.json();
    if (!memoryId || typeof memoryId !== 'string') {
      return NextResponse.json({ error: 'memoryId is required' }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    await updateAgentMemoryText({ memoryId, text: text.trim() });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating agent memory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get('memoryId');
    if (!memoryId) {
      return NextResponse.json({ error: 'memoryId is required' }, { status: 400 });
    }

    await deleteAgentMemory(memoryId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting agent memory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

