import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = 'force-dynamic';

// POST /api/summarize - Generate or update conversation summary
export async function POST(req: NextRequest) {
  try {
    const { messages, currentSummary } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Format messages for OpenAI
    const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages
      .filter((m: any) => m?.role === 'user' || m?.role === 'assistant')
      .map((m: any): OpenAI.Chat.Completions.ChatCompletionMessageParam => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
      }));

    // Create a prompt for summarization
    const systemPrompt = currentSummary
      ? `You are a conversation summarizer. Update the existing summary based on new messages. Keep it concise (2-3 sentences max) and focused on the main topics, decisions, and action items discussed.

Current summary: ${currentSummary}

Update the summary to include the latest messages while keeping it brief and actionable.`
      : `You are a conversation summarizer. Generate a concise summary (2-3 sentences max) of what this conversation is about. Focus on:
- Main topics discussed
- Key decisions or questions
- Action items or next steps

Keep it brief and actionable.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Only use last 10 messages for context
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const summary = response.choices[0]?.message?.content || 'Unable to generate summary.';

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate summary' }, { status: 500 });
  }
}
