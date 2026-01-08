import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateMessageAudioUrl } from '@/lib/sessions';
import { updateProjectChatMessageAudioUrl } from '@/lib/projectChats';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text, sessionId, messageIndex, projectId, projectChatId, messageId, messageKey } = await req.json();

    const hasSessionTarget =
      typeof sessionId === 'string' && sessionId.trim() && (typeof messageIndex === 'number' || typeof messageIndex === 'string');
    const hasProjectTarget =
      typeof projectId === 'string' && projectId.trim() && typeof projectChatId === 'string' && projectChatId.trim();

    const safeText = typeof text === 'string' ? text.trim() : '';
    if (!safeText) {
      return NextResponse.json({ error: 'Missing required field: text' }, { status: 400 });
    }

    if (!hasSessionTarget && !hasProjectTarget) {
      return NextResponse.json(
        { error: 'Missing target. Provide sessionId+messageIndex or projectId+projectChatId.' },
        { status: 400 }
      );
    }

    // 1. Generate speech using OpenAI
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "sage",
      input: safeText,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // 2. Upload to Firebase Storage
    const key =
      typeof messageKey === 'string' && messageKey.trim()
        ? messageKey.trim()
        : typeof messageIndex === 'number'
          ? String(messageIndex)
          : typeof messageIndex === 'string' && messageIndex.trim()
            ? messageIndex.trim()
            : typeof messageId === 'string' && messageId.trim()
              ? messageId.trim()
              : `tts_${Date.now()}`;

    const storagePath = hasSessionTarget
      ? `sessions/${String(sessionId).trim()}/messages/${String(messageIndex)}/audio.mp3`
      : `projects/${String(projectId).trim()}/chats/${String(projectChatId).trim()}/messages/${key}/audio.mp3`;
    const audioRef = ref(storage, storagePath);
    
    await uploadBytes(audioRef, buffer, {
      contentType: 'audio/mpeg',
    });

    // 3. Get the download URL
    const audioUrl = await getDownloadURL(audioRef);

    // 4. Update the message in Firestore (best-effort)
    if (hasSessionTarget) {
      await updateMessageAudioUrl(String(sessionId).trim(), Number(messageIndex), audioUrl);
    } else if (hasProjectTarget && typeof messageId === 'string' && messageId.trim()) {
      await updateProjectChatMessageAudioUrl(
        String(projectId).trim(),
        String(projectChatId).trim(),
        messageId.trim(),
        audioUrl
      );
    }

    return NextResponse.json({ audioUrl });
  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
