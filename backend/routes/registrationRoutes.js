import express from "express";

import {
  generateRegistrationQR,
  getRegistrationQR,
  registerStudentFromQR,
} from "../controllers/registrationController.js";

import {
  protect,
  adminOnly,
} from "../middleware/auth.js";

const router = express.Router();

// Admin generates QR
router.post(
  "/generate",
  protect,
  adminOnly,
  generateRegistrationQR
);

// Student scans QR
router.get(
  "/:token",
  getRegistrationQR
);

// Student submits registration
router.post(
  "/:token/register",
  registerStudentFromQR
);

export default router;