require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));

const fetch = global.fetch;

app.post("/whatsapp", async (req, res) => {
  const userMessage = req.body.Body;
  const sender = req.body.From;

  console.log(`📩 Messaggio da ${sender}: ${userMessage}`);

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
          content: "Rispondi come se fossi un camperizzatore di van professionista. Sii gentile e informativo",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  });

  const data = await openaiRes.json();
  const reply = data?.choices?.[0]?.message?.content || "Errore nella risposta.";

  res.set("Content-Type", "text/xml");
  res.send(`
    <Response>
      <Message>${reply}</Message>
    </Response>
  `);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server avviato su http://localhost:${PORT}/whatsapp`));
