import { Agent, webSearchTool } from '@openai/agents';
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';
import {
  BRAND_VOICE_MARKETING_PROMPT,
  CHIEF_OF_STAFF_PROMPT,
  COMMUNITY_ENGAGEMENT_PROMPT,
  DOCS_KNOWLEDGE_PROMPT,
  FUNDRAISING_CASH_FLOW_PROMPT,
  GBETA_SPECIALIST_PROMPT,
  GTM_REVENUE_GROWTH_PROMPT,
  LEGAL_COMPLIANCE_PROMPT,
  OPERATIONS_SCALING_PROMPT,
  PRODUCT_TECHNICAL_PROMPT,
  WELLBEING_SUSTAINABILITY_PROMPT,
} from '@/lib/teamPrompts';

export const fundraisingCashFlowAdvisor = new Agent({
  name: 'fundraising_cash_flow_advisor',
  model: 'gpt-5.2',
  instructions: FUNDRAISING_CASH_FLOW_PROMPT,
  tools: [webSearchTool()],
});

export const gtmRevenueGrowthStrategist = new Agent({
  name: 'gtm_revenue_growth_strategist',
  model: 'gpt-5.2',
  instructions: GTM_REVENUE_GROWTH_PROMPT,
});

export const productTechnicalAdvisor = new Agent({
  name: 'product_technical_advisor',
  model: 'gpt-5.2',
  instructions: PRODUCT_TECHNICAL_PROMPT,
});

export const legalComplianceAdvisor = new Agent({
  name: 'legal_compliance_advisor',
  model: 'gpt-5.2',
  instructions: LEGAL_COMPLIANCE_PROMPT,
});

export const brandVoiceMarketingAgent = new Agent({
  name: 'brand_voice_marketing_agent',
  model: 'gpt-5.2',
  instructions: BRAND_VOICE_MARKETING_PROMPT,
  tools: [webSearchTool()],
});

export const documentationKnowledgeManager = new Agent({
  name: 'documentation_knowledge_manager',
  model: 'gpt-5.2',
  instructions: DOCS_KNOWLEDGE_PROMPT,
});

export const communityEngagementManager = new Agent({
  name: 'community_engagement_manager',
  model: 'gpt-5.2',
  instructions: COMMUNITY_ENGAGEMENT_PROMPT,
});

export const founderWellbeingAdvisor = new Agent({
  name: 'founder_wellbeing_advisor',
  model: 'gpt-5.2',
  instructions: WELLBEING_SUSTAINABILITY_PROMPT,
});

export const operationsScalingAdvisor = new Agent({
  name: 'operations_scaling_advisor',
  model: 'gpt-5.2',
  instructions: OPERATIONS_SCALING_PROMPT,
});

export const gbetaProgramSpecialist = new Agent({
  name: 'gbeta_program_specialist',
  model: 'gpt-5.2',
  instructions: GBETA_SPECIALIST_PROMPT,
});

/**
 * CHIEF OF STAFF (PRIMARY ORCHESTRATOR)
 * Uses handoffs so the UI can show agent switching in real-time.
 */
export const teamLeadAgent = Agent.create({
  name: 'chief_of_staff',
  model: 'gpt-5.2',
  instructions: `${RECOMMENDED_PROMPT_PREFIX}\n${CHIEF_OF_STAFF_PROMPT}`,
  handoffs: [
    fundraisingCashFlowAdvisor,
    gtmRevenueGrowthStrategist,
    productTechnicalAdvisor,
    legalComplianceAdvisor,
    brandVoiceMarketingAgent,
    documentationKnowledgeManager,
    communityEngagementManager,
    founderWellbeingAdvisor,
    operationsScalingAdvisor,
    gbetaProgramSpecialist,
  ],
  // Give Chief of Staff light research ability for misc lookups, but prefer delegation.
  tools: [webSearchTool()],
});

/**
 * Map of all agents by their ID for easy lookup
 */
export const agentsById: Record<string, Agent> = {
  chief_of_staff: teamLeadAgent,
  fundraising_cash_flow_advisor: fundraisingCashFlowAdvisor,
  gtm_revenue_growth_strategist: gtmRevenueGrowthStrategist,
  product_technical_advisor: productTechnicalAdvisor,
  legal_compliance_advisor: legalComplianceAdvisor,
  brand_voice_marketing_agent: brandVoiceMarketingAgent,
  documentation_knowledge_manager: documentationKnowledgeManager,
  community_engagement_manager: communityEngagementManager,
  founder_wellbeing_advisor: founderWellbeingAdvisor,
  operations_scaling_advisor: operationsScalingAdvisor,
  gbeta_program_specialist: gbetaProgramSpecialist,
};
