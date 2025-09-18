"use client";

import { useState, useEffect, useRef } from "react";
import { useTrialUsage } from "@/hooks/use-trial-usage";
import { useAuth } from "@/hooks/use-auth";
import PaymentModal from "@/components/payment-modal";
import VoiceRecorder from "@/components/voice-recorder";
import AudioProcessor from "@/components/audio-processor";
import ConversationControls from "@/components/conversation-controls";
import ImmediateFeedback from "@/components/immediate-feedback";

interface VoiceConversationProps {
  selectedOperator?: string;
  selectedCategory?: string;
  selectedDeck?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onUpgrade?: () => void;
  onLoginRequired?: () => void;
}

interface ConversationMessage {
  role: string;
  content: string;
}

export default function VoiceConversation({
  selectedOperator,
  selectedCategory,
  selectedDeck,
  onConnect,
  onDisconnect,
  onError,
  onUpgrade,
  onLoginRequired,
}: VoiceConversationProps) {
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFirstUserInput, setIsFirstUserInput] = useState(true);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isPlayingFeedback, setIsPlayingFeedback] = useState(false);
  const [isConsultationEnding, setIsConsultationEnding] = useState(false);

  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { isAuthenticated: authIsAuthenticated, loading: authLoading } =
    useAuth();
  const {
    hasExceededLimit,
    activateTrial,
    usage,
    isLoading: isUsageLoading,
    isAuthenticated: trialIsAuthenticated,
  } = useTrialUsage();

  // Debug authentication state changes - only log significant changes
  const prevAuth = useRef({ authIsAuthenticated: false, authLoading: true });
  useEffect(() => {
    if (
      prevAuth.current.authIsAuthenticated !== authIsAuthenticated ||
      (prevAuth.current.authLoading && !authLoading)
    ) {
      prevAuth.current = { authIsAuthenticated, authLoading };
    }
  }, [authIsAuthenticated, trialIsAuthenticated, authLoading, isUsageLoading]);

  // Initialize voice recorder hook
  const voiceRecorder = VoiceRecorder({
    onAudioReady: handleAudioReady,
    isAISpeaking,
    isFirstUserInput,
    onFirstUserInputChange: setIsFirstUserInput,
    onListeningChange: setIsListening,
    onRecordingChange: setIsRecording,
  });

  // Initialize audio processor hook
  const audioProcessor = AudioProcessor({
    selectedOperator,
    selectedCategory,
    selectedDeck,
    userId: usage?.userId, // Pass user ID for name extraction
    onTTSStart: () => setIsAISpeaking(true),
    onTTSEnd: handleTTSEnd,
    onTTSError: handleTTSError,
    onConsultationComplete: handleConsultationComplete,
  });

  // Initialize immediate feedback system
  const immediateFeedback = ImmediateFeedback({
    selectedCategory,
    onFeedbackStart: () => setIsPlayingFeedback(true),
    onFeedbackEnd: () => setIsPlayingFeedback(false),
  });

  // Handle audio ready from voice recorder
  async function handleAudioReady(audioBlob: Blob) {
    // Check if consultation is ending before processing
    if (isConsultationEnding) {
      console.log('🔚 Main: Ignoring audio input - consultation is ending');
      return;
    }

    const conversationStartTime = performance.now();

    // User finished speaking

    // Play immediate feedback to fill silence while processing
    immediateFeedback.playImmediateFeedback();

    try {
      setIsProcessing(true);
      
      const processingStartTime = performance.now();
      const result = await audioProcessor.processConversationFlow(
        audioBlob,
        conversation
      );
      const processingEndTime = performance.now();

      // Update conversation history
      const newConversation = [
        ...conversation,
        { role: "user", content: result.userMessage },
        { role: "assistant", content: result.aiResponse },
      ];
      setConversation(newConversation);

      // Conversation turn completed
    } catch (error) {
      console.error("❌ Main: Error processing audio:", error);
      onError?.(error as Error);

      // Restart listening on error
      setTimeout(() => {
        if (sessionStartTime && !isListening && !isRecording) {
          console.log("🔄 Main: Restarting listening after error");
          voiceRecorder.startRecording();
        }
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  }

  // Handle TTS end
  function handleTTSEnd() {
    setIsAISpeaking(false);

    // Don't restart if consultation is ending
    if (isConsultationEnding) {
      return;
    }

    // Restart listening after AI finishes
    setTimeout(() => {
      if (isConsultationEnding) return;

      if (!sessionStartTime) {
        setSessionStartTime(new Date());
        voiceRecorder.startRecording();
      } else if (!isListening && !isRecording) {
        voiceRecorder.startRecording();
      }
    }, 500);
  }

  // Handle TTS error
  function handleTTSError() {
    setIsAISpeaking(false);

    if (isConsultationEnding) return;

    setTimeout(() => {
      if (isConsultationEnding) return;

      if (!sessionStartTime) {
        setSessionStartTime(new Date());
      }
      if (!isListening && !isRecording) {
        voiceRecorder.startRecording();
      }
    }, 500);
  }

  // Handle consultation completion
  function handleConsultationComplete() {
    console.log("🔚 Consultation completed - ending session");
    setIsConsultationEnding(true);
    setIsAISpeaking(false);
    voiceRecorder.stopRecording();

    setTimeout(() => {
      endConversation();
    }, 2000);
  }

  // Start tracking usage every second
  const startUsageTracking = () => {
    sessionIntervalRef.current = setInterval(() => {
      // Only track usage when actually listening or processing
      if (isListening || isProcessing) {
        // Session is active - no need to check limits during conversation
      }
    }, 1000);
  };

  // Stop tracking usage
  const stopUsageTracking = () => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
  };

  // Start conversation with AI greeting  
  const startConversation = async () => {
    if (!sessionStartTime && !hasStarted) {
      console.log("🚀 Main: Starting conversation...");

      // Check if user has access BEFORE starting conversation
      const limitExceeded = hasExceededLimit();
      if (limitExceeded) {
        console.log("🚨 Main: Access denied - showing upgrade modal");
        setShowLimitModal(true);
        return; // Stop here, don't start conversation
      }

      // Activate trial if not already activated (for new users)
      if (usage && !usage.activatedAt && !usage.expiresAt) {
        console.log("🎁 Activating free trial for new user...");
        await activateTrial();
      }

      setSessionStartTime(new Date());
      startUsageTracking();
      onConnect?.();
      setHasStarted(true);

      // Start with AI greeting
      try {
        setIsProcessing(true);
        await audioProcessor.generateInitialGreeting();
      } catch (error) {
        console.error("❌ Main: Error with initial greeting:", error);
        setIsProcessing(false);

        // Initialize and start listening anyway
        setTimeout(async () => {
          if (!voiceRecorder.hasPermission) {
            await voiceRecorder.initializeMediaRecorder();
          }
          voiceRecorder.startRecording();
        }, 1000);
      }
    }
  };

  // End conversation
  const endConversation = async () => {
    try {
      console.log("🔚 Main: Ending conversation...");
      voiceRecorder.stopRecording();
      voiceRecorder.cleanup();

      setConversation([]);
      setSessionStartTime(null);
      setHasStarted(false);
      setIsFirstUserInput(true);
      setIsConsultationEnding(false); // Reset the ending flag
      onDisconnect?.();

      console.log("Main: Conversation ended");
    } catch (error) {
      console.error("Main: Failed to end conversation:", error);
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    const hasPermission = await voiceRecorder.checkMicrophonePermission();
    return hasPermission;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceRecorder) {
        voiceRecorder.cleanup();
      }
    };
  }, []);

  // Handle page unload events to save usage
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isListening || isProcessing) {
        // Show warning to user
        event.preventDefault();
        return "Hai una conversazione in corso. Sei sicuro di voler uscire?";
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && (isListening || isProcessing)) {
      }
    };

    const handlePageHide = () => {
      if (isListening || isProcessing) {
      }
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    // Cleanup
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [isListening, isProcessing]);

  // Check microphone permission on mount
  useEffect(() => {
    voiceRecorder.checkMicrophonePermission();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Conversation Controls */}
      <ConversationControls
        hasPermission={voiceRecorder.hasPermission}
        sessionStartTime={sessionStartTime}
        isListening={isListening}
        isProcessing={isProcessing}
        isAISpeaking={isAISpeaking || isPlayingFeedback}
        authLoading={authLoading}
        isUsageLoading={isUsageLoading}
        authIsAuthenticated={authIsAuthenticated}
        selectedOperator={selectedOperator}
        onStartConversation={startConversation}
        onEndConversation={endConversation}
        onRequestPermission={requestMicrophonePermission}
        onLoginRequired={onLoginRequired}
      />

      {/* Hidden audio elements */}
      <audio ref={audioProcessor.audioRef} style={{ display: "none" }} />
      <audio ref={immediateFeedback.audioRef} style={{ display: "none" }} />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
      />
    </div>
  );
}
