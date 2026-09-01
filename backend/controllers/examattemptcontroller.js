// controllers/examAttemptController.js

import Exam        from '../models/exam.model.js';
import ExamAttempt from '../models/examattempt.model.js';
import User        from '../models/user.models.js';
import mongoose from 'mongoose';

// ── helpers ───────────────────────────────────────────────────────────────────
const getStudent = async (req, res) => {
  const s = await User.findById(req.user._id || req.user.id).select('department role fullName studentId').lean();
  if (!s || s.role !== 'student') { res.status(403).json({ message: 'Access denied' }); return null; }
  return s;
};

const getAdminDept = async (req, res) => {
  const a = await User.findById(req.user._id || req.user.id).select('department role').lean();
  if (!a)            { res.status(401).json({ message: 'Admin not found' }); return null; }
  if (!a.department) { res.status(400).json({ message: 'Admin has no department' }); return null; }
  return a.department;
};

// Grade helper
const getGrade = (pct) => {
  if (pct >= 90) return { grade: 'O',  label: 'Outstanding' };
  if (pct >= 75) return { grade: 'A',  label: 'Excellent'   };
  if (pct >= 60) return { grade: 'B',  label: 'Good'        };
  if (pct >= 50) return { grade: 'C',  label: 'Average'     };
  if (pct >= 40) return { grade: 'D',  label: 'Pass'        };
  return             { grade: 'F',  label: 'Fail'        };
};

// =============================================================================
// POST /api/student/exams/:id/submit
// Student submits answers — one-time only. Creates ExamAttempt record.
// Body: { answers: [{ questionId, selectedOption }], terminatedBy?: "proctor" }
// =============================================================================
export const submitExam = async (req, res) => {
  try {
    const student = await getStudent(req, res);
    if (!student) return;

    const exam = await Exam.findOne({
      _id:        req.params.id,
      department: student.department,
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // ── Already attempted? ──────────────────────────────────────────────────
    const existing = await ExamAttempt.findOne({ exam: exam._id, student: student._id });
    if (existing) {
      return res.status(409).json({
        message:    'You have already submitted this exam',
        attempt:    existing._id,
        submittedAt: existing.submittedAt,
        score:      existing.score,
        totalMarks: existing.totalMarks,
        percentage: existing.percentage,
      });
    }

    const { answers = [], terminatedBy = null } = req.body;
    const mpq = exam.marksPerQuestion ?? 1;

    // ── Score calculation ───────────────────────────────────────────────────
    let correct = 0, wrong = 0, unanswered = 0;

    const scoredAnswers = exam.questions.map((q) => {
      const submitted = answers.find(a => String(a.questionId) === String(q._id));
      const selected  = submitted?.selectedOption ?? null;

      if (selected === null || selected === undefined) {
        unanswered++;
      } else if (Number(selected) === q.correctAnswer) {
        correct++;
      } else {
        wrong++;
      }

      return { questionId: q._id, selectedOption: selected };
    });

    const score      = correct * mpq;
    const totalMarks = exam.questions.length * mpq;
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const { grade, label: gradeLabel } = getGrade(percentage);

    const attempt = await ExamAttempt.create({
      exam:             exam._id,
      student:          student._id,
      department:       student.department,
      answers:          scoredAnswers,
      score,
      totalMarks,
      marksPerQuestion: mpq,
      correctCount:     correct,
      wrongCount:       wrong,
      unansweredCount:  unanswered,
      percentage,
      status:           terminatedBy === 'proctor' ? 'terminated' : 'submitted',
      terminationReason: terminatedBy === 'proctor' ? 'Proctoring violations exceeded' : null,
      submittedAt:      new Date(),
    });

    res.status(201).json({
      message:    terminatedBy === 'proctor' ? 'Exam terminated and recorded' : 'Exam submitted successfully',
      result: {
        attemptId:    attempt._id,
        subject:      exam.subject,
        score,
        totalMarks,
        marksPerQuestion: mpq,
        correctCount:  correct,
        wrongCount:    wrong,
        unansweredCount: unanswered,
        percentage,
        grade,
        gradeLabel,
        submittedAt:  attempt.submittedAt,
        status:       attempt.status,
      },
    });
  } catch (err) {
    // Duplicate key = already submitted (race condition)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted this exam' });
    }
    console.error('submitExam:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================================
// GET /api/student/results
// Student's own results — all submitted attempts
// =============================================================================
export const getMyResults = async (req, res) => {
  try {
    const student = await getStudent(req, res);
    if (!student) return;

    const attempts = await ExamAttempt.find({ student: student._id })
      .populate('exam', 'subject duration department startTime endTime marksPerQuestion')
      .sort({ submittedAt: -1 })
      .lean();

    const results = attempts.map(a => ({
      attemptId:       a._id,
      examId:          a.exam?._id,
      subject:         a.exam?.subject || 'Unknown',
      department:      a.department,
      score:           a.score,
      totalMarks:      a.totalMarks,
      marksPerQuestion: a.marksPerQuestion,
      correctCount:    a.correctCount,
      wrongCount:      a.wrongCount,
      unansweredCount: a.unansweredCount,
      percentage:      a.percentage,
      ...getGrade(a.percentage),
      status:          a.status,
      submittedAt:     a.submittedAt,
      examDate:        a.exam?.startTime,
    }));

    res.status(200).json({ results, total: results.length });
  } catch (err) {
    console.error('getMyResults:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================================
// GET /api/student/exams/:id/attempt-status
// Check if student has already attempted this exam
// Returns: { attempted: bool, attempt?: { score, totalMarks, ... } }
// =============================================================================
export const getAttemptStatus = async (req, res) => {
  try {
    const student = await getStudent(req, res);
    if (!student) return;

    const attempt = await ExamAttempt.findOne({
      exam:    req.params.id,
      student: student._id,
    }).lean();

    if (!attempt) {
      return res.status(200).json({ attempted: false });
    }

    res.status(200).json({
      attempted:   true,
      status:      attempt.status,
      score:       attempt.score,
      totalMarks:  attempt.totalMarks,
      percentage:  attempt.percentage,
      ...getGrade(attempt.percentage),
      submittedAt: attempt.submittedAt,
    });
  } catch (err) {
    console.error('getAttemptStatus:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// =============================================================================
// GET /api/admin/exams/:id/attempts
// Admin sees all student attempts for a specific exam
// =============================================================================
export const getExamAttempts = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔴 Validate ObjectId (IMPORTANT FIX)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid exam ID' });
    }

    // 🔍 Debug log (optional)
    console.log("Exam ID:", id);

    // ✅ Get Admin Department
    const adminDept = await getAdminDept(req, res);
    if (!adminDept) return;

    // ✅ Find Exam
    const exam = await Exam.findOne({
      _id: id,
      department: adminDept,
    }).lean();

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // ✅ Get Attempts
    const attempts = await ExamAttempt.find({ exam: exam._id })
      .populate('student', 'fullName studentId email department')
      .sort({ submittedAt: -1 })
      .lean();

    // ✅ Format Data
    const formattedAttempts = attempts.map((a) => ({
      attemptId: a._id,

      student: {
        _id: a.student?._id || null,
        fullName: a.student?.fullName || 'Unknown',
        studentId: a.student?.studentId || '—',
        email: a.student?.email || '—',
      },

      score: a.score || 0,
      totalMarks: a.totalMarks || 0,
      marksPerQuestion: a.marksPerQuestion || 0,

      correctCount: a.correctCount || 0,
      wrongCount: a.wrongCount || 0,
      unansweredCount: a.unansweredCount || 0,

      percentage: a.percentage || 0,

      // ✅ Grade helper
      ...getGrade(a.percentage || 0),

      status: a.status || 'completed',
      terminationReason: a.terminationReason || null,

      rescheduledAt: a.rescheduledAt || null,
      rescheduledNote: a.rescheduledNote || null,

      submittedAt: a.submittedAt,
    }));

    // ✅ Final Response
    res.status(200).json({
      exam: {
        _id: exam._id,
        subject: exam.subject,
        totalMarks: exam.questions.length * exam.marksPerQuestion,
      },
      attempts: formattedAttempts,
      total: formattedAttempts.length,
    });

  } catch (err) {
    console.error('getExamAttempts Error:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
  }
};

// =============================================================================
// DELETE /api/admin/exams/:examId/attempts/:studentId/reschedule
// Admin resets a student's attempt — deletes the record so student can re-attempt
// Body: { note?: string }
// =============================================================================
export const rescheduleAttempt = async (req, res) => {
  try {
    const adminDept = await getAdminDept(req, res);
    if (!adminDept) return;

    const exam = await Exam.findOne({ _id: req.params.examId, department: adminDept });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const attempt = await ExamAttempt.findOne({
      exam:    exam._id,
      student: req.params.studentId,
    });
    if (!attempt) return res.status(404).json({ message: 'No attempt found for this student' });

    const { note = '' } = req.body;

    // Delete attempt → student can now re-attempt
    await attempt.deleteOne();

    res.status(200).json({
      message: `Exam rescheduled for student. They can now re-attempt "${exam.subject}".`,
      note,
    });
  } catch (err) {
    console.error('rescheduleAttempt:', err);
    res.status(500).json({ message: 'Server error' });
  }
};