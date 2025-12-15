const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Genera una actividad educativa usando Claude
 */
async function generateActivity(context, userPrompt = '') {
  const { subject, unit, subtopic, type, difficulty, questionsCount } = context;

  const typeInstructions = {
    QUIZ: 'cuestionario de opción múltiple con 4 opciones',
    MULTIPLE_CHOICE: 'preguntas de opción múltiple con 4 opciones',
    TRUE_FALSE: 'preguntas de verdadero o falso',
    CODE_CHALLENGE: 'retos de programación con código',
    OPEN_QUESTION: 'preguntas abiertas que requieren respuesta escrita',
    QUESTION: 'preguntas educativas',
    EXERCISE: 'ejercicios prácticos'
  };

  const difficultyInstructions = {
    EASY: 'conceptos básicos y fundamentales, claros y directos',
    MEDIUM: 'aplicación de conceptos y resolución de problemas moderados',
    HARD: 'análisis profundo, casos complejos y razonamiento avanzado',
    BASIC: 'conceptos básicos y fundamentales',
    INTERMEDIATE: 'nivel intermedio de complejidad',
    ADVANCED: 'nivel avanzado y complejo'
  };

  const systemPrompt = `Eres un experto profesor universitario creando material educativo de alta calidad.

**CONTEXTO EDUCATIVO:**
- Materia: ${subject}
- Unidad: ${unit}
- Subtema: ${subtopic}
- Tipo de actividad: ${typeInstructions[type] || 'cuestionario'}
- Dificultad: ${difficulty} (${difficultyInstructions[difficulty]})
- Cantidad de preguntas: ${questionsCount}

${userPrompt ? `**INSTRUCCIONES ADICIONALES DEL PROFESOR:**\n${userPrompt}\n` : ''}

**TU TAREA:**
Genera un ${typeInstructions[type]} educativo de calidad universitaria.

**FORMATO DE RESPUESTA (JSON):**
{
  "title": "Título atractivo y descriptivo del cuestionario",
  "description": "Descripción breve de qué cubre esta actividad",
  "estimatedTime": 15,
  "questions": [
    {
      "id": 1,
      "question": "Pregunta clara y bien formulada",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": 0,
      "explanation": "Explicación detallada de por qué esta respuesta es correcta",
      "points": 10
    }
  ]
}

**REGLAS IMPORTANTES:**
1. Todas las preguntas deben ser claras y sin ambigüedades
2. Las opciones incorrectas deben ser plausibles pero claramente incorrectas
3. Cada pregunta debe tener una explicación educativa
4. Varía los puntos según la complejidad (5-20 puntos)
5. El campo "correctAnswer" es el índice (0-3) de la respuesta correcta
6. Responde ÚNICAMENTE con el JSON válido, sin texto adicional

**GENERA EL CUESTIONARIO AHORA:**`;

  try {
    console.log('🤖 Generando actividad con IA...');
    console.log('📝 Contexto:', { subject, unit, subtopic, type, difficulty });
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: systemPrompt
      }]
    });

    const content = message.content[0].text;
    console.log('✅ Respuesta recibida de Claude');

    // Extraer JSON de la respuesta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('❌ No se encontró JSON en la respuesta:', content.substring(0, 200));
      throw new Error('No se pudo extraer JSON de la respuesta de la IA');
    }

    const generated = JSON.parse(jsonMatch[0]);
    
    // Validar estructura
    if (!generated.title || !generated.questions || !Array.isArray(generated.questions)) {
      throw new Error('Estructura JSON inválida recibida de la IA');
    }

    // Validar que cada pregunta tenga la estructura correcta
    generated.questions.forEach((q, index) => {
      if (!q.question || !q.options || !Array.isArray(q.options)) {
        throw new Error(`Pregunta ${index + 1} tiene estructura inválida`);
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        throw new Error(`Pregunta ${index + 1} tiene correctAnswer inválido`);
      }
    });

    console.log(`✅ Actividad generada: "${generated.title}" con ${generated.questions.length} preguntas`);
    
    return generated;

  } catch (error) {
    console.error('❌ Error generando actividad con IA:', error);
    throw new Error(`Error al generar actividad: ${error.message}`);
  }
}

/**
 * Regenera una pregunta específica
 */
async function regenerateQuestion(originalQuestion, context, reason = '') {
  const prompt = `Regenera esta pregunta mejorándola:

**Pregunta Original:**
${originalQuestion.question}

**Opciones:**
${originalQuestion.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

**Respuesta Correcta:** Opción ${originalQuestion.correctAnswer + 1} - ${originalQuestion.options[originalQuestion.correctAnswer]}

**Contexto:** 
- Materia: ${context.subject}
- Subtema: ${context.subtopic}
- Dificultad: ${context.difficulty}

${reason ? `**Razón para regenerar:** ${reason}` : ''}

Genera una nueva versión de esta pregunta manteniendo el mismo concepto pero con diferente redacción y opciones.

Responde ÚNICAMENTE en formato JSON:
{
  "question": "Nueva pregunta reformulada",
  "options": ["Nueva opción A", "Nueva opción B", "Nueva opción C", "Nueva opción D"],
  "correctAnswer": 0,
  "explanation": "Explicación clara de por qué esta respuesta es correcta",
  "points": 10
}`;

  try {
    console.log('🔄 Regenerando pregunta...');
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = message.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }

    const regenerated = JSON.parse(jsonMatch[0]);
    
    // Validar estructura
    if (!regenerated.question || !regenerated.options || regenerated.correctAnswer === undefined) {
      throw new Error('Estructura JSON inválida en pregunta regenerada');
    }

    console.log('✅ Pregunta regenerada exitosamente');
    return regenerated;

  } catch (error) {
    console.error('❌ Error regenerando pregunta:', error);
    throw error;
  }
}

module.exports = {
  generateActivity,
  regenerateQuestion
};