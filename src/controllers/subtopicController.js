// controllers/subtopicController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * GET /api/v1/subtopics/:id
 * Devuelve un subtema por id
 */
const getSubtopicById = async (req, res) => {
  try {
    const { id } = req.params;

    const subtopic = await prisma.subtopic.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            subject: true,
          },
        },
        activities: true, // opcional: si tienes relación activities en el modelo
      },
    });

    if (!subtopic) {
      return res.status(404).json({ error: "Subtema no encontrado" });
    }

    res.json({ subtopic });
  } catch (error) {
    console.error("Error en getSubtopicById:", error);
    res.status(500).json({ error: "Error al obtener subtema" });
  }
};

module.exports = {
  getSubtopicById,
};
