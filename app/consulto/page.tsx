"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import AuthModal from "@/components/auth-modal";
import PaymentModal from "@/components/payment-modal";
import VoiceConversation from "@/components/voice-conversation-refactored";

function ConsultoPageContent() {
  const searchParams = useSearchParams();
  const selectedOperator = searchParams.get("operator");
  const selectedCategory = searchParams.get("category");

  const [showAuth, setShowAuth] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [timer, setTimer] = useState(0);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [selectedOperatorCategory, setSelectedOperatorCategory] = useState<
    string | null
  >(null);
  const [consultationStarted, setConsultationStarted] = useState(false);

  const tarotDecks = [
    "Sibille",
    "Motherpeace",
    "Sola Busca",
    "Petit Eitteilla",
    "Le Grand Eitteilla",
    "Tarocco Arlecchino",
    "The Book of Thoth",
    "Carte da gioco tradizionali",
    "Lenormand Game of Hope",
    "Golden Dawn",
    "Tarocchi di Marsiglia",
    "Rider-Waite-Smith",
  ];

  const operatorCategories = [
    {
      id: "amore",
      name: "Amore e Relazioni",
      icon: "💕",
      description: "Consulti sentimentali",
    },
    {
      id: "lavoro",
      name: "Lavoro e Carriera",
      icon: "💼",
      description: "Crescita professionale",
    },
    {
      id: "famiglia",
      name: "Famiglia",
      icon: "👨‍👩‍👧‍👦",
      description: "Relazioni familiari",
    },
    {
      id: "denaro",
      name: "Denaro e Finanze",
      icon: "💰",
      description: "Situazione economica",
    },
    {
      id: "spiritualita",
      name: "Spiritualità",
      icon: "🕯️",
      description: "Crescita interiore",
    },
    {
      id: "crescita",
      name: "Crescita Personale",
      icon: "🌱",
      description: "Sviluppo personale",
    },
  ];

  const canStartConsultation = selectedDeck && selectedOperatorCategory;

  const handleStartConsultation = () => {
    if (canStartConsultation) {
      setConsultationStarted(true);
    }
  };

  useEffect(() => {
    // Generate floating particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
    }));
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleVoiceConnect = () => {
    setIsCallActive(true);
    setTimer(0);
  };

  const handleVoiceDisconnect = () => {
    setIsCallActive(false);
    setTimer(0);
  };

  const handleVoiceError = (error: Error) => {
    console.error("Voice conversation error:", error);
    setIsCallActive(false);
    setTimer(0);
  };

  const handleUpgrade = () => {
    setShowPayment(true);
  };

  const handleLoginRequired = () => {
    setShowAuth(true);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-earth-900 via-sage-900 to-terracotta-900 text-white overflow-x-hidden">
      <Header onAuthClick={() => setShowAuth(true)} dark />

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-sage-400/30 rounded-full animate-float"
            style={{
              left: `${Math.max(1, Math.min(99, particle.x))}%`,
              top: `${Math.max(1, Math.min(99, particle.y))}%`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative pt-20 pb-16 px-4 flex flex-col items-center justify-center min-h-screen max-w-full">
        {/* Configuration Overlay - Only shown before consultation starts */}
        {!consultationStarted && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-playfair font-bold text-white mb-4">
                  Configura il Tuo Consulto
                </h2>
                <p className="text-sage-300 text-lg">
                  Scegli l'argomento e il mazzo di carte per iniziare
                </p>
              </div>

              {/* Category Selection */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4 text-center">
                  1. Su cosa vuoi essere guidato?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {operatorCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedOperatorCategory(category.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-300 transform hover:scale-105 ${
                        selectedOperatorCategory === category.id
                          ? "border-sage-400 bg-sage-600/30 text-white"
                          : "border-sage-400/30 bg-white/10 text-sage-300 hover:border-sage-400/60 hover:bg-sage-600/20"
                      }`}
                    >
                      <div className="text-2xl mb-2">{category.icon}</div>
                      <div className="font-medium text-sm">{category.name}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {category.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deck Selection */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-4 text-center">
                  2. Scegli il tuo mazzo di carte
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {tarotDecks.map((deck, index) => (
                    <button
                      key={deck}
                      onClick={() => setSelectedDeck(deck)}
                      className={`p-3 rounded-lg border transition-all duration-300 text-center transform hover:scale-105 ${
                        selectedDeck === deck
                          ? "border-sage-400 bg-sage-600/30 text-white"
                          : "border-sage-400/30 bg-white/10 text-sage-300 hover:border-sage-400/60 hover:bg-sage-600/20"
                      }`}
                    >
                      <div className="text-lg mb-1">
                        {
                          [
                            "🔮",
                            "🌙",
                            "⭐",
                            "🃏",
                            "✨",
                            "🎭",
                            "📜",
                            "♠️",
                            "🎪",
                            "🌟",
                            "🎨",
                            "🎯",
                          ][index]
                        }
                      </div>
                      <div className="text-xs">{deck}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <div className="text-center">
                <button
                  onClick={handleStartConsultation}
                  disabled={!canStartConsultation}
                  className={`px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 ${
                    canStartConsultation
                      ? "bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                      : "bg-gray-600 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  🔮 Inizia Consulto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Crystal Ball */}
        <div className="relative mb-12">
          <div className="crystal-ball w-80 h-80 rounded-full bg-gradient-to-br from-sage-400/20 via-terracotta-400/30 to-earth-400/20 backdrop-blur-sm border border-white/20 flex items-center justify-center relative overflow-hidden">
            {/* Inner glow */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-sage-300/10 via-transparent to-terracotta-300/10 animate-pulse" />

            {/* Rotating gradient overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-conic from-sage-400/20 via-terracotta-400/20 to-earth-400/20 animate-spin-slow" />

            {/* Center crystal */}
            <div className="relative z-10 text-8xl animate-pulse">⭐️</div>

            {/* Mystical particles inside */}
            <div className="absolute inset-0 rounded-full">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white/60 rounded-full animate-float"
                  style={{
                    left: `${20 + i * 10}%`,
                    top: `${30 + i * 5}%`,
                    animationDelay: `${i * 0.5}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Outer glow rings */}
          <div className="absolute inset-0 rounded-full border border-sage-400/20 animate-ping" />
          <div
            className="absolute inset-0 rounded-full border border-terracotta-400/20 animate-ping"
            style={{ animationDelay: "1s" }}
          />
        </div>

        {/* Call Status - only shown when consultation started */}
        {consultationStarted && (
          <div className="text-center mb-8">
            {isCallActive && (
              <div className="text-2xl font-mono text-sage-300 mb-4 animate-pulse">
                {formatTime(timer)}
              </div>
            )}
          </div>
        )}

        {/* Selected Configuration Display - only shown when consultation started */}
        {consultationStarted && selectedOperatorCategory && selectedDeck && (
          <div className="text-center mb-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 max-w-md mx-auto">
            <h4 className="text-lg font-semibold text-white mb-2">
              🔮 Consulto Attivo
            </h4>
            <div className="text-sm text-sage-300">
              <div>
                {
                  operatorCategories.find(
                    (c) => c.id === selectedOperatorCategory
                  )?.name
                }
              </div>
              <div>{selectedDeck}</div>
            </div>
          </div>
        )}

        {/* Voice Conversation Component - only shown when consultation started */}
        {consultationStarted && selectedDeck && selectedOperatorCategory && (
          <div className="mb-8">
            <VoiceConversation
              selectedOperator={
                operatorCategories.find(
                  (c) => c.id === selectedOperatorCategory
                )?.name || undefined
              }
              selectedCategory={selectedOperatorCategory}
              selectedDeck={selectedDeck}
              onConnect={handleVoiceConnect}
              onDisconnect={handleVoiceDisconnect}
              onError={handleVoiceError}
              onUpgrade={handleUpgrade}
              onLoginRequired={handleLoginRequired}
            />
          </div>
        )}

        {/* Mystical Elements - contained within viewport */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 text-6xl opacity-20 animate-float transform -translate-x-1/2 -translate-y-1/2">
            ✨
          </div>
          <div
            className="absolute top-1/3 right-1/4 text-4xl opacity-30 animate-float transform translate-x-1/2 -translate-y-1/2"
            style={{ animationDelay: "1s" }}
          >
            🌙
          </div>
          <div
            className="absolute bottom-1/4 left-1/3 text-5xl opacity-25 animate-float transform -translate-x-1/2 translate-y-1/2"
            style={{ animationDelay: "2s" }}
          >
            ⭐
          </div>
          <div
            className="absolute bottom-1/3 right-1/3 text-3xl opacity-20 animate-float transform translate-x-1/2 translate-y-1/2"
            style={{ animationDelay: "1.5s" }}
          >
            🔯
          </div>
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
      />
    </div>
  );
}

export default function ConsultoPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-gradient-to-br from-earth-900 via-sage-900 to-terracotta-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-sage-400/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-2xl">⭐️</span>
            </div>
            <p className="text-sage-300">Caricamento consulto...</p>
          </div>
        </div>
      }
    >
      <ConsultoPageContent />
    </Suspense>
  );
}
