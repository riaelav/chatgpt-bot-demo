require("dotenv").config();
const fs = require("fs");

// Usa il fetch nativo di Node.js v18
const fetch = global.fetch;

// Leggi il contenuto del transcript
const transcript = fs.readFileSync("./transcript.txt", "utf-8");

// Funzione per inviare la domanda a ChatGPT
async function askChatGPT(userInput) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
          content: "Rispondi usando queste informazioni:\n\n" + transcript,
        },
        {
          role: "user",
          content: userInput,
        },
      ],
    }),
  });

  const data = await res.json();

  // Mostra l'intera risposta per debug
  console.log("\n Risposta grezza dell'API:\n", JSON.stringify(data, null, 2));

  // Se c'è un errore, lo stampiamo
  if (!res.ok || !data.choices) {
    console.error("\n❌ Errore nella risposta OpenAI.");
    return;
  }

  // Risposta dell'assistente
  console.log("\nChatGPT risponde:\n", data.choices[0].message.content);
}
