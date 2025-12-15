// controllers/unitController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/v1/units/:id  → obtener una unidad
const getUnitById = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        subtopics: true,
        subject: true,
      },
    });

    if (!unit) {
      return res.status(404).json({ error: "Unidad no encontrada" });
    }

    res.json({ unit });
  } catch (error) {
    console.error("Error en getUnitById:", error);
    res.status(500).json({ error: "Error al obtener unidad" });
  }
};

// POST /api/v1/units  → crear unidad (solo ADMIN)
const createUnit = async (req, res) => {
  try {
    const { subjectId, name, description } = req.body;

    if (!subjectId || !name) {
      return res
        .status(400)
        .json({ error: "subjectId y name son requeridos" });
    }

    const unit = await prisma.unit.create({
      data: {
        subjectId,
        name,
        description: description || "",
      },
      include: {
        subject: true,
      },
    });

    res.status(201).json({ unit });
  } catch (error) {
    console.error("Error en createUnit:", error);
    res.status(500).json({ error: "Error al crear unidad" });
  }
};

// PUT /api/v1/units/:id  → actualizar unidad (solo ADMIN)
const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "name es requerido" });
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name,
        description: description || "",
      },
      include: {
        subject: true,
      },
    });

    res.json({ unit });
  } catch (error) {
    console.error("Error en updateUnit:", error);
    res.status(500).json({ error: "Error al actualizar unidad" });
  }
};

// DELETE /api/v1/units/:id  → eliminar unidad (solo ADMIN)
const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    // Opcional: borrar subtemas/actividades relacionados con ON DELETE CASCADE en Prisma
    await prisma.unit.delete({
      where: { id },
    });

    res.json({ message: "Unidad eliminada correctamente" });
  } catch (error) {
    console.error("Error en deleteUnit:", error);
    res.status(500).json({ error: "Error al eliminar unidad" });
  }
};

module.exports = {
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
};
