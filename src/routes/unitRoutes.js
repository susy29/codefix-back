// routes/unitRoutes.js
const express = require("express");
const router = express.Router();
const {
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} = require("../controllers/unitController");
const authMiddleware = require("../middlewares/authMiddleware");

// Todas protegidas; si quieres solo ADMIN, valida rol dentro del controller
router.get("/units/:id", authMiddleware, getUnitById);
router.post("/units", authMiddleware, createUnit);
router.put("/units/:id", authMiddleware, updateUnit);
router.delete("/units/:id", authMiddleware, deleteUnit);

module.exports = router;
