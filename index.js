import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Aquí guardamos los historiales en memoria (puedes cambiarlo por Redis o DB si quieres persistencia real)
const conversations = {};

app.post("/chat", async (req, res) => {
  const { userId, message } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Falta userId" });
  }

  // Crear historial si no existe
  if (!conversations[userId]) {
    conversations[userId] = [];
  }

  // Agregar mensaje del usuario al historial
  conversations[userId].push({ role: "user", content: message });

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "portalbot",
      num_predict: 200,
      stream: false,
      messages: conversations[userId],
    }),
  });

  // 🔹 Procesar respuesta en streaming JSONL
  let reply = "";
  const decoder = new TextDecoder("utf-8");

  for await (const chunk of response.body) {
    const text = decoder.decode(chunk, { stream: true }).trim();

    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          reply += json.message.content;
        }
      } catch (e) {
        console.error("Error parseando:", line);
      }
    }
  }

  // Guardar respuesta del bot en historial
  conversations[userId].push({ role: "assistant", content: reply });

  res.json({ reply });
});

app.listen(3000, () =>
  console.log("🤖 Chatbot backend con historial en http://localhost:3000")
);
