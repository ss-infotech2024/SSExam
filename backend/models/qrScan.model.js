import mongoose from "mongoose";

const qrScanSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    studentId: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["added", "duplicate"],
      default: "added",
    },

    scannedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const QRScan = mongoose.model("QRScan", qrScanSchema);

export default QRScan;