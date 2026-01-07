import { NextRequest, NextResponse } from 'next/server';
import { getAgentPrompt, saveAgentPrompt, getAllAgentPrompts } from '@/lib/agentPrompts';

export const dynamic = 'force-dynamic';

// GET /api/agent-prompts - Get all prompts or a specific one
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    
    if (agentId) {
      const prompt = await getAgentPrompt(agentId);
      return NextResponse.json({ prompt });
    } else {
      const prompts = await getAllAgentPrompts();
      return NextResponse.json({ prompts });
    }
  } catch (error: any) {
    console.error('Error fetching agent prompts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/agent-prompts - Save or update an agent prompt
export async function POST(req: NextRequest) {
  try {
    const { agentId, prompt } = await req.json();
    
    if (!agentId || !prompt) {
      return NextResponse.json({ error: 'agentId and prompt are required' }, { status: 400 });
    }
    
    await saveAgentPrompt(agentId, prompt);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving agent prompt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
