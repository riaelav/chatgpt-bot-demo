require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();

// Middleware per interpretare correttamente il body delle richieste da Twilio
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Usa il fetch nativo di Node.js (v18+)
const fetch = global.fetch;

// 🔹 Legge il contenuto del transcript una sola volta all'avvio
const transcript = fs.readFileSync("./transcript.txt", "utf-8").trim();

// Rotta principale che riceve i messaggi da WhatsApp via Twilio
app.post("/whatsapp", async (req, res) => {
  console.log("🎯 ENTRATO NELLA ROTTA /whatsapp");
  console.log("📨 Body ricevuto:", req.body);

  const userMessage = req.body.Body;
  const sender = req.body.From;

  console.log(`📩 Messaggio da ${sender}: ${userMessage}`);

  try {
    // Prompt ottimizzato per vendite + risposte tecniche
    const messages = [
      {
        role: "system",
        content: `
Agisci come un assistente alle vendite esperto in camper van.

✅ Rispondi alle domande dell'utente usando SOLO le informazioni presenti nel seguente transcript tecnico.

📌 Se non trovi una risposta nel transcript, dillo in modo gentile.

🧠 Dopo aver risposto a 1 o 2 domande, guida l'utente verso l'acquisto di una consulenza con Niki, dicendo frasi come:

- "Se vuoi approfondire il progetto, puoi prenotare una consulenza con Niki, il nostro camperizzatore."
- "Niki può aiutarti a definire tutti i dettagli in base alle tue esigenze."
- "Vuoi che ti mandi il link per prenotare una call con Niki?"

Sii gentile, amichevole e proattivo, ma non invadente.

Contenuto tecnico disponibile:

${transcript}

      },
      {
        role: "user",
        content: userMessage,
      },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
      }),
    });

    const data = await openaiRes.json();
    console.log("🤖 Risposta da OpenAI:", JSON.stringify(data, null, 2));

    const reply = data?.choices?.[0]?.message?.content || "Non sono riuscito a generare una risposta.";

    // Rilevamento lead basato su parole chiave o frasi tipiche
    if (
      userMessage.toLowerCase().includes("preventivo") ||
      userMessage.toLowerCase().includes("noleggio") ||
      userMessage.toLowerCase().includes("acquistare") ||
      reply.toLowerCase().includes("ti facciamo contattare") ||
      reply.toLowerCase().includes("posso farti contattare")
    ) {
      console.log("🔎 Lead potenziale rilevato!");
      console.log("➡️ Utente:", sender);
      console.log("💬 Domanda:", userMessage);
      console.log("🤖 Risposta:", reply);
    }

    // Risposta per Twilio/WhatsApp
    res.set("Content-Type", "text/xml");
    res.send(`<Response><Message>${reply}</Message></Response>`);
  } catch (error) {
    console.error("❌ Errore nella richiesta a OpenAI:", error);

    res.set("Content-Type", "text/xml");
    res.send(`<Response><Message>Si è verificato un errore interno. Riprova più tardi.</Message></Response>`);
  }
});

// Porta d'ascolto per Render (usa PORT se definito)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}/whatsapp`);
});
