// models/user.models.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: function () { return this.role === 'student'; },
    trim: true,
  },

  studentId: {
    type: Number,  // ✅ Keep as Number
    default: null,
  },

  rollNumber: {
    type: String,  // ✅ Use this for display like "STUDENT101" or "Data Bricks101"
    trim: true,
  },

  department: {
    type: String,
    enum: ['Data Bricks', 'Service Now', null],
    required: function () { return this.role !== 'superadmin'; },
    default: null,
  },

  email: {
    type: String,
    required: true,
    unique: true,  // ✅ This already creates the index
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ['superadmin', 'admin', 'student'],
    required: true,
    default: 'student',
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
plainPassword: {
  type: String,
  default: '',
},
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── INDEXES ─────────────────────────────────────────────────────────────────
// ✅ studentId unique per department (sparse allows null for non-students)
userSchema.index({ studentId: 1, department: 1 }, { unique: true, sparse: true });

// ✅ Query optimization indexes
userSchema.index({ department: 1, role: 1 });
userSchema.index({ rollNumber: 1 });

// ❌ REMOVED: Duplicate email index (already created by unique: true above)
// userSchema.index({ email: 1 }, { unique: true });

// ─── VIRTUAL for display name ────────────────────────────────────────────────
userSchema.virtual('displayName').get(function() {
  if (this.role === 'student') {
    return `${this.fullName} (${this.rollNumber || this.studentId || 'N/A'})`;
  }
  return this.fullName || this.email;
});

// ─── VIRTUAL for formatted student ID ────────────────────────────────────────
userSchema.virtual('formattedStudentId').get(function() {
  return this.studentId ? `STUDENT${this.studentId}` : null;
});

// ─── PRE-SAVE: Only hash password, DON'T auto-assign studentId here ──────────
// Reason: insertMany can cause race conditions with async queries in pre-save
userSchema.pre('save', async function() {
  // Only hash password if modified
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// ─── COMPARE PASSWORD ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// ─── STATIC: Get next student ID for a department ────────────────────────────
userSchema.statics.getNextStudentId = async function(department) {
  const lastStudent = await this.findOne(
    { 
      role: 'student', 
      department: department, 
      studentId: { $ne: null, $exists: true, $type: 'number' }
    }
  ).sort({ studentId: -1 }).select('studentId').lean();
  
  return lastStudent ? lastStudent.studentId + 1 : 101;
};

// ─── STATIC: Find by department ──────────────────────────────────────────────
userSchema.statics.findByDepartment = function(department, role = 'student') {
  return this.find({ department, role, status: 'active' })
    .select('-password')
    .sort({ fullName: 1 });
};

// ─── METHOD: Safe user object ────────────────────────────────────────────────
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;