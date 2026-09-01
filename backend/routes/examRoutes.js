// routes/examRoutes.js
import express from 'express';
import { protect, studentOnly } from '../middleware/auth.js';
import { getStudentExams, getStudentExamById,submitExam,
  getAttemptStatus,
  getStudentResults } from '../controllers/examController.js';

const router = express.Router();

router.use(protect, studentOnly);

router.get('/exams',  getStudentExams);
router.get('/exams/:id',  getStudentExamById);
router.get('/exams/:id/attempt-status',  getAttemptStatus);
router.post('/exams/:id/submit',  submitExam);
router.get('/results', getStudentResults);

export default router;