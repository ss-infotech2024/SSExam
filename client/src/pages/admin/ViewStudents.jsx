import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaEdit, FaTrash, FaKey, FaTimes, FaCheckCircle,
  FaExclamationTriangle, FaUserGraduate, FaSearch,
} from "react-icons/fa";
import { FiRefreshCw, FiAlertCircle } from "react-icons/fi";

// ─── AXIOS INSTANCE ───────────────────────────────────────────────────────────
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://onlineexamportal-uvvx.onrender.com/api",
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    window.location.href = "/";
    return Promise.reject(new Error("Not authenticated"));
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("adminDepartment");
      window.location.href = "/";
      return Promise.reject(new Error("Session expired. Please log in again."));
    }
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.msg ||
      err.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

// ─── API ──────────────────────────────────────────────────────────────────────
const api = {
  // GET /api/admin/students?status=active&search=john
  fetchStudents: (params) =>
    axiosInstance.get("/admin/students", { params }).then((r) => r.data),

  // PUT /api/admin/students/:id
  updateStudent: (id, body) =>
    axiosInstance.put(`/admin/students/${id}`, body).then((r) => r.data),

  // DELETE /api/admin/students/:id
  deleteStudent: (id) =>
    axiosInstance.delete(`/admin/students/${id}`).then((r) => r.data),

  // PATCH /api/admin/students/:id/password
  changePassword: (id, newPassword) =>
    axiosInstance
      .patch(`/admin/students/${id}/password`, { newPassword })
      .then((r) => r.data),
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEPARTMENTS = ["IT", "CS", "CE", "ECE"];
const DEPT_LABELS = {
  IT: "Information Technology",
  CS: "Computer Science",
  CE: "Civil Engineering",
  ECE: "Electronics & Communication",
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl
      shadow-2xl text-sm font-semibold transition-all
      ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}
  >
    {type === "success"
      ? <FaCheckCircle className="shrink-0" />
      : <FaExclamationTriangle className="shrink-0" />}
    <span>{message}</span>
    <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
      <FaTimes />
    </button>
  </div>
);

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
const EditModal = ({ student, onClose, onSaved }) => {
  const [form,        setForm]        = useState({
    fullName:   student.fullName || student.name || "",
    email:      student.email      || "",
    department: student.department || "",
    status:     student.status     || "active",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!form.fullName.trim()) return setError("Full name is required");
    if (!form.email.trim())    return setError("Email is required");

    setSaving(true);
    setError("");
    try {
      // Only send editable fields — department is locked server-side too
      const { fullName, email, status } = form;
      const data = await api.updateStudent(student._id, { fullName, email, status });
      onSaved(data.student);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Edit Student</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg flex items-center gap-2">
              <FiAlertCircle /> {error}
            </p>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text" name="fullName" value={form.fullName} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" name="email" value={form.email} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Department — LOCKED, admin cannot move student to another dept */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <div className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-lg
              text-sm text-gray-700 flex items-center justify-between">
              <span className="font-semibold">{form.department}</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                🔒 Locked
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Department cannot be changed after student creation
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status" value={form.status} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm
              disabled:opacity-50 transition flex items-center gap-2"
          >
            {saving
              ? <><FiRefreshCw className="animate-spin w-4 h-4" /> Saving…</>
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── PASSWORD MODAL ───────────────────────────────────────────────────────────
const PasswordModal = ({ student, onClose }) => {
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error,           setError]           = useState("");
  const [saving,          setSaving]          = useState(false);
  const [success,         setSuccess]         = useState(false);

  const generateRandom = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    const pwd   = Array.from({ length: 10 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    if (!newPassword || !confirmPassword) return setError("Both fields are required");
    if (newPassword.length < 6)           return setError("Password must be at least 6 characters");
    if (newPassword !== confirmPassword)  return setError("Passwords do not match");

    setSaving(true);
    try {
      await api.changePassword(student._id, newPassword);
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-semibold">{student.fullName || student.name}</span>
            {" "}· ID: {student.studentId ?? "N/A"} · {student.department}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {success ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 text-green-800 rounded-xl">
              <FaCheckCircle size={20} />
              <span className="font-semibold">Password updated successfully!</span>
            </div>
          ) : (
            <>
              <button
                onClick={generateRandom}
                className="w-full py-2.5 px-4 bg-purple-50 text-purple-700 border border-purple-200
                  rounded-lg hover:bg-purple-100 transition text-sm font-medium flex items-center justify-center gap-2"
              >
                <FiRefreshCw className="w-4 h-4" /> Generate Random Password
              </button>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input
                  type="text"     // text so admin can see what they're setting
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none
                    focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input
                  type="text"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none
                    focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg flex items-center gap-2">
                  <FaExclamationTriangle /> {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          {!success && (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                text-sm font-medium disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving
                ? <><FiRefreshCw className="animate-spin w-4 h-4" /> Updating…</>
                : "Update Password"}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── DELETE MODAL ─────────────────────────────────────────────────────────────
const DeleteModal = ({ student, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await api.deleteStudent(student._id);
      onDeleted(student._id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-bold text-red-600">Delete Student</h3>
          <p className="mt-2 text-gray-600 text-sm">
            Are you sure you want to delete{" "}
            <strong>{student.fullName || student.name}</strong>?
            This action <strong>cannot be undone</strong>.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ID: {student.studentId ?? "N/A"} · {student.department}
          </p>
        </div>

        {error && (
          <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg flex items-center gap-2">
            <FaExclamationTriangle /> {error}
          </p>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700
              text-sm font-medium disabled:opacity-50 transition flex items-center gap-2"
          >
            {deleting
              ? <><FiRefreshCw className="animate-spin w-4 h-4" /> Deleting…</>
              : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const ViewStudents = () => {
  const navigate = useNavigate();

  const [adminDepartment, setAdminDepartment] = useState("");
  const [students,        setStudents]        = useState([]);
  const [loading,         setLoading]         = useState(true);

  const [searchTerm,    setSearchTerm]    = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");

  // Modal state — only one modal open at a time
  const [modal,           setModal]           = useState(null); // 'edit' | 'password' | 'delete'
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const role  = localStorage.getItem("userRole");
    const dept  = localStorage.getItem("adminDepartment");
    const token = localStorage.getItem("token");

    if (!token || role !== "admin" || !dept) { navigate("/"); return; }

    setAdminDepartment(dept);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load students when department is set ───────────────────────────────────
  useEffect(() => {
    if (!adminDepartment) return;
    loadStudents();
  }, [adminDepartment]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await api.fetchStudents({ department: adminDepartment });
      setStudents(data.students || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered list (client-side — all students are already dept-filtered by backend) ──
  const filtered = students.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      (s.fullName || s.name || "").toLowerCase().includes(q) ||
      // studentId is a Number — safely convert, skip if undefined
      (s.studentId != null && String(s.studentId).includes(q)) ||
      (s.email || "").toLowerCase().includes(q);

    const matchStatus =
      !statusFilter || statusFilter === "All" || s.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openModal  = (type, student) => { setSelectedStudent(student); setModal(type); };
  const closeModal = ()               => { setSelectedStudent(null);   setModal(null); };

  // ── CRUD handlers (update state without full reload) ───────────────────────
  const handleUpdated = (updated) => {
    setStudents((p) => p.map((s) => (s._id === updated._id ? updated : s)));
    closeModal();
    showToast("Student updated successfully");
  };

  const handleDeleted = (deletedId) => {
    setStudents((p) => p.filter((s) => s._id !== deletedId));
    closeModal();
    showToast("Student deleted successfully");
  };

  const clearFilters = () => { setSearchTerm(""); setStatusFilter(""); };
  const activeFilters = [searchTerm, statusFilter].filter(Boolean).length;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">View Students</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Department: <strong className="text-gray-700">
                {adminDepartment} — {DEPT_LABELS[adminDepartment] || adminDepartment}
              </strong>
            </p>
          </div>
          <button
            onClick={loadStudents}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300
              rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          {[
            { label: "Total Students",    value: filtered.length,                                          color: "text-gray-900"  },
            { label: "Active Students",   value: filtered.filter((s) => s.status === "active").length,    color: "text-green-600" },
            { label: "Inactive Students", value: filtered.filter((s) => s.status === "inactive").length,  color: "text-red-600"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500">{label}</p>
              {loading
                ? <div className="h-9 w-14 bg-gray-200 rounded-lg animate-pulse mt-2" />
                : <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              }
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, ID or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg
                hover:bg-red-100 text-sm transition flex items-center gap-2"
            >
              <FaTimes /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["ID", "Student Name", "Email", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[40, 140, 160, 60, 80].map((w, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded-full animate-pulse" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-14 rounded-xl shadow-sm text-center border border-gray-200">
            <FaUserGraduate className="w-14 h-14 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No students found</h3>
            <p className="text-gray-400 text-sm">
              {students.length === 0
                ? `No students have been added to ${adminDepartment} yet.`
                : "No students match your current search or filter."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {["ID", "Student Name", "Email", "Join Date", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50 transition-colors">

                      {/* ID */}
                      <td className="px-6 py-3.5">
                        {student.studentId != null ? (
                          <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1
                            bg-blue-50 text-blue-700 text-xs font-bold rounded-lg font-mono">
                            {student.studentId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1
                            bg-gray-100 text-gray-400 text-xs font-medium rounded-lg font-mono italic">
                            N/A
                          </span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-blue-600 text-sm font-bold">
                              {(student.fullName || student.name || "?")[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {student.fullName || student.name}
                            </p>
                            <p className="text-xs text-gray-400">{student.department}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-3.5 text-sm text-gray-500">{student.email}</td>

                      {/* Join Date */}
                      <td className="px-6 py-3.5 text-sm text-gray-400">
                        {student.joinDate || student.createdAt?.split("T")[0] || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full
                          ${student.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"}`}>
                          {student.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openModal("edit", student)}
                            title="Edit student"
                            className="text-blue-500 hover:text-blue-700 transition"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => openModal("password", student)}
                            title="Change password"
                            className="text-purple-500 hover:text-purple-700 transition"
                          >
                            <FaKey />
                          </button>
                          <button
                            onClick={() => openModal("delete", student)}
                            title="Delete student"
                            className="text-red-500 hover:text-red-700 transition"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              Showing {filtered.length} of {students.length} student{students.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "edit"     && selectedStudent && (
        <EditModal
          student={selectedStudent}
          onClose={closeModal}
          onSaved={handleUpdated}
        />
      )}
      {modal === "password" && selectedStudent && (
        <PasswordModal
          student={selectedStudent}
          onClose={closeModal}
        />
      )}
      {modal === "delete"   && selectedStudent && (
        <DeleteModal
          student={selectedStudent}
          onClose={closeModal}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
};

export default ViewStudents;