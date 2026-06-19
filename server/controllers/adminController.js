// controllers/adminController.js
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import User from '../models/user.models.js';

// ─── SCHEMA CONSTANTS (must match user model enum exactly) ───────────────────
const DEPARTMENTS = ['Data Bricks', 'Service Now'];

// ─── HELPER: single error message from express-validator ─────────────────────
const firstError = (req, res) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    res.status(400).json({ message: result.array()[0].msg });
    return false;
  }
  return true;
};

// ─── HELPER: next auto-increment studentId for a department ──────────────────
// Scans existing numeric studentIds in that dept, returns max + 1.
// First student in a department starts at 101.
const nextStudentId = async (department) => {
  const students = await User.find(
    { role: 'student', department, studentId: { $ne: null } },
    { studentId: 1 }
  ).lean();

  if (!students.length) return 101;

  const max = students.reduce((hi, s) => {
    const n = parseInt(s.studentId, 10);
    return !isNaN(n) && n > hi ? n : hi;
  }, 100);

  return max + 1;
};

// ─── HELPER: re-fetch admin from DB and return their department ──────────────
// Used by all controllers that need to enforce the department guard.
// Relying on req.user.department is unsafe — the JWT may be stale or missing
// the field if the middleware only decodes id + role.
const getAdminDept = async (req, res) => {
  const admin = await User.findById(req.user._id || req.user.id).lean();
  if (!admin) {
    res.status(401).json({ message: 'Admin account not found' });
    return null;
  }
  if (!admin.department) {
    res.status(400).json({ message: 'Your account has no department assigned — contact superadmin' });
    return null;
  }
  return admin.department;
};

// ─── SHAPE helper: converts a raw User doc → frontend-safe object ─────────────
const shapeStudent = (s) => ({
  _id:        s._id,
  studentId:  s.studentId,                              // number e.g. 101
  name:       s.fullName,
  fullName:   s.fullName,
  email:      s.email,
  department: s.department,
  status:     s.status || 'active',
  joinDate:   s.createdAt
    ? new Date(s.createdAt).toISOString().split('T')[0]
    : '',
  createdAt:  s.createdAt,
});

// ─── GET STUDENTS ─────────────────────────────────────────────────────────────
// GET /api/admin/students?status=active&search=john&page=1&limit=20
export const getStudents = [
  query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),

  async (req, res) => {
    if (!firstError(req, res)) return;

    try {
      const { status, search, page = 1, limit = 50 } = req.query;

      // ── Resolve which department to query ────────────────────────────────────
      // Priority:
      //   1. ?department=CS  query param  (explicit override, useful in Postman / superadmin)
      //   2. admin's own department from DB  (normal case)
      //
      // We always re-fetch the admin from DB so we are never relying on stale JWT data.
      const adminUser = await User.findById(req.user._id || req.user.id).lean();

      if (!adminUser) {
        return res.status(401).json({ message: 'Admin account not found' });
      }

      // Accept ?department=XX override — fall back to admin's stored department
      const adminDept   = adminUser.department;
      const queryDept   = req.query.department?.trim() || null;
      const targetDept  = queryDept || adminDept;

      if (!targetDept) {
        return res.status(400).json({
          message: 'No department found — pass ?department=XX or ensure your admin account has a department set',
          _debug:  { adminDept, queryDept },
        });
      }

      // ── Build the query filter ───────────────────────────────────────────────
      const filter = {
        role:       'student',
        department: { $regex: new RegExp(`^${targetDept}$`, 'i') },
      };

      if (status) filter.status = status;

      if (search?.trim()) {
        const q = search.trim();
        filter.$or = [
          { fullName: { $regex: q, $options: 'i' } },
          { email:    { $regex: q, $options: 'i' } },
          ...(isNaN(q) ? [] : [{ studentId: parseInt(q, 10) }]),
        ];
      }

      const pageNum  = parseInt(page,  10);
      const limitNum = parseInt(limit, 10);

      // ── Debug log — remove once confirmed working ────────────────────────────
      console.log('[getStudents] admin:', adminUser.email, '| adminDept:', adminDept, '| targetDept:', targetDept);

      const [students, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .sort({ studentId: 1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        User.countDocuments(filter),
      ]);

      // ── Debug log — remove once confirmed working ────────────────────────────
      console.log('[getStudents] found:', total, 'students');

      res.status(200).json({
        students:   students.map(shapeStudent),
        pagination: {
          total,
          page:       pageNum,
          limit:      limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasNext:    pageNum * limitNum < total,
          hasPrev:    pageNum > 1,
        },
        _debug: { adminDept, queryDept, targetDept, total },   // REMOVE after fixing
      });
    } catch (err) {
      console.error('getStudents:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// ─── CREATE STUDENT ───────────────────────────────────────────────────────────
// POST /api/admin/create-student
// Body: { fullName, email, password, department, studentId? }
// studentId is OPTIONAL — if omitted, auto-assigned as max+1 for that dept.
// If provided by admin, it is used as-is (validated: positive integer).
export const createStudent = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('department')
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),

  body('studentId')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Student ID must be a positive integer'),

  async (req, res) => {
    if (!firstError(req, res)) return;

    const { fullName, email, password, department } = req.body;
    // studentId from body (admin manual entry) — undefined means auto-assign
    const manualId = req.body.studentId != null && req.body.studentId !== ''
      ? parseInt(req.body.studentId, 10)
      : null;

    try {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ message: 'A user with this email already exists.' });
      }

      // If admin provided a studentId, check it is not already taken in this dept
      if (manualId !== null) {
        const taken = await User.findOne({ studentId: manualId, department });
        if (taken) {
          return res.status(400).json({
            message: `Student ID ${manualId} is already taken in the ${department} department. Please choose a different ID.`,
          });
        }
      }

      // Use manual ID if provided, otherwise auto-generate
      const studentId = manualId !== null ? manualId : await nextStudentId(department);

      const user = new User({
        fullName:   fullName.trim(),
        studentId,
        email:      email.toLowerCase().trim(),
        password,                      // pre-save hook hashes this
        department,
        role:       'student',
        status:     'active',
        createdBy:  req.user._id,
      });

      await user.save();

      res.status(201).json({
        message: 'Student created successfully',
        student: shapeStudent(user),
      });
    } catch (err) {
      // Compound unique index violation: same studentId + department combo
      if (err.code === 11000 && err.keyPattern?.studentId) {
        return res.status(400).json({
          message: `Student ID ${manualId ?? 'auto-assigned'} already exists in the ${req.body.department} department.`,
        });
      }
      console.error('createStudent:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// ─── MULTER CONFIG ────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      return cb(new Error('Only .xlsx and .xls files are allowed'));
    }
    cb(null, true);
  },
});

// ─── BULK ADD STUDENTS ────────────────────────────────────────────────────────
// POST /api/admin/students/bulk
// multipart/form-data, field name: "excelFile"
// Required Excel columns: Name, Email
// Optional columns: Password, Department
// studentId is AUTO-GENERATED per department — no column needed in Excel
export const bulkAddStudents = [
  upload.single('excelFile'),

  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded' });
    }

    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      const rawData  = XLSX.utils.sheet_to_json(sheet, {
        header: 1, defval: '', blankrows: false,
      });

      if (rawData.length < 2) {
        return res.status(400).json({ message: 'Excel file is empty or has no data rows' });
      }

      // Normalize headers
      const headers = rawData[0].map((h) =>
        String(h || '').trim().toLowerCase().replace(/\s+/g, '')
      );

      const col = (aliases) =>
        aliases.reduce((found, a) => (found !== -1 ? found : headers.indexOf(a)), -1);

      const nameIdx  = col(['name', 'fullname', 'studentname']);
      const emailIdx = headers.findIndex((h) => h.includes('email'));
      const passIdx  = headers.findIndex((h) => h.includes('pass'));
      const deptIdx  = col(['department', 'dept', 'branch']);

      if (nameIdx === -1 || emailIdx === -1) {
        return res.status(400).json({
          message: 'Missing required columns: Name and Email are required',
        });
      }

      // Re-fetch admin dept from DB — JWT may not include department field
      const adminDept = await getAdminDept(req, res);
      if (!adminDept) return;
      const createdBy  = req.user._id || req.user.id;
      const rowErrors  = [];
      const validRows  = [];

      for (let i = 1; i < rawData.length; i++) {
        const row   = rawData[i];
        const name  = String(row[nameIdx]  || '').trim();
        const email = String(row[emailIdx] || '').trim().toLowerCase();
        const pass  = passIdx !== -1 ? String(row[passIdx] || '').trim() : '';
        const dept  = deptIdx !== -1
          ? String(row[deptIdx] || '').trim()
          : adminDept;

        if (!name || !email) continue; // skip blank rows

        if (!email.includes('@')) {
          rowErrors.push(`Row ${i + 1}: Invalid email "${email}"`);
          continue;
        }

        // Validate department against schema enum
        const finalDept = DEPARTMENTS.includes(dept) ? dept : adminDept;
        if (dept && !DEPARTMENTS.includes(dept)) {
          rowErrors.push(
            `Row ${i + 1}: Unknown department "${dept}" — defaulting to ${adminDept}`
          );
        }

        validRows.push({
          fullName:   name,
          email,
          password:   pass || 'Student@123',
          department: finalDept,
        });
      }

      if (!validRows.length) {
        return res.status(400).json({
          message: 'No valid student records found in the Excel file',
          errors:  rowErrors,
        });
      }

      // Group by department so we call nextStudentId ONCE per dept (not per row)
      const byDept = {};
      for (const row of validRows) {
        if (!byDept[row.department]) byDept[row.department] = [];
        byDept[row.department].push(row);
      }

      const studentsToInsert = [];

      for (const [dept, rows] of Object.entries(byDept)) {
        const startId = await nextStudentId(dept);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          studentsToInsert.push({
            fullName:   row.fullName,
            studentId:  startId + i,                    // 101, 102, 103…
            email:      row.email,
            password:   await bcrypt.hash(row.password, 12),
            department: dept,
            role:       'student',
            status:     'active',
            createdBy,
          });
        }
      }

      // ordered: false → MongoDB continues inserting even when some rows are
      // duplicates. On partial failure it throws a BulkWriteError but STILL
      // inserts the non-duplicate rows. We must catch that error and read
      // err.insertedDocs (Mongoose ≥7) or err.result.result.insertedIds to
      // recover the successfully inserted documents.
      let inserted = [];
      let dupCount  = 0;
      const dupErrors = [];

      try {
        inserted = await User.insertMany(studentsToInsert, {
          ordered:                false,
          throwOnValidationError: false,
        });
      } catch (bulkErr) {
        // BulkWriteError — some rows succeeded, some were duplicates
        if (bulkErr.name === 'MongoBulkWriteError' || bulkErr.code === 11000) {
          // Mongoose attaches the successfully inserted docs here
          inserted = bulkErr.insertedDocs ?? [];

          // Collect info about which rows were skipped
          const writeErrors = bulkErr.result?.result?.writeErrors
            || bulkErr.writeErrors
            || [];

          dupCount = writeErrors.length || (studentsToInsert.length - inserted.length);

          for (const we of writeErrors) {
            const failed = studentsToInsert[we.index];
            if (failed) {
              dupErrors.push(
                `Skipped "${failed.email}" — duplicate email or Student ID ${failed.studentId} already exists in ${failed.department}`
              );
            }
          }
        } else {
          // Genuine unexpected error — rethrow to outer catch
          throw bulkErr;
        }
      }

      const allErrors = [
        ...rowErrors,    // validation errors from parsing (bad email, etc.)
        ...dupErrors,    // duplicate key errors from DB
      ];

      return res.status(201).json({
        message:       inserted.length
          ? `Added ${inserted.length} student(s)${dupCount ? ` (${dupCount} skipped — duplicates)` : ''}`
          : 'No new students were added — all records were duplicates',
        students:      inserted.map(shapeStudent),
        insertedCount: inserted.length,
        failedCount:   dupCount,
        errors:        allErrors.length ? allErrors : undefined,
      });

    } catch (err) {
      console.error('bulkAddStudents unexpected error:', err);
      res.status(500).json({ message: 'Failed to process bulk upload' });
    }
  },
];

// ─── DELETE STUDENT ───────────────────────────────────────────────────────────
// DELETE /api/admin/students/:id
// Admin can only delete students from their own department
export const deleteStudent = [
  async (req, res) => {
    try {
      const { id } = req.params;

      const student = await User.findOne({ _id: id, role: 'student' });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Dept guard — re-fetch admin from DB to get correct department
      const adminDept = await getAdminDept(req, res);
      if (!adminDept) return; // response already sent

      if (student.department.toUpperCase() !== adminDept.toUpperCase()) {
        return res.status(403).json({ message: 'Access denied — student is not in your department' });
      }

      await User.findByIdAndDelete(id);

      res.status(200).json({
        message:   'Student deleted successfully',
        studentId: student.studentId,
        _id:       student._id,
      });
    } catch (err) {
      console.error('deleteStudent:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// ─── UPDATE STUDENT ───────────────────────────────────────────────────────────
// PUT /api/admin/students/:id
// Updatable fields: fullName, email, status
// department is LOCKED — cannot be changed after creation (matches frontend lock)
// studentId and role are NOT updatable
export const updateStudent = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address'),

  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),

  async (req, res) => {
    if (!firstError(req, res)) return;

    try {
      const { id } = req.params;

      const student = await User.findOne({ _id: id, role: 'student' });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Re-fetch admin dept from DB — never trust stale JWT data
      const adminDept = await getAdminDept(req, res);
      if (!adminDept) return;

      if (student.department.toUpperCase() !== adminDept.toUpperCase()) {
        return res.status(403).json({ message: 'Access denied — student is not in your department' });
      }

      const { fullName, email, status } = req.body;

      // Build $set payload — only include fields that were actually sent
      const updates = {};

      if (fullName?.trim()) {
        updates.fullName = fullName.trim();
      }

      if (status) {
        updates.status = status;
      }

      // Email — check uniqueness only if it changed
      if (email) {
        const normalised = email.toLowerCase().trim();
        if (normalised !== student.email) {
          const emailTaken = await User.findOne({
            email: normalised,
            _id:   { $ne: id },   // exclude this student themselves
          });
          if (emailTaken) {
            return res.status(400).json({ message: 'Email is already in use by another account.' });
          }
          updates.email = normalised;
        }
      }

      if (!Object.keys(updates).length) {
        return res.status(400).json({ message: 'No valid fields provided to update.' });
      }

      // Use findByIdAndUpdate + $set — bypasses the pre-save hook so the
      // already-hashed password is never touched and studentId is never
      // re-evaluated. runValidators: true still validates the changed fields.
      const updated = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ message: 'Student not found after update.' });
      }

      res.status(200).json({
        message: 'Student updated successfully',
        student: shapeStudent(updated),
      });
    } catch (err) {
      console.error('updateStudent:', err);
      // Mongoose validation error — return a readable message
      if (err.name === 'ValidationError') {
        const msg = Object.values(err.errors).map((e) => e.message).join(', ');
        return res.status(400).json({ message: msg });
      }
      res.status(500).json({ message: 'Server error' });
    }
  },
];

// ─── CHANGE STUDENT PASSWORD ──────────────────────────────────────────────────
// PATCH /api/admin/students/:id/password
// Body: { newPassword }
// Admin resets a student's password — no old password required
export const changeStudentPassword = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  async (req, res) => {
    if (!firstError(req, res)) return;

    try {
      const { id } = req.params;

      const student = await User.findOne({ _id: id, role: 'student' });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      // Dept guard — re-fetch admin dept from DB
      const adminDept = await getAdminDept(req, res);
      if (!adminDept) return;

      if (student.department.toUpperCase() !== adminDept.toUpperCase()) {
        return res.status(403).json({ message: 'Access denied — student is not in your department' });
      }

      // Hash and save — directly set so the pre-save hook re-hashes it
      student.password = req.body.newPassword;
      await student.save(); // pre('save') hook hashes the new password

      res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
      console.error('changeStudentPassword:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
];