import { NextRequest, NextResponse } from 'next/server';
import {
  createSummary,
  getSessionSummaries,
  getSummary,
  deleteSessionSummaries,
} from '@/lib/summaries';

export const dynamic = 'force-dynamic';

// GET /api/summaries - Get summaries for a session
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const summaryId = searchParams.get('summaryId');
    
    if (summaryId) {
      // Get a single summary
      const summary = await getSummary(summaryId);
      if (!summary) {
        return NextResponse.json({ error: 'Summary not found' }, { status: 404 });
      }
      return NextResponse.json({ summary });
    } else if (sessionId) {
      // Get all summaries for a session
      const summaries = await getSessionSummaries(sessionId);
      return NextResponse.json({ summaries });
    } else {
      return NextResponse.json({ error: 'sessionId or summaryId required' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/summaries - Create a new summary
export async function POST(req: NextRequest) {
  try {
    const { sessionId, summary, messageIndex } = await req.json();
    
    if (!sessionId || !summary || typeof messageIndex !== 'number') {
      return NextResponse.json({ error: 'sessionId, summary, and messageIndex are required' }, { status: 400 });
    }
    
    const summaryId = await createSummary(sessionId, summary, messageIndex);
    const newSummary = await getSummary(summaryId);
    return NextResponse.json({ summary: newSummary });
  } catch (error: any) {
    console.error('Error creating summary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/summaries - Delete summaries for a session
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    await deleteSessionSummaries(sessionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting summaries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
