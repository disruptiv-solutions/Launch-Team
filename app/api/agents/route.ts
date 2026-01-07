import { NextRequest, NextResponse } from 'next/server';
import {
  getAllAgentDefinitions,
  getAgentDefinition,
  createAgentDefinition,
  updateAgentDefinition,
} from '@/lib/agentsEnhanced';

export const dynamic = 'force-dynamic';

// GET /api/agents - Get all agents or a specific agent
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    if (agentId) {
      // Decode the agentId in case it has special characters
      const decodedAgentId = decodeURIComponent(agentId);
      const agent = await getAgentDefinition(decodedAgentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      return NextResponse.json({ agent });
    }

    const agents = await getAllAgentDefinitions();
    return NextResponse.json({ agents });
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/agents - Create a new agent
export async function POST(req: NextRequest) {
  try {
    const { name, systemPrompt, agentType, description, tools, model } = await req.json();

    if (!name || !systemPrompt || !agentType) {
      return NextResponse.json(
        { error: 'name, systemPrompt, and agentType are required' },
        { status: 400 }
      );
    }

    const agentId = await createAgentDefinition(
      name,
      systemPrompt,
      agentType,
      description,
      tools,
      model
    );
    const agent = await getAgentDefinition(agentId);
    return NextResponse.json({ agent });
  } catch (error: any) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/agents - Update an agent
export async function PUT(req: NextRequest) {
  try {
    const { agentId, ...updates } = await req.json();

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    await updateAgentDefinition(agentId, updates);
    const agent = await getAgentDefinition(agentId);
    return NextResponse.json({ agent });
  } catch (error: any) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
