require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs"); // 👈 Per leggere il file transcript.txt

const app = express();

// Middleware per interpretare correttamente il body della richiesta di Twilio
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Aggiunto per sicurezza

// Usa il fetch nativo di Node (v18+)
const fetch = global.fetch;

// 🔹 Leggi il contenuto del file transcript una sola volta all'avvio
const transcript = fs.readFileSync("./transcript.txt", "utf-8");

// Rotta principale che riceve i messaggi da WhatsApp/Twilio
app.post("/whatsapp", async (req, res) => {
  console.log("🎯 ENTRATO NELLA ROTTA /whatsapp");

  // Verifica che Twilio stia mandando qualcosa
  console.log("📨 Body ricevuto:", req.body);

  const userMessage = req.body.Body;
  const sender = req.body.From;

  console.log(`📩 Messaggio da ${sender}: ${userMessage}`);

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Agisci come assistente vendite. Il tuo obiettivo è rispondere in modo gentile ma strategico, porre domande per qualificare il cliente e raccogliere informazioni utili alla vendita. Usa queste informazioni per rispondere come un camperizzatore esperto:\n\n${transcript}\n\nSe non sai la risposta, dì che non puoi aiutare.`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    const data = await openaiRes.json();
    console.log("🤖 Risposta da OpenAI:", JSON.stringify(data, null, 2));

    const reply = data?.choices?.[0]?.message?.content || "Non sono riuscito a generare una risposta.";

    if (
      reply.toLowerCase().includes("posso farti contattare") ||
      userMessage.toLowerCase().includes("preventivo") ||
      userMessage.toLowerCase().includes("noleggio") ||
      userMessage.toLowerCase().includes("acquistare") ||
      reply.toLowerCase().includes("ti facciamo contattare")
    ) {
      console.log("🔎 Lead potenziale rilevato!");
      console.log("➡️ Utente:", sender);
      console.log("💬 Domanda:", userMessage);
      console.log("🤖 Risposta:", reply);
    }

    res.set("Content-Type", "text/xml");
    res.send(`<Response><Message>${reply}</Message></Response>`);
  } catch (error) {
    console.error("❌ Errore nella richiesta a OpenAI:", error);

    res.set("Content-Type", "text/xml");
    res.send(`<Response><Message>Si è verificato un errore interno. Riprova più tardi.</Message></Response>`);
  }
});

// Porta d'ascolto per Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}/whatsapp`);
});
