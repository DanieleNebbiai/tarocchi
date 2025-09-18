"use client";

import { useRef } from "react";

interface AudioProcessorProps {
  selectedOperator?: string;
  selectedCategory?: string;
  selectedDeck?: string;
  userId?: string;
  onTTSStart: () => void;
  onTTSEnd: () => void;
  onTTSError: () => void;
  onConsultationComplete?: () => void;
}

// Generate a persistent session ID for the component lifecycle
const generateSessionId = () =>
  `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface ConversationMessage {
  role: string;
  content: string;
}

export default function AudioProcessor({
  selectedOperator,
  selectedCategory,
  selectedDeck,
  userId,
  onTTSStart,
  onTTSEnd,
  onTTSError,
  onConsultationComplete,
}: AudioProcessorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  // Process audio with OpenAI GPT-4o Transcribe
  const processAudioWithWhisper = async (audioBlob: Blob): Promise<string> => {
    const startTime = performance.now();
    try {
      console.log("🎧 AudioProcessor: Transcribing audio...");

      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const fetchStart = performance.now();
      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });
      const fetchEnd = performance.now();

      if (!response.ok) {
        throw new Error("Failed to transcribe audio");
      }

      const parseStart = performance.now();
      const { text } = await response.json();
      const parseEnd = performance.now();
      const totalTime = performance.now() - startTime;

      console.log(
        "🎧 AudioProcessor: Transcription completed:",
        text.substring(0, 50)
      );

      return text.trim();
    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error("🎧 AudioProcessor: Transcription error:", error.message);
      throw error;
    }
  };

  // Generate AI response
  const generateAIResponse = async (
    message: string,
    conversation: ConversationMessage[]
  ): Promise<{ text: string; isComplete: boolean }> => {
    const startTime = performance.now();
    try {
      console.log("🧠 AudioProcessor: Getting AI response...");

      const requestStart = performance.now();
      // Use persistent sessionId for caching when no userId
      const sessionId = userId || sessionIdRef.current;

      // Get AI response
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          operator: selectedOperator,
          category: selectedCategory,
          selectedDeck,
          userId, // Pass user ID for name extraction and database updates
          sessionId, // Pass session ID for caching without userId
          conversation, // Pass conversation history for context
        }),
      });
      const requestEnd = performance.now();

      if (!chatResponse.ok) {
        throw new Error("Failed to get AI response");
      }

      const parseStart = performance.now();
      const { text: aiResponse, isConsultationComplete = false } =
        await chatResponse.json();
      const parseEnd = performance.now();
      const totalTime = performance.now() - startTime;

      if (isConsultationComplete) {
        console.log(
          "🧠 AudioProcessor: AI response generated (consultation complete)"
        );
      }

      return { text: aiResponse, isComplete: isConsultationComplete };
    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error("🧠 AudioProcessor: AI response error:", error.message);
      throw error;
    }
  };

  // Convert text to speech
  const convertToSpeech = async (text: string): Promise<void> => {
    const startTime = performance.now();
    try {
      console.log("🔊 AudioProcessor: Converting to speech...");

      const requestStart = performance.now();
      // Convert to speech
      const ttsResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          category: selectedCategory,
        }),
      });
      const requestEnd = performance.now();

      if (ttsResponse.ok && audioRef.current) {
        const blobStart = performance.now();
        const audioBlob = await ttsResponse.blob();
        const blobEnd = performance.now();

        const audioUrl = URL.createObjectURL(audioBlob);
        const totalConversionTime = performance.now() - startTime;

        // No log needed for successful TTS

        onTTSStart();

        audioRef.current.src = audioUrl;

        // Listen for when audio finishes
        audioRef.current.onended = () => {
          onTTSEnd();
        };

        audioRef.current.onerror = () => {
          console.error("❌ AudioProcessor: Audio playback error");
          onTTSError();
        };

        await audioRef.current.play();
      } else {
        console.log("⚠️ AudioProcessor: No TTS audio available");
        onTTSError();
      }
    } catch (error) {
      console.error("🔊 AudioProcessor: Error converting to speech:", error);
      onTTSError();
      throw error;
    }
  };

  // Generate AI initial greeting
  const generateInitialGreeting = async (): Promise<void> => {
    try {
      console.log("👋 AudioProcessor: Starting AI initial greeting...");

      // Generate personalized greeting based on operator and category
      let greetingText =
        "Benvenuto, sono qui per aiutarti. Cosa ti preoccupa oggi?";

      if (selectedOperator && selectedCategory) {
        greetingText = `Ciao, sono ${selectedOperator}. Vedo che hai scelto una consulenza su ${selectedCategory.toLowerCase()}. Dimmi, cosa ti porta da me oggi?`;
      } else if (selectedOperator) {
        greetingText = `Salve, sono ${selectedOperator}. Sono qui per guidarti. Parlami di ciò che ti sta a cuore.`;
      } else if (selectedCategory) {
        greetingText = `Benvenuto. Vedo che cerchi una consulenza su ${selectedCategory.toLowerCase()}. Raccontami la tua situazione.`;
      }

      // Convert greeting to speech
      await convertToSpeech(greetingText);
    } catch (error) {
      console.error("👋 AudioProcessor: Error with initial greeting:", error);
      onTTSError();
    }
  };

  // Process complete conversation flow: audio -> text -> AI -> speech
  const processConversationFlow = async (
    audioBlob: Blob,
    conversation: ConversationMessage[]
  ): Promise<{ userMessage: string; aiResponse: string }> => {
    const overallStartTime = performance.now();

    // Starting conversation flow...

    try {
      // Step 1: Transcribe audio
      const step1Start = performance.now();
      const userMessage = await processAudioWithWhisper(audioBlob);
      const step1End = performance.now();

      if (!userMessage) {
        throw new Error("No text detected from audio");
      }

      // Step 2: Generate AI response with updated conversation including current user message
      const step2Start = performance.now();
      const currentConversation = [
        ...conversation,
        { role: "user", content: userMessage },
      ];
      const aiResult = await generateAIResponse(
        userMessage,
        currentConversation
      );
      const step2End = performance.now();

      // Check if consultation is complete and trigger callback BEFORE TTS
      if (aiResult.isComplete && onConsultationComplete) {
        console.log("🔚 Consultation complete - ending session");
        onConsultationComplete();
      }

      // Step 3: Convert AI response to speech
      const step3Start = performance.now();
      await convertToSpeech(aiResult.text);
      const step3End = performance.now();

      const totalTime = performance.now() - overallStartTime;

      // Flow completed

      return { userMessage, aiResponse: aiResult.text };
    } catch (error) {
      console.error("🔄 Conversation flow error:", error.message);
      throw error;
    }
  };

  return {
    processAudioWithWhisper,
    generateAIResponse,
    convertToSpeech,
    generateInitialGreeting,
    processConversationFlow,
    audioRef,
  };
}
