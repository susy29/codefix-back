const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

const prisma = new PrismaClient();

// Registro de usuario
const register = async (req, res) => {
  try {
    const { email, username, password, role } = req.body; // 👈 Agregamos role aquí

    if (!email || !username || !password) {
      return res.status(400).json({ 
        error: 'Email, username y password son requeridos' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'El password debe tener al menos 6 caracteres' 
      });
    }

    // 👇 Validación opcional del role
    const validRoles = ['STUDENT', 'ADMIN'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Role inválido. Debe ser STUDENT o ADMIN' 
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'El email o username ya está registrado' 
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: role || 'STUDENT' // 👈 AQUÍ está el cambio importante
      },
      select: {
        id: true,
        email: true,
        username: true,
        xp: true,
        role: true,
        createdAt: true
      }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user,
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

// Login de usuario (sin cambios)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y password son requeridos' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        xp: true,
        role: true,
        passwordHash: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login exitoso',
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// Obtener perfil del usuario autenticado (sin cambios)
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        xp: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

module.exports = {
  register,
  login,
  getProfile
};