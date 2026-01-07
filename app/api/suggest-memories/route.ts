import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { dedupeMemorySuggestions, listAgentMemories } from '@/lib/agentMemories';
import { agentsById } from '@/lib/agents';
import { getAgentDefinition } from '@/lib/agentsEnhanced';

export const dynamic = 'force-dynamic';

const MAX_SUGGESTIONS = 3;

const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }
  return new OpenAI({ apiKey });
};

export async function POST(req: NextRequest) {
  try {
    const { agentId, agentName, conversationSnippet, assistantFinalText } = await req.json();

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }
    if (!assistantFinalText || typeof assistantFinalText !== 'string' || !assistantFinalText.trim()) {
      return NextResponse.json({ error: 'assistantFinalText is required' }, { status: 400 });
    }

    const openai = getOpenAI();

    const existing = await listAgentMemories(agentId);
    const existingTexts = existing
      .map((m) => (typeof m.text === 'string' ? m.text.trim() : ''))
      .filter(Boolean);

    const builtIn = agentsById[agentId];
    const builtInInstructions =
      builtIn && typeof (builtIn as any)?.instructions === 'string' ? ((builtIn as any).instructions as string) : '';

    const def = await getAgentDefinition(agentId);
    const systemPromptFromDb = typeof def?.systemPrompt === 'string' ? def.systemPrompt : '';

    const agentSystemPrompt = (builtInInstructions || systemPromptFromDb || '').trim();

    const systemPrompt = `You are a memory suggestion agent for a specific AI sub-agent.

Your job: propose durable, reusable memories that would improve the agent's future responses.

Memories MUST be:
- One-line to multi-line fact / preference / standing decision / important context
- Specific and stable (not ephemeral like \"today\" unless it is a durable policy)
- Safe and non-sensitive by default (avoid secrets, credentials, personal identifiers)
- Role-specific: each memory MUST be clearly grounded in the agent's actual scope/role (from the agent system prompt).

Rules:
- Suggest 0 to ${MAX_SUGGESTIONS} memories maximum
- Do NOT repeat or paraphrase existing memories
- Do NOT repeat or paraphrase information that is ALREADY IN THE AGENT SYSTEM PROMPT.
- Avoid generic \"professional boundaries / keep things in writing\" type memories unless the agent's role explicitly centers on that.
- If you cannot generate role-specific, durable memories, return an empty list.
- Output JSON: {"suggestions":["...","..."]} where each item is a string
`;

    const userPrompt = [
      `AGENT: ${typeof agentName === 'string' && agentName.trim() ? agentName.trim() : agentId}`,
      ``,
      `AGENT SYSTEM PROMPT (ground truth):`,
      agentSystemPrompt.length > 0 ? agentSystemPrompt : '(unknown)',
      ``,
      `EXISTING MEMORIES (do not repeat):`,
      existingTexts.length > 0 ? existingTexts.map((t) => `- ${t}`).join('\n') : '(none)',
      ``,
      `CONVERSATION SNIPPET (optional):`,
      typeof conversationSnippet === 'string' && conversationSnippet.trim() ? conversationSnippet.trim() : '(none)',
      ``,
      `ASSISTANT FINAL RESPONSE (what the user saw):`,
      assistantFinalText.trim(),
    ].join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{"suggestions":[]}';
    const parsed = JSON.parse(content);
    const rawSuggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions
      : parsed.suggestions
        ? [parsed.suggestions]
        : [];

    const suggestions = dedupeMemorySuggestions({
      suggestions: rawSuggestions,
      existingMemories: existingTexts,
      systemPrompt: agentSystemPrompt,
      maxSuggestions: MAX_SUGGESTIONS,
    });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error suggesting memories:', error);
    return NextResponse.json({ suggestions: [] });
  }
}

