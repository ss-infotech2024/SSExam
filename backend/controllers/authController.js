// controllers/authController.js
import jwt        from 'jsonwebtoken';
import User       from '../models/user.models.js';

const DEPARTMENTS = ['IT', 'CS', 'CE', 'ECE'];

// ─── JWT helper ───────────────────────────────────────────────────────────────
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── REGISTER SUPER ADMIN ─────────────────────────────────────────────────────
// POST /api/auth/register-superadmin
// Should only be called ONCE during initial setup.
// Subsequent calls are blocked if a superadmin already exists.
export const registerSuperAdmin = async (req, res) => {
  try {
    const existing = await User.findOne({ role: 'superadmin' });
    if (existing) {
      return res.status(400).json({ message: 'Super admin already exists.' });
    }

    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const superAdmin = await User.create({
      email:      email.trim().toLowerCase(),
      password,                              // hashed by pre-save hook
      role:       'superadmin',
      department: null,
      status:     'active',
    });

    const token = signToken({ id: superAdmin._id, role: superAdmin.role });

    return res.status(201).json({
      message: 'Super admin registered successfully.',
      token,
      user: {
        _id:   superAdmin._id,
        email: superAdmin.email,
        role:  superAdmin.role,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already in use.' });
    }
    console.error('registerSuperAdmin:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
// POST /api/auth/admin/login
// Body: { email, password }
// Accepts both admin and superadmin roles.
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      role:  { $in: ['admin', 'superadmin'] },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact the super admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Update lastActive — use findByIdAndUpdate to bypass the pre-save hook
    // (which would try to re-hash the already-hashed password and crash)
    await User.findByIdAndUpdate(user._id, { lastActive: new Date() });

    const token = signToken({ id: user._id, role: user.role });

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        _id:        user._id,
        email:      user.email,
        role:       user.role,
        department: user.department || null,
        status:     user.status,
      },
    });
  } catch (err) {
    console.error('loginAdmin:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── STUDENT LOGIN ────────────────────────────────────────────────────────────
// POST /api/auth/student/login
// Body: { email, password }
export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      role:  'student',
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Your account is inactive. Contact your department admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken({ id: user._id, role: user.role });

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        _id:        user._id,
        fullName:   user.fullName,
        email:      user.email,
        role:       user.role,
        studentId:  user.studentId,
        department: user.department,
        status:     user.status,
      },
    });
  } catch (err) {
    console.error('loginStudent:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── STUDENT REGISTER ─────────────────────────────────────────────────────────
// POST /api/auth/student/register
// Body: { fullName, email, password, department }
const nextStudentId = async (department) => {
  const last = await User.findOne({ role: 'student', department })
    .sort({ studentId: -1 })
    .select('studentId')
    .lean();
  return last?.studentId ? last.studentId + 1 : 101;
};

export const studentRegister = async (req, res) => {
  try {
    const { fullName, email, password, department } = req.body;

    if (!fullName?.trim())  return res.status(400).json({ message: 'Full name is required.' });
    if (!email?.trim())     return res.status(400).json({ message: 'Email is required.' });
    if (!password)          return res.status(400).json({ message: 'Password is required.' });
    if (!department)        return res.status(400).json({ message: 'Department is required.' });

    const dept = department.toUpperCase();
    if (!DEPARTMENTS.includes(dept)) {
      return res.status(400).json({ message: `Department must be one of: ${DEPARTMENTS.join(', ')}` });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const studentId = await nextStudentId(dept);

    const student = await User.create({
      fullName:   fullName.trim(),
      email:      email.trim().toLowerCase(),
      password,
      department: dept,
      studentId,
      role:       'student',
      status:     'active',
    });

    return res.status(201).json({
      message:   'Registration successful.',
      studentId: student.studentId,
      user: {
        _id:        student._id,
        fullName:   student.fullName,
        email:      student.email,
        department: student.department,
        studentId:  student.studentId,
        role:       student.role,
      },
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.email) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('studentRegister:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─── GENERAL LOGIN (dev convenience) ─────────────────────────────────────────
// POST /api/auth/login
// Auto-detects role from DB. Remove in production if desired.
export const loginGeneral = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ message: 'Account is deactivated.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken({ id: user._id, role: user.role });

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        _id:        user._id,
        fullName:   user.fullName   || null,
        email:      user.email,
        role:       user.role,
        studentId:  user.studentId  || null,
        department: user.department || null,
        status:     user.status,
      },
    });
  } catch (err) {
    console.error('loginGeneral:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};