// routes/authRoutes.js
import express from 'express';
import {
  registerSuperAdmin,
  loginAdmin,
  loginStudent,
  studentRegister,
  loginGeneral,
} from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/register-superadmin   → one-time super admin setup
router.post('/register-superadmin', registerSuperAdmin);

// POST /api/auth/admin/login           → admin + superadmin login
router.post('/admin/login', loginAdmin);

// POST /api/auth/student/login         → student login
router.post('/student/login', loginStudent);

// POST /api/auth/student/register      → student self-registration
router.post('/student/register', studentRegister);

// POST /api/auth/login                 → general login (auto-detects role)
router.post('/login', loginGeneral);

export default router;