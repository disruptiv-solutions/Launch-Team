import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// Helper to get OpenAI client (lazy initialization)
const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }
  return new OpenAI({ apiKey });
};

// POST /api/detect-tasks - Detect actionable tasks in a message
export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const openai = getOpenAI();

    const systemPrompt = `You are a task detection agent. Analyze the given message and identify any actionable tasks or action items that the user should do.

Rules:
- Only extract clear, specific, actionable tasks
- Ignore general advice or suggestions that aren't concrete actions
- Extract 1-3 tasks maximum
- Format each task as a concise, actionable statement starting with a verb
- If no clear tasks are found, return an empty array
- Focus on tasks that have clear outcomes (e.g., "Review the pricing page" not "Think about pricing")

Return a JSON object with a "tasks" array property. Example: {"tasks": ["Review the pricing page", "Send follow-up email to John"]}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{"tasks": []}';
    const parsed = JSON.parse(content);
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : (parsed.tasks ? [parsed.tasks] : []);

    return NextResponse.json({ tasks: tasks.filter((t: string) => t && t.trim()) });
  } catch (error: any) {
    console.error('Error detecting tasks:', error);
    // If JSON parsing fails, try to extract tasks from text response
    try {
      const content = error.response?.data?.choices?.[0]?.message?.content || '';
      const tasks = content.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && line.startsWith('-') || line.match(/^\d+\./))
        .map((line: string) => line.replace(/^[-•]\s*|\d+\.\s*/, '').trim())
        .filter((line: string) => line.length > 0);
      
      return NextResponse.json({ tasks });
    } catch {
      return NextResponse.json({ tasks: [] });
    }
  }
}
