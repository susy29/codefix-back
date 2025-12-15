// src/controllers/activityController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helpers
const normalizeDifficulty = (d) => {
  if (!d) return "EASY";
  const raw = String(d).trim().toUpperCase();

  // Mapeos comunes desde UI
  const map = {
    FACIL: "EASY",
    FÁCIL: "EASY",
    EASY: "EASY",
    BASIC: "BASIC",

    MEDIO: "MEDIUM",
    MEDIUM: "MEDIUM",
    INTERMEDIATE: "INTERMEDIATE",

    DIFICIL: "HARD",
    DIFÍCIL: "HARD",
    HARD: "HARD",
    ADVANCED: "ADVANCED",
  };

  return map[raw] || raw;
};

const allowedActivityTypes = new Set([
  "QUIZ",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "CODE_CHALLENGE",
  "OPEN_QUESTION",
  "QUESTION",
  "EXERCISE",
]);

const allowedDifficulty = new Set([
  "EASY",
  "MEDIUM",
  "HARD",
  "BASIC",
  "INTERMEDIATE",
  "ADVANCED",
]);

// =======================
// ADMIN: Crear QUIZ (manual)
// Body: { subtopicId, title, description, difficulty, questions:[...] }
// =======================
const generateQuiz = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: "No autenticado" });

    const { subtopicId, title, description, difficulty = "EASY", questions = [] } = req.body;

    if (!subtopicId) return res.status(400).json({ error: "subtopicId es requerido" });
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "questions debe ser un arreglo con al menos 1 pregunta" });
    }

    const diff = normalizeDifficulty(difficulty);
    if (!allowedDifficulty.has(diff)) {
      return res.status(400).json({ error: `difficulty inválido: ${diff}` });
    }

    // valida subtopic
    const st = await prisma.subtopic.findUnique({ where: { id: subtopicId }, select: { id: true } });
    if (!st) return res.status(400).json({ error: "subtopicId no existe" });

    const activity = await prisma.activity.create({
      data: {
        subtopicId,
        createdById: req.userId,
        type: "QUIZ",
        difficulty: diff,
        title: title || "Cuestionario",
        description: description || null,
        content: { questions },
        aiGenerated: false,
      },
      include: {
        subtopic: { include: { unit: { include: { subject: true } } } },
      },
    });

    return res.status(201).json({ message: "Quiz creado correctamente", activity });
  } catch (error) {
    console.error("generateQuiz error:", error);
    return res.status(500).json({ error: "Error al crear quiz", detail: error.message });
  }
};

// =======================
// ADMIN: Crear actividad NO-QUIZ (manual)
// Body: { subtopicId, type, title, description, instructions, difficulty }
// =======================
const generateActivity = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: "No autenticado" });

    const {
      subtopicId,
      type = "OPEN_QUESTION",
      title,
      description,
      instructions,
      difficulty = "EASY",
    } = req.body;

    if (!subtopicId) return res.status(400).json({ error: "subtopicId es requerido" });
    if (!instructions || String(instructions).trim().length === 0) {
      return res.status(400).json({ error: "instructions es requerido" });
    }

    const safeType = String(type).trim().toUpperCase();
    if (!allowedActivityTypes.has(safeType) || safeType === "QUIZ") {
      return res.status(400).json({ error: `type inválido para generateActivity: ${safeType}` });
    }

    const diff = normalizeDifficulty(difficulty);
    if (!allowedDifficulty.has(diff)) {
      return res.status(400).json({ error: `difficulty inválido: ${diff}` });
    }

    const st = await prisma.subtopic.findUnique({ where: { id: subtopicId }, select: { id: true } });
    if (!st) return res.status(400).json({ error: "subtopicId no existe" });

    const activity = await prisma.activity.create({
      data: {
        subtopicId,
        createdById: req.userId,
        type: safeType,
        difficulty: diff,
        title: title || "Actividad",
        description: description || null,
        content: { instructions: String(instructions).trim() }, // ✅ Json
        aiGenerated: false,
      },
      include: {
        subtopic: { include: { unit: { include: { subject: true } } } },
      },
    });

    return res.status(201).json({ message: "Actividad creada correctamente", activity });
  } catch (error) {
    console.error("generateActivity error:", error);
    return res.status(500).json({ error: "Error al crear actividad", detail: error.message });
  }
};

// =======================
// CONSULTAR: Actividades por subtema
// =======================
const getActivitiesBySubtopic = async (req, res) => {
  try {
    const { subtopicId } = req.params;

    const activities = await prisma.activity.findMany({
      where: { subtopicId },
      orderBy: { createdAt: "asc" },
    });

    return res.json({ activities });
  } catch (error) {
    console.error("getActivitiesBySubtopic error:", error);
    return res.status(500).json({ error: "Error al obtener actividades" });
  }
};

// =======================
// CONSULTAR: Actividad por ID
// =======================
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
    console.error("getActivityById error:", error);
    return res.status(500).json({ error: "Error al obtener actividad" });
  }
};

// =======================
// ADMIN: Ver submissions de una actividad
// =======================
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
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    return res.json({ submissions });
  } catch (error) {
    console.error("getAllSubmissions error:", error);
    return res.status(500).json({ error: "Error al obtener entregas" });
  }
};

// =======================
// ESTUDIANTE: submitActivity
// answers Json (quiz: array; open: string)
// =======================
const submitActivity = async (req, res) => {
  try {
    const { activityId, answers } = req.body;
    const userId = req.userId;

    if (!userId) return res.status(401).json({ error: "No autenticado" });
    if (!activityId) return res.status(400).json({ error: "activityId es requerido" });

    const existing = await prisma.submission.findFirst({
      where: { activityId, userId },
      orderBy: { completedAt: "desc" },
    });

    if (existing) {
      return res.status(400).json({
        error: "Ya entregaste esta actividad. No puedes enviarla de nuevo.",
        submission: existing,
      });
    }

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) return res.status(404).json({ error: "Actividad no encontrada" });

    let score = null;
    let feedback = "";
    let detailedResults = [];

    if (activity.type === "QUIZ") {
      const questions = activity.content?.questions || [];
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Quiz sin preguntas válidas" });
      }

      const safeAnswers = Array.isArray(answers) ? answers : [];
      let correct = 0;

      questions.forEach((q, i) => {
        const picked = safeAnswers[i];
        const isCorrect = picked === q.correctAnswer;
        if (isCorrect) correct++;

        detailedResults.push({
          questionNumber: i + 1,
          question: q.question,
          yourAnswer: typeof picked === "number" ? q.options?.[picked] : "No respondida",
          correctAnswer: q.options?.[q.correctAnswer],
          isCorrect,
          explanation: q.explanation,
        });
      });

      score = (correct / questions.length) * 100;
      feedback = `Respondiste correctamente ${correct} de ${questions.length} preguntas (${score.toFixed(1)}%)`;
    } else {
      // OPEN / CODE / etc. (si ya tienes IA en otro archivo, aquí la conectas)
      score = 100;
      feedback = "Respuesta enviada correctamente";
    }

    const submission = await prisma.submission.create({
      data: {
        userId,
        activityId,
        answers, // Json
        score,
        feedback,
        status: "COMPLETED",
      },
    });

    return res.status(201).json({ message: "Actividad completada", submission, score, feedback, detailedResults });
  } catch (error) {
    console.error("submitActivity error:", error);
    return res.status(500).json({ error: "Error al enviar actividad", detail: error.message });
  }
};

// =======================
// ESTUDIANTE: obtener su submission
// =======================
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
    console.error("getMySubmission error:", error);
    return res.status(500).json({ error: "Error al obtener submission" });
  }
};

const getStudentHistory = async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { userId: req.userId },
      include: {
        activity: {
          include: {
            subtopic: { include: { unit: { include: { subject: true } } } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    return res.json({ submissions });
  } catch (error) {
    console.error("getStudentHistory error:", error);
    return res.status(500).json({ error: "Error al obtener historial" });
  }
};

const regenerateQuestionController = async (req, res) => {
  return res.status(501).json({ error: "regenerateQuestionController no implementado" });
};

const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.activity.delete({ where: { id } });
    return res.json({ message: "Actividad eliminada correctamente" });
  } catch (error) {
    console.error("deleteActivity error:", error);
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
