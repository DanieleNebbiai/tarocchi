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
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  // Process audio with OpenAI Whisper
  const processAudioWithWhisper = async (audioBlob: Blob): Promise<string> => {
    const startTime = performance.now();
    try {
      console.log('🎧 [TIMING] AudioProcessor: Starting Whisper transcription...', {
        audioSize: audioBlob.size,
        audioType: audioBlob.type,
        timestamp: new Date().toISOString()
      });
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      
      const fetchStart = performance.now();
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });
      const fetchEnd = performance.now();
      
      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }
      
      const parseStart = performance.now();
      const { text } = await response.json();
      const parseEnd = performance.now();
      const totalTime = performance.now() - startTime;
      
      console.log('🎧 [TIMING] AudioProcessor: Whisper transcription completed', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        textLength: text.length,
        networkTime: Math.round(fetchEnd - fetchStart),
        parseTime: Math.round(parseEnd - parseStart),
        totalTime: Math.round(totalTime),
        timestamp: new Date().toISOString()
      });
      
      return text.trim();
    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error('🎧 [TIMING] AudioProcessor: Whisper transcription error', {
        error: error.message,
        timeToError: Math.round(errorTime),
        timestamp: new Date().toISOString()
      });
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
      console.log('🧠 [TIMING] AudioProcessor: Getting AI response...', {
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        messageLength: message.length,
        conversationLength: conversation.length,
        selectedDeck,
        timestamp: new Date().toISOString()
      });
      
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
      const { text: aiResponse, isConsultationComplete = false } = await chatResponse.json();
      const parseEnd = performance.now();
      const totalTime = performance.now() - startTime;

      console.log('🧠 [TIMING] AudioProcessor: AI response generated', {
        response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
        responseLength: aiResponse.length,
        isConsultationComplete,
        networkTime: Math.round(requestEnd - requestStart),
        parseTime: Math.round(parseEnd - parseStart),
        totalTime: Math.round(totalTime),
        timestamp: new Date().toISOString()
      });

      return { text: aiResponse, isComplete: isConsultationComplete };
    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error("🧠 [TIMING] AudioProcessor: Error generating AI response", {
        error: error.message,
        timeToError: Math.round(errorTime),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  };

  // Convert text to speech
  const convertToSpeech = async (text: string): Promise<void> => {
    const startTime = performance.now();
    try {
      console.log('🔊 [TIMING] AudioProcessor: Converting to speech...', {
        textLength: text.length,
        textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        timestamp: new Date().toISOString()
      });
      
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

        console.log('🔊 [TIMING] AudioProcessor: TTS conversion completed, starting playback', {
          networkTime: Math.round(requestEnd - requestStart),
          blobProcessingTime: Math.round(blobEnd - blobStart),
          totalConversionTime: Math.round(totalConversionTime),
          audioSize: audioBlob.size,
          timestamp: new Date().toISOString()
        });
        
        onTTSStart();
        
        audioRef.current.src = audioUrl;
        
        // Listen for when audio finishes
        audioRef.current.onended = () => {
          const playbackTime = performance.now() - startTime;
          console.log('🔇 [TIMING] AudioProcessor: AI finished speaking', {
            totalProcessTime: Math.round(playbackTime),
            timestamp: new Date().toISOString()
          });
          onTTSEnd();
        };
        
        audioRef.current.onerror = () => {
          const errorTime = performance.now() - startTime;
          console.log('❌ [TIMING] AudioProcessor: AI audio playback error', {
            timeToError: Math.round(errorTime),
            timestamp: new Date().toISOString()
          });
          onTTSError();
        };
        
        const playStart = performance.now();
        await audioRef.current.play();
        const playStarted = performance.now();
        
        console.log('🎧 [TIMING] AudioProcessor: Audio playback started', {
          playInitTime: Math.round(playStarted - playStart),
          totalTimeToPlay: Math.round(playStarted - startTime),
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('⚠️ AudioProcessor: No TTS audio available');
        onTTSError();
      }
    } catch (error) {
      console.error('🔊 AudioProcessor: Error converting to speech:', error);
      onTTSError();
      throw error;
    }
  };

  // Generate AI initial greeting
  const generateInitialGreeting = async (): Promise<void> => {
    try {
      console.log('👋 AudioProcessor: Starting AI initial greeting...');
      
      // Generate personalized greeting based on operator and category
      let greetingText = "Benvenuto, sono qui per aiutarti. Cosa ti preoccupa oggi?";
      
      if (selectedOperator && selectedCategory) {
        greetingText = `Ciao, sono ${selectedOperator}. Vedo che hai scelto una consulenza su ${selectedCategory.toLowerCase()}. Dimmi, cosa ti porta da me oggi?`;
      } else if (selectedOperator) {
        greetingText = `Salve, sono ${selectedOperator}. Sono qui per guidarti. Parlami di ciò che ti sta a cuore.`;
      } else if (selectedCategory) {
        greetingText = `Benvenuto. Vedo che cerchi una consulenza su ${selectedCategory.toLowerCase()}. Raccontami la tua situazione.`;
      }
      
      console.log('👋 AudioProcessor: AI greeting message:', greetingText);
      
      // Convert greeting to speech
      await convertToSpeech(greetingText);
    } catch (error) {
      console.error('👋 AudioProcessor: Error with initial greeting:', error);
      onTTSError();
    }
  };

  // Process complete conversation flow: audio -> text -> AI -> speech
  const processConversationFlow = async (
    audioBlob: Blob,
    conversation: ConversationMessage[]
  ): Promise<{ userMessage: string; aiResponse: string }> => {
    const overallStartTime = performance.now();
    
    console.log('🔄 [TIMING] CONVERSATION FLOW: Starting complete flow', {
      audioSize: audioBlob.size,
      conversationLength: conversation.length,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Step 1: Transcribe audio
      const step1Start = performance.now();
      const userMessage = await processAudioWithWhisper(audioBlob);
      const step1End = performance.now();
      
      if (!userMessage) {
        throw new Error('No text detected from audio');
      }
      
      // Step 2: Generate AI response with updated conversation including current user message
      const step2Start = performance.now();
      const currentConversation = [
        ...conversation,
        { role: "user", content: userMessage }
      ];
      const aiResult = await generateAIResponse(userMessage, currentConversation);
      const step2End = performance.now();

      // Step 3: Convert AI response to speech
      const step3Start = performance.now();
      await convertToSpeech(aiResult.text);
      const step3End = performance.now();

      // Check if consultation is complete and trigger callback
      if (aiResult.isComplete && onConsultationComplete) {
        console.log('🔚 [CONSULTATION] Triggering consultation complete callback');
        // Delay the callback slightly to let the TTS finish
        setTimeout(() => {
          onConsultationComplete();
        }, 1000);
      }
      
      const totalTime = performance.now() - overallStartTime;
      
      // Log complete flow summary
      console.log('✅ [TIMING] CONVERSATION FLOW: Complete flow finished', {
        userMessage: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''),
        aiResponse: aiResult.text.substring(0, 50) + (aiResult.text.length > 50 ? '...' : ''),
        isConsultationComplete: aiResult.isComplete,
        step1_STT_Time: Math.round(step1End - step1Start) + 'ms',
        step2_AI_Time: Math.round(step2End - step2Start) + 'ms',
        step3_TTS_Time: Math.round(step3End - step3Start) + 'ms',
        totalFlowTime: Math.round(totalTime) + 'ms',
        conversationAfterUser: currentConversation.length,
        timestamp: new Date().toISOString(),
        performance: {
          sttPercentage: Math.round(((step1End - step1Start) / totalTime) * 100) + '%',
          aiPercentage: Math.round(((step2End - step2Start) / totalTime) * 100) + '%',
          ttsPercentage: Math.round(((step3End - step3Start) / totalTime) * 100) + '%'
        }
      });

      return { userMessage, aiResponse: aiResult.text };
    } catch (error) {
      const errorTime = performance.now() - overallStartTime;
      console.error('🔄 [TIMING] CONVERSATION FLOW: Error in conversation flow', {
        error: error.message,
        timeToError: Math.round(errorTime) + 'ms',
        timestamp: new Date().toISOString()
      });
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