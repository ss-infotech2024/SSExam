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
    type: Number,
  },

  rollNumber: {
    type: String,
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
    unique: true,  // ← Keep this for unique constraint
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

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── COMPOUND INDEX: studentId unique per department ─────────────────────────
userSchema.index({ studentId: 1, department: 1 }, { unique: true, sparse: true });

// ─── INDEX for faster queries (REMOVE duplicate email index) ────────────────
// Note: email already has unique: true in schema definition, so don't create another index
userSchema.index({ department: 1, role: 1 });
userSchema.index({ rollNumber: 1 });

// ─── VIRTUAL for display name ────────────────────────────────────────────────
userSchema.virtual('displayName').get(function() {
  if (this.role === 'student') {
    return `${this.fullName} (${this.rollNumber || this.studentId || 'N/A'})`;
  }
  return this.fullName || this.email;
});

// ─── AUTO-ASSIGN studentId BEFORE SAVE ───────────────────────────────────────
userSchema.pre('save', async function() {
  try {
    // Auto-assign studentId for new students that don't have one yet
    if (this.role === 'student' && this.isNew && (this.studentId == null || this.studentId === undefined)) {
      const User = mongoose.model('User');
      
      // Find the highest studentId in the same department
      const lastStudent = await User.findOne(
        { 
          role: 'student', 
          department: this.department, 
          studentId: { $ne: null, $exists: true } 
        },
        { studentId: 1 },
        { sort: { studentId: -1 } }
      ).lean();
      
      // Assign new studentId (start from 101 if no existing students)
      this.studentId = lastStudent ? lastStudent.studentId + 1 : 101;
      
      // Also set rollNumber for display purposes
      this.rollNumber = `${this.department}${this.studentId}`;
    }

    // Auto-assign rollNumber for existing students without one
    if (this.role === 'student' && !this.rollNumber && this.studentId) {
      this.rollNumber = `${this.department}${this.studentId}`;
    }

    // Hash password if it was modified
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
   
  } catch (error) {
    console.log(error);
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

// ─── STATIC METHOD to get next student ID ─────────────────────────────────────
userSchema.statics.getNextStudentId = async function(department) {
  const lastStudent = await this.findOne(
    { 
      role: 'student', 
      department: department, 
      studentId: { $ne: null, $exists: true } 
    },
    { studentId: 1 },
    { sort: { studentId: -1 } }
  ).lean();
  
  return lastStudent ? lastStudent.studentId + 1 : 101;
};

// ─── STATIC METHOD to find by department ──────────────────────────────────────
userSchema.statics.findByDepartment = function(department, role = 'student') {
  return this.find({ department, role, status: 'active' })
    .select('-password')
    .sort({ fullName: 1 });
};

// ─── METHOD to safely return user data ────────────────────────────────────────
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;