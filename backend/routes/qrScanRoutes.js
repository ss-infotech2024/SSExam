import express from "express";

import {
  scanStudentQR,
  getQRScanCount,
  getQRScans,
} from "../controllers/qrScanController.js";

import { protect, adminOnly } from "../middleware/auth.js";

const router = express.Router();

// Authentication + Admin protection
router.use(protect, adminOnly);

// Scan Student QR
router.post("/scan", scanStudentQR);

// Get QR scan count
router.get("/count", getQRScanCount);

// Get all QR scans
router.get("/scans", getQRScans);

export default router;