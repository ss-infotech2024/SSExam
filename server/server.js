import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import superAdminRoutes from './routes/superRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import studentExamRoutes from './routes/examRoutes.js';
import examAttemptroutes from './routes/examattemptroutes.js';

dotenv.config();
const app = express();

// ✅ CORS FIX (IMPORTANT)
app.use(
  cors({
    origin: [
      "http://localhost:5173", // local dev
      "http://localhost:5174",
      "http://localhost:5175",
      "https://ss-exam-portal.netlify.app",
      "https://tgpexambackend.onrender.com"
    ],
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// DB connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/student', studentExamRoutes);
app.use('/api', examAttemptroutes);

// Health check (VERY IMPORTANT for Render)
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

// PORT (Render uses env PORT)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
