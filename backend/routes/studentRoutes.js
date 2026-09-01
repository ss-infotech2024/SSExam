// routes/studentRoutes.js
import express from 'express';
import { protect, studentOnly } from '../middleware/auth.js';
import { getStudentProfile } from '../controllers/studentController.js';

const router = express.Router();

// All routes below require authentication + student role
router.use(protect, studentOnly);

router.get('/profile', getStudentProfile);

// Add more student routes here in future, e.g.:
// router.put('/profile', updateStudentProfile);
// router.get('/subjects', getMySubjects);

export default router;