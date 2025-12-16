// src/controllers/activityController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { generateActivity: aiGenerateActivity, evaluateOpenSubmission } = require("../services/aiService");

/**
 * Mapear tipos de UI -> enum ActivityType de Prisma
 */
function mapFrontTypeToActivityType(frontType) {
  const t = String(frontType || "").toUpperCase();

  // Tu enum real:
  // QUIZ, MULTIPLE_CHOICE, TRUE_FALSE, CODE_CHALLENGE, OPEN_QUESTION, QUESTION, EXERCISE
  if (t === "QUIZ" || t === "QUESTIONNAIRE") return "QUIZ";
  if (t === "CODE" || t === "CODE_CHALLENGE") return "CODE_CHALLENGE";
  if (t === "RESEARCH" || t === "ESSAY" || t === "OPEN_QUESTION") return "OPEN_QUESTION";
  if (t === "MULTIPLE_CHOICE") return "MULTIPLE_CHOICE";
  if (t === "TRUE_FALSE") return "TRUE_FALSE";

  return "OPEN_QUESTION";
}

/**
 * ===== ADMIN: Generar QUIZ con IA basado en texto del subtema =====
 * Body:
 * { subtopicId, title, description, difficulty, numberOfQuestions, instructions }
 */
const generateQuiz = async (req, res) => {
  try {
    const {
      subtopicId,
      title,
      description,
      difficulty = "BASIC",
      numberOfQuestions = 5,
      instructions = "",
    } = req.body;

    if (!subtopicId) return res.status(400).json({ error: "subtopicId es requerido" });

    const st = await prisma.subtopic.findUnique({
      where: { id: subtopicId },
      include: { unit: { include: { subject: true } } },
    });
    if (!st) return res.status(400).json({ error: "subtopicId no existe" });

    const subjectName = st.unit?.subject?.name || "Materia";
    const unitName = st.unit?.name || "Unidad";
    const subtopicName = st.name || "Subtema";

    const studyText = (st.content || st.description || st.name || "").toString();

    const generated = await aiGenerateActivity(
      {
        subject: subjectName,
        unit: unitName,
        subtopic: subtopicName,
        type: "QUIZ",
        difficulty,
        questionsCount: Number(numberOfQuestions) || 5,
        studyText,
      },
      String(instructions || "").trim()
    );

    const questions = generated.questions;

    const activity = await prisma.activity.create({
      data: {
        subtopicId,
        createdById: req.userId,
        type: "QUIZ",
        difficulty,
        title: generated.title || title || `Cuestionario: ${st.name}`,
        description: generated.description || description || "Cuestionario generado con IA",
        content: {
          // Moodle-like
          studyText: generated.studyText || studyText,
          instructions: generated.instructions || String(instructions || "").trim(),
          generatedText: generated.generatedText || "",
          questions,
          estimatedTime: generated.estimatedTime || 15,
          // guardamos el promptText/extra
          meta: { source: "claude", model: "claude-sonnet-4-20250514" },
        },
        aiGenerated: true,
      },
      include: {
        subtopic: { include: { unit: { include: { subject: true } } } },
      },
    });

    return res.status(201).json({ message: "Quiz creado correctamente", activity });
  } catch (error) {
    console.error("generateQuiz error:", error);
    return res.status(500).json({ error: "Error al crear quiz" });
  }
};

/**
 * ===== ADMIN: Generar actividad NO-QUIZ con IA =====
 * Body:
 * { subtopicId, type, title, description, instructions, difficulty }
 */
const generateActivity = async (req, res) => {
  try {
    const {
      subtopicId,
      type = "OPEN_QUESTION", // puede venir RESEARCH/ESSAY/CODE/etc
      title,
      description,
      instructions,
      difficulty = "BASIC",
    } = req.body;

    if (!subtopicId) return res.status(400).json({ error: "subtopicId es requerido" });

    const st = await prisma.subtopic.findUnique({
      where: { id: subtopicId },
      include: { unit: { include: { subject: true } } },
    });
    if (!st) return res.status(400).json({ error: "subtopicId no existe" });

    const mappedType = mapFrontTypeToActivityType(type);
    if (mappedType === "QUIZ") {
      return res.status(400).json({ error: "Para QUIZ usa /activities/generate-quiz" });
    }

    if (!instructions || String(instructions).trim().length === 0) {
      return res.status(400).json({ error: "instructions es requerido" });
    }

    const subjectName = st.unit?.subject?.name || "Materia";
    const unitName = st.unit?.name || "Unidad";
    const subtopicName = st.name || "Subtema";

    const studyText = (st.content || st.description || st.name || "").toString();

    const generated = await aiGenerateActivity(
      {
        subject: subjectName,
        unit: unitName,
        subtopic: subtopicName,
        type: mappedType,
        difficulty,
        questionsCount: 0,
        studyText,
      },
      String(instructions).trim()
    );

    const activity = await prisma.activity.create({
      data: {
        subtopicId,
        createdById: req.userId,
        type: mappedType, // OPEN_QUESTION / CODE_CHALLENGE / TRUE_FALSE etc
        difficulty,
        title: generated.title || title || `Actividad: ${st.name}`,
        description: generated.description || description || "Actividad generada con IA",
        content: {
          // Moodle-like
          studyText: generated.studyText || studyText,
          instructions: generated.instructions || String(instructions).trim(),
          generatedText: generated.generatedText || generated.instructions || "",
          estimatedTime: generated.estimatedTime || 15,
          meta: { source: "claude", model: "claude-sonnet-4-20250514" },
        },
        aiGenerated: true,
      },
      include: {
        subtopic: { include: { unit: { include: { subject: true } } } },
      },
    });

    return res.status(201).json({ message: "Actividad creada correctamente", activity });
  } catch (error) {
    console.error("generateActivity error:", error);
    return res.status(500).json({ error: "Error al crear actividad" });
  }
};

/**
 * CONSULTAR: actividades por subtema
 */
const getActivitiesBySubtopic = async (req, res) => {
  try {
    const { subtopicId } = req.params;

    const activities = await prisma.activity.findMany({
      where: { subtopicId },
      orderBy: { createdAt: "asc" },
    });

    return res.json({ activities });
  } catch (error) {
    console.error("Error en getActivitiesBySubtopic:", error);
    return res.status(500).json({ error: "Error al obtener actividades" });
  }
};

/**
 * CONSULTAR: actividad por ID (incluye subtopic->unit->subject)
 */
const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        subtopic: { include: { unit: { include: { subject: true } } } },
      },
    });

    if (!activity) return res.status(404).json({ error: "Actividad no encontrada" });
    return res.json({ activity });
  } catch (error) {
    console.error("Error en getActivityById:", error);
    return res.status(500).json({ error: "Error al obtener actividad" });
  }
};

/**
 * ADMIN: ver submissions de una actividad
 */
const getAllSubmissions = async (req, res) => {
  try {
    const { activityId } = req.params;

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });
    if (!activity) return res.status(404).json({ error: "Actividad no encontrada" });

    const submissions = await prisma.submission.findMany({
      where: { activityId },
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { completedAt: "desc" },
    });

    return res.json({ submissions });
  } catch (error) {
    console.error("Error en getAllSubmissions:", error);
    return res.status(500).json({ error: "Error al obtener entregas" });
  }
};

/**
 * ESTUDIANTE: Submit (bloquea reintento)
 * ✅ QUIZ: califica normal
 * ✅ NO-QUIZ: califica con IA basado en studyText + generatedText + respuesta
 */
const submitActivity = async (req, res) => {
  try {
    const { activityId, answers } = req.body;
    const userId = req.userId;

    if (!activityId) return res.status(400).json({ error: "activityId es requerido" });

    const existingSubmission = await prisma.submission.findFirst({
      where: { activityId, userId },
      orderBy: { completedAt: "desc" },
    });

    if (existingSubmission) {
      return res.status(400).json({
        error: "Ya entregaste esta actividad. No puedes enviarla de nuevo.",
        submission: existingSubmission,
      });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        subtopic: { select: { name: true, content: true, description: true } },
      },
    });
    if (!activity) return res.status(404).json({ error: "Actividad no encontrada" });

    let score = null;
    let feedback = "";
    let detailedResults = [];
    let aiReview = null;

    if (activity.type === "QUIZ") {
      const questions = activity.content?.questions || [];

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "El quiz no tiene preguntas en content.questions" });
      }

      const safeAnswers = Array.isArray(answers) ? answers : [];
      let correct = 0;

      questions.forEach((q, index) => {
        const picked = safeAnswers[index];
        const isCorrect = picked === q.correctAnswer;
        if (isCorrect) correct++;

        detailedResults.push({
          questionNumber: index + 1,
          question: q.question,
          yourAnswer: typeof picked === "number" ? q.options?.[picked] : "No respondida",
          correctAnswer: q.options?.[q.correctAnswer],
          isCorrect,
          explanation: q.explanation,
          points: q.points ?? null,
        });
      });

      score = (correct / questions.length) * 100;
      feedback = `Respondiste correctamente ${correct} de ${questions.length} preguntas (${score.toFixed(1)}%)`;
    } else {
      // NO-QUIZ: evaluar con IA
      const studentAnswer =
        Array.isArray(answers) && answers.length > 0
          ? String(answers[0])
          : typeof answers === "string"
          ? answers
          : JSON.stringify(answers ?? "");

      const studyText =
        activity.content?.studyText ||
        activity.subtopic?.content ||
        activity.subtopic?.description ||
        "";

      const instructions = activity.content?.instructions || "";
      const generatedText = activity.content?.generatedText || "";

      aiReview = await evaluateOpenSubmission({
        activityType: activity.type,
        title: activity.title,
        studyText,
        instructions,
        generatedText,
        studentAnswer,
      });

      score = aiReview.score;
      feedback = aiReview.feedback;
    }

    const submission = await prisma.submission.create({
      data: {
        userId,
        activityId,
        answers,
        score,
        feedback,
        status: "COMPLETED",
      },
    });

    return res.status(201).json({
      message: "Actividad completada",
      submission,
      score,
      feedback,
      detailedResults, // solo QUIZ
      aiReview,        // solo NO-QUIZ (rubric/strengths/improvements)
    });
  } catch (error) {
    console.error("Error en submitActivity:", error);
    return res.status(500).json({ error: "Error al enviar actividad" });
  }
};

/**
 * ESTUDIANTE: ver su submission
 */
const getMySubmission = async (req, res) => {
  try {
    const { activityId } = req.params;

    const submission = await prisma.submission.findFirst({
      where: { activityId, userId: req.userId },
      orderBy: { completedAt: "desc" },
    });

    if (!submission) return res.status(404).json({ error: "No se encontró entrega de esta actividad." });
    return res.json({ submission });
  } catch (error) {
    console.error("Error en getMySubmission:", error);
    return res.status(500).json({ error: "Error al obtener submission" });
  }
};

/**
 * HISTORIAL del estudiante
 */
const getStudentHistory = async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: req.userId },
      include: {
        activity: { include: { subtopic: { include: { unit: { include: { subject: true } } } } } },
      },
      orderBy: { completedAt: "desc" },
    });
    return res.json({ submissions });
  } catch (error) {
    console.error("Error en getStudentHistory:", error);
    return res.status(500).json({ error: "Error al obtener historial" });
  }
};

/**
 * Admin: stub regenerar pregunta
 */
const regenerateQuestionController = async (req, res) => {
  return res.status(501).json({ error: "regenerateQuestionController no implementado" });
};

/**
 * Admin: eliminar actividad
 */
const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.activity.delete({ where: { id } });
    return res.json({ message: "Actividad eliminada correctamente" });
  } catch (error) {
    console.error("Error en deleteActivity:", error);
    return res.status(500).json({ error: "Error al eliminar actividad" });
  }
};

module.exports = {
  generateQuiz,
  generateActivity,
  getActivitiesBySubtopic,
  getActivityById,
  getAllSubmissions,
  submitActivity,
  getMySubmission,
  getStudentHistory,
  regenerateQuestionController,
  deleteActivity,
};
