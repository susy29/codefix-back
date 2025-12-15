const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============ MATERIAS ============

// Crear materia (solo admin)
const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const subject = await prisma.subject.create({
      data: { name, description }
    });

    res.status(201).json({
      message: 'Materia creada exitosamente',
      subject
    });
  } catch (error) {
    console.error('Error en createSubject:', error);
    res.status(500).json({ error: 'Error al crear materia' });
  }
};

// Listar todas las materias
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        units: {
          orderBy: { order: 'asc' },
          include: {
            subtopics: {
              orderBy: { order: 'asc' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ subjects });
  } catch (error) {
    console.error('Error en getAllSubjects:', error);
    res.status(500).json({ error: 'Error al obtener materias' });
  }
};

// Obtener una materia por ID
const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { order: 'asc' },
          include: {
            subtopics: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Materia no encontrada' });
    }

    res.json({ subject });
  } catch (error) {
    console.error('Error en getSubjectById:', error);
    res.status(500).json({ error: 'Error al obtener materia' });
  }
};

// Actualizar materia (solo admin)
const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const subject = await prisma.subject.update({
      where: { id },
      data: { name, description }
    });

    res.json({
      message: 'Materia actualizada exitosamente',
      subject
    });
  } catch (error) {
    console.error('Error en updateSubject:', error);
    res.status(500).json({ error: 'Error al actualizar materia' });
  }
};

// Eliminar materia (solo admin)
const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.subject.delete({
      where: { id }
    });

    res.json({ message: 'Materia eliminada exitosamente' });
  } catch (error) {
    console.error('Error en deleteSubject:', error);
    res.status(500).json({ error: 'Error al eliminar materia' });
  }
};

// ============ UNIDADES ============

// Crear unidad (solo admin)
const createUnit = async (req, res) => {
  try {
    const { subjectId, name, description, order } = req.body;

    if (!subjectId || !name) {
      return res.status(400).json({ 
        error: 'subjectId y name son requeridos' 
      });
    }

    const unit = await prisma.unit.create({
      data: {
        subjectId,
        name,
        description,
        order: order || 0
      }
    });

    res.status(201).json({
      message: 'Unidad creada exitosamente',
      unit
    });
  } catch (error) {
    console.error('Error en createUnit:', error);
    res.status(500).json({ error: 'Error al crear unidad' });
  }
};

// Actualizar unidad (solo admin)
const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, order } = req.body;

    const unit = await prisma.unit.update({
      where: { id },
      data: { name, description, order }
    });

    res.json({
      message: 'Unidad actualizada exitosamente',
      unit
    });
  } catch (error) {
    console.error('Error en updateUnit:', error);
    res.status(500).json({ error: 'Error al actualizar unidad' });
  }
};

// Eliminar unidad (solo admin)
const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.unit.delete({
      where: { id }
    });

    res.json({ message: 'Unidad eliminada exitosamente' });
  } catch (error) {
    console.error('Error en deleteUnit:', error);
    res.status(500).json({ error: 'Error al eliminar unidad' });
  }
};

// ============ SUBTEMAS ============

// Crear subtema (solo admin)
const createSubtopic = async (req, res) => {
  try {
    const { unitId, name, description, content, order } = req.body;

    if (!unitId || !name) {
      return res.status(400).json({ 
        error: 'unitId y name son requeridos' 
      });
    }

    const subtopic = await prisma.subtopic.create({
      data: {
        unitId,
        name,
        description,
        content,
        order: order || 0
      }
    });

    res.status(201).json({
      message: 'Subtema creado exitosamente',
      subtopic
    });
  } catch (error) {
    console.error('Error en createSubtopic:', error);
    res.status(500).json({ error: 'Error al crear subtema' });
  }
};

// Actualizar subtema (solo admin)
const updateSubtopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, content, order } = req.body;

    const subtopic = await prisma.subtopic.update({
      where: { id },
      data: { name, description, content, order }
    });

    res.json({
      message: 'Subtema actualizado exitosamente',
      subtopic
    });
  } catch (error) {
    console.error('Error en updateSubtopic:', error);
    res.status(500).json({ error: 'Error al actualizar subtema' });
  }
};

// Eliminar subtema (solo admin)
const deleteSubtopic = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.subtopic.delete({
      where: { id }
    });

    res.json({ message: 'Subtema eliminado exitosamente' });
  } catch (error) {
    console.error('Error en deleteSubtopic:', error);
    res.status(500).json({ error: 'Error al eliminar subtema' });
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  createUnit,
  updateUnit,
  deleteUnit,
  createSubtopic,
  updateSubtopic,
  deleteSubtopic
};