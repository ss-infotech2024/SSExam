import axios from "axios";

// Create Axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://ssexam.onrender.com/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Automatically attach token to every request
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ❌ Handle global response errors (like 401 unauthorized)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

// ==========================================
// QR SCANNER APIs
// ==========================================

// 🔍 Scan Student QR
export const scanStudentQR = (studentId, examId) => {
  return API.post("/admin/qr-scanner/scan", {
    studentId,
    examId,
  });
};

// 📊 Get QR Scan Count
export const getQRScanCount = (examId) => {
  return API.get("/admin/qr-scanner/count", {
    params: {
      examId,
    },
  });
};

// 📋 Get All QR Scans
export const getQRScans = (examId) => {
  return API.get("/admin/qr-scanner/scans", {
    params: {
      examId,
    },
  });
};

// ==========================================
// STUDENT REGISTRATION QR
// ==========================================

export const generateRegistrationQR = () => {
  return API.post("/student-registration/generate");
};

export const getRegistrationQR = (token) => {
  return API.get(`/student-registration/${token}`);
};

export const registerStudentFromQR = (token, studentData) => {
  return API.post(
    `/student-registration/${token}/register`,
    studentData
  );
};

export default API;