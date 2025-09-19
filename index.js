import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// **Tu API Key de Gemini**
// IMPORTANTE: NO subir esto a GitHub. Usar una variable de entorno en producción.
const GEMINI_API_KEY = "TU_API_KEY_AQUI"; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" + GEMINI_API_KEY;

// Base de datos de conocimientos centralizada organizada por módulos
// Se ha añadido un campo 'keywords' para una búsqueda más precisa.
const knowledgeBase = {
  financiero: {
    'solicitudes-asociacion': {
      keywords: ['solicitud', 'asociacion', 'conceptos', 'unidades', 'presupuestal', 'financiero'],
      descripcion: 'Procedimiento de asociación de conceptos a unidades presupuestales.',
      url: '/#/conceptos-ingreso-financiero/gestionar-conceptos-unidades?relation=UAA-CONCEPTO&id=1',
      pasos: [
        'La secretaria de unidad o el jefe de unidad solicita la asociación de conceptos de ingreso a unidades presupuestales.',
        'Debe ser aprobada por el auxiliar o jefe de presupuesto.'
      ]
    },
    'crear-conceptos': {
      keywords: ['crear', 'conceptos', 'ingreso', 'solicitud', 'financiero'],
      descripcion: 'Procedimiento para la creación de solicitudes de conceptos de ingreso.',
      url: '/#/conceptos-ingreso-financiero/crear-solicitud-concepto',
      pasos: [
        'La secretaria o jefe de unidad solicita la creación de un concepto de ingreso, asociando una o varias uniadades presupuestales.',
        'Se asocian los rubros presupuestales por parte del auxiliar o jefe de presupuesto.'
      ]
    }
  },
  rrhh: {
    'contratacion': {
      keywords: ['contratacion', 'contrato', 'empleado', 'hoja de vida', 'rrh'],
      descripcion: 'Proceso de contratación para personal nuevo.',
      url: '/#/rrhh/contratacion',
      pasos: [
        'La secretaria crea la solicitud de contrato.',
        'La secretaria envía la solicitud al jefe.',
        'El jefe aprueba la solicitud.',
        'El analista de contratación aprueba la solicitud.',
        'El analista SIGEP aprueba la solicitud.',
        'El empleado carga la hoja de vida.',
        'El analista SIGEP aprueba la hoja de vida.',
        'Contrato aprobado.'
      ]
    },
    'vacaciones': {
      keywords: ['vacaciones', 'dias', 'descanso', 'viaticos', 'rrhh'],
      descripcion: 'Guía para la solicitud de días de descanso para empleados.',
      url: '/#/rrhh/vacaciones'
    }
  }
};

app.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Falta el mensaje' });
  }

  // Lógica de búsqueda (RAG)
  let relevantKnowledge = null;
  const query = message.toLowerCase();
  for (const moduleKey in knowledgeBase) {
    for (const processKey in knowledgeBase[moduleKey]) {
      const process = knowledgeBase[moduleKey][processKey];
      // Búsqueda más precisa por palabras clave
      const match = process.keywords.some(keyword => query.includes(keyword));
      if (match) {
        relevantKnowledge = process;
        break;
      }
    }
    if (relevantKnowledge) break;
  }

  // **Prompt optimizado para la API de Gemini**
  let systemPrompt = `
    Eres un asistente virtual para el portal SIA Uisard de la Universidad Industrial de Santander.

    Responde SIEMPRE en formato HTML válido.
    - Usa <p> para párrafos.
    - Usa <ul><li>...</li></ul> para listas.
    - Para los saltos de línea, utiliza <br>.
    - Para rutas, genera un enlace así: 🔗 <a href="/ruta/proceso" target="_self">Nombre del proceso</a>.
    - No uses markdown, solo HTML.
    - No cierres con etiquetas <html> ni <body>.
    - Responde en español, de forma clara y breve.
    - Si no tienes información relevante para la pregunta, responde: "Lo siento, no tengo información sobre eso. Por favor revisa en el portal principal."
  `;

  let userPrompt = "";
  if (relevantKnowledge) {
    userPrompt = `
      Basado en la siguiente información, responde a la pregunta del usuario: "${message}"

      Información Relevante:
      Descripción: ${relevantKnowledge.descripcion}
      ${relevantKnowledge.url ? `Ruta: ${relevantKnowledge.url}` : ''}
      ${relevantKnowledge.pasos ? `Pasos: ${relevantKnowledge.pasos.join(' ')}` : ''}
    `;
  } else {
    userPrompt = `Pregunta del usuario: ${message}`;
  }

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    // Otros parámetros de generación si son necesarios
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de la API de Gemini:', errorData);
      return res.status(response.status).json({ error: 'Error en la API de Gemini' });
    }

    const data = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, hubo un problema al generar la respuesta.";
    res.json({ reply: replyText });

  } catch (error) {
    console.error('Error al conectar con la API de Gemini:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(3000, () =>
  console.log('🤖 Chatbot backend con Gemini en http://localhost:3000')
);
