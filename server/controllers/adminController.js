import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import XLSX from 'xlsx';
import User from '../models/user.models.js';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      return cb(new Error('Only .xlsx and .xls files are allowed'));
    }
    cb(null, true);
  },
});

// ✅ Generates a secure random 10-char password
function generatePassword(length = 10) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$!%*?';
  const all = upper + lower + digits + symbols;

  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  const rest = Array.from({ length: length - required.length }, () =>
    all[Math.floor(Math.random() * all.length)]
  );

  return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}

// ✅ Builds Excel for bulk-add credentials (4 columns)
async function generateStudentExcel(credentials) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');

  ws.columns = [
    { header: 'Student ID', key: 'studentId', width: 18 },
    { header: 'Full Name', key: 'fullName', width: 26 },
    { header: 'Email', key: 'email', width: 34 },
    { header: 'Password', key: 'password', width: 20 },
  ];

  applyHeaderStyle(ws.getRow(1));
  credentials.forEach((cred, idx) => {
    const row = ws.addRow({
      studentId: cred.studentId,
      fullName: cred.fullName,
      email: cred.email,
      password: cred.password,
    });
    applyRowStyle(row, idx);
  });

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return wb.xlsx.writeBuffer();
}

// ✅ NEW: Builds Excel for "Download All" with passwords (7 columns)
async function generateAllStudentsExcel(students) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('All Students');

  ws.columns = [
    { header: 'Student ID', key: 'studentId', width: 18 },
    { header: 'Full Name', key: 'fullName', width: 26 },
    { header: 'Email', key: 'email', width: 34 },
    { header: 'Password', key: 'password', width: 20 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Join Date', key: 'joinDate', width: 14 },
  ];

  applyHeaderStyle(ws.getRow(1));

  students.forEach((s, idx) => {
    const row = ws.addRow({
      studentId: s.studentId,
      fullName: s.fullName,
      email: s.email,
      password: s.password,
      department: s.department,
      status: s.status,
      joinDate: s.joinDate,
    });
    applyRowStyle(row, idx);
  });

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return wb.xlsx.writeBuffer();
}

// ── Shared styling helpers ──────────────────────────────────────────────────
function applyHeaderStyle(headerRow) {
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder();
  });
  headerRow.height = 28;
}

function applyRowStyle(row, idx) {
  const bgColor = idx % 2 === 0 ? 'FFEBF0FA' : 'FFFFFFFF';
  row.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder();
  });
  row.height = 22;
}

function thinBorder() {
  const s = { style: 'thin', color: { argb: 'FFCCCCCC' } };
  return { top: s, bottom: s, left: s, right: s };
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK ADD STUDENTS
// ─────────────────────────────────────────────────────────────────────────────
export const bulkAddStudents = [
  upload.single('excelFile'),

  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded' });
    }

    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      if (rawData.length < 2) {
        return res.status(400).json({ message: 'Excel file is empty or has no data rows' });
      }

      const headers = rawData[0].map((h) =>
        String(h || '').trim().toLowerCase().replace(/\s+/g, '')
      );

      const col = (aliases) =>
        aliases.reduce((found, a) => (found !== -1 ? found : headers.indexOf(a)), -1);

      const nameIdx = col(['name', 'fullname', 'studentname']);
      const emailIdx = headers.findIndex((h) => h.includes('email'));

      if (nameIdx === -1 || emailIdx === -1) {
        return res.status(400).json({
          message: 'Excel must have columns: "Full Name" and "Email"',
        });
      }

      const adminDept = await getAdminDept(req, res);
      if (!adminDept) {
        return res.status(400).json({ message: 'Could not determine admin department' });
      }

      const createdBy = req.user?._id || req.user?.id;
      if (!createdBy) {
        return res.status(401).json({ message: 'Unauthorized: user ID not found' });
      }

      const rowErrors = [];
      const validRows = [];

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        const name = String(row[nameIdx] || '').trim();
        const email = String(row[emailIdx] || '').trim().toLowerCase();

        if (!name && !email) continue;

        if (!name) {
          rowErrors.push(`Row ${i + 1}: Name is required`);
          continue;
        }
        if (!email) {
          rowErrors.push(`Row ${i + 1}: Email is required`);
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          rowErrors.push(`Row ${i + 1}: Invalid email "${email}"`);
          continue;
        }

        validRows.push({ fullName: name, email });
      }

      console.log(`[BULK] Parsed ${validRows.length} valid rows from Excel`);

      if (!validRows.length) {
        return res.status(400).json({
          message: 'No valid student records found in the Excel file',
          errors: rowErrors,
        });
      }

      const emailsToCheck = validRows.map((r) => r.email);
      const existingUsers = await User.find(
        { email: { $in: emailsToCheck } },
        { email: 1 }
      ).lean();

      const existingEmails = new Set(existingUsers.map((u) => u.email));
      console.log(`[BULK] Found ${existingUsers.length} existing users`);

      const startSeq = await User.getNextStudentId(adminDept);
      console.log(`[BULK] Next sequence start: ${startSeq}`);

      const studentsToInsert = [];
      const plainCredentials = [];
      const preInsertErrors = [];

      let seqCounter = 0;

      for (const row of validRows) {
        if (existingEmails.has(row.email)) {
          preInsertErrors.push(`Skipped "${row.email}" — email already exists`);
          continue;
        }

        const studentIdNum = startSeq + seqCounter;
        const rollNumber = `STUDENT${studentIdNum}`;
        const rawPassword = generatePassword();

        seqCounter++;

        const hashedPassword = await bcrypt.hash(rawPassword, 12);

        studentsToInsert.push({
          fullName: row.fullName,
          studentId: studentIdNum,
          rollNumber: rollNumber,
          email: row.email,
          password: hashedPassword,
          plainPassword: rawPassword,          // ✅ NEW: store plain password
          department: adminDept,
          role: 'student',
          status: 'active',
          createdBy,
        });

        plainCredentials.push({
          studentId: rollNumber,
          fullName: row.fullName,
          email: row.email,
          password: rawPassword,
        });
      }

      console.log(`[BULK] Attempting to insert ${studentsToInsert.length} students`);

      if (!studentsToInsert.length) {
        return res.status(400).json({
          message: 'No new students to add — all emails already exist',
          errors: [...rowErrors, ...preInsertErrors],
        });
      }

      let insertedIndices = new Set(studentsToInsert.map((_, i) => i));
      const dupErrors = [];

      try {
        await User.insertMany(studentsToInsert, { ordered: false });
        console.log('[BULK] insertMany completed successfully');
      } catch (bulkErr) {
        console.error('[BULK] Insert error:', {
          name: bulkErr.name,
          code: bulkErr.code,
          writeErrorsCount: bulkErr.writeErrors?.length,
        });

        let writeErrors = bulkErr.writeErrors || bulkErr.result?.writeErrors || [];

        if (writeErrors.length > 0) {
          for (const we of writeErrors) {
            const idx = we.index ?? we.idx;
            if (idx !== undefined && idx !== null) {
              insertedIndices.delete(idx);
              const failed = studentsToInsert[idx];
              if (failed) {
                const errMsg = we.errmsg || '';
                const isEmailDup = errMsg.includes('email');
                const isIdDup = errMsg.includes('studentId');

                let reason = 'duplicate record';
                if (isEmailDup) reason = 'duplicate email';
                else if (isIdDup) reason = 'duplicate Student ID';

                dupErrors.push(`Skipped "${failed.email}" (${failed.rollNumber}) — ${reason}`);
              }
            }
          }
        } else {
          insertedIndices.clear();
          for (const s of studentsToInsert) {
            dupErrors.push(`Failed "${s.email}" — unknown error`);
          }
        }
      }

      const returnedCreds = plainCredentials.filter((_, idx) => insertedIndices.has(idx));
      const insertedCount = returnedCreds.length;

      console.log(`[BULK] Successfully inserted: ${insertedCount}`);

      const allErrors = [...rowErrors, ...preInsertErrors, ...dupErrors];

      if (insertedCount === 0) {
        return res.status(400).json({
          message: 'No new students added',
          errors: allErrors.length > 0 ? allErrors : ['Unknown insert error'],
        });
      }

      let exportBuffer;
      try {
        exportBuffer = await generateStudentExcel(returnedCreds);
      } catch (excelErr) {
        console.error('[BULK] Excel generation failed:', excelErr);
        return res.status(201).json({
          message: `${insertedCount} students added successfully`,
          inserted: returnedCreds,
          errors: allErrors,
        });
      }

      const filename = `students_credentials_${Date.now()}.xlsx`;

      return res
        .status(201)
        .set({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Inserted-Count': String(insertedCount),
          'X-Failed-Count': String(studentsToInsert.length - insertedCount),
          'X-Errors': JSON.stringify(allErrors),
        })
        .send(exportBuffer);
    } catch (err) {
      console.error('[BULK] Unexpected error:', err);
      res.status(500).json({
        message: 'Failed to process bulk upload',
        error: err.message,
      });
    }
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW: DOWNLOAD ALL STUDENTS WITH PASSWORDS
// ─────────────────────────────────────────────────────────────────────────────
export const downloadAllStudentsExcel = async (req, res) => {
  try {
    const department = req.query.department;
    if (!department) {
      return res.status(400).json({ message: 'Department parameter is required' });
    }

    const students = await User.find({
      department,
      role: 'student',
    })
      .select('studentId rollNumber fullName name email plainPassword department status joinDate createdAt')
      .sort({ studentId: 1 })
      .lean();

    if (!students.length) {
      return res.status(404).json({ message: 'No students found for this department' });
    }

    const rows = students.map((s) => ({
      studentId: s.rollNumber || String(s.studentId ?? '—'),
      fullName: s.fullName || s.name || '—',
      email: s.email || '—',
      password: s.plainPassword || 'N/A',       // "N/A" for students created before this change
      department: s.department || department,
      status: s.status || 'active',
      joinDate:
        s.joinDate ||
        (s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '—'),
    }));

    const buffer = await generateAllStudentsExcel(rows);
    const filename = `${department}_students_with_passwords_${Date.now()}.xlsx`;

    return res
      .status(200)
      .set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Total-Count': String(students.length),
      })
      .send(buffer);
  } catch (err) {
    console.error('[DOWNLOAD ALL] Error:', err);
    res.status(500).json({ message: 'Failed to generate Excel', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SINGLE STUDENT — also save plainPassword
// ─────────────────────────────────────────────────────────────────────────────
export const createStudent = async (req, res) => {
  try {
    const { fullName, email, password, department, studentId } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Check duplicate email
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ message: 'A student with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let assignedId = studentId;
    if (!assignedId) {
      assignedId = await User.getNextStudentId(department);
    }

    const rollNumber = `STUDENT${assignedId}`;

    const student = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      plainPassword: password,                    // ✅ NEW: store plain password
      studentId: Number(assignedId),
      rollNumber,
      department,
      role: 'student',
      status: 'active',
      createdBy: req.user?._id || req.user?.id,
    });

    return res.status(201).json({
      message: 'Student created successfully',
      student,
    });
  } catch (err) {
    console.error('[CREATE STUDENT] Error:', err);
    res.status(500).json({ message: 'Failed to create student', error: err.message });
  }
};

// (keep your existing getStudents, getAdminDept, etc. unchanged below)

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
// export const createStudent = [
//   body('fullName')
//     .trim()
//     .notEmpty()
//     .withMessage('Full name is required'),

//   body('email')
//     .trim()
//     .isEmail()
//     .withMessage('Invalid email address'),

//   body('password')
//     .isLength({ min: 6 })
//     .withMessage('Password must be at least 6 characters'),

//   body('department')
//     .isIn(DEPARTMENTS)
//     .withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),

//   body('studentId')
//     .optional({ nullable: true, checkFalsy: true })
//     .isInt({ min: 1 })
//     .withMessage('Student ID must be a positive integer'),

//   async (req, res) => {
//     if (!firstError(req, res)) return;

//     const { fullName, email, password, department } = req.body;
//     // studentId from body (admin manual entry) — undefined means auto-assign
//     const manualId = req.body.studentId != null && req.body.studentId !== ''
//       ? parseInt(req.body.studentId, 10)
//       : null;

//     try {
//       const existing = await User.findOne({ email: email.toLowerCase().trim() });
//       if (existing) {
//         return res.status(400).json({ message: 'A user with this email already exists.' });
//       }

//       // If admin provided a studentId, check it is not already taken in this dept
//       if (manualId !== null) {
//         const taken = await User.findOne({ studentId: manualId, department });
//         if (taken) {
//           return res.status(400).json({
//             message: `Student ID ${manualId} is already taken in the ${department} department. Please choose a different ID.`,
//           });
//         }
//       }

//       // Use manual ID if provided, otherwise auto-generate
//       const studentId = manualId !== null ? manualId : await nextStudentId(department);

//       const user = new User({
//         fullName:   fullName.trim(),
//         studentId,
//         email:      email.toLowerCase().trim(),
//         password,                      // pre-save hook hashes this
//         department,
//         role:       'student',
//         status:     'active',
//         createdBy:  req.user._id,
//       });

//       await user.save();

//       res.status(201).json({
//         message: 'Student created successfully',
//         student: shapeStudent(user),
//       });
//     } catch (err) {
//       // Compound unique index violation: same studentId + department combo
//       if (err.code === 11000 && err.keyPattern?.studentId) {
//         return res.status(400).json({
//           message: `Student ID ${manualId ?? 'auto-assigned'} already exists in the ${req.body.department} department.`,
//         });
//       }
//       console.error('createStudent:', err);
//       res.status(500).json({ message: 'Server error' });
//     }
//   },
// ];

// ─── MULTER CONFIG ────────────────────────────────────────────────────────────


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