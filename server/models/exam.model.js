// models/exam.model.js
import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text:          { type: String, required: true, trim: true },
  options:       { type: [String], required: true, validate: (v) => v.length === 4 },
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
}, { _id: true });

const examSchema = new mongoose.Schema({
  subject: {
    type:     String,
    required: true,
    trim:     true,
  },
  duration: {
    type:     Number,
    required: true,
    min:      1,
  },
  startTime: {
    type:     Date,
    required: true,
  },
  endTime: {
    type:     Date,
    required: true,
  },
  department: {
    type:     String,
    enum:     ['Data Bricks', 'Service Now'],
    required: true,
  },
  createdBy: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },

  // ── Marks per question — set once at creation, fixed forever ──────────────
  marksPerQuestion: {
    type:     Number,
    required: true,
    min:      1,
    max:      10,
    default:  1,
  },

  questions: {
    type:    [questionSchema],
    default: [],
  },
  status: {
    type:    String,
    enum:    ['upcoming', 'active', 'completed'],
    default: 'upcoming',
  },
}, { timestamps: true });

examSchema.index({ department: 1, startTime: -1 });

const Exam = mongoose.model('Exam', examSchema);
export default Exam;