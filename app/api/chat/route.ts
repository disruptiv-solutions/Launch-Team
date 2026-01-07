import { NextRequest } from 'next/server';
import { teamLeadAgent, agentsById } from '@/lib/agents';
import { buildAgentFromDefinition, buildTeamAgent, getAgentDefinition } from '@/lib/agentsEnhanced';
import { run } from '@openai/agents';
import { getSession, updateSessionMessages, addMessageToSession } from '@/lib/sessions';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

// Default to auto detail so the model can choose the right fidelity.
// Can be made user-configurable later (low/auto/high).
const DEFAULT_IMAGE_DETAIL: 'low' | 'high' | 'auto' = 'auto';

const MAX_EXTRACT_CHARS_PER_FILE = 60_000;
const MAX_TOTAL_EXTRACT_CHARS = 120_000;

const truncate = (text: string, maxChars: number) => {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Truncated: ${text.length - maxChars} more characters omitted]`;
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
    // In Next.js/Turbopack server builds, pdfjs worker resolution can fail.
    // Disable worker and use the "fake worker" path in-process.
    const parser = new PDFParse({ data: buf, disableWorker: true } as any);
    try {
      const result: any = await parser.getText();
      return typeof result?.text === 'string' ? result.text : '';
    } finally {
      await parser.destroy();
    }
  }

  if (ct === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result: any = await (mammoth as any).extractRawText({ buffer: buf });
    return typeof result?.value === 'string' ? result.value : '';
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

    // Determine which agent to use
    let agentToUse;
    if (agentMode === 'specific' && selectedAgentId) {
      // Direct agent mode (prefer built-in/static agents, fall back to Firestore-defined agents)
      if (agentsById[selectedAgentId]) {
        agentToUse = agentsById[selectedAgentId];
      } else {
        const agentDef = await getAgentDefinition(selectedAgentId);
        if (!agentDef) {
          return new Response(JSON.stringify({ error: `Agent not found: ${selectedAgentId}` }), {
            status: 404,
          });
        }
        agentToUse = buildAgentFromDefinition(agentDef);
      }
    } else if (teamId) {
      // Team mode - build team agent dynamically
      try {
        agentToUse = await buildTeamAgent(teamId);
      } catch (error) {
        console.error('Error building team agent, falling back to default:', error);
        agentToUse = teamLeadAgent;
      }
    } else {
      // Default to existing teamLeadAgent for backward compatibility
      agentToUse = teamLeadAgent;
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Run the agent with streaming enabled
          const result = await run(agentToUse, [...inputHistory, lastMessageItem], {
            stream: true,
          });

          let currentAgentName = agentToUse.name;
          let assistantMessageContent = '';

          for await (const event of result) {
            // Track active agent
            if (event.type === 'agent_updated_stream_event') {
              currentAgentName = event.agent.name;
              
              // Notify frontend about agent change
              const agentChangeData = {
                author: currentAgentName,
                content: '',
                partial: true,
                isFinal: false
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(agentChangeData)}\n\n`));
              continue;
            }

            // Handle text deltas
            if (event.type === 'raw_model_stream_event') {
              const data: any = event.data;
              if (data.type === 'output_text_delta' && data.delta) {
                assistantMessageContent += data.delta;
                const chunkData = {
                  author: currentAgentName,
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
            });
          }

          // Final event to signal completion
          const finalData = {
            author: currentAgentName,
            content: finalText,
            partial: false,
            isFinal: true
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
