import { NextRequest, NextResponse } from 'next/server';
import {
  getAllDocuments,
  getDocument,
  createDocument,
  deleteDocument,
} from '@/lib/documents';

export const dynamic = 'force-dynamic';

// GET /api/documents - List all documents or get a single document
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');
    
    if (docId) {
      // Get a single document
      const document = await getDocument(docId);
      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json({ document });
    } else {
      // Get all documents
      const documents = await getAllDocuments();
      return NextResponse.json({ documents });
    }
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/documents - Create a new document
export async function POST(req: NextRequest) {
  try {
    const { title, content, sessionId, agent } = await req.json();
    
    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }
    
    const docId = await createDocument(title, content, sessionId, agent);
    const document = await getDocument(docId);
    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/documents - Delete a document
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'docId required' }, { status: 400 });
    }

    await deleteDocument(docId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
