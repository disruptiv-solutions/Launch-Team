import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateMessageAudioUrl } from '@/lib/sessions';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text, sessionId, messageIndex } = await req.json();

    if (!text || !sessionId || messageIndex === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: text, sessionId, messageIndex' },
        { status: 400 }
      );
    }

    // 1. Generate speech using OpenAI
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "sage",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());

    // 2. Upload to Firebase Storage
    const storagePath = `sessions/${sessionId}/messages/${messageIndex}/audio.mp3`;
    const audioRef = ref(storage, storagePath);
    
    await uploadBytes(audioRef, buffer, {
      contentType: 'audio/mpeg',
    });

    // 3. Get the download URL
    const audioUrl = await getDownloadURL(audioRef);

    // 4. Update the message in Firestore
    await updateMessageAudioUrl(sessionId, messageIndex, audioUrl);

    return NextResponse.json({ audioUrl });
  } catch (error: any) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
