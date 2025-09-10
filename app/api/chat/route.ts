import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/client";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory conversation cache for active sessions
interface ConversationMessage {
  role: string;
  content: string;
  timestamp: number;
}

interface CachedConversation {
  messages: ConversationMessage[];
  lastActivity: number;
  userName?: string;
}

// Global cache - in production use Redis or similar
const conversationCache = new Map<string, CachedConversation>();

// Clean old conversations (older than 30 minutes)
const CONVERSATION_TTL = 30 * 60 * 1000; // 30 minutes
function cleanExpiredConversations() {
  const now = Date.now();
  for (const [userId, conversation] of conversationCache.entries()) {
    if (now - conversation.lastActivity > CONVERSATION_TTL) {
      conversationCache.delete(userId);
      console.log('🗑️ [CACHE] Cleaned expired conversation for user:', userId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanExpiredConversations, 5 * 60 * 1000);

// Reset conversation endpoint
export async function DELETE(request: Request) {
  try {
    const { userId } = await request.json();
    if (userId && conversationCache.has(userId)) {
      conversationCache.delete(userId);
      console.log('🗑️ [CACHE] Conversation reset for user:', userId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const apiStartTime = performance.now();

  try {
    const parseStart = performance.now();
    const { message, selectedDeck, userId, conversation } =
      await request.json();
    const parseEnd = performance.now();

    console.log("🧠 [TIMING] AI API: Processing request", {
      message: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      messageLength: message.length,
      conversationLength: (conversation || []).length,
      frontendConversation: conversation || [],
      selectedDeck,
      userId: userId || "no-user-id",
      parseTime: Math.round(parseEnd - parseStart),
      timestamp: new Date().toISOString(),
    });

    // Get or create conversation from cache, with frontend fallback
    let fullConversation: ConversationMessage[] = [];
    const now = Date.now();
    
    if (userId) {
      const cached = conversationCache.get(userId);
      if (cached && cached.messages.length > 0) {
        fullConversation = cached.messages;
        console.log("💾 [CACHE] Retrieved conversation from cache:", fullConversation.length, "messages");
      } else {
        // Fallback to frontend conversation if cache is empty (excluding current message)
        if (conversation && conversation.length > 0) {
          fullConversation = conversation
            .filter((msg: any) => msg.content !== message) // Exclude current message to avoid duplication
            .map((msg: any) => ({
              role: msg.role,
              content: msg.content,
              timestamp: now - (conversation.length - conversation.indexOf(msg)) * 1000 // Estimate timestamps
            }));
          console.log("🔄 [FALLBACK] Using frontend conversation as cache is empty:", fullConversation.length, "messages");
        } else {
          console.log("💾 [CACHE] No cached conversation and no frontend conversation, starting new");
        }
      }
    } else {
      // No userId, use frontend conversation if available (excluding current message)
      if (conversation && conversation.length > 0) {
        fullConversation = conversation
          .filter((msg: any) => msg.content !== message) // Exclude current message to avoid duplication
          .map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: now - (conversation.length - conversation.indexOf(msg)) * 1000
          }));
        console.log("👤 [NO-USER] Using frontend conversation without userId:", fullConversation.length, "messages");
      }
    }

    // Add current user message to conversation
    const userMessage: ConversationMessage = {
      role: "user",
      content: message,
      timestamp: now
    };
    fullConversation.push(userMessage);

    // DEBUG: Log complete conversation for analysis
    console.log("🔍 [DEBUG] Full conversation (with cache):", {
      conversationArray: fullConversation,
      conversationLength: fullConversation.length,
      userId: userId || "no-user-id",
    });

    // EXTREME DEBUG: Log every single message to see what AI receives
    console.log("🚨 [EXTREME DEBUG] EXACT messages going to AI:");
    fullConversation.forEach((msg, index) => {
      console.log(`  ${index}: [${msg.role}] "${msg.content}"`);
    });

    const deckName = selectedDeck || "Tarocchi di Marsiglia";

    // Extract user name using AI and save to database if found
    let userName = "cara";

    // First try to get cached name
    if (userId) {
      const cached = conversationCache.get(userId);
      if (cached?.userName) {
        userName = cached.userName;
        console.log("💾 [CACHE] Retrieved cached name:", userName);
      } else {
        // Try to get name from database if user is authenticated
        try {
          const supabase = createClient();
          const { data: profile } = await supabase
            .from("profiles")
            .select("extracted_name")
            .eq("id", userId)
            .single();

          if (profile?.extracted_name) {
            userName = profile.extracted_name;
            console.log("💾 [DATABASE] Retrieved saved name:", userName);
          } else {
            console.log("💾 [DATABASE] No saved name found in profile");
          }
        } catch (dbError) {
          console.log(
            "💾 [DATABASE] No saved name found, will try to extract from conversation"
          );
        }
      }
    }

    // If no saved name, try to extract name from full conversation using AI
    if (userName === "cara" && fullConversation.length > 0) {
      const userMessages = fullConversation
        .filter((m) => m.role === "user")
        .map((m) => m.content);
      console.log(
        "🔍 [DEBUG] User messages for name extraction:",
        userMessages
      );

      if (userMessages.length > 0) {
        try {
          const nameExtractionResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Analizza i messaggi dell'utente ed estrai SOLO il nome proprio della persona (es. Marco, Giulia, Alessandro). Se l'utente non ha mai detto il suo nome, rispondi con 'NONE'. Rispondi SOLO con il nome o 'NONE', niente altro.",
              },
              {
                role: "user",
                content: "Messaggi utente: " + userMessages.join(" | "),
              },
            ],
            temperature: 0,
            max_tokens: 10,
          });

          const extractedName =
            nameExtractionResponse.choices[0]?.message?.content?.trim();
          if (
            extractedName &&
            extractedName !== "NONE" &&
            extractedName.length > 1
          ) {
            userName = extractedName;
            console.log("🤖 [AI NAME EXTRACTION] Found name:", userName);

            // Save name to database profile
            if (userId) {
              try {
                const supabase = createClient();
                const { error } = await supabase.from("profiles").upsert({
                  id: userId,
                  extracted_name: extractedName,
                  updated_at: new Date().toISOString(),
                });

                if (error) {
                  console.error("💾 [DATABASE] Error saving name:", error);
                } else {
                  console.log(
                    "💾 [DATABASE] Name saved successfully:",
                    extractedName
                  );
                }
              } catch (dbError) {
                console.error("💾 [DATABASE] Database error:", dbError);
              }
            }
          } else {
            console.log(
              "🤖 [AI NAME EXTRACTION] No name found in conversation"
            );
          }
        } catch (error) {
          console.error("🤖 [AI NAME EXTRACTION] Error:", error);
        }
      }
    }

    console.log("👤 [FINAL] Using userName for prompt:", userName);

    let systemPrompt = `
## Chi sei
Sei il consulente di Tarocchi.cloud, esperto cartomante con anni di esperienza.
La tua voce è calda, professionale, mistica e rassicurante. 
Usa sempre il nome del cliente (${userName}) quando lo conosci per creare connessione profonda.
Il mazzo scelto è: ${deckName}

## Obiettivo della sessione
Conduci un consulto di tarocchi completo ma contenuto (10-15 minuti totali). 
Analizza la conversazione esistente per capire a che punto siete, senza ripetere informazioni già fornite.

## Flusso della consultazione (linee guida):

**1. ACCOGLIENZA** (solo se primo messaggio)
- Benvenuta calorosa: "Benvenuto su Tarocchi.cloud, sono il tuo consulente. Grazie per avermi scelto, sarò la tua guida..."
- Trigger per fidelizzazione: "Molti tornano regolarmente perché ogni volta il mazzo rivela nuovi tasselli..."

**2. INQUADRAMENTO** (SOLO se l'utente non ha MAI menzionato il suo nome in NESSUN messaggio precedente)
- PRIMA controlla attentamente TUTTI i messaggi precedenti dell'utente per vedere se ha già detto il suo nome
- Se ha già detto "sono Marco", "mi chiamo Giulia", "sono nato..." o simili → NON chiedere di nuovo il nome
- Se NON ha mai menzionato il nome → allora chiedi: "Per entrare in sintonia con ${deckName}, ho bisogno del tuo nome e data di nascita"
- Trigger temi: "Oggi ci concentreremo su un tema, ma potrai tornare su altri aspetti: amore, lavoro, famiglia..."

**3. DEFINIZIONE DOMANDA** (se non conosci la preoccupazione)
- Domanda chiave: "Qual è la domanda che ti sta più a cuore? C'è un ambito specifico: amore, lavoro, famiglia, denaro, spiritualità?"
- Clausola salute: "Non affrontiamo domande sulla salute, per quelle rivolgiti a un medico"
- Trigger: "Spesso emergono più piani insieme, quello che non approfondiamo oggi possiamo vederlo in futuro..."

**4. SCELTA MAZZO** (conferma veloce)
- Conferma: "Hai scelto ${deckName}. Useremo questo oggi, ma la prossima volta potremo esplorare con altri strumenti..."

**5. RITUALE D'AVVIO** (momento mistico)
- Concentrazione: "Ora mescolerò pensando alla tua domanda. Concentrati e dimmi STOP quando senti che è il momento"
- Attendi la parola STOP prima di procedere
- Trigger: "Questo rito puoi ripeterlo ogni volta, diventa un momento solo tuo..."

**6. LETTURA BASE** (cuore del consulto)
- Estrai 3-4 carte specifiche dal ${deckName} e presenta:
  * "Le carte mostrano questa situazione..."
  * "Qui vedo l'OSTACOLO che si presenta..."
  * "L'esito probabile è..."
  * "Il consiglio delle carte è..."
- Chiedi conferma: "Ti ritrovi in quello che descrivono le carte? Ti sembra familiare?"
- Trigger approfondimento: "Emerge un dettaglio interessante, vuoi esplorarlo ora o la prossima volta?"

**7. APPROFONDIMENTO** (se richiesto)
- Offerta: "Vuoi scendere più a fondo? Possiamo tirare altre carte per maggiore chiarezza..."
- Trigger evoluzione: "Con qualche carta in più possiamo vedere una possibile evoluzione..."

**8. RECAP** (sintesi finale)
- Riassunto strutturato: "Quindi ${userName}, le carte parlano chiaro, ecco il quadro per te:"
  * **Situazione**: [sintesi situazione attuale]
  * **Consiglio**: [consiglio pratico specifico]
  * **Esito probabile**: [previsione realistica]
- Trigger check: "Le carte indicano sviluppi rapidi. Ti consiglio un controllo tra qualche giorno per vedere i cambiamenti"

**9. CHIUSURA** (quando il consulto è completo)
- Saluto finale: "È stato un piacere leggerti ${userName} e accompagnarti. Potrai tornare quando vorrai..."
- Trigger ritorno: "Ti consiglio di richiamarmi tra qualche giorno per vedere insieme l'evoluzione..."

## Regole comportamentali:
- Mantieni un ritmo contemplativo ma sii CONCISO: max 2-3 frasi per risposta
- Dividi letture lunghe in più scambi invece di una risposta unica molto lunga
- NON ripetere informazioni già fornite dall'utente  
- USA sempre ${userName} quando parli direttamente alla persona
- Cita carte specifiche e realistiche del ${deckName}
- Blocca domande sulla salute (rimanda sempre al medico)
- Includi sempre i "trigger" per incoraggiare ritorni futuri
- Mantieni dialogo fluido e veloce per esperienza migliore

## 🚨 ATTENZIONE ASSOLUTA - LEGGI TUTTO 🚨

PRIMA di rispondere, devi fare questa analisi OBBLIGATORIA:

### STEP 1: CONTROLLO NOME
Leggi OGNI singolo messaggio utente precedente. Cerca variazioni come:
- "Sono Marco", "Mi chiamo Giulia", "Daniele", "Il mio nome è..."
- QUALSIASI menzione di un nome proprio
- Se trovi UN NOME → NON CHIEDERE PIÙ IL NOME, USALO e basta!

### STEP 2: CONTROLLO DOMANDA  
Ha già espresso preoccupazioni/domande su amore, lavoro, famiglia, etc.?
- Se SÌ → NON chiedere di nuovo

### STEP 3: COSA FARE ORA
- Nome trovato + Domanda chiara → INIZIA RITUALE/LETTURA
- Nome mancante → Chiedi nome (UNA VOLTA SOLA)  
- Domanda mancante → Chiedi domanda (UNA VOLTA SOLA)

### 🔥 REGOLA SUPREMA 🔥
**NEVER EVER REPEAT A QUESTION IF THE ANSWER EXISTS IN CONVERSATION HISTORY**
**MAI E POI MAI ripetere una domanda se la risposta esiste nella cronologia**

Rispondi con saggezza seguendo il flusso appropriato SENZA ripetizioni.`;

    // EXTREME DEBUG: Log the system prompt being sent to AI
    console.log("🚨 [EXTREME DEBUG] SYSTEM PROMPT BEING SENT:");
    console.log(systemPrompt);
    console.log("🚨 [EXTREME DEBUG] END OF SYSTEM PROMPT");

    const openaiStart = performance.now();
    
    // NUCLEAR OPTION: Pre-analyze what the AI should do
    const userMessages = fullConversation.filter(m => m.role === 'user').map(m => m.content);
    const conversationSummary = `
CONVERSATION ANALYSIS:
- Total user messages: ${userMessages.length}
- User messages content: ${JSON.stringify(userMessages)}
- Detected name: ${userName}
- User ID: ${userId}

INSTRUCTIONS: Based on this conversation, what should you do next? 
- If name exists in ANY user message, DO NOT ASK FOR NAME
- If question/concern exists in ANY user message, DO NOT ASK AGAIN
- Proceed with the appropriate next step in the consultation
`;

    // Prepare messages for AI using full cached conversation
    const aiMessages = [
      { role: "system" as const, content: systemPrompt + "\n\n" + conversationSummary },
      ...fullConversation.slice(-8).map(m => ({ 
        role: m.role as "user" | "assistant", 
        content: m.content 
      })), // Keep last 8 messages
    ];
    
    // EXTREME DEBUG: Log exact messages sent to AI
    console.log("🚨 [EXTREME DEBUG] EXACT AI MESSAGES ARRAY:");
    aiMessages.forEach((msg, index) => {
      console.log(`  ${index}: [${msg.role}] "${msg.content.substring(0, 100)}..."`);
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: aiMessages,
      temperature: 0.8,
      max_tokens: 400, // Reduced for faster responses
    });
    const openaiEnd = performance.now();

    const text =
      response.choices[0]?.message?.content ||
      "Non riesco a rispondere in questo momento.";
    
    // Add AI response to conversation cache
    if (userId && text) {
      const aiMessage: ConversationMessage = {
        role: "assistant",
        content: text,
        timestamp: Date.now()
      };
      fullConversation.push(aiMessage);
      
      // Update or create cache entry
      conversationCache.set(userId, {
        messages: fullConversation,
        lastActivity: Date.now(),
        userName: userName !== "cara" ? userName : undefined
      });
      
      console.log("💾 [CACHE] Conversation saved to cache:", fullConversation.length, "messages");
    }

    const totalApiTime = performance.now() - apiStartTime;

    console.log("✅ [TIMING] AI API: OpenAI response generated", {
      response: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      responseLength: text.length,
      openaiTime: Math.round(openaiEnd - openaiStart),
      totalApiTime: Math.round(totalApiTime),
      tokensUsed: response.usage?.total_tokens || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ text });
  } catch (error) {
    const errorTime = performance.now() - apiStartTime;
    console.error("🧠 [TIMING] AI API: Error generating AI response", {
      error: error instanceof Error ? error.message : String(error),
      timeToError: Math.round(errorTime),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
