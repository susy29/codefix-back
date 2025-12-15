require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const activityRoutes = require('./routes/activityRoutes');
const subtopicRoutes = require('./routes/subtopicRoutes');
const userRoutes = require('./routes/userRoutes');
const progressRoutes = require('./routes/progressRoutes'); // ← AGREGAR

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: 'CodeFix Arena API',
    version: '1.0.0',
    status: 'running'
  });
});

// Rutas de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', subjectRoutes);
app.use('/api/v1', activityRoutes);
app.use('/api/v1', subtopicRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1/progress', progressRoutes); // ← AGREGAR

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   AUTH:`);
  console.log(`   POST http://localhost:${PORT}/api/v1/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/auth/profile`);
  console.log(`   SUBJECTS (Admin):`);
  console.log(`   GET    http://localhost:${PORT}/api/v1/subjects`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/subjects`);
  console.log(`   ACTIVITIES:`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/activities/generate-quiz (Admin)`);
  console.log(`   GET    http://localhost:${PORT}/api/v1/subtopics/:id/activities`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/activities/submit`);
  console.log(`   SUBTOPICS:`);
  console.log(`   GET    http://localhost:${PORT}/api/v1/subtopics/:id`);
  console.log(`   USERS:`);
  console.log(`   GET    http://localhost:${PORT}/api/v1/users`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/users`);
  console.log(`   PUT    http://localhost:${PORT}/api/v1/users/:id`);
  console.log(`   DELETE http://localhost:${PORT}/api/v1/users/:id`);
  console.log(`   PROGRESS:`); // ← AGREGAR
  console.log(`   GET    http://localhost:${PORT}/api/v1/progress/user/:userId/stats`);
  console.log(`   GET    http://localhost:${PORT}/api/v1/progress/user/:userId/subject/:subjectId`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/progress`);
});