// src/controllers/progressController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const progressController = {
  // GET /api/v1/progress/user/:userId/stats
  getUserStats: async (req, res) => {
    try {
      const { userId } = req.params;

      // Estadísticas generales del usuario
      const stats = await prisma.userProgress.aggregate({
        where: {
          userId: userId,
          completed: true
        },
        _sum: {
          score: true
        },
        _avg: {
          score: true
        },
        _count: {
          userId: true
        }
      });

      // Progreso por materia - usando query raw
      const progressBySubject = await prisma.$queryRaw`
        SELECT 
          s.id as subject_id,
          s.name as subject_name,
          COUNT(DISTINCT st.id) as total_subtopics,
          COUNT(DISTINCT CASE WHEN up.completed = true THEN up.subtopic_id END) as completed_subtopics,
          ROUND(
            (COUNT(DISTINCT CASE WHEN up.completed = true THEN up.subtopic_id END)::decimal / 
            NULLIF(COUNT(DISTINCT st.id), 0) * 100), 2
          ) as progress_percentage,
          ROUND(AVG(CASE WHEN up.completed = true THEN up.score END), 2) as avg_score
        FROM subjects s
        LEFT JOIN units u ON u.subject_id = s.id
        LEFT JOIN subtopics st ON st.unit_id = u.id
        LEFT JOIN user_progress up ON up.subtopic_id = st.id AND up.user_id = ${userId}
        GROUP BY s.id, s.name
        ORDER BY s.name
      `;

      res.json({
        totalXP: Math.round(stats._sum.score || 0),
        averageScore: Math.round(stats._avg.score || 0),
        completedQuizzes: stats._count.userId || 0,
        progressBySubject: progressBySubject.map(subject => ({
          id: subject.subject_id,
          name: subject.subject_name,
          totalSubtopics: Number(subject.total_subtopics),
          completedSubtopics: Number(subject.completed_subtopics),
          progressPercentage: Number(subject.progress_percentage) || 0,
          averageScore: Number(subject.avg_score) || 0
        }))
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ 
        error: 'Error obteniendo estadísticas del usuario',
        details: error.message 
      });
    }
  },

  // GET /api/v1/progress/user/:userId/subject/:subjectId
  getSubjectProgress: async (req, res) => {
    try {
      const { userId, subjectId } = req.params;

      const progress = await prisma.$queryRaw`
        SELECT 
          u.id as unit_id,
          u.name as unit_name,
          u."order" as unit_order,
          st.id as subtopic_id,
          st.name as subtopic_name,
          st."order" as subtopic_order,
          up.completed,
          up.score,
          up.completed_at
        FROM units u
        LEFT JOIN subtopics st ON st.unit_id = u.id
        LEFT JOIN user_progress up ON up.subtopic_id = st.id AND up.user_id = ${userId}
        WHERE u.subject_id = ${subjectId}
        ORDER BY u."order", st."order"
      `;

      res.json(progress);

    } catch (error) {
      console.error('Error obteniendo progreso:', error);
      res.status(500).json({ 
        error: 'Error obteniendo progreso de materia',
        details: error.message 
      });
    }
  },

  // POST /api/v1/progress
  saveProgress: async (req, res) => {
    try {
      const { user_id, subtopic_id, score, completed } = req.body;

      if (!user_id || !subtopic_id || score === undefined) {
        return res.status(400).json({ 
          error: 'Faltan datos: user_id, subtopic_id, score' 
        });
      }

      // Buscar registro existente
      const existingProgress = await prisma.userProgress.findUnique({
        where: {
          userId_subtopicId: {
            userId: user_id,
            subtopicId: subtopic_id
          }
        }
      });

      let progress;

      if (existingProgress) {
        // Actualizar
        progress = await prisma.userProgress.update({
          where: {
            userId_subtopicId: {
              userId: user_id,
              subtopicId: subtopic_id
            }
          },
          data: {
            score: parseFloat(score),
            completed: completed !== undefined ? completed : true,
            completedAt: new Date()
          }
        });
      } else {
        // Crear
        progress = await prisma.userProgress.create({
          data: {
            userId: user_id,
            subtopicId: subtopic_id,
            score: parseFloat(score),
            completed: completed !== undefined ? completed : true,
            completedAt: new Date()
          }
        });
      }

      res.json(progress);

    } catch (error) {
      console.error('Error guardando progreso:', error);
      res.status(500).json({ 
        error: 'Error guardando progreso',
        details: error.message 
      });
    }
  },

  // GET /api/v1/progress/admin/stats
  getAdminStats: async (req, res) => {
    try {
      console.log("📊 Obteniendo estadísticas de admin...");

      // Total de usuarios
      const totalUsers = await prisma.user.count();
      console.log("✅ Total usuarios:", totalUsers);

      // Usuarios por rol
      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      });
      console.log("✅ Usuarios por rol:", usersByRole);

      // Total de materias
      const totalSubjects = await prisma.subject.count();
      console.log("✅ Total materias:", totalSubjects);

      // Total de actividades completadas
      const totalCompletedActivities = await prisma.userProgress.count({
        where: { completed: true }
      });
      console.log("✅ Actividades completadas:", totalCompletedActivities);

      // Total de actividades disponibles
      const totalActivities = await prisma.activity.count();
      console.log("✅ Total actividades:", totalActivities);

      // Promedio general de calificaciones
      const avgScore = await prisma.userProgress.aggregate({
        where: { completed: true },
        _avg: { score: true }
      });
      console.log("✅ Promedio scores:", avgScore);

      // Actividad reciente (últimos 7 días)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivity = await prisma.userProgress.count({
        where: {
          completed: true,
          completedAt: {
            gte: sevenDaysAgo
          }
        }
      });
      console.log("✅ Actividad reciente:", recentActivity);

      // TODAS las materias con actividad (sin límite)
      let topSubjects = [];
      try {
        topSubjects = await prisma.$queryRaw`
          SELECT 
            s.id,
            s.name,
            COUNT(DISTINCT up.user_id) as active_users,
            COUNT(up.user_id) as total_completions
          FROM subjects s
          LEFT JOIN units u ON u.subject_id = s.id
          LEFT JOIN subtopics st ON st.unit_id = u.id
          LEFT JOIN user_progress up ON up.subtopic_id = st.id AND up.completed = true
          GROUP BY s.id, s.name
          ORDER BY total_completions DESC
        `;
        console.log("✅ Todas las materias:", topSubjects.length);
      } catch (queryError) {
        console.warn("⚠️ Error en query de materias:", queryError.message);
        topSubjects = [];
      }

      const response = {
        users: {
          total: totalUsers,
          byRole: usersByRole.reduce((acc, curr) => {
            acc[curr.role] = curr._count.id;
            return acc;
          }, {})
        },
        subjects: {
          total: totalSubjects
        },
        activities: {
          total: totalActivities,
          completed: totalCompletedActivities,
          completionRate: totalActivities > 0 
            ? Math.round((totalCompletedActivities / totalActivities) * 100) 
            : 0
        },
        performance: {
          averageScore: Math.round(avgScore._avg.score || 0),
          recentActivity: recentActivity
        },
        topSubjects: topSubjects.map(s => ({
          id: s.id,
          name: s.name,
          activeUsers: Number(s.active_users),
          totalCompletions: Number(s.total_completions)
        }))
      };

      console.log("✅ Respuesta final enviada");
      res.json(response);

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de admin:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ 
        error: 'Error obteniendo estadísticas',
        details: error.message 
      });
    }
  }
};

module.exports = progressController;