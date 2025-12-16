// src/services/aiService.js
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function extractJson(text) {
  const s = String(text || "");
  const match = s.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se pudo extraer JSON de la respuesta de la IA.");
  return JSON.parse(match[0]);
}

/**
 * Genera una actividad educativa usando Claude (QUIZ / OPEN_QUESTION / CODE_CHALLENGE)
 */
async function generateActivity(context, userPrompt = "") {
  const { subject, unit, subtopic, type, difficulty, questionsCount, studyText } = context;

  const typeInstructions = {
    QUIZ: "cuestionario de opción múltiple con 4 opciones",
    MULTIPLE_CHOICE: "preguntas de opción múltiple con 4 opciones",
    TRUE_FALSE: "preguntas de verdadero o falso",
    CODE_CHALLENGE: "retos de programación con código",
    OPEN_QUESTION: "preguntas abiertas que requieren respuesta escrita",
    QUESTION: "preguntas educativas",
    EXERCISE: "ejercicios prácticos",
  };

  const difficultyInstructions = {
    EASY: "conceptos básicos y fundamentales, claros y directos",
    MEDIUM: "aplicación de conceptos y resolución de problemas moderados",
    HARD: "análisis profundo, casos complejos y razonamiento avanzado",
    BASIC: "conceptos básicos y fundamentales",
    INTERMEDIATE: "nivel intermedio de complejidad",
    ADVANCED: "nivel avanzado y complejo",
  };

  // Importante: meter el texto del subtema para que sí se base en eso
  const systemPrompt = `Eres un profesor universitario experto creando actividades educativas de alta calidad.

CONTEXTO:
- Materia: ${subject}
- Unidad: ${unit}
- Subtema: ${subtopic}
- Tipo de actividad: ${type} (${typeInstructions[type] || "actividad"})
- Dificultad: ${difficulty} (${difficultyInstructions[difficulty] || "nivel medio"})
- Cantidad de preguntas (si aplica): ${questionsCount}

TEXTO BASE DEL SUBTEMA (lo que el alumno debe estudiar):
${studyText || "(vacío)"}

${userPrompt ? `INSTRUCCIONES DEL PROFESOR:\n${userPrompt}\n` : ""}

REGLAS:
- Debes basarte EN EL TEXTO BASE del subtema.
- Para QUIZ, genera preguntas con 4 opciones, correctAnswer (0..3), explanation y points (5..20).
- Para OPEN_QUESTION o CODE_CHALLENGE, genera un enunciado completo con:
  - objetivo
  - descripción
  - criterios de evaluación (con porcentajes o puntos)
  - entregables
  - preguntas de reflexión (si aplica)
- Responde ÚNICAMENTE con JSON válido.

FORMATO JSON:
{
  "title": "Título",
  "description": "Descripción",
  "estimatedTime": 15,
  "studyText": "Texto base a estudiar (puedes resumirlo o dejarlo igual)",
  "instructions": "Instrucciones breves",
  "generatedText": "Enunciado completo (Moodle-like)",
  "questions": [
    {
      "id": 1,
      "question": "Pregunta",
      "options": ["A","B","C","D"],
      "correctAnswer": 0,
      "explanation": "Explicación",
      "points": 10
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    temperature: 0.7,
    messages: [{ role: "user", content: systemPrompt }],
  });

  const content = message.content?.[0]?.text ?? "";
  const generated = extractJson(content);

  // Validaciones mínimas
  if (!generated.title) generated.title = "Actividad generada";
  if (!generated.description) generated.description = "";
  if (!generated.estimatedTime) generated.estimatedTime = 15;

  // Para QUIZ, aseguramos estructura de questions
  if (type === "QUIZ") {
    if (!Array.isArray(generated.questions) || generated.questions.length === 0) {
      throw new Error("La IA no devolvió questions para QUIZ.");
    }
    generated.questions.forEach((q, i) => {
      if (!q.question || !Array.isArray(q.options)) {
        throw new Error(`Pregunta ${i + 1} inválida`);
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new Error(`Pregunta ${i + 1} correctAnswer inválido`);
      }
    });
  } else {
    // Para NO-QUIZ, aseguramos texto
    if (!generated.generatedText && !generated.instructions) {
      generated.instructions = userPrompt || "Lee el enunciado y responde.";
      generated.generatedText = generated.instructions;
    }
  }

  // Garantizar que studyText exista (para mostrar antes del quiz)
  if (!generated.studyText) generated.studyText = studyText || "";

  return generated;
}

/**
 * ✅ Califica una entrega abierta/código con base en el enunciado y criterios
 */
async function evaluateOpenSubmission({
  activityType,
  title,
  studyText,
  instructions,
  generatedText,
  studentAnswer,
}) {
  const prompt = `Eres un profesor universitario. Debes CALIFICAR una entrega.

TIPO: ${activityType}
TÍTULO: ${title}

=== TEXTO BASE (para estudiar) ===
${studyText || "(vacío)"}

=== ENUNCIADO / INSTRUCCIONES ===
${generatedText || instructions || "(vacío)"}

=== RESPUESTA DEL ESTUDIANTE ===
${studentAnswer || "(vacío)"}

TAREA:
1) Evalúa si cumple las instrucciones y criterios del enunciado.
2) Asigna score 0..100.
3) Retroalimentación específica.
4) Si hay criterios (porcentaje/puntos), haz un desglose.

RESPONDE SOLO JSON VÁLIDO:
{
  "score": 0,
  "feedback": "texto",
  "rubric": [
    { "criterion": "Criterio", "points": 0, "maxPoints": 0, "notes": "..." }
  ],
  "strengths": ["..."],
  "improvements": ["..."]
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1800,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content?.[0]?.text ?? "";
  const parsed = extractJson(content);

  let score = parsed.score;
  if (typeof score === "string") score = Number(score);
  if (typeof score !== "number" || Number.isNaN(score)) score = 0;
  score = Math.max(0, Math.min(100, score));

  const feedback = String(parsed.feedback ?? "").trim() || "Sin retroalimentación.";
  const rubric = Array.isArray(parsed.rubric) ? parsed.rubric : [];
  const strengths = Array.isArray(parsed.strengths) ? parsed.strengths : [];
  const improvements = Array.isArray(parsed.improvements) ? parsed.improvements : [];

  return { score, feedback, rubric, strengths, improvements };
}

module.exports = {
  generateActivity,
  evaluateOpenSubmission,
};
