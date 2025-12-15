// src/routes/progressRoutes.js - AGREGAR esta línea

const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Rutas existentes...
router.get('/user/:userId/stats', progressController.getUserStats);
router.get('/user/:userId/subject/:subjectId', progressController.getSubjectProgress);
router.post('/', progressController.saveProgress);

// AGREGAR ESTA NUEVA RUTA
router.get('/admin/stats', progressController.getAdminStats);

module.exports = router;