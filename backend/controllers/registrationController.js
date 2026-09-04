import crypto from "crypto";
import RegistrationQR from "../models/registrationQR.model.js";
import User from "../models/user.models.js";

// =====================================================
// GENERATE REGISTRATION QR
// =====================================================
export const generateRegistrationQR = async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString("hex");

    const registrationQR = await RegistrationQR.create({
      token,
      createdBy: req.user._id,
      department: req.user.department,
      active: true,
    });

    const frontendURL = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");

    const registrationURL =
      `${frontendURL}/student-registration/${token}`;
      
    res.status(201).json({
      success: true,
      message: "Registration QR generated successfully.",

      token,

      registrationURL,

      totalRegistrations:
        registrationQR.totalRegistrations,
    });
  } catch (error) {
    console.error("GENERATE REGISTRATION QR ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate registration QR.",
      error: error.message,
    });
  }
};

// =====================================================
// GET REGISTRATION QR DETAILS
// =====================================================
export const getRegistrationQR = async (req, res) => {
  try {
    const { token } = req.params;

    const registrationQR = await RegistrationQR.findOne({
      token,
      active: true,
    });

    if (!registrationQR) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired registration QR.",
      });
    }

    const department = registrationQR.department;
    
    res.json({
      success: true,
      message: "Registration QR is valid.",
      totalRegistrations:
        registrationQR.totalRegistrations,
    });
  } catch (error) {
    console.error("GET REGISTRATION QR ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to validate registration QR.",
      error: error.message,
    });
  }
};

// =====================================================
// REGISTER STUDENT USING QR
// =====================================================
export const registerStudentFromQR = async (req, res) => {
  try {
    const { token } = req.params;

    const {
      fullName,
      email,
      mobile,
      college,
      password,
      rollNumber,
    } = req.body;

    // -------------------------------------------------
    // 1. CHECK QR
    // -------------------------------------------------

    const registrationQR = await RegistrationQR.findOne({
      token,
      active: true,
    });

    
    if (!registrationQR) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired registration QR.",
      });
    }
    
    const department = registrationQR.department;
    // -------------------------------------------------
    // 2. REQUIRED FIELDS
    // -------------------------------------------------

    if (
      !fullName ||
      !email ||
      !mobile ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email, mobile and password are required.",
      });
    }

    // -------------------------------------------------
    // 3. PASSWORD VALIDATION
    // -------------------------------------------------

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long.",
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one uppercase letter.",
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one lowercase letter.",
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one number.",
      });
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one special character.",
      });
    }

    // -------------------------------------------------
    // 4. CHECK DUPLICATE EMAIL
    // -------------------------------------------------

    const existingStudent = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message:
          "A student with this email already exists.",
      });
    }

    // -------------------------------------------------
    // 5. GENERATE NEXT STUDENT ID
    // -------------------------------------------------

    const studentId =
      await User.getNextStudentId(department);

    // Example:
    // Existing highest = 160
    // New student = 161

    // -------------------------------------------------
    // 6. GENERATE ROLL NUMBER
    // -------------------------------------------------

    const finalRollNumber =
      rollNumber?.trim() ||
      `STUDENT${studentId}`;

    // -------------------------------------------------
    // 7. CREATE STUDENT
    // -------------------------------------------------

    const student = await User.create({
      fullName: fullName.trim(),
      studentId: studentId,
      rollNumber: finalRollNumber,
      email: email.toLowerCase().trim(),
      password: password,
      role: "student",
      status: "active",

      // IMPORTANT
      department: department,

      createdBy: registrationQR.createdBy,
      mobile: mobile.trim(),
      college: college?.trim() || "",
    });

    // -------------------------------------------------
    // 8. UPDATE QR REGISTRATION COUNT
    // -------------------------------------------------

    registrationQR.totalRegistrations += 1;

    await registrationQR.save();

    // -------------------------------------------------
    // 9. SUCCESS RESPONSE
    // -------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        "Student registration successful.",

      student: {
        id: student._id,

        fullName: student.fullName,

        name: student.fullName,

        email: student.email,

        mobile: student.mobile,

        college: student.college,

        studentId: student.studentId,

        formattedStudentId:
          `STUDENT${student.studentId}`,

        rollNumber: student.rollNumber,
      },
    });

  } catch (error) {

    console.error(
      "STUDENT REGISTRATION ERROR:",
      error
    );

    // Duplicate MongoDB key
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(409).json({
          success: false,
          message: "A student with this email already exists.",
        });
      }

      if (error.keyPattern?.studentId) {
        return res.status(409).json({
          success: false,
          message: "Student ID already exists. Please try again.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Duplicate student record.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Student registration failed.",
      error: error.message,
    });
  }
};