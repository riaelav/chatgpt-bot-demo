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

Rispondi alle domande dell'utente utilizzando le informazioni presenti nel seguente transcript tecnico.

 Il tuo obiettivo è:
1. Offrire risposte utili, chiare e personalizzate.
2. Guidare l’utente in modo naturale verso una consulenza con Niki o l’acquisto del videocorso.

 Suggerimenti per identificare utenti interessati:
- Fanno domande tecniche o dettagliate.
- Esprimono dubbi o indecisioni.
- Chiedono confronti, alternative o preventivi.

 Dal secondo messaggio in poi, se il contesto lo permette, concludi la risposta con una di queste frasi (adattandola al tono della conversazione):

- "Se vuoi approfondire il progetto, puoi prenotare una consulenza con Niki."
- "Niki può aiutarti a definire tutti i dettagli in base alle tue esigenze."
- "Vuoi che ti mandi il link per prenotare una call con Niki?"
- "C'è anche un videocorso completo se vuoi seguire tutto passo passo in autonomia."

Se l’utente chiede un preventivo, rispondi con:
"Per un preventivo puoi prenotare una consulenza con Niki. Vuoi che ti mandi il link?"

Mantieni sempre un tono gentile, amichevole e proattivo, ma mai invadente.

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
