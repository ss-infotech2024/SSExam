// routes/superAdminRoutes.js
import express from 'express';
import {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  toggleAdminStatus,
  getDepartmentStats,
  getDepartmentResults,
} from '../controllers/superController.js';
import { protect, superAdminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes protected — must be logged in AND be a superadmin
router.use(protect, superAdminOnly);

// GET    /api/superadmin/admins              → list all admins
router.get('/admins', getAllAdmins);

// POST   /api/superadmin/create-admin        → create a new admin
router.post('/create-admin', createAdmin);

// PUT    /api/superadmin/admins/:id          → update admin details
router.put('/admins/:id', updateAdmin);

// DELETE /api/superadmin/admins/:id          → delete an admin
router.delete('/admins/:id', deleteAdmin);

// PATCH  /api/superadmin/admins/:id/status   → toggle active / inactive
router.patch('/admins/:id/status', toggleAdminStatus);
// ====================== NEW SUPER ADMIN DASHBOARD ROUTES ======================

// GET /api/superadmin/department-stats
// Department-wise summary (student count, average score, pass rate, etc.)
router.get('/department-stats', getDepartmentStats);

// GET /api/superadmin/department/:dept/results
// Detailed results for a specific department
router.get('/department/:dept/results', getDepartmentResults);

export default router;