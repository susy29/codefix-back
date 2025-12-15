// controllers/userController.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Función auxiliar para asegurar que sea ADMIN
async function ensureAdmin(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ error: "No autorizado. Solo ADMIN." });
    return null;
  }

  return user;
}

// GET /api/v1/users  -> listar usuarios
const listUsers = async (req, res) => {
  try {
    const admin = await ensureAdmin(req, res);
    if (!admin) return;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        xp: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  } catch (error) {
    console.error("Error en listUsers:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

// POST /api/v1/users -> crear usuario (ADMIN)
const createUser = async (req, res) => {
  try {
    const admin = await ensureAdmin(req, res);
    if (!admin) return;

    const { email, username, password, role = "STUDENT" } = req.body;

    if (!email || !username || !password) {
      return res
        .status(400)
        .json({ error: "email, username y password son requeridos" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "El password debe tener al menos 6 caracteres" });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true, email: true, username: true },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: "El email o username ya está en uso" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        xp: true,
        createdAt: true,
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error("Error en createUser:", error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

// PUT /api/v1/users/:id -> actualizar usuario (ADMIN)
const updateUser = async (req, res) => {
  try {
    const admin = await ensureAdmin(req, res);
    if (!admin) return;

    const { id } = req.params;
    const { email, username, role } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        email,
        username,
        role,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        xp: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error("Error en updateUser:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

// DELETE /api/v1/users/:id -> eliminar usuario (ADMIN)
const deleteUser = async (req, res) => {
  try {
    const admin = await ensureAdmin(req, res);
    if (!admin) return;

    const { id } = req.params;

    await prisma.user.delete({ where: { id } });

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error en deleteUser:", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
