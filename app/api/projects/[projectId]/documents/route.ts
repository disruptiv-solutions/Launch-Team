import { NextRequest, NextResponse } from 'next/server';
import {
  createProjectFileDocument,
  createProjectTextDocument,
  deleteProjectDocument,
  listProjectDocuments,
  type ProjectFileRef,
} from '@/lib/projectDocuments';

export const dynamic = 'force-dynamic';

const MAX_EXTRACT_CHARS = 60_000;

const truncate = (text: string, maxChars: number) => {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Truncated: ${text.length - maxChars} more characters omitted]`;
};

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function extractTextFromUrl(params: { url: string; contentType?: string; name?: string }): Promise<string> {
  const ct = params.contentType || '';
  const buf = await fetchBuffer(params.url);

  if (ct === 'text/plain') return buf.toString('utf8');
  if (ct === 'text/csv') {
    const csv = buf.toString('utf8');
    const lines = csv.split(/\r?\n/).slice(0, 200).join('\n');
    return `CSV preview (first 200 lines):\n${lines}`;
  }
  if (ct === 'application/pdf') {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buf, disableWorker: true } as any);
      try {
        const result: any = await parser.getText();
        return typeof result?.text === 'string' ? result.text : '';
      } finally {
        await parser.destroy();
      }
    } catch (e) {
      console.warn('PDF parsing failed:', e);
      return '';
    }
  }
  if (ct === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const mammoth = await import('mammoth');
      const result: any = await (mammoth as any).extractRawText({ buffer: buf });
      return typeof result?.value === 'string' ? result.value : '';
    } catch (e) {
      console.warn('DOCX parsing failed:', e);
      return '';
    }
  }

  return '';
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const documents = await listProjectDocuments(projectId);
    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Error fetching project documents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const body = await req.json();

    const type = body?.type;
    if (type !== 'text' && type !== 'file') {
      return NextResponse.json({ error: 'type must be text|file' }, { status: 400 });
    }

    if (type === 'text') {
      const title = typeof body?.title === 'string' ? body.title.trim() : '';
      const content = typeof body?.content === 'string' ? body.content : '';
      if (!title || !content.trim()) {
        return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
      }
      const docId = await createProjectTextDocument(projectId, { title, content });
      return NextResponse.json({ documentId: docId });
    }

    const file: ProjectFileRef | null = body?.file && typeof body.file === 'object' ? body.file : null;
    if (!file || typeof file.url !== 'string' || typeof file.storagePath !== 'string') {
      return NextResponse.json({ error: 'file {name,contentType,sizeBytes,storagePath,url} is required' }, { status: 400 });
    }

    const title = typeof body?.title === 'string' ? body.title : undefined;
    let extractedText = typeof body?.extractedText === 'string' ? body.extractedText : '';
    if (!extractedText.trim() && typeof file.url === 'string' && file.url) {
      const raw = await extractTextFromUrl({ url: file.url, contentType: file.contentType, name: file.name });
      extractedText = truncate((raw || '').trim(), MAX_EXTRACT_CHARS);
    }

    const docId = await createProjectFileDocument(projectId, {
      title,
      file: {
        name: String(file.name || ''),
        contentType: String(file.contentType || ''),
        sizeBytes: Number(file.sizeBytes || 0),
        storagePath: String(file.storagePath || ''),
        url: String(file.url || ''),
      },
      extractedText,
    });

    return NextResponse.json({ documentId: docId });
  } catch (error: any) {
    console.error('Error creating project document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');
    if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 });
    await deleteProjectDocument(projectId, docId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting project document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

