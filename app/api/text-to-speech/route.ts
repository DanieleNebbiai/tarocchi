import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const apiStartTime = performance.now();

  try {
    const parseStart = performance.now();
    const {
      text,
      voice = "nova",
      category,
      immediate = false,
    } = await request.json();
    const parseEnd = performance.now();

    // Get voice based on category (all female voices)
    let selectedVoice = voice;
    if (category) {
      switch (category) {
        case "AMORE":
          selectedVoice = "nova"; // Warm, caring female voice for love readings
          break;
        case "LAVORO":
          selectedVoice = "shimmer"; // Clear, confident female voice for career
          break;
        case "SOLDI":
          selectedVoice = "fable"; // Expressive female voice for financial advice
          break;
        case "LOTTO":
          selectedVoice = "coral"; // Bright female voice for numbers and luck
          break;
        case "GENERICO":
          selectedVoice = "alloy"; // Balanced female voice for general readings
          break;
        default:
          selectedVoice = "nova";
      }
    }

    console.log("🔊 [TIMING] TTS API: Starting text-to-speech conversion", {
      textLength: text.length,
      textPreview: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
      selectedVoice,
      category,
      immediate: immediate,
      parseTime: Math.round(parseEnd - parseStart),
      timestamp: new Date().toISOString(),
    });

    const ttsStart = performance.now();
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts", // Supports instructions parameter
      voice: selectedVoice as any,
      input: text,
      // Use same instructions for both immediate and normal TTS
      instructions: "Parla con un tono mistico, caldo e professionale come una cartomante italiana.",
      response_format: "mp3",
      speed: 0.85, // Same speed for both immediate and normal responses
    });
    const ttsEnd = performance.now();

    const bufferStart = performance.now();
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const bufferEnd = performance.now();
    const totalApiTime = performance.now() - apiStartTime;

    console.log("✅ [TIMING] TTS API: Audio generation completed", {
      openaiTtsTime: Math.round(ttsEnd - ttsStart),
      bufferTime: Math.round(bufferEnd - bufferStart),
      totalApiTime: Math.round(totalApiTime),
      audioSize: buffer.length,
      timestamp: new Date().toISOString(),
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Text-to-speech error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
