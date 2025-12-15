// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

// Todas estas rutas requieren estar logueado
router.use(authMiddleware);

// GET /api/v1/users
router.get("/users", listUsers);

// POST /api/v1/users
router.post("/users", createUser);

// PUT /api/v1/users/:id
router.put("/users/:id", updateUser);

// DELETE /api/v1/users/:id
router.delete("/users/:id", deleteUser);

module.exports = router;
