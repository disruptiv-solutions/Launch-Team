import { NextRequest, NextResponse } from 'next/server';
import {
  createTask,
  getSessionTasks,
  updateTask,
  deleteTask,
} from '@/lib/tasks';

export const dynamic = 'force-dynamic';

// GET /api/tasks - Get tasks for a session
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    
    const tasks = await getSessionTasks(sessionId, includeArchived);
    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(req: NextRequest) {
  try {
    const { sessionId, task, messageIndex, description } = await req.json();
    
    if (!sessionId || !task) {
      return NextResponse.json({ error: 'sessionId and task are required' }, { status: 400 });
    }
    
    const taskId = await createTask(sessionId, task, messageIndex, description);
    return NextResponse.json({ taskId, success: true });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/tasks - Update a task
export async function PUT(req: NextRequest) {
  try {
    const { taskId, ...updates } = await req.json();
    
    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }
    
    await updateTask(taskId, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }

    await deleteTask(taskId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
