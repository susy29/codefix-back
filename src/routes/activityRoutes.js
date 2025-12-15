// src/routes/activityRoutes.js
const express = require("express");
const router = express.Router();

const activityController = require("../controllers/activityController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

router.use(authMiddleware);

// Admin: generar
router.post("/activities/generate-quiz", adminMiddleware, activityController.generateQuiz);
router.post("/activities/generate", adminMiddleware, activityController.generateActivity);

// Consultar
router.get("/subtopics/:subtopicId/activities", activityController.getActivitiesBySubtopic);
router.get("/activities/:id", activityController.getActivityById);

// Admin: ver entregas
router.get("/activities/:activityId/submissions", adminMiddleware, activityController.getAllSubmissions);

// Estudiante: enviar / ver su entrega
router.post("/activities/submit", activityController.submitActivity);
router.get("/activities/:activityId/my-submission", activityController.getMySubmission);
router.get("/my-history", activityController.getStudentHistory);

// Admin extra
router.post("/activities/:id/regenerate-question", adminMiddleware, activityController.regenerateQuestionController);
router.delete("/activities/:id", adminMiddleware, activityController.deleteActivity);

module.exports = router;
