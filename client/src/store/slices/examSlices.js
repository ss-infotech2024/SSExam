// store/slices/examSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../services/api";
import axios from "axios";
const BASE_URL = import.meta.env.VITE_API_URL || "https://tgpexambackend.onrender.com/api";
// ─── Async Thunks ─────────────────────────────────────────────────────────────

// Admin — fetch all exams in their department
export const fetchExams = createAsyncThunk(
  "exams/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/admin/exams");
      return res.data.exams;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch exams");
    }
  }
);

// Admin — fetch single exam (for EditExam page)
export const fetchExamById = createAsyncThunk(
  "exams/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.get(`/admin/exams/${id}`);
      return res.data.exam;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch exam");
    }
  }
);

// Admin — create exam (manual form)
export const createExam = createAsyncThunk(
  "exams/create",
  async (body, { rejectWithValue }) => {
    try {
      const res = await API.post("/admin/exams", body);
      return res.data.exam;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create exam");
    }
  }
);

// ─── NEW: Excel upload → create exam ──────────────────────────────────────────
// Accepts a File object. Returns the created exam on success.
// On row-level validation errors the backend sends { message, errors: string[] }.
export const createExamFromExcel = createAsyncThunk(
  "exams/createFromExcel",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("examFile", file);

      const token = localStorage.getItem("token");

      const response = await axios.post(
        `${BASE_URL}/admin/exams/upload`,
        formData,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          // DO NOT set Content-Type here
        }
      );

      return response.data;
    } catch (error) {
      const data = error.response?.data;

      if (typeof data === "string") {
        return rejectWithValue(data);
      }

      if (data?.errors && Array.isArray(data.errors)) {
        return rejectWithValue({
          message: data.message || "Validation errors in your file.",
          errors: data.errors,
        });
      }

      if (data?.message) {
        return rejectWithValue(data.message);
      }

      return rejectWithValue(
        error.message || "Failed to upload exam. Please check your connection and try again."
      );
    }
  }
);
// ─── NEW: Download blank Excel template ───────────────────────────────────────
// Triggers a browser file download; nothing is stored in Redux state.
export const downloadExamTemplate = createAsyncThunk(
  "exams/downloadTemplate",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/admin/exams/template/download", {
        responseType: "blob",
      });
      // Create a temporary anchor and click it to trigger the download
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", "exam_upload_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to download template");
    }
  }
);

// Admin — update exam
export const updateExam = createAsyncThunk(
  "exams/update",
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const res = await API.put(`/admin/exams/${id}`, body);
      return res.data.exam;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update exam");
    }
  }
);

// Admin — delete exam
export const deleteExam = createAsyncThunk(
  "exams/delete",
  async (id, { rejectWithValue }) => {
    try {
      await API.delete(`/admin/exams/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete exam");
    }
  }
);

// Student — fetch exams for their department (no correctAnswer)
export const fetchStudentExams = createAsyncThunk(
  "exams/fetchStudent",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.get("/student/exams");
      return res.data.exams;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch exams");
    }
  }
);

// Student — fetch single exam to attempt (enforces time window)
export const fetchStudentExamById = createAsyncThunk(
  "exams/fetchStudentById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await API.get(`/student/exams/${id}`);
      return res.data.exam;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch exam");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const examSlice = createSlice({
  name: "exams",
  initialState: {
    // Admin
    list:          [],     // all exams for admin's dept
    selected:      null,   // single exam loaded for edit

    // Student
    studentList:   [],     // exams for student's dept (no correctAnswer)
    activeExam:    null,   // exam currently being attempted

    // State
    loading:       false,
    actionLoading: false,  // for create / update / delete spinners
    error:         null,   // fetch error
    actionError:   null,   // create / update / delete error

    // NEW: Excel-specific loading states (separate so the form spinner
    // doesn't fire when only the template download is in-flight)
    excelUploading:   false,
    templateDownloading: false,
  },
  reducers: {
    clearSelected:    (state) => { state.selected    = null; },
    clearActiveExam:  (state) => { state.activeExam  = null; },
    clearActionError: (state) => { state.actionError = null; },
    clearError:       (state) => { state.error       = null; },
  },
  extraReducers: (builder) => {

    // ── fetchExams (admin list) ───────────────────────────────────────────────
    builder
      .addCase(fetchExams.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.loading = false;
        state.list    = action.payload;
      })
      .addCase(fetchExams.rejected,  (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchExamById (admin edit) ────────────────────────────────────────────
    builder
      .addCase(fetchExamById.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchExamById.fulfilled, (state, action) => {
        state.loading  = false;
        state.selected = action.payload;
      })
      .addCase(fetchExamById.rejected,  (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── createExam (manual form) ──────────────────────────────────────────────
    builder
      .addCase(createExam.pending,   (state) => { state.actionLoading = true;  state.actionError = null; })
      .addCase(createExam.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.list.unshift(action.payload);
      })
      .addCase(createExam.rejected,  (state, action) => {
        state.actionLoading = false;
        state.actionError   = action.payload;
      });

    // ── createExamFromExcel (NEW) ─────────────────────────────────────────────
    builder
      .addCase(createExamFromExcel.pending,   (state) => {
        state.excelUploading = true;
        state.actionError    = null;
      })
      .addCase(createExamFromExcel.fulfilled, (state, action) => {
        state.excelUploading = false;
        state.list.unshift(action.payload);   // add to top of list, same as manual create
      })
      .addCase(createExamFromExcel.rejected,  (state, action) => {
        state.excelUploading = false;
        state.actionError    = action.payload;
      });

    // ── downloadExamTemplate (NEW) ────────────────────────────────────────────
    builder
      .addCase(downloadExamTemplate.pending,   (state) => { state.templateDownloading = true; })
      .addCase(downloadExamTemplate.fulfilled, (state) => { state.templateDownloading = false; })
      .addCase(downloadExamTemplate.rejected,  (state, action) => {
        state.templateDownloading = false;
        state.actionError         = action.payload;
      });

    // ── updateExam ────────────────────────────────────────────────────────────
    builder
      .addCase(updateExam.pending,   (state) => { state.actionLoading = true;  state.actionError = null; })
      .addCase(updateExam.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.list.findIndex(e => e._id === action.payload._id);
        if (idx !== -1) state.list[idx] = { ...state.list[idx], ...action.payload };
        if (state.selected?._id === action.payload._id) {
          state.selected = { ...state.selected, ...action.payload };
        }
      })
      .addCase(updateExam.rejected,  (state, action) => {
        state.actionLoading = false;
        state.actionError   = action.payload;
      });

    // ── deleteExam ────────────────────────────────────────────────────────────
    builder
      .addCase(deleteExam.pending,   (state) => { state.actionLoading = true;  state.actionError = null; })
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.list          = state.list.filter(e => e._id !== action.payload);
      })
      .addCase(deleteExam.rejected,  (state, action) => {
        state.actionLoading = false;
        state.actionError   = action.payload;
      });

    // ── fetchStudentExams ─────────────────────────────────────────────────────
    builder
      .addCase(fetchStudentExams.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchStudentExams.fulfilled, (state, action) => {
        state.loading     = false;
        state.studentList = action.payload;
      })
      .addCase(fetchStudentExams.rejected,  (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });

    // ── fetchStudentExamById ──────────────────────────────────────────────────
    builder
      .addCase(fetchStudentExamById.pending,   (state) => { state.loading = true;  state.error = null; })
      .addCase(fetchStudentExamById.fulfilled, (state, action) => {
        state.loading    = false;
        state.activeExam = action.payload;
      })
      .addCase(fetchStudentExamById.rejected,  (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      });
  },
});

export const {
  clearSelected,
  clearActiveExam,
  clearActionError,
  clearError,
} = examSlice.actions;

export default examSlice.reducer;