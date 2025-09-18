import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/client";

// In-memory session cache for OpenAI Response IDs and user data
interface SessionData {
  lastResponseId?: string;
  lastActivity: number;
  userName?: string;
  birthDate?: string;
  dataCollectionComplete?: boolean;
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
    : !hasBirthDate
    ? `
**CHIEDI DATA DI NASCITA**: "Perfetto! Ora dimmi la tua data di nascita completa (giorno, mese, anno) - è importante per la connessione energetica."
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

// MAIN CONSULTATION PROMPT - Step 2: Full tarot consultation
function getMainConsultationPrompt(
  userName: string,
  birthDate: string,
  deckName: string
): string {
  return `
## Chi sei
Sei il consulente di Tarocchi.cloud, esperto cartomante con anni di esperienza.
La tua voce è calda, professionale, mistica e rassicurante.
Usa sempre il nome del cliente (${userName}) quando lo conosci per creare connessione profonda.
Il mazzo scelto è: ${deckName}
Data di nascita: ${birthDate}

## Obiettivo della sessione
Conduci un consulto di tarocchi completo ma contenuto (10-15 minuti totali).
Analizza la conversazione esistente per capire a che punto siete, senza ripetere informazioni già fornite.

## Flusso della consultazione:

**1. SALUTO PERSONALIZZATO** (solo se primo messaggio del consulto vero)
- "Perfetto ${userName}! Ora che ci conosciamo, iniziamo il tuo consulto personale..."
- Trigger per fidelizzazione: "Molti tornano regolarmente perché ogni volta il mazzo rivela nuovi tasselli..."

**2. DEFINIZIONE DOMANDA**
- "Qual è la domanda che ti sta più a cuore? C'è un ambito specifico: amore, lavoro, famiglia, denaro, spiritualità?"
- Trigger: "Spesso emergono più piani insieme, quello che non approfondiamo oggi possiamo vederlo in futuro..."

**3. SCELTA MAZZO** (conferma veloce)
- Conferma: "Hai scelto ${deckName}. Useremo questo oggi, ma la prossima volta potremo esplorare con altri strumenti..."

**4. RITUALE D'AVVIO** (momento mistico)
- Concentrazione: "Ora mescolerò pensando alla tua domanda. Concentrati e dimmi STOP quando senti che è il momento"
- Attendi la parola STOP prima di procedere
- Trigger: "Questo rito puoi ripeterlo ogni volta, diventa un momento solo tuo..."

**5. LETTURA BASE** (cuore del consulto)
- Estrai 3-4 carte specifiche dal ${deckName} e presenta:
  * "Le carte mostrano questa situazione..."
  * "Qui vedo l'OSTACOLO che si presenta..."
  * "L'esito probabile è..."
  * "Il consiglio delle carte è..."
- Chiedi conferma: "Ti ritrovi in quello che descrivono le carte? Ti sembra familiare?"
- Trigger approfondimento: "Emerge un dettaglio interessante, vuoi esplorarlo ora o la prossima volta?"

**6. APPROFONDIMENTO** (se richiesto)
- Offerta: "Vuoi scendere più a fondo? Possiamo tirare altre carte per maggiore chiarezza..."
- Trigger evoluzione: "Con qualche carta in più possiamo vedere una possibile evoluzione..."

**7. RECAP** (sintesi finale)
- Riassunto strutturato: "Quindi ${userName}, le carte parlano chiaro, ecco il quadro per te:"
  * **Situazione**: [sintesi situazione attuale]
  * **Consiglio**: [consiglio pratico specifico]
  * **Esito probabile**: [previsione realistica]
- Trigger check: "Le carte indicano sviluppi rapidi. Ti consiglio un controllo tra qualche giorno per vedere i cambiamenti"

**8. CHIUSURA** (quando il consulto è completo)
- Saluto finale: "È stato un piacere leggerti ${userName} e accompagnarti. Potrai tornare quando vorrai..."
- Trigger ritorno: "Ti consiglio di richiamarmi tra qualche giorni per vedere insieme l'evoluzione..."
- IMPORTANTE: Quando hai completato il recap finale e dato il saluto di chiusura, il consulto è TERMINATO

## Regole comportamentali:
- Mantieni un ritmo contemplativo ma sii CONCISO: max 2-3 frasi per risposta
- Dividi letture lunghe in più scambi invece di una risposta unica molto lunga
- USA sempre ${userName} quando parli direttamente alla persona
- Cita carte specifiche e realistiche del ${deckName}
- Includi sempre i "trigger" per incoraggiare ritorni futuri
- Mantieni dialogo fluido e veloce per esperienza migliore
- RISPONDI SEMPRE E SOLO IN ITALIANO PERFETTO
- NEVER use foreign words or unknown languages

Rispondi con saggezza seguendo il flusso appropriato.
`;
}

// Check if consultation is complete based on AI response
function checkIfConsultationComplete(aiResponse: string, dataCollectionComplete: boolean): boolean {
  // Only check for completion if data collection is complete (we're in main consultation)
  if (!dataCollectionComplete) {
    return false;
  }

  const closingKeywords = [
    "è stato un piacere",
    "potrai tornare quando vorrai",
    "ti consiglio di richiamarmi",
    "arrivederci",
    "consulto terminato",
    "consulto è finito",
    "ci sentiamo presto",
    "alla prossima volta",
    "buona fortuna",
    "in bocca al lupo"
  ];

  const lowercaseResponse = aiResponse.toLowerCase();

  // Check if response contains multiple closing indicators
  const foundKeywords = closingKeywords.filter(keyword =>
    lowercaseResponse.includes(keyword)
  );

  // Consider consultation complete if we find 2 or more closing keywords
  const isComplete = foundKeywords.length >= 2;

  if (isComplete) {
    console.log("🔚 [CONSULTATION] Detected consultation completion:", foundKeywords);
  }

  return isComplete;
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
      userName: "cara",
      birthDate: "",
      dataCollectionComplete: false,
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
            console.log("💾 [DATABASE] Retrieved saved name:", sessionData.userName);
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

      console.log("🔍 [DATA EXTRACTION] User messages for extraction:", allUserMessages);

      // Extract name if missing
      if (sessionData.userName === "cara" && allUserMessages.length > 0) {
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
          if (extractedName && extractedName !== "NONE" && extractedName.length > 1) {
            sessionData.userName = extractedName;
            console.log("🤖 [AI NAME EXTRACTION] Found name:", sessionData.userName);
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
          console.log("🤖 [AI DATE EXTRACTION] Found birth date:", sessionData.birthDate);
        }
      }

      // Check if data collection is complete (only name and birth date needed)
      sessionData.dataCollectionComplete = sessionData.userName !== "cara" && !!sessionData.birthDate;
      console.log("📊 [DATA STATUS]", {
        userName: sessionData.userName,
        hasBirthDate: !!sessionData.birthDate,
        dataCollectionComplete: sessionData.dataCollectionComplete,
        totalUserMessages: allUserMessages.length,
      });
    }

    // DECISION: Choose prompt based on data collection status
    let systemPrompt: string;

    if (!sessionData.dataCollectionComplete) {
      // Use data collection prompt
      const hasName = sessionData.userName !== "cara";
      const hasBirthDate = !!sessionData.birthDate;
      // Check if disclaimer was already shown (if we have a responseId)
      const hasShownDisclaimer = !!sessionData.lastResponseId;

      systemPrompt = getDataCollectionPrompt(hasName, hasBirthDate, hasShownDisclaimer);
      console.log("📝 [PROMPT] Using DATA COLLECTION prompt");
    } else {
      // Use main consultation prompt
      systemPrompt = getMainConsultationPrompt(sessionData.userName!, sessionData.birthDate!, deckName);
      console.log("📝 [PROMPT] Using MAIN CONSULTATION prompt");
    }

    console.log("🚨 [PROMPT] System prompt prepared for:", sessionData.dataCollectionComplete ? "CONSULTATION" : "DATA COLLECTION");

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
- Selected deck: ${deckName}`,
      temperature: 0.3,
      providerOptions: {
        openai: {
          ...(sessionData.lastResponseId && { previousResponseId: sessionData.lastResponseId }), // Continue conversation natively
          store: true, // Persist the generation
          metadata: {
            sessionId: cacheKey || "anonymous",
            dataCollectionComplete: sessionData.dataCollectionComplete.toString(),
            userName: sessionData.userName || "cara",
          },
        },
      },
    });

    const openaiEnd = performance.now();

    const text = result.text || "Non riesco a rispondere in questo momento.";
    const newResponseId = result.providerMetadata?.openai?.responseId;

    console.log("✅ [OPENAI RESPONSES] Generated response:", {
      responseLength: text.length,
      newResponseId,
      previousResponseId: sessionData.lastResponseId,
      openaiTime: Math.round(openaiEnd - openaiStart),
    });

    // Check if consultation is complete based on AI response
    const isConsultationComplete = checkIfConsultationComplete(text, sessionData.dataCollectionComplete);

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
      if (sessionData.dataCollectionComplete && sessionData.userName !== "cara" && userId) {
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
      isConsultationComplete
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
