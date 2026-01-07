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
      // Decode and normalize the agentId
      const decodedAgentId = decodeURIComponent(agentId);
      
      // Normalize ID: lowercase, collapse multiple underscores
      const normalizeId = (id: string) => {
        return id.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
      };
      
      const normalizedId = normalizeId(decodedAgentId);
      
      // Try normalized ID first
      let agent = await getAgentDefinition(normalizedId);
      
      // If not found, try original ID (in case it's stored with different format)
      if (!agent && normalizedId !== decodedAgentId) {
        agent = await getAgentDefinition(decodedAgentId);
      }
      
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

    // Normalize ID: lowercase, collapse multiple underscores
    const normalizeId = (id: string) => {
      return id.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    };
    
    const normalizedId = normalizeId(agentId);
    
    // Try to find agent with normalized ID or original ID
    let foundAgentId = normalizedId;
    let agent = await getAgentDefinition(normalizedId);
    
    if (!agent && normalizedId !== agentId) {
      agent = await getAgentDefinition(agentId);
      if (agent) {
        foundAgentId = agentId;
      }
    }
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    await updateAgentDefinition(foundAgentId, updates);
    const updatedAgent = await getAgentDefinition(foundAgentId);
    return NextResponse.json({ agent: updatedAgent });
  } catch (error: any) {
    console.error('Error updating agent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
