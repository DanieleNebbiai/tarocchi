import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { createClient } from "@/lib/supabase/client";
import { z } from "zod";

// In-memory session cache for OpenAI Response IDs and user data
interface SessionData {
  lastResponseId?: string;
  lastActivity: number;
  userName?: string;
  birthDate?: string;
  dataCollectionComplete?: boolean;
  consultationPhase?: "data_collection" | "pre_shuffle" | "post_shuffle";
  currentQuestion?: string;
  extractedCards?: string[];
  postShuffleTurns?: number; // Count turns in post-shuffle phase
}

// Global cache - in production use Redis or similar
const sessionCache = new Map<string, SessionData>();

// Clean old sessions (older than 30 minutes)
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, sessionData] of sessionCache.entries()) {
    if (now - sessionData.lastActivity > SESSION_TTL) {
      sessionCache.delete(sessionId);
      console.log("🗑️ [CACHE] Cleaned expired session:", sessionId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanExpiredSessions, 5 * 60 * 1000);

// DATA COLLECTION PROMPT - Step 1: Show disclaimer first, then collect name and birth date
function getDataCollectionPrompt(
  hasName: boolean,
  hasBirthDate: boolean,
  hasShownDisclaimer: boolean
): string {
  return `
## Chi sei
Sei il consulente di Tarocchi.cloud, esperto cartomante con anni di esperienza.
La tua voce è calda, professionale, mistica e rassicurante.

## Obiettivo ATTUALE
Prima di iniziare il consulto, devo raccogliere alcune informazioni essenziali.
Sii breve, diretto e caloroso.

## Cosa fare ORA:

${
  !hasShownDisclaimer
    ? `
**DISCLAIMER SALUTE PRIMA**: "Benvenuto su Tarocchi.cloud, sono il tuo consulente personale. Prima di iniziare, è importante che tu sappia: non trattiamo mai temi legati alla salute. Per qualsiasi questione medica, ti consiglio vivamente di consultare un medico qualificato. Le carte si concentrano su amore, lavoro, famiglia, crescita personale e spiritualità. Ora, per entrare in sintonia con le carte, ho bisogno del tuo nome."
`
    : !hasName
    ? `
**CHIEDI IL NOME**: "Per entrare in sintonia con le carte, ho bisogno del tuo nome."
`
    : !hasBirthDate && hasName
    ? `
**CHIEDI DATA DI NASCITA**: "Perfetto! Ora dimmi la tua data di nascita completa (giorno, mese, anno) - è importante per la connessione energetica."
`
    : !hasName
    ? `
**CHIEDI IL NOME ANCORA**: "Mi dispiace, non ho capito il tuo nome. Potresti dirmi come ti chiami?"
`
    : ""
}

## Regole:
- Chiedi UNA cosa alla volta
- Sii caloroso ma conciso (massimo 2 frasi)
- NON iniziare il consulto finché non hai tutto
- Ringrazia sempre per ogni informazione ricevuta
- RISPONDI SEMPRE E SOLO IN ITALIANO PERFETTO
- NEVER use foreign words or unknown languages

Rispondi seguendo l'ordine: prima disclaimer salute + richiesta nome, poi la data di nascita.
`;
}

// PRE-SHUFFLE CONSULTATION PROMPT - Question gathering and preparation
function getPreShufflePrompt(
  userName: string,
  birthDate: string,
  deckName: string
): string {
  return `
## Chi sei
Sei il consulente di Tarocchi.cloud, esperto cartomante con anni di esperienza.
La tua voce è calda, professionale, mistica e rassicurante.

## Fase ATTUALE: Pre-Mescolamento
Ora devi raccogliere la domanda specifica e preparare il mescolamento.

## Cosa fare ORA:

**1. DEFINIZIONE DOMANDA SPECIFICA**
- Chiedi: "Su cosa vorresti che le carte ti guidino oggi? Qual è la domanda che ti sta più a cuore?"
- Approfondisci: "C'è un aspetto specifico che ti preoccupa di più?"
- Conferma: "Perfetto, quindi la domanda è: [riformula la domanda chiaramente]"

**2. PREPARAZIONE MESCOLAMENTO**
- Annuncio: "Ora mescolo le carte del ${deckName} pensando alla tua domanda, dimmi stop quando ti senti pronto e procederò ad estrarre le carte, poi lasciamo del tempo per concentrarmi sulla lettura, ti risponderò appena ho fatto"
- Concentrazione: "Mi sto concentrando sulla tua energia e sulla domanda che hai posto..."
- **IMPORTANTE**: Quando hai raccolto la domanda chiara, USA il tool "start_card_reading" per procedere al mescolamento

## Regole comportamentali:
- Sii CONCISO: max 2-3 frasi per risposta
- USA sempre ${userName} quando parli direttamente alla persona
- Se l'utente dice "stop", "basta", "fermati" - sono solo esitazioni, continua normalmente
- Non interpretare MAI "stop" come richiesta di chiudere la conversazione
- Mantieni dialogo fluido e rassicurante
- RISPONDI SEMPRE E SOLO IN ITALIANO PERFETTO

L'utente è: ${userName}, nato il ${birthDate}.
Mazzo selezionato: ${deckName}
`;
}

// POST-SHUFFLE CONSULTATION PROMPT - Card interpretation and reading
function getPostShufflePrompt(
  userName: string,
  birthDate: string,
  deckName: string,
  question: string,
  cards: string[]
): string {
  return `
## Chi sei
Sei il consulente di Tarocchi.cloud, esperto cartomante con anni di esperienza.
La tua voce è calda, professionale, mistica e rassicurante.

## Fase ATTUALE: Post-Mescolamento - Interpretazione Carte
Le carte sono state estratte, ora devi interpretarle.

## Domanda dell'utente: "${question}"
## Carte estratte: ${cards.join(", ")}

## Cosa fare ORA:

**1. PRESENTAZIONE CARTE**
- Annuncio: "Ecco cosa emerge dalle carte per la tua domanda su ${question}..."
- Presenta: "Ho estratto ${cards.join(", ")}. Vediamo cosa ci dicono..."

**2. INTERPRETAZIONE DETTAGLIATA**
- Interpreta ogni carta in relazione alla domanda specifica
- Spiega i collegamenti tra le carte
- Fornisci consigli pratici e actionable

**3. SINTESI **
- Riassunto: "Quindi ${userName}, ti ritrovi in quello che descrivono le carte? Ti sembra familiare?"
- Consiglio finale pratico

**4. APPROFONDIMENTO** (se richiesto)
- Offerta: "Vuoi scendere più a fondo? Vuoi che tiriamo altre carte per maggiore chiarezza?"
- Trigger evoluzione: "Con qualche carta in più possiamo vedere una possibile evoluzione..."

**5. RECAP** (sintesi finale)
- Riassunto strutturato: "Quindi ${userName}, le carte parlano chiaro, ecco il quadro per te:"
  * **Situazione**: [sintesi situazione attuale]
  * **Consiglio**: [consiglio pratico specifico]
  * **Esito probabile**: [previsione realistica]
- Trigger check: "Le carte indicano sviluppi rapidi. Ti consiglio un controllo tra qualche giorno per vedere i cambiamenti"

**6. GESTIONE CARTE** (automatica)
- Mescoli e estrai le carte AUTOMATICAMENTE senza aspettare comandi
- Non chiedere "dimmi stop" o simili - procedi direttamente con l'interpretazione
- Esempio: "Ora mescolo le carte... Ecco cosa emerge: ho estratto La Torre, Il Sole e La Morte..."

**7. CHIUSURA AUTOMATICA** (OBBLIGATORIA dopo consultazione completa)
- Dopo aver fornito:
  * Interpretazione completa di tutte le carte estratte
  * Risposta chiara alla domanda "${question}"
  * Consigli pratici specifici per ${userName}
  * Sintesi finale della situazione
- Saluto di chiusura: "È stato un piacere leggerti ${userName}. Le carte hanno parlato chiaramente oggi."
- **IMPORTANTE**: DEVI SEMPRE usare il tool "end_consultation" dopo aver completato l'interpretazione delle carte e dato una risposta completa alla domanda. NON continuare indefinitamente - chiudi il consulto quando hai interpretato tutte le carte estratte (${cards.join(", ")}) e risposto alla domanda. Dopo 3-4 scambi nella fase post-shuffle, dovresti aver fornito una consultazione completa.

## Regole comportamentali:
- Sii CONCISO: max 2-3 frasi per risposta
- USA sempre ${userName} quando parli direttamente alla persona
- Dividi l'interpretazione in più scambi per mantenere l'engagement
- Cita sempre le carte specifiche del ${deckName}
- RISPONDI SEMPRE E SOLO IN ITALIANO PERFETTO

L'utente è: ${userName}, nato il ${birthDate}.
`;
}

// Extract birth date from user messages using AI
async function extractBirthDate(
  userMessages: string[]
): Promise<string | null> {
  if (userMessages.length === 0) return null;

  try {
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Analizza i messaggi dell'utente ed estrai SOLO la data di nascita se menzionata.
      Formati accettati: DD/MM/YYYY, DD-MM-YYYY, DD MM YYYY, o simili.
      Se non trovi una data, rispondi con 'NONE'.
      Rispondi SOLO con la data in formato DD/MM/YYYY o 'NONE'.

      Messaggi utente: ${userMessages.join(" | ")}`,
      temperature: 0,
    });

    const extractedDate = result.text.trim();
    return extractedDate && extractedDate !== "NONE" ? extractedDate : null;
  } catch (error) {
    console.error("🤖 [AI DATE EXTRACTION] Error:", error);
    return null;
  }
}

// Reset conversation endpoint
export async function DELETE(request: Request) {
  try {
    const { userId, sessionId } = await request.json();
    const cacheKey = userId || sessionId;

    if (cacheKey && sessionCache.has(cacheKey)) {
      sessionCache.delete(cacheKey);
      console.log("🗑️ [CACHE] Session reset for cacheKey:", cacheKey);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// Define tools using the proper tool() helper
const startCardReadingTool = tool({
  description: "Call this tool when you have gathered the user's specific question and are ready to extract cards for interpretation. This transitions from pre-shuffle to post-shuffle phase.",
  inputSchema: z.object({
    question: z.string().describe("The specific question the user wants guidance on"),
    cards: z.array(z.string()).describe("Array of 3-4 card names extracted from the selected deck")
  }),
  execute: async ({ question, cards }, { experimental_context }) => {
    const { sessionData, cacheKey, sessionCache } = experimental_context as any;
    console.log("🎴 [TOOL] AI called start_card_reading:", { question, cards });

    // Update session with question and cards
    if (cacheKey) {
      const currentSession = sessionCache.get(cacheKey);
      if (currentSession) {
        currentSession.consultationPhase = "post_shuffle";
        currentSession.currentQuestion = question;
        currentSession.extractedCards = cards;
        currentSession.postShuffleTurns = 0; // Reset counter for new phase
        sessionCache.set(cacheKey, currentSession);
        console.log("🎴 [TOOL] Session updated to post_shuffle phase with cards:", cards);

        // Update local sessionData as well
        sessionData.consultationPhase = "post_shuffle";
        sessionData.currentQuestion = question;
        sessionData.extractedCards = cards;
        sessionData.postShuffleTurns = 0;
      }
    }
    return `Cards extracted successfully: ${cards.join(", ")}. Now proceeding with interpretation.`;
  },
});

const endConsultationTool = tool({
  description: "ONLY call this tool when you have completed a FULL card interpretation with detailed insights, practical advice, and final summary. This automatically ends the session.",
  inputSchema: z.object({
    reason: z.string().describe("Brief reason why the consultation is complete")
  }),
  execute: async ({ reason }) => {
    console.log("🔚 [TOOL] AI called end_consultation tool:", { reason });
    return "Consultation completed successfully.";
  },
});

export async function POST(request: Request) {
  const apiStartTime = performance.now();

  try {
    const parseStart = performance.now();
    const { message, selectedDeck, userId, conversation, sessionId } =
      await request.json();
    const parseEnd = performance.now();

    console.log("🧠 [TIMING] AI API: Processing request", {
      message: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      messageLength: message.length,
      conversationLength: (conversation || []).length,
      frontendConversation: conversation || [],
      selectedDeck,
      userId: userId || "no-user-id",
      sessionId: sessionId || "no-session-id",
      parseTime: Math.round(parseEnd - parseStart),
      timestamp: new Date().toISOString(),
    });

    const deckName = selectedDeck || "Tarocchi di Marsiglia";
    const now = Date.now();

    // Use userId or sessionId for session management
    const cacheKey = userId || sessionId;

    // Get session data (responseId and user data)
    let sessionData: SessionData = {
      lastActivity: now,
      userName: "NOME_NON_FORNITO",
      birthDate: "",
      dataCollectionComplete: false,
      consultationPhase: "data_collection",
      currentQuestion: "",
      extractedCards: [],
      postShuffleTurns: 0,
    };

    if (cacheKey) {
      const cached = sessionCache.get(cacheKey);
      if (cached) {
        sessionData = { ...cached, lastActivity: now };
        console.log("💾 [SESSION] Retrieved session data:", {
          cacheKey,
          hasResponseId: !!sessionData.lastResponseId,
          userName: sessionData.userName,
          birthDate: sessionData.birthDate,
          dataCollectionComplete: sessionData.dataCollectionComplete,
        });
      } else if (userId) {
        // Try to get user data from database if user is authenticated
        try {
          const supabase = createClient();
          const { data: profile } = await supabase
            .from("profiles")
            .select("extracted_name")
            .eq("id", userId)
            .single();

          if (profile?.extracted_name) {
            sessionData.userName = profile.extracted_name;
            console.log(
              "💾 [DATABASE] Retrieved saved name:",
              sessionData.userName
            );
          }
        } catch (dbError) {
          console.log("💾 [DATABASE] No saved data found");
        }
      }
    }

    // Extract missing data if not complete (using frontend conversation + current message)
    if (!sessionData.dataCollectionComplete) {
      // Collect all user messages for extraction
      let allUserMessages = [message]; // Current message

      if (conversation && conversation.length > 0) {
        const frontendUserMessages = conversation
          .filter((msg: any) => msg.role === "user")
          .map((msg: any) => msg.content);
        allUserMessages = [...frontendUserMessages, message];
        // Remove duplicates
        allUserMessages = [...new Set(allUserMessages)];
      }

      console.log(
        "🔍 [DATA EXTRACTION] User messages for extraction:",
        allUserMessages
      );

      // Extract name if missing
      if (
        sessionData.userName === "NOME_NON_FORNITO" &&
        allUserMessages.length > 0
      ) {
        try {
          const nameResult = await generateText({
            model: openai("gpt-4o-mini"),
            prompt: `Analizza i messaggi dell'utente ed estrai SOLO il nome proprio della persona (es. Marco, Giulia, Alessandro).
            Se l'utente non ha mai detto il suo nome, rispondi con 'NONE'.
            Rispondi SOLO con il nome o 'NONE', niente altro.

            Messaggi utente: ${allUserMessages.join(" | ")}`,
            temperature: 0,
          });

          const extractedName = nameResult.text.trim();
          if (
            extractedName &&
            extractedName !== "NONE" &&
            extractedName.length > 1
          ) {
            sessionData.userName = extractedName;
            console.log(
              "🤖 [AI NAME EXTRACTION] Found name:",
              sessionData.userName
            );
          }
        } catch (error) {
          console.error("🤖 [AI NAME EXTRACTION] Error:", error);
        }
      }

      // Extract birth date if missing
      if (!sessionData.birthDate && allUserMessages.length > 0) {
        const extractedDate = await extractBirthDate(allUserMessages);
        if (extractedDate) {
          sessionData.birthDate = extractedDate;
          console.log(
            "🤖 [AI DATE EXTRACTION] Found birth date:",
            sessionData.birthDate
          );
        }
      }

      // Check if data collection is complete (MUST have name first, then birth date)
      sessionData.dataCollectionComplete =
        sessionData.userName !== "NOME_NON_FORNITO" && !!sessionData.birthDate;
      console.log("📊 [DATA STATUS]", {
        userName: sessionData.userName,
        hasBirthDate: !!sessionData.birthDate,
        dataCollectionComplete: sessionData.dataCollectionComplete,
        totalUserMessages: allUserMessages.length,
      });
    }

    // DECISION: Choose prompt based on consultation phase
    let systemPrompt: string;

    if (!sessionData.dataCollectionComplete) {
      // Phase 1: Data Collection
      const hasName = sessionData.userName !== "NOME_NON_FORNITO";
      const hasBirthDate = !!sessionData.birthDate;
      const hasShownDisclaimer = !!sessionData.lastResponseId;

      systemPrompt = getDataCollectionPrompt(
        hasName,
        hasBirthDate,
        hasShownDisclaimer
      );
      console.log("📝 [PROMPT] Using DATA COLLECTION prompt");
    } else {
      // Set consultation phase to pre_shuffle if just completed data collection
      if (sessionData.consultationPhase === "data_collection") {
        sessionData.consultationPhase = "pre_shuffle";
      }

      if (sessionData.consultationPhase === "pre_shuffle") {
        // Phase 2: Pre-Shuffle - Question gathering
        systemPrompt = getPreShufflePrompt(
          sessionData.userName!,
          sessionData.birthDate!,
          deckName
        );
        console.log("📝 [PROMPT] Using PRE-SHUFFLE prompt");
      } else {
        // Phase 3: Post-Shuffle - Card interpretation
        systemPrompt = getPostShufflePrompt(
          sessionData.userName!,
          sessionData.birthDate!,
          deckName,
          sessionData.currentQuestion!,
          sessionData.extractedCards!
        );
        console.log("📝 [PROMPT] Using POST-SHUFFLE prompt");
      }
    }

    // Increment post-shuffle turn counter
    if (sessionData.consultationPhase === "post_shuffle") {
      sessionData.postShuffleTurns = (sessionData.postShuffleTurns || 0) + 1;
    }

    console.log(
      "🚨 [PROMPT] System prompt prepared for:",
      !sessionData.dataCollectionComplete
        ? "DATA COLLECTION"
        : sessionData.consultationPhase === "pre_shuffle"
        ? "PRE-SHUFFLE"
        : `POST-SHUFFLE (turn ${sessionData.postShuffleTurns})`
    );

    const openaiStart = performance.now();

    // Use OpenAI Responses API with previousResponseId for native conversation continuity
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: `Current user message: ${message}

Context:
- User name: ${sessionData.userName}
- Birth date: ${sessionData.birthDate || "not provided"}
- Data collection complete: ${sessionData.dataCollectionComplete}
- Selected deck: ${deckName}
- Consultation phase: ${sessionData.consultationPhase}
${sessionData.consultationPhase === "post_shuffle" ? `- Post-shuffle turns completed: ${sessionData.postShuffleTurns}
- Question: ${sessionData.currentQuestion}
- Cards extracted: ${sessionData.extractedCards?.join(", ")}
- **Remember**: Call end_consultation tool after 3-4 turns when consultation is complete` : ""}`,
      temperature: 0.3,
      tools:
        sessionData.consultationPhase === "pre_shuffle"
          ? {
              start_card_reading: startCardReadingTool,
            }
          : sessionData.consultationPhase === "post_shuffle"
          ? {
              end_consultation: endConsultationTool,
            }
          : {},
      experimental_context: {
        sessionData,
        cacheKey,
        sessionCache,
      },
      providerOptions: {
        openai: {
          ...(sessionData.lastResponseId && {
            previousResponseId: sessionData.lastResponseId,
          }), // Continue conversation natively
          store: true, // Persist the generation
          metadata: {
            sessionId: cacheKey || "anonymous",
            dataCollectionComplete:
              sessionData.dataCollectionComplete.toString(),
            userName: sessionData.userName || "NOME_NON_FORNITO",
          },
        },
      },
    });

    const openaiEnd = performance.now();

    const text = result.text || "Non riesco a rispondere in questo momento.";
    const newResponseId = result.providerMetadata?.openai?.responseId;

    // Check if AI used tools
    const hasEndConsultationTool =
      result.toolCalls &&
      result.toolCalls.some((call) => call.toolName === "end_consultation");
    const hasStartCardReadingTool =
      result.toolCalls &&
      result.toolCalls.some((call) => call.toolName === "start_card_reading");
    let toolReason = "";
    let phaseTransitioned = false;

    if (hasEndConsultationTool) {
      const endTool = result.toolCalls.find(
        (call) => call.toolName === "end_consultation"
      );
      if (endTool && (endTool as any).args) {
        toolReason = (endTool as any).args.reason || "";
      }
    }

    if (hasStartCardReadingTool) {
      phaseTransitioned = true;
      console.log(
        "🎴 [PHASE TRANSITION] Pre-shuffle completed, transitioning to post-shuffle phase"
      );
    }

    console.log("✅ [OPENAI RESPONSES] Generated response:", {
      responseLength: text.length,
      newResponseId,
      previousResponseId: sessionData.lastResponseId,
      hasEndConsultationTool,
      hasStartCardReadingTool,
      phaseTransitioned,
      ...(hasEndConsultationTool && { toolReason }),
      consultationPhase: sessionData.consultationPhase,
      openaiTime: Math.round(openaiEnd - openaiStart),
    });

    // Consultation is complete if AI used the end_consultation tool
    const isConsultationComplete = hasEndConsultationTool;

    // Update session data with new responseId and user data
    if (cacheKey) {
      // Update session data with new responseId for conversation continuity
      if (newResponseId) {
        sessionData.lastResponseId = newResponseId as string;
      }
      sessionData.lastActivity = Date.now();

      // Save session data to cache
      sessionCache.set(cacheKey, sessionData);

      // Save extracted data to database if complete and user authenticated
      if (
        sessionData.dataCollectionComplete &&
        sessionData.userName !== "NOME_NON_FORNITO" &&
        userId
      ) {
        try {
          const supabase = createClient();
          const { error } = await supabase.from("profiles").upsert({
            id: userId,
            extracted_name: sessionData.userName,
            birth_date: sessionData.birthDate,
            updated_at: new Date().toISOString(),
          });

          if (error) {
            console.error("💾 [DATABASE] Error saving user data:", error);
          } else {
            console.log("💾 [DATABASE] User data saved successfully:", {
              userName: sessionData.userName,
              birthDate: sessionData.birthDate,
            });
          }
        } catch (dbError) {
          console.error("💾 [DATABASE] Database error:", dbError);
        }
      }

      console.log("💾 [SESSION] Session data updated:", {
        cacheKey,
        responseId: newResponseId,
        userName: sessionData.userName,
        birthDate: sessionData.birthDate,
        dataCollectionComplete: sessionData.dataCollectionComplete,
      });
    }

    // Handle phase transition from pre-shuffle to post-shuffle
    if (phaseTransitioned && sessionData.consultationPhase === "post_shuffle") {
      console.log(
        "🎴 [PHASE TRANSITION] Generating post-shuffle response with extracted cards"
      );

      try {
        // Generate immediate follow-up response with post-shuffle prompt
        const postShuffleResult = await generateText({
          model: openai("gpt-4o-mini"),
          system: getPostShufflePrompt(
            sessionData.userName!,
            sessionData.birthDate!,
            deckName,
            sessionData.currentQuestion!,
            sessionData.extractedCards!
          ),
          prompt: `Begin the card interpretation for the question: "${
            sessionData.currentQuestion
          }". The cards extracted are: ${sessionData.extractedCards!.join(
            ", "
          )}.`,
          temperature: 0.3,
          tools: {
            end_consultation: endConsultationTool,
          },
          experimental_context: {
            sessionData,
            cacheKey,
            sessionCache,
          },
          providerOptions: {
            openai: {
              store: true,
              metadata: {
                sessionId: cacheKey || "anonymous",
                consultationPhase: "post_shuffle",
                userName: sessionData.userName || "NOME_NON_FORNITO",
              },
            },
          },
        });

        const postShuffleText =
          postShuffleResult.text ||
          "Non riesco a interpretare le carte in questo momento.";
        const postShuffleResponseId =
          postShuffleResult.providerMetadata?.openai?.responseId;

        // Update session with new responseId
        if (cacheKey && postShuffleResponseId) {
          sessionData.lastResponseId = postShuffleResponseId as string;
          sessionCache.set(cacheKey, sessionData);
        }

        // Check if post-shuffle response completed consultation
        const postShuffleHasEndTool =
          postShuffleResult.toolCalls &&
          postShuffleResult.toolCalls.some(
            (call) => call.toolName === "end_consultation"
          );

        console.log("🎴 [PHASE TRANSITION] Post-shuffle response generated", {
          responseLength: postShuffleText.length,
          hasEndTool: postShuffleHasEndTool,
          responseId: postShuffleResponseId,
        });

        const totalApiTime = performance.now() - apiStartTime;

        console.log("✅ [TIMING] AI API: Phase transition completed", {
          response:
            postShuffleText.substring(0, 100) +
            (postShuffleText.length > 100 ? "..." : ""),
          totalApiTime: Math.round(totalApiTime),
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
          text: postShuffleText,
          isConsultationComplete: postShuffleHasEndTool,
        });
      } catch (error) {
        console.error(
          "🎴 [PHASE TRANSITION] Error generating post-shuffle response:",
          error
        );
        // Fall back to original response
      }
    }

    const totalApiTime = performance.now() - apiStartTime;

    console.log("✅ [TIMING] AI API: OpenAI response generated", {
      response: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
      responseLength: text.length,
      openaiTime: Math.round(openaiEnd - openaiStart),
      totalApiTime: Math.round(totalApiTime),
      tokensUsed: result.usage?.totalTokens || "unknown",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      text,
      isConsultationComplete,
    });
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
