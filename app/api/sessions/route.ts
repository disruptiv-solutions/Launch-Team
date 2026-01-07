import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSessions,
  getSession,
  createSession,
  updateSessionTitle,
  deleteSession,
} from '@/lib/sessions';

export const dynamic = 'force-dynamic';

// GET /api/sessions - List all sessions or get a single session
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (sessionId) {
      // Get a single session
      const session = await getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ session });
    } else {
      // Get all sessions
      const sessions = await getAllSessions();
      return NextResponse.json({ sessions });
    }
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/sessions - Create a new session
export async function POST(req: NextRequest) {
  try {
    const { title, teamId } = await req.json();
    const sessionId = await createSession(title, teamId);
    const session = await getSession(sessionId);
    return NextResponse.json({ session });
  } catch (error: any) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/sessions/[sessionId] - Update session title
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const { title } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    await updateSessionTitle(sessionId, title);
    const session = await getSession(sessionId);
    return NextResponse.json({ session });
  } catch (error: any) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/sessions/[sessionId] - Delete a session
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    await deleteSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
