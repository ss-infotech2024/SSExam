import QRScan from "../models/qrScan.model.js";
import User from "../models/user.models.js";

// ===============================
// SCAN STUDENT QR
// ===============================
export const scanStudentQR = async (req, res) => {
  try {
    const { studentId, examId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: "Exam ID is required",
      });
    }

    // Find student
    const student = await User.findOne({
      $or: [
        { studentId: studentId },
        { _id: studentId },
      ],
    }).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check duplicate scan for same exam
    const existingScan = await QRScan.findOne({
      student: student._id,
      exam: examId,
    });

    if (existingScan) {
      return res.status(200).json({
        success: false,
        duplicate: true,
        message: "Student already scanned for this exam",
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          mobile: student.mobile,
          department: student.department,
        },
      });
    }

    // Create scan record
    const scan = await QRScan.create({
      student: student._id,
      exam: examId,
      scannedBy: req.user._id,
      studentId: student.studentId || studentId,
      status: "added",
    });

    return res.status(201).json({
      success: true,
      message: "Student QR scanned successfully",
      scanId: scan._id,

      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        mobile: student.mobile,
        department: student.department,
      },
    });
  } catch (error) {
    console.error("QR Scan Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to scan QR",
      error: error.message,
    });
  }
};

// ===============================
// GET SCAN COUNT
// ===============================
export const getQRScanCount = async (req, res) => {
  try {
    const { examId } = req.query;

    const filter = {};

    if (examId) {
      filter.exam = examId;
    }

    const totalScanned = await QRScan.countDocuments(filter);

    const added = await QRScan.countDocuments({
      ...filter,
      status: "added",
    });

    const duplicate = await QRScan.countDocuments({
      ...filter,
      status: "duplicate",
    });

    return res.status(200).json({
      success: true,
      count: {
        totalScanned,
        added,
        duplicate,
      },
    });
  } catch (error) {
    console.error("QR Count Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get QR scan count",
      error: error.message,
    });
  }
};

// ===============================
// GET ALL SCANS
// ===============================
export const getQRScans = async (req, res) => {
  try {
    const { examId } = req.query;

    const filter = {};

    if (examId) {
      filter.exam = examId;
    }

    const scans = await QRScan.find(filter)
      .populate("student", "name email mobile studentId department")
      .populate("exam", "title name")
      .populate("scannedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: scans.length,
      scans,
    });
  } catch (error) {
    console.error("Get QR Scans Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get QR scans",
      error: error.message,
    });
  }
};