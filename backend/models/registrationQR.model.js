import mongoose from "mongoose";

const registrationQRSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Department of the admin who generated this QR
    department: {
      type: String,
      enum: ["Data Bricks", "Service Now", "MCA"],
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },

    totalRegistrations: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const RegistrationQR = mongoose.model(
  "RegistrationQR",
  registrationQRSchema
);

export default RegistrationQR;