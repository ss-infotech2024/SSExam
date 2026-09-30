// controllers/studentController.js
import User from '../models/user.models.js';

// Get own student profile (basic example)
export const getStudentProfile = async (req, res) => {
  try {
    // req.user already has the logged-in user (from protect middleware)
    const student = await User.findById(req.user._id)
      .select('-password -__v') // exclude password & version key
      .populate('createdBy', 'email role'); // optional: show who created this student

    if (!student || student.role !== 'student') {
      return res.status(403).json({ message: 'Not a student account' });
    }

    res.json({
      message: 'Student profile',
      student: {
        id: student._id,
        fullName: student.fullName,
        department: student.department,
        email: student.email,
        createdAt: student.createdAt,
        createdBy: student.createdBy
          ? {
              id: student.createdBy._id,
              email: student.createdBy.email,
              role: student.createdBy.role,
            }
          : null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// You can add more student-specific endpoints later, e.g.:
// - update own profile (limited fields)
// - view assigned subjects (if you extend the schema)
// - etc.