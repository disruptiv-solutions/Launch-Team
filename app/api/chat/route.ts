import { NextRequest } from 'next/server';
import { teamLeadAgent, agentsById, teamSpecialists } from '@/lib/agents';
import {
  buildAgentFromDefinition,
  buildTeamAgent,
  buildTeamAgentsForConsultation,
  buildAgentFromDefinitionWithMemories,
  getAgentDefinition,
} from '@/lib/agentsEnhanced';
import { Agent, run } from '@openai/agents';
import { getSession, updateSessionMessages, addMessageToSession } from '@/lib/sessions';
import { z } from 'zod';
import { buildInstructionsWithMemories, listAgentMemories } from '@/lib/agentMemories';

export const dynamic = 'force-dynamic';

// Default to auto detail so the model can choose the right fidelity.
// Can be made user-configurable later (low/auto/high).
const DEFAULT_IMAGE_DETAIL: 'low' | 'high' | 'auto' = 'auto';

const MAX_EXTRACT_CHARS_PER_FILE = 60_000;
const MAX_TOTAL_EXTRACT_CHARS = 120_000;

const MAX_CONSULTED_SPECIALISTS = 4;
const MAX_TRANSCRIPT_CHARS_FOR_SELECTOR = 12_000;
const MAX_TRANSCRIPT_CHARS_FOR_SPECIALISTS = 16_000;
const MAX_SPECIALIST_OUTPUT_CHARS = 6_000;

const truncate = (text: string, maxChars: number) => {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Truncated: ${text.length - maxChars} more characters omitted]`;
};

const extractTextFromAgentContent = (content: any): string => {
  if (!Array.isArray(content)) return '';
  const parts = content
    .map((p) => {
      if (!p || typeof p !== 'object') return '';
      if (typeof p.text === 'string') return p.text;
      return '';
    })
    .filter(Boolean);
  return parts.join('\n').trim();
};

const agentInputItemsToTranscript = (items: any[], maxChars: number): string => {
  const lines = items
    .filter((i) => i && typeof i === 'object' && i.type === 'message')
    .map((i) => {
      const role = typeof i.role === 'string' ? i.role : 'unknown';
      const text = extractTextFromAgentContent(i.content);
      if (!text) return '';
      return `${role.toUpperCase()}: ${text}`;
    })
    .filter(Boolean);

  const joined = lines.join('\n\n');
  return truncate(joined, maxChars);
};

const buildSpecialistCatalogText = (specialists: { id: string; name?: string; description?: string }[]) => {
  if (specialists.length === 0) return '(no specialists)';
  return specialists
    .map((s) => {
      const label = s.name ? `${s.name} (${s.id})` : s.id;
      const desc = (s.description || '').trim();
      return desc ? `- ${label}: ${desc}` : `- ${label}`;
    })
    .join('\n');
};

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch file: ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function extractTextFromFile(params: {
  url: string;
  contentType?: string;
  name?: string;
}): Promise<string> {
  const ct = params.contentType || '';
  const buf = await fetchBuffer(params.url);

  if (ct === 'text/plain') {
    return buf.toString('utf8');
  }

  if (ct === 'text/csv') {
    // Simple, safe CSV preview (no heavy parsing) to keep token usage reasonable.
    const csv = buf.toString('utf8');
    const lines = csv.split(/\r?\n/).slice(0, 200).join('\n');
    return `CSV preview (first 200 lines):\n${lines}`;
  }

  if (ct === 'application/pdf') {
    // Dynamically import pdf-parse to avoid browser API issues during module initialization
    try {
      const { PDFParse } = await import('pdf-parse');
      // In Next.js/Turbopack server builds, pdfjs worker resolution can fail.
      // Disable worker and use the "fake worker" path in-process.
      const parser = new PDFParse({ data: buf, disableWorker: true } as any);
      try {
        const result: any = await parser.getText();
        return typeof result?.text === 'string' ? result.text : '';
      } finally {
        await parser.destroy();
      }
    } catch (error) {
      console.warn('PDF parsing failed:', error);
      return '';
    }
  }

  if (ct === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // Dynamically import mammoth to avoid browser API issues during module initialization
    try {
      const mammoth = await import('mammoth');
      const result: any = await (mammoth as any).extractRawText({ buffer: buf });
      return typeof result?.value === 'string' ? result.value : '';
    } catch (error) {
      console.warn('DOCX parsing failed:', error);
      return '';
    }
  }

  // .doc and other formats: attach as input_file, but skip extraction here.
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId, agentMode, selectedAgentId, teamId } = await req.json();
    const lastMessage = messages?.[messages.length - 1];

    const lastText = typeof lastMessage?.content === 'string' ? lastMessage.content : '';
    const lastAttachments = Array.isArray(lastMessage?.attachments) ? lastMessage.attachments : [];

    if (!lastText.trim() && lastAttachments.length === 0) {
      return new Response(JSON.stringify({ error: 'No message content or attachments provided' }), { status: 400 });
    }

    // Load session history if sessionId provided
    let inputHistory: any[] = [];
    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) {
        // Convert stored messages to AgentInputItem format
        inputHistory = session.messages.slice(0, -1).map((m) => {
          const role = m.role === 'assistant' ? 'assistant' : 'user';
          const attachments = Array.isArray((m as any).attachments) ? (m as any).attachments : [];

          const attachmentParts =
            role === 'user'
              ? attachments
                  .filter((a: any) => typeof a?.url === 'string' && a.url.length > 0)
                  .map((a: any) => {
                    if (a.kind === 'image' || (typeof a.contentType === 'string' && a.contentType.startsWith('image/'))) {
                      // OpenAI docs use `image_url`; Agents SDK accepts `image` and maps it through.
                      return { type: 'input_image', image: a.url, detail: DEFAULT_IMAGE_DETAIL };
                    }
                    return {
                      type: 'input_file',
                      file: { url: a.url },
                    };
                  })
              : [];

          return {
            type: 'message',
            role,
            content: [
              {
                type: role === 'user' ? 'input_text' : 'output_text',
                text: m.content,
              },
              ...attachmentParts,
            ],
          };
        });
      }
    } else {
      // No sessionId: use provided messages (for backward compatibility)
      inputHistory = (messages ?? []).slice(0, -1).map((m: any) => {
        const role = m?.role === 'assistant' ? 'assistant' : 'user';
        const text = typeof m?.content === 'string' ? m.content : '';
        const attachments = Array.isArray(m?.attachments) ? m.attachments : [];
        const attachmentParts =
          role === 'user'
            ? attachments
                .filter((a: any) => typeof a?.url === 'string' && a.url.length > 0)
                .map((a: any) => {
                  if (a.kind === 'image' || (typeof a.contentType === 'string' && a.contentType.startsWith('image/'))) {
                    return { type: 'input_image', image: a.url, detail: DEFAULT_IMAGE_DETAIL };
                  }
                  return {
                    type: 'input_file',
                    file: { url: a.url },
                  };
                })
            : [];
        return {
          type: 'message',
          role,
          content: [
            {
              type: role === 'user' ? 'input_text' : 'output_text',
              text,
            },
            ...attachmentParts,
          ],
        };
      });
    }

    const lastImageParts = lastAttachments
      .filter((a: any) => typeof a?.url === 'string' && a.url.length > 0)
      .filter((a: any) => a.kind === 'image' || (typeof a.contentType === 'string' && a.contentType.startsWith('image/')))
      .map((a: any) => ({ type: 'input_image', image: a.url, detail: DEFAULT_IMAGE_DETAIL }));

    const lastFileParts = lastAttachments
      .filter((a: any) => typeof a?.url === 'string' && a.url.length > 0)
      .filter((a: any) => !(a.kind === 'image' || (typeof a.contentType === 'string' && a.contentType.startsWith('image/'))))
      .map((a: any) => ({
        type: 'input_file',
        file: { url: a.url },
      }));

    // Best-effort text extraction for common doc types so the model has immediate context.
    // (Still attach the files via input_file for models/tools that can use them directly.)
    let extractedBlocks: string[] = [];
    let extractedSoFar = 0;
    for (const a of lastAttachments) {
      if (typeof a?.url !== 'string' || !a.url) continue;
      const ct = typeof a?.contentType === 'string' ? a.contentType : '';
      if (!['text/plain', 'text/csv', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(ct)) {
        continue;
      }

      if (extractedSoFar >= MAX_TOTAL_EXTRACT_CHARS) break;

      try {
        const raw = await extractTextFromFile({ url: a.url, contentType: ct, name: a.name });
        const trimmed = (raw || '').trim();
        if (!trimmed) continue;

        const remaining = Math.max(0, MAX_TOTAL_EXTRACT_CHARS - extractedSoFar);
        const chunk = truncate(trimmed, Math.min(MAX_EXTRACT_CHARS_PER_FILE, remaining));
        extractedSoFar += chunk.length;

        extractedBlocks.push(
          `---\nFILE: ${typeof a.name === 'string' ? a.name : 'uploaded_file'}\nTYPE: ${ct}\n---\n${chunk}\n`
        );
      } catch (error) {
        // Non-fatal: still include the file as input_file.
        console.warn('File text extraction failed:', error);
      }
    }

    const extractedContext =
      extractedBlocks.length > 0
        ? `\n\n[Uploaded file text (best-effort extraction)]\n${extractedBlocks.join('\n')}`
        : '';

    const baseUserText =
      lastText.trim().length > 0 ? lastText : 'User uploaded attachment(s). Please analyze them and respond.';

    const lastMessageItem = {
      type: 'message',
      role: 'user',
      content: [
        { type: 'input_text', text: `${baseUserText}${extractedContext}` },
        ...lastImageParts,
        ...lastFileParts,
      ],
    };

    // Save user message to session if sessionId provided
    if (sessionId) {
      await addMessageToSession(sessionId, {
        role: 'user',
        content: lastText,
        ...(lastAttachments.length > 0 ? { attachments: lastAttachments } : {}),
      });
    }

    const isSpecificMode = agentMode === 'specific' && !!selectedAgentId;
    let leadAgent: Agent;
    let specialistAgents: Agent[] = [];
    let specialistCatalog: { id: string; name?: string; description?: string }[] = [];

    if (isSpecificMode && selectedAgentId) {
      // Direct agent mode (prefer built-in/static agents, fall back to Firestore-defined agents)
      if (agentsById[selectedAgentId]) {
        leadAgent = agentsById[selectedAgentId];
      } else {
        const agentDef = await getAgentDefinition(selectedAgentId);
        if (!agentDef) {
          return new Response(JSON.stringify({ error: `Agent not found: ${selectedAgentId}` }), {
            status: 404,
          });
        }
        leadAgent = await buildAgentFromDefinitionWithMemories(agentDef);
      }
    } else if (teamId) {
      // Team mode - consult sub-agents and have lead synthesize a single final answer.
      try {
        const built = await buildTeamAgentsForConsultation(teamId);
        leadAgent = built.teamLeadAgent;
        specialistAgents = built.subAgents;
        specialistCatalog = built.subAgentDefinitions.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
        }));
      } catch (error) {
        console.error('Error building team agents, falling back to default:', error);
        leadAgent = teamLeadAgent;
        specialistAgents = teamSpecialists;
        specialistCatalog = teamSpecialists.map((a) => ({ id: a.name }));
      }
    } else {
      // Default "all" mode with built-in team
      leadAgent = teamLeadAgent;
      specialistAgents = teamSpecialists;
      specialistCatalog = teamSpecialists.map((a) => ({ id: a.name }));
    }

    // Apply saved memories to built-in agents at runtime (next-turn effect).
    // Firestore-built agents already include memories in their instructions.
    const cloneAgentWithInstructions = (base: Agent, nextInstructions: string): Agent => {
      const anyBase: any = base as any;
      const tools = Array.isArray(anyBase.tools) ? anyBase.tools : [];
      const model = anyBase.model ?? undefined;
      const modelSettings = anyBase.modelSettings ?? undefined;

      return new Agent({
        name: anyBase.name,
        model,
        modelSettings,
        instructions: nextInstructions,
        tools,
      });
    };

    const applyMemoriesToAgent = async (agent: Agent): Promise<Agent> => {
      const anyAgent: any = agent as any;
      const agentId = typeof anyAgent?.name === 'string' ? anyAgent.name : '';
      const baseInstructions = typeof anyAgent?.instructions === 'string' ? anyAgent.instructions : '';
      if (!agentId || !baseInstructions) return agent;

      const memories = await listAgentMemories(agentId);
      if (!memories || memories.length === 0) return agent;

      const instructions = buildInstructionsWithMemories({ baseInstructions, memories });
      return cloneAgentWithInstructions(agent, instructions);
    };

    // Only apply here for built-in/static agents to avoid extra reads.
    if (agentsById[leadAgent.name] || leadAgent === teamLeadAgent) {
      leadAgent = await applyMemoriesToAgent(leadAgent);
    }
    if (specialistAgents.length > 0 && specialistCatalog.length > 0) {
      // For built-in specialists, apply memories per agent.
      specialistAgents = await Promise.all(specialistAgents.map((a) => applyMemoriesToAgent(a)));
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const runInputBase = [...inputHistory, lastMessageItem];
          const shouldConsultTeam = !isSpecificMode && specialistAgents.length > 0;

          let finalRunInput: any[] = runInputBase;
          let consultedAgentsForPersistence: string[] = [];
          let planTextForPersistence: string | undefined;
          let phaseForPersistence: 'planning' | 'consulting' | 'answering' | 'done' | undefined;

          if (shouldConsultTeam) {
            const transcriptForSelector = agentInputItemsToTranscript(runInputBase.slice(-12), MAX_TRANSCRIPT_CHARS_FOR_SELECTOR);
            const catalogText = buildSpecialistCatalogText(specialistCatalog);

            const SpecialistSelection = z.object({
              agentIds: z.array(z.string()).default([]),
              planText: z.string().default(''),
            });

            const selectorAgent = new Agent({
              name: `${leadAgent.name}_specialist_selector`,
              model: 'gpt-5.2',
              instructions: [
                `You are the Chief of Staff deciding which specialists to consult for the user's message.`,
                `Select 0-${MAX_CONSULTED_SPECIALISTS} specialists whose expertise is most relevant.`,
                `Only return IDs from the provided specialist list.`,
                `Also provide a 1-sentence plan that mentions who you will consult (or that no consult is needed), and that you will reply after.`,
                `Return strictly valid JSON matching the schema.`,
              ].join('\n'),
              outputType: SpecialistSelection,
              modelSettings: { temperature: 0.2, toolChoice: 'none' },
            });

            const selectorPrompt = [
              `AVAILABLE SPECIALISTS (choose by ID):`,
              catalogText,
              ``,
              `CONVERSATION (most recent):`,
              transcriptForSelector || '(empty)',
              ``,
              `TASK: Return JSON: {"agentIds":["id1","id2",...], "planText":"..."} with up to ${MAX_CONSULTED_SPECIALISTS} IDs (or an empty list if none are needed).`,
            ].join('\n');

            const selectionResult = await run(selectorAgent, selectorPrompt);
            const rawSelected = selectionResult.finalOutput?.agentIds ?? [];
            const rawPlanText =
              typeof selectionResult.finalOutput?.planText === 'string'
                ? selectionResult.finalOutput.planText.trim()
                : '';

            const allowed = new Set(specialistAgents.map((a) => a.name));
            const selectedAgentIds = Array.from(
              new Set(
                rawSelected
                  .filter((id: any): id is string => typeof id === 'string')
                  .map((id) => id.trim())
                  .filter((id) => allowed.has(id))
              )
            ).slice(0, MAX_CONSULTED_SPECIALISTS);

            consultedAgentsForPersistence = selectedAgentIds;
            planTextForPersistence =
              rawPlanText.length > 0
                ? rawPlanText
                : selectedAgentIds.length > 0
                  ? `Plan: I’ll consult ${selectedAgentIds.join(', ')}, then respond.`
                  : `Plan: I can answer directly—no specialist consult needed.`;

            phaseForPersistence = 'planning';

            // Notify the client of plan + selected specialists.
            const planningData = {
              author: leadAgent.name,
              phase: 'planning',
              consultedAgents: selectedAgentIds,
              planText: planTextForPersistence,
              partial: true,
              isFinal: false,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(planningData)}\n\n`));

            const specialistsToConsult = specialistAgents.filter((a) => selectedAgentIds.includes(a.name));
            if (specialistsToConsult.length === 0) {
              // No consultation needed; proceed directly to lead synthesis.
              finalRunInput = runInputBase;
            } else {
              phaseForPersistence = 'consulting';
              const transcriptForSpecialists = agentInputItemsToTranscript(runInputBase.slice(-16), MAX_TRANSCRIPT_CHARS_FOR_SPECIALISTS);

              const consultationPrompt = (specialistId: string) =>
                [
                  `You are being consulted by the Chief of Staff. Do NOT speak to the user directly.`,
                  `Provide internal notes only. Be concise and actionable.`,
                  ``,
                  `FORMAT:`,
                  `- Key insights (bullets)`,
                  `- Risks / gotchas (bullets)`,
                  `- Recommended response angle (1-3 bullets)`,
                  `- 1-2 clarifying questions (if needed)`,
                  ``,
                  `CONVERSATION (most recent):`,
                  transcriptForSpecialists || '(empty)',
                  ``,
                  `SPECIALIST: ${specialistId}`,
                ].join('\n');

              // Stream live "consulting X" updates to the client.
              const specialistNotes = await Promise.all(
                specialistsToConsult.map(async (specialist) => {
                  const startData = {
                    author: leadAgent.name,
                    phase: 'consulting',
                    consultingAgent: specialist.name,
                    consultingStatus: 'started',
                    partial: true,
                    isFinal: false,
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(startData)}\n\n`));

                  try {
                    const r = await run(specialist, consultationPrompt(specialist.name));
                    const text = typeof r.finalOutput === 'string' ? r.finalOutput : JSON.stringify(r.finalOutput ?? '');

                    const doneData = {
                      author: leadAgent.name,
                      phase: 'consulting',
                      consultingAgent: specialist.name,
                      consultingStatus: 'completed',
                      partial: true,
                      isFinal: false,
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneData)}\n\n`));

                    return { id: specialist.name, text: truncate(text.trim(), MAX_SPECIALIST_OUTPUT_CHARS) };
                  } catch (e: any) {
                    const doneData = {
                      author: leadAgent.name,
                      phase: 'consulting',
                      consultingAgent: specialist.name,
                      consultingStatus: 'completed',
                      partial: true,
                      isFinal: false,
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneData)}\n\n`));

                    return { id: specialist.name, text: `Error consulting specialist: ${e?.message ?? String(e)}` };
                  }
                })
              );

              const briefing = [
                `INTERNAL SPECIALIST BRIEFING (not shown to user):`,
                ...specialistNotes.map((n) => `\n[${n.id}]\n${n.text}`),
              ].join('\n');

              const internalBriefingItem = {
                type: 'message',
                role: 'assistant',
                content: [{ type: 'output_text', text: briefing }],
              };

              finalRunInput = [...inputHistory, internalBriefingItem, lastMessageItem];
            }
          }

          // Run the lead agent with streaming enabled (lead always produces final user-facing output)
          const result = await run(leadAgent, finalRunInput, { stream: true });

          const currentAgentName = leadAgent.name;
          let assistantMessageContent = '';
          let hasEmittedAnsweringPhase = false;

          for await (const event of result) {
            // Handle text deltas
            if (event.type === 'raw_model_stream_event') {
              const data: any = event.data;
              if (data.type === 'output_text_delta' && data.delta) {
                if (!hasEmittedAnsweringPhase) {
                  hasEmittedAnsweringPhase = true;
                  phaseForPersistence = 'answering';
                  const answeringData = {
                    author: currentAgentName,
                    phase: 'answering',
                    partial: true,
                    isFinal: false,
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(answeringData)}\n\n`));
                }
                assistantMessageContent += data.delta;
                const chunkData = {
                  author: currentAgentName,
                  phase: 'answering',
                  content: data.delta,
                  partial: true,
                  isFinal: false
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
              }
            }
          }

          // Ensure the run finished and then send a final "author + full text" payload.
          await result.completed;

          const finalText =
            typeof result.finalOutput === 'string'
              ? result.finalOutput
              : result.finalOutput
                ? JSON.stringify(result.finalOutput)
                : assistantMessageContent || '';

          // Save assistant response to session if sessionId provided
          if (sessionId) {
            await addMessageToSession(sessionId, {
              role: 'assistant',
              content: finalText,
              agent: currentAgentName,
              ...(typeof planTextForPersistence === 'string' && planTextForPersistence.trim().length > 0
                ? { planText: planTextForPersistence.trim() }
                : {}),
              ...(Array.isArray(consultedAgentsForPersistence) && consultedAgentsForPersistence.length > 0
                ? { consultedAgents: consultedAgentsForPersistence }
                : { consultedAgents: [] }),
            });
          }

          // Final event to signal completion
          phaseForPersistence = 'done';
          const finalData = {
            author: currentAgentName,
            phase: 'done',
            content: finalText,
            partial: false,
            isFinal: true,
            ...(typeof planTextForPersistence === 'string' && planTextForPersistence.trim().length > 0
              ? { planText: planTextForPersistence.trim() }
              : {}),
            consultedAgents: consultedAgentsForPersistence,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`));
          
          controller.close();
        } catch (error: any) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
