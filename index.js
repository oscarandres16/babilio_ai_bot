import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import knowledgeBase from './knowledge_base_v2.json' with { type: 'json' };  // Importa la base de conocimientos desde un archivo JSON

const app = express();
app.use(cors());
app.use(express.json());

// **Tu API Key de Gemini**
// IMPORTANTE: NO subir esto a GitHub. Usar una variable de entorno en producción.
const GEMINI_API_KEY = "AIzaSyDhRr3oUvssYVeenmGk56_X6QwHFvT-sws";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" +
  GEMINI_API_KEY;

/**
 * Busca el conocimiento relevante en la base de datos local.
 * @param {string} query La pregunta del usuario.
 * @returns {object|null} El objeto de proceso relevante o null si no se encuentra.
 */
function findRelevantKnowledge(query) {
  const lowerQuery = query.toLowerCase();

  // Recorre los módulos (financiero, rrhh)
  for (const moduleKey in knowledgeBase.modulos) {
    const module = knowledgeBase.modulos[moduleKey];
    // Recorre los procesos dentro de cada módulo
    for (const process of module.procesos) {
      // Busca coincidencias en las palabras clave
      if (process.palabras_clave && process.palabras_clave.some(keyword => lowerQuery.includes(keyword))) {
        return process;
      }
    }
  }
  return null;
}

app.post("/chat", async (req, res) => {
  const { message, rol, nombre, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Falta el mensaje" });
  }

  // Lógica de búsqueda (RAG) en el objeto JSON local
  const relevantKnowledge = findRelevantKnowledge(message);

  let systemPrompt = `
    Eres un asistente virtual llamado "Babilio AI (beta)". Tu propósito es proporcionar información clara, concisa y precisa sobre los procesos internos de la Universidad Industrial de Santander (UIS), basándote únicamente en el contexto que se te proporciona y el historial de la conversación.

    Reglas de formato:
    - Utiliza etiquetas <p> para párrafos.
    - Usa <ul><li>...</li></ul> para listas de pasos.
    - Para saltos de línea, usa <br>.
    - Para las rutas, genera un enlace con el ícono y la etiqueta <a>, así: 🔗 <a href="/ruta/proceso" target="_self">Nombre del proceso</a>.
    - NO uses markdown, solo HTML.
    - Responde siempre en español.
    - Explica lo mejor posible.
    - Si el mensaje anterior es sobre un proceso y la nueva pregunta está relacionada, no repitas la información; continúa la conversación de forma fluida.

    Si el contexto no contiene información relevante, si no encuentras nada responde amablemente que no tienes la información y sugiere al usuario contactar con la mesa de ayuda (https://mda.uis.edu.co/, target="_blank") o hazle preguntas al usuario.
  `;

  let userPrompt = "";
  console.log('relevantKnowledge', relevantKnowledge);
  if (relevantKnowledge) {
    const formattedPasos = relevantKnowledge.flujo && relevantKnowledge.flujo.length > 0 ? `
          <ul>
              ${relevantKnowledge.flujo.map(p => `<li>**Paso ${p.paso}:** ${p.accion} <br> **Responsable:** ${p.responsable} <br> **Detalles:** ${p.detalles}</li>`).join('')}
          </ul>
      ` : '';
    const formattedUrl = relevantKnowledge.url ? `🔗 <a href="${relevantKnowledge.url}">${relevantKnowledge.titulo}</a>` : '';

    userPrompt = `
          Contexto de la base de conocimientos:
          Título: ${relevantKnowledge.titulo}
          Propósito: ${relevantKnowledge.proposito}
          ${formattedPasos}
          ${formattedUrl}

          Rol usuario: ${rol}
          Nombre usuario: ${nombre}

          Historial de la conversación:
          ${history.map(entry => `Usuario: ${entry.user} \nAsistente: ${entry.assistant}`).join('\n')}

          Pregunta del usuario: "${message}"
      `;
  } else {
    userPrompt = `
      Rol usuario: ${rol}
      Nombre usuario: ${nombre}

      Historial de la conversación:
      ${history.map(entry => `Usuario: ${entry.user} \nAsistente: ${entry.assistant}`).join('\n')}

      Pregunta del usuario: "${message}"
    `;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error de la API de Gemini:", errorData);
      return res
        .status(response.status)
        .json({ error: "Error en la API de Gemini" });
    }

    const data = await response.json();
    const replyText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Lo siento, hubo un problema al generar la respuesta.";
    res.json({ reply: replyText, tutorialGuiado: relevantKnowledge?.tutorial_guiado ?? null });
  } catch (error) {
    console.error("Error al conectar con la API de Gemini:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(3000, () =>
  console.log("🤖 Chatbot backend con Gemini en http://localhost:3000")
);
