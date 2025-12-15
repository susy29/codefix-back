const { verifyAccessToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token no proporcionado' 
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        error: 'Token inválido o expirado' 
      });
    }

    // Agregar userId y role al request
    req.userId = decoded.userId;
    req.userRole = decoded.role; // Agregar role para adminMiddleware

    next();

  } catch (error) {
    console.error('Error en authMiddleware:', error);
    res.status(401).json({ error: 'Error de autenticación' });
  }
};

module.exports = authMiddleware;