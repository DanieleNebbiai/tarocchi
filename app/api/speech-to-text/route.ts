import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const apiStartTime = performance.now();
  
  try {
    const formDataStart = performance.now();
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const formDataEnd = performance.now();

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('🎧 [TIMING] STT API: Processing audio file', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type,
      formDataTime: Math.round(formDataEnd - formDataStart),
      timestamp: new Date().toISOString()
    });

    const whisperStart = performance.now();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'it',
      response_format: 'text',
    });
    const whisperEnd = performance.now();
    const totalApiTime = performance.now() - apiStartTime;

    console.log('✅ [TIMING] STT API: Transcription completed', {
      transcription: transcription.substring(0, 100) + (transcription.length > 100 ? '...' : ''),
      textLength: transcription.length,
      whisperTime: Math.round(whisperEnd - whisperStart),
      totalApiTime: Math.round(totalApiTime),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      text: transcription,
    });

  } catch (error) {
    const errorTime = performance.now() - apiStartTime;
    console.error('🎧 [TIMING] STT API: Speech-to-text error', {
      error: error.message,
      timeToError: Math.round(errorTime),
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}