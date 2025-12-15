const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const adminMiddleware = async (req, res, next) => {
  try {
    // El authMiddleware ya validó el token y agregó req.userId
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Acceso denegado. Se requieren privilegios de administrador' 
      });
    }

    next();
  } catch (error) {
    console.error('Error en adminMiddleware:', error);
    res.status(500).json({ error: 'Error al verificar permisos' });
  }
};

module.exports = adminMiddleware;