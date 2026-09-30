// routes/examAttemptRoutes.js
// STUDENT ROUTES ONLY
// Admin attempt routes are in adminRoutes.js to avoid route conflicts

import express from 'express';
import { protect, studentOnly } from '../middleware/auth.js';
import {
  submitExam,
  getMyResults,
  getAttemptStatus,
} from '../controllers/examattemptcontroller.js';

const router = express.Router();

router.post('/student/exams/:id/submit',         protect, studentOnly, submitExam);
router.get ('/student/results',                  protect, studentOnly, getMyResults);
router.get('/exams/:id/attempt-status', protect, studentOnly,getAttemptStatus);
router.post('/exams/:id/submit', protect, studentOnly,submitExam);

export default router;