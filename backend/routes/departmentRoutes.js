import express from "express";
import {
  getDepartments,
  createDepartment,
} from "../controllers/departmentController.js";

import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// Get departments
router.get("/", getDepartments);

// Create department
router.post("/", protect, adminOnly, createDepartment);

export default router;