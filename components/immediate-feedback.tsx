"use client";

import { useRef } from "react";

interface ImmediateFeedbackProps {
  selectedCategory?: string;
  onFeedbackStart?: () => void;
  onFeedbackEnd?: () => void;
}

export default function ImmediateFeedback({
  selectedCategory,
  onFeedbackStart,
  onFeedbackEnd,
}: ImmediateFeedbackProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastUsedIndexRef = useRef<number>(-1);

  // Pool di frasi di feedback immediate per categoria
  const feedbackPhrases = {
    amore: [
      "Mmm, sì... sento qualcosa...",
      "Ok, ho capito la situazione...",
      "Certamente, vediamo insieme...",
      "Prendo le carte per te, un attimo...",
      "Sento le tue energie molto forti...",
      "Vedo, vedo... interessante...",
      "Perfetto, mi concentro ora...",
      "Le carte mi stanno parlando chiaramente...",
      "Interessante quello che emerge...",
      "Aspetta un momento, consulto...",
      "Mi concentro su di te e la situazione...",
      "Sì, sì... le energie sono chiare...",
      "Chiaro, ho percepito tutto...",
      "Bene, ora mescolerò per te...",
      "Le energie sono molto forti oggi...",
      "Un momento, sto vedendo qualcosa...",
      "Sto consultando il mazzo per te...",
      "Mmm-hmm... sento una connessione...",
      "Ho sentito, le vibrazioni sono intense...",
      "Le carte si stanno rivelando bene...",
    ],
    lavoro: [
      "Ok, ho capito la tua situazione lavorativa...",
      "Prendo le carte per il lavoro, un momento...",
      "Vediamo cosa dicono le carte professionali...",
      "Certamente, mi concentro sul lavoro...",
      "Mmm, interessante quello che emerge...",
      "Un momento, consulto il mazzo per te...",
      "Chiaro, sento le energie lavorative...",
      "Perfetto, ora vedo la situazione...",
      "Sto vedendo qualcosa di importante...",
      "Le carte del lavoro si stanno rivelando...",
      "Sì, comprendo la tua preoccupazione...",
      "Bene, le energie sono molto chiare...",
      "Un attimo, sto percependo qualcosa...",
      "Le energie professionali sono forti...",
      "Concentrandomi sulla tua carriera...",
      "Mmm-hmm... sento una direzione...",
      "Ho sentito, le vibrazioni lavorative...",
      "Aspetta, vedo dei cambiamenti...",
      "Le carte mi parlano del tuo futuro...",
      "Interessante situazione professionale...",
    ],
    soldi: [
      "Ok, questioni finanziarie molto importanti...",
      "Prendo le carte del denaro per te...",
      "Mmm, vediamo la situazione economica...",
      "Certamente, mi concentro sui soldi...",
      "Le energie economiche sono interessanti...",
      "Un momento, sento qualcosa sui soldi...",
      "Chiaro, ho capito la tua preoccupazione...",
      "Bene, le energie finanziarie sono forti...",
      "Sto consultando le carte del denaro...",
      "Perfetto, ora vedo la situazione economica...",
      "Sì, capisco le tue difficoltà finanziarie...",
      "Interessante quello che emerge sui soldi...",
      "Le carte finanziarie si stanno rivelando...",
      "Un attimo, sto percependo le energie...",
      "Mmm-hmm... sento movimento economico...",
      "Ho sentito, le vibrazioni del denaro...",
      "Aspetta un momento, vedo cambiamenti...",
      "Le carte mi stanno guidando sui soldi...",
      "Concentrandomi sulla tua situazione economica...",
      "Vedo qualcosa di importante sui soldi...",
    ],
    lotto: [
      "Ah, i numeri e la fortuna...",
      "Prendo le carte della fortuna per te...",
      "Mmm, vediamo i segni e i numeri...",
      "Certamente, mi concentro sui numeri...",
      "Le energie numeriche sono molto forti...",
      "Un momento, sento vibrazioni numeriche...",
      "I numeri mi parlano chiaramente oggi...",
      "Bene, le energie della fortuna sono attive...",
      "Sto vedendo combinazioni interessanti...",
      "Perfetto, ora vedo i numeri fortunati...",
      "Sì, i sogni e i segni sono chiari...",
      "Interessante quello che emerge sui numeri...",
      "Le combinazioni si stanno rivelando...",
      "Un attimo, sto percependo i numeri...",
      "Mmm-hmm... sento la fortuna che arriva...",
      "Ho sentito, le vibrazioni numeriche sono forti...",
      "Aspetta, vedo dei numeri importanti...",
      "I numeri fortunati si stanno manifestando...",
      "Concentrandomi sui segni del destino...",
      "Vedo dei simboli numerici molto chiari...",
    ],
    generico: [
      "Ok, ho capito la tua situazione...",
      "Prendo le carte per te, un momento...",
      "Mmm, vediamo cosa emerge dalle carte...",
      "Certamente, mi concentro su di te...",
      "Sento le tue energie molto chiaramente...",
      "Un momento, sto consultando per te...",
      "Chiaro, ho percepito la tua richiesta...",
      "Bene, le energie sono molto forti oggi...",
      "Sto consultando le carte per te...",
      "Perfetto, ora vedo la tua situazione...",
      "Sì, comprendo quello che ti preoccupa...",
      "Interessante quello che sta emergendo...",
      "Le carte mi parlano di te chiaramente...",
      "Un attimo, sto percependo qualcosa...",
      "Mmm-hmm... sento una connessione forte...",
      "Ho sentito, le vibrazioni sono intense...",
      "Aspetta un momento, vedo qualcosa...",
      "Mi concentro sulla tua energia...",
      "Vedo qualcosa di molto interessante...",
      "Le energie sono molto chiare oggi...",
    ],
  };

  // Seleziona una frase casuale evitando ripetizioni immediate
  const getRandomFeedback = (): string => {
    const category = selectedCategory?.toLowerCase() || "generico";
    const phrases = feedbackPhrases[category as keyof typeof feedbackPhrases] || feedbackPhrases.generico;
    
    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * phrases.length);
    } while (randomIndex === lastUsedIndexRef.current && phrases.length > 1);
    
    lastUsedIndexRef.current = randomIndex;
    return phrases[randomIndex];
  };

  // Genera feedback immediato
  const playImmediateFeedback = async (): Promise<void> => {
    const startTime = performance.now();
    
    try {
      const feedback = getRandomFeedback();
      
      console.log('🎤 [IMMEDIATE FEEDBACK] Playing instant response:', feedback);
      
      onFeedbackStart?.();

      const ttsStart = performance.now();
      // Usa TTS diretto senza API di chat
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: feedback,
          category: selectedCategory,
          // Flag per feedback immediato - risposta più veloce
          immediate: true,
        }),
      });
      const ttsEnd = performance.now();

      if (response.ok && audioRef.current) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioRef.current.src = audioUrl;
        
        // Gestisci fine riproduzione
        audioRef.current.onended = () => {
          const totalTime = performance.now() - startTime;
          console.log('🎤 [IMMEDIATE FEEDBACK] Feedback completed:', {
            phrase: feedback,
            totalTime: Math.round(totalTime) + 'ms',
            timestamp: new Date().toISOString()
          });
          onFeedbackEnd?.();
        };
        
        audioRef.current.onerror = () => {
          console.error('🎤 [IMMEDIATE FEEDBACK] Audio error');
          onFeedbackEnd?.();
        };

        await audioRef.current.play();
        
        console.log('🎤 [IMMEDIATE FEEDBACK] Started playing:', {
          phrase: feedback,
          ttsTime: Math.round(ttsEnd - ttsStart) + 'ms',
          totalSetupTime: Math.round(performance.now() - startTime) + 'ms'
        });
        
      } else {
        console.error('🎤 [IMMEDIATE FEEDBACK] TTS request failed');
        onFeedbackEnd?.();
      }
      
    } catch (error) {
      console.error('🎤 [IMMEDIATE FEEDBACK] Error:', error);
      onFeedbackEnd?.();
    }
  };

  return {
    playImmediateFeedback,
    audioRef,
  };
}