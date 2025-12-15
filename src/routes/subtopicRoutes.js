// routes/subtopicRoutes.js
const express = require("express");
const router = express.Router();
const { getSubtopicById } = require("../controllers/subtopicController");
const authMiddleware = require("../middlewares/authMiddleware");

// Obtener un subtema por id
router.get("/subtopics/:id", authMiddleware, getSubtopicById);

module.exports = router;
