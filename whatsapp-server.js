require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const fetch = global.fetch;
const transcript = fs.readFileSync("./transcript.txt", "utf-8").trim();

app.post("/whatsapp", async (req, res) => {
  console.log("ENTRATO NELLA ROTTA /whatsapp");
  console.log("Body ricevuto:", req.body);

  const userMessage = req.body.Body;
  const sender = req.body.From;

  console.log(`Messaggio da ${sender}: ${userMessage}`);

  try {
    const messages = [
      {
        role: "system",
        content: `
        Agisci come un assistente alle vendite esperto in camper van.

Rispondi alle domande dell'utente usando le informazioni presenti nel seguente transcript tecnico.

Il tuo obiettivo è aiutare l’utente con risposte utili e accurate, e poi **guidarlo gentilmente verso una consulenza con Niki o verso l'acquisto del videocorso**, se rilevante.

Se l’utente:
- Fa domande tecniche approfondite,
- Sembra indeciso sul progetto,
- Chiede alternative, prezzi o confronti,

… allora probabilmente **potrebbe trarre beneficio da una consulenza con Niki o dal videocorso**.

Concludi spesso con una delle seguenti frasi (adattandole al contesto):

- "Se vuoi approfondire il progetto, puoi prenotare una consulenza con Niki."
- "Niki può aiutarti a definire tutti i dettagli in base alle tue esigenze."
- "Vuoi che ti mandi il link per prenotare una call con Niki?"
- "C'è anche un videocorso completo se vuoi seguire tutto passo passo in autonomia."

Sii gentile, amichevole e proattivo, ma non invadente.

Contenuto tecnico disponibile:


${transcript}
        `.trim(),
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
        messages,
      }),
    });

    const data = await openaiRes.json();
    console.log("Risposta da OpenAI:", JSON.stringify(data, null, 2));

    const reply = data?.choices?.[0]?.message?.content || "Non sono riuscito a generare una risposta.";

    if (
      userMessage.toLowerCase().includes("preventivo") ||
      userMessage.toLowerCase().includes("noleggio") ||
      userMessage.toLowerCase().includes("acquistare") ||
      reply.toLowerCase().includes("ti facciamo contattare") ||
      reply.toLowerCase().includes("posso farti contattare")
    ) {
      console.log("Lead potenziale rilevato!");
      console.log("Utente:", sender);
      console.log("Domanda:", userMessage);
    }

    res.set("Content-Type", "text/xml");
    res.send(`<Response><Message>${reply}</Message></Response>`);
  } catch (error) {
    console.error("Errore nella richiesta a OpenAI:", error);

    res.set("Content-Type", "text/xml");
    res.send(`<Response><Message>Si è verificato un errore interno. Riprova più tardi.</Message></Response>`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}/whatsapp`);
});
