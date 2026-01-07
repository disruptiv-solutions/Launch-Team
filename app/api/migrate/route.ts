import { NextRequest, NextResponse } from 'next/server';
import { createTeam } from '@/lib/teams';
import { createAgentDefinition, getAllAgentDefinitions } from '@/lib/agentsEnhanced';
import {
  CHIEF_OF_STAFF_PROMPT,
  FUNDRAISING_CASH_FLOW_PROMPT,
  GTM_REVENUE_GROWTH_PROMPT,
  PRODUCT_TECHNICAL_PROMPT,
  LEGAL_COMPLIANCE_PROMPT,
  BRAND_VOICE_MARKETING_PROMPT,
  DOCS_KNOWLEDGE_PROMPT,
  COMMUNITY_ENGAGEMENT_PROMPT,
  WELLBEING_SUSTAINABILITY_PROMPT,
  OPERATIONS_SCALING_PROMPT,
  GBETA_SPECIALIST_PROMPT,
} from '@/lib/teamPrompts';

export const dynamic = 'force-dynamic';

async function migrateToDefaultTeam() {
  try {
    console.log('Starting migration to teams system...');

    // Check if agents already exist
    const existingAgents = await getAllAgentDefinitions();
    const existingTeamLead = existingAgents.find(a => a.id === 'chief_of_staff' || a.name === 'Chief of Staff');
    
    let teamLeadId: string;
    
    if (existingTeamLead) {
      console.log('Using existing Chief of Staff agent');
      teamLeadId = existingTeamLead.id;
    } else {
      // Create team lead agent
      teamLeadId = await createAgentDefinition(
        'Chief of Staff',
        CHIEF_OF_STAFF_PROMPT,
        'team_lead',
        'Strategic Orchestrator - Primary interface for routing to specialists',
        ['webSearch'],
        'gpt-5.2'
      );
      console.log(`Created team lead: ${teamLeadId}`);
    }

    // Map of agent names to their configs
    const agentConfigs = [
      { name: 'Fundraising & Cash Flow Advisor', prompt: FUNDRAISING_CASH_FLOW_PROMPT, desc: 'Runway + fundraising', tools: ['webSearch'] },
      { name: 'GTM & Revenue Growth Strategist', prompt: GTM_REVENUE_GROWTH_PROMPT, desc: 'Sales + conversion', tools: [] },
      { name: 'Product & Technical Advisor', prompt: PRODUCT_TECHNICAL_PROMPT, desc: 'Bugs + roadmap + Earl', tools: [] },
      { name: 'Legal & Compliance Advisor', prompt: LEGAL_COMPLIANCE_PROMPT, desc: 'LLC + contracts + risk', tools: [] },
      { name: 'Brand Voice & Marketing Agent', prompt: BRAND_VOICE_MARKETING_PROMPT, desc: 'Messaging + copy', tools: ['webSearch'] },
      { name: 'Documentation & Knowledge Manager', prompt: DOCS_KNOWLEDGE_PROMPT, desc: 'Guides + FAQs', tools: [] },
      { name: 'Community & Engagement Manager', prompt: COMMUNITY_ENGAGEMENT_PROMPT, desc: 'Retention + feed', tools: [] },
      { name: 'Founder Wellbeing & Sustainability Advisor', prompt: WELLBEING_SUSTAINABILITY_PROMPT, desc: 'Sustainability', tools: [] },
      { name: 'Operations & Scaling Advisor', prompt: OPERATIONS_SCALING_PROMPT, desc: 'Systems (defer)', tools: [] },
      { name: 'gBETA Program Specialist', prompt: GBETA_SPECIALIST_PROMPT, desc: 'gBETA program support', tools: [] },
    ];

    // Create or reuse sub-agents
    const subAgentIds = await Promise.all(
      agentConfigs.map(async (config) => {
        const existingAgent = existingAgents.find(
          a => a.id === config.name.toLowerCase().replace(/\s+/g, '_') || a.name === config.name
        );
        
        if (existingAgent) {
          console.log(`Using existing agent: ${config.name}`);
          return existingAgent.id;
        }
        
        return await createAgentDefinition(
          config.name,
          config.prompt,
          'sub_agent',
          config.desc,
          config.tools,
          'gpt-5.2'
        );
      })
    );

    console.log(`Processed ${subAgentIds.length} sub-agents`);

    // Create default team
    const teamId = await createTeam(
      'LaunchHub Team',
      teamLeadId,
      subAgentIds,
      'Default LaunchHub team with Chief of Staff and 10 specialized agents'
    );

    console.log(`Migration complete! Created team: ${teamId}`);
    return teamId;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// POST /api/migrate - Run migration to create default team
export async function POST(req: NextRequest) {
  try {
    const teamId = await migrateToDefaultTeam();
    return NextResponse.json({ success: true, teamId });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
