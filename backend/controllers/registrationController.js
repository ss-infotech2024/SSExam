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
      active: true,
    });

    const frontendURL =
      process.env.FRONTEND_URL || "http://localhost:5173";

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
      department,
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

    // -------------------------------------------------
    // 2. REQUIRED FIELDS
    // -------------------------------------------------
    if (
      !fullName ||
      !email ||
      !mobile ||
      !department
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Full name, email, mobile and department are required.",
      });
    }

    // -------------------------------------------------
    // 3. VALID DEPARTMENT
    // -------------------------------------------------
    const allowedDepartments = [
      "Data Bricks",
      "Service Now",
      "MCA",
    ];

    if (!allowedDepartments.includes(department)) {
      return res.status(400).json({
        success: false,
        message: "Invalid department.",
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
    // Data Bricks -> 101
    // Data Bricks -> 102
    // Data Bricks -> 103

    // -------------------------------------------------
    // 6. GENERATE PASSWORD
    // -------------------------------------------------
    const password = `Student@${studentId}`;

    // -------------------------------------------------
    // 7. GENERATE ROLL NUMBER
    // -------------------------------------------------
    const finalRollNumber =
      rollNumber?.trim() ||
      `STUDENT${studentId}`;

    // -------------------------------------------------
    // 8. CREATE STUDENT
    // -------------------------------------------------
    const student = await User.create({
      fullName: fullName.trim(),

      studentId: studentId,

      rollNumber: finalRollNumber,

      department: department,

      email: email.toLowerCase().trim(),

      password: password,

      plainPassword: password,

      role: "student",

      status: "active",

      createdBy: registrationQR.createdBy,

      mobile: mobile.trim(),

      college: college?.trim() || "",
    });

    // -------------------------------------------------
    // 9. UPDATE QR REGISTRATION COUNT
    // -------------------------------------------------
    registrationQR.totalRegistrations += 1;

    await registrationQR.save();

    // -------------------------------------------------
    // 10. SUCCESS RESPONSE
    // -------------------------------------------------
    return res.status(201).json({
      success: true,

      message:
        "Student registration successful.",

      student: {
        id: student._id,

        fullName: student.fullName,

        email: student.email,

        mobile: student.mobile,

        college: student.college,

        department: student.department,

        studentId: student.studentId,

        formattedStudentId:
          `STUDENT${student.studentId}`,

        rollNumber: student.rollNumber,

        password: password,
      },
    });

  } catch (error) {

    console.error(
      "STUDENT REGISTRATION ERROR:",
      error
    );

    // Duplicate MongoDB key
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Student already exists with this email or student ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Student registration failed.",
      error: error.message,
    });
  }
};