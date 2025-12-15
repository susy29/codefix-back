const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Middleware para proteger todas las rutas
router.use(authMiddleware);

// ============ MATERIAS ============
// Rutas públicas (cualquier usuario autenticado)
router.get('/subjects', subjectController.getAllSubjects);
router.get('/subjects/:id', subjectController.getSubjectById);

// Rutas de administrador
router.post('/subjects', adminMiddleware, subjectController.createSubject);
router.put('/subjects/:id', adminMiddleware, subjectController.updateSubject);
router.delete('/subjects/:id', adminMiddleware, subjectController.deleteSubject);

// ============ UNIDADES ============
router.post('/units', adminMiddleware, subjectController.createUnit);
router.put('/units/:id', adminMiddleware, subjectController.updateUnit);
router.delete('/units/:id', adminMiddleware, subjectController.deleteUnit);

// ============ SUBTEMAS ============
router.post('/subtopics', adminMiddleware, subjectController.createSubtopic);
router.put('/subtopics/:id', adminMiddleware, subjectController.updateSubtopic);
router.delete('/subtopics/:id', adminMiddleware, subjectController.deleteSubtopic);

module.exports = router;