// pages/admin/ExamList.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchExams, deleteExam, clearActionError } from "../../store/slices/examSlices";
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiClock, FiBookOpen,
  FiRefreshCw, FiCheckCircle, FiAlertCircle, FiX, FiCalendar,
  FiChevronRight, FiInbox, FiStar, FiUsers,
} from "react-icons/fi";

// ─── IST Timezone Helpers ─────────────────────────────────────────────────────

/**
 * Formats a UTC ISO string from DB → readable IST datetime string.
 * e.g. "2025-04-09T11:20:00.000Z"  →  "09 Apr 2025, 04:50 PM IST"
 */
const formatIST = (isoString) => {
  if (!isoString) return "—";
  return (
    new Date(isoString).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day:      "2-digit",
      month:    "short",
      year:     "numeric",
      hour:     "2-digit",
      minute:   "2-digit",
      hour12:   true,
    }) + " IST"
  );
};

/**
 * Formats a UTC ISO string → date-only IST string.
 * e.g. "2025-04-09T11:20:00.000Z"  →  "09 Apr 2025"
 */
const formatDateIST = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day:      "2-digit",
    month:    "short",
    year:     "numeric",
  });
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5
    rounded-xl shadow-2xl text-sm font-semibold max-w-sm
    ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}>
    {type === "success"
      ? <FiCheckCircle className="w-4 h-4 shrink-0" />
      : <FiAlertCircle className="w-4 h-4 shrink-0" />}
    <span className="flex-1">{message}</span>
    <button onClick={onClose}><FiX className="w-4 h-4 opacity-70 hover:opacity-100" /></button>
  </div>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS = {
  upcoming:  { label: "Upcoming",  bg: "bg-blue-100",  text: "text-blue-700",  dot: "bg-blue-500"  },
  active:    { label: "Live Now",  bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  completed: { label: "Completed", bg: "bg-gray-100",  text: "text-gray-500",  dot: "bg-gray-400"  },
};

const DEPT_STYLE = {
  IT:  { bg: "bg-purple-600", light: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  CS:  { bg: "bg-blue-600",   light: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"   },
  CE:  { bg: "bg-green-600",  light: "bg-green-50",  text: "text-green-700",  border: "border-green-200"  },
  ECE: { bg: "bg-yellow-500", light: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────
const DeleteModal = ({ exam, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FiTrash2 className="w-6 h-6 text-red-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Exam</h3>
      <p className="text-sm text-gray-500 text-center mb-6">
        Delete <span className="font-semibold text-gray-800">"{exam.subject}"</span>?
        This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl
            text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {loading
            ? <><FiRefreshCw className="w-4 h-4 animate-spin" /> Deleting…</>
            : "Yes, Delete"}
        </button>
      </div>
    </div>
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const ExamList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: exams, loading, actionLoading, actionError } = useSelector((s) => s.exams);

  useEffect(() => {
    const role  = localStorage.getItem("userRole");
    const dept  = localStorage.getItem("adminDepartment");
    const token = localStorage.getItem("token");
    if (!token || role !== "admin" || !dept) navigate("/");
    dispatch(clearActionError());
  }, []); // eslint-disable-line

  const adminDept = localStorage.getItem("adminDepartment") || "";
  const ds        = DEPT_STYLE[adminDept] || DEPT_STYLE["CS"];

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { if (actionError) showToast(actionError, "error"); }, [actionError]);
  useEffect(() => { dispatch(fetchExams()); }, [dispatch]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const subj = deleteTarget.subject;
    const res  = await dispatch(deleteExam(deleteTarget._id));
    if (res.meta.requestStatus === "fulfilled") {
      showToast(`"${subj}" deleted`);
      setDeleteTarget(null);
    }
  };

  const filtered = exams.filter((e) =>
    (statusFilter === "all" || e.status === statusFilter) &&
    (!search.trim() || e.subject.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total:     exams.length,
    upcoming:  exams.filter((e) => e.status === "upcoming").length,
    active:    exams.filter((e) => e.status === "active").length,
    completed: exams.filter((e) => e.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {deleteTarget && (
        <DeleteModal
          exam={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={actionLoading}
        />
      )}

      <div className="max-w-7xl mx-auto">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exams</h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5">
              <FiBookOpen className="w-4 h-4" />
              All exams for the{" "}
              <span className={`font-bold ${ds.text}`}>{adminDept}</span> department
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => dispatch(fetchExams())}
              title="Refresh"
              className="p-2.5 border border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100">
              <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => navigate("/admin/create-exam")}
              className={`flex items-center gap-2 px-5 py-2.5 ${ds.bg}
                text-white text-sm font-semibold rounded-xl hover:opacity-90 shadow-sm`}>
              <FiPlus className="w-4 h-4" /> Create Exam
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Exams", value: stats.total,     icon: FiBookOpen,    color: "text-gray-700",  bg: "bg-gray-100"  },
            { label: "Upcoming",    value: stats.upcoming,  icon: FiCalendar,    color: "text-blue-600",  bg: "bg-blue-50"   },
            { label: "Live Now",    value: stats.active,    icon: FiCheckCircle, color: "text-green-600", bg: "bg-green-50"  },
            { label: "Completed",   value: stats.completed, icon: FiClock,       color: "text-gray-500",  bg: "bg-gray-100"  },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                {loading
                  ? <div className="h-7 w-8 bg-gray-200 rounded animate-pulse mt-0.5" />
                  : <p className={`text-2xl font-bold ${color}`}>{value}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* ── SEARCH + FILTER ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {["all", "upcoming", "active", "completed"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold capitalize transition-colors
                  ${statusFilter === s
                    ? `${ds.bg} text-white shadow-sm`
                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                {s === "all" ? "All" : STATUS[s]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TABLE ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">
              {loading
                ? "Loading…"
                : `${filtered.length} exam${filtered.length !== 1 ? "s" : ""}`}
              {statusFilter !== "all" && ` — ${STATUS[statusFilter]?.label}`}
            </p>
            {(search || statusFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                <FiX className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded-full animate-pulse w-48" />
                  <div className="h-4 bg-gray-200 rounded-full animate-pulse w-20 ml-auto" />
                  <div className="h-4 bg-gray-200 rounded-full animate-pulse w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FiInbox className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">
                {search || statusFilter !== "all"
                  ? "No exams match your filters"
                  : "No exams yet"}
              </p>
              {!search && statusFilter === "all" && (
                <button
                  onClick={() => navigate("/admin/create-exam")}
                  className={`flex items-center gap-2 px-5 py-2.5 mt-4 ${ds.bg}
                    text-white text-sm font-semibold rounded-xl hover:opacity-90`}>
                  <FiPlus className="w-4 h-4" /> Create First Exam
                </button>
              )}
            </div>
          )}

          {/* Data rows */}
          {!loading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Subject", "Status", "Questions",
                      "Marks/Q", "Total Marks", "Duration",
                      "Start Time", "End Time", "Actions",
                    ].map((h) => (
                      <th key={h}
                        className="px-5 py-3 text-left text-xs font-bold text-gray-400
                          uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((exam) => {
                    const s          = STATUS[exam.status] || STATUS.upcoming;
                    const totalMarks = (exam.questionCount ?? 0) * (exam.marksPerQuestion ?? 1);
                    return (
                      <tr key={exam._id} className="hover:bg-gray-50 transition-colors">

                        {/* Subject */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 ${ds.light} ${ds.border} border rounded-lg
                              flex items-center justify-center shrink-0`}>
                              <FiBookOpen className={`w-4 h-4 ${ds.text}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{exam.subject}</p>
                              {/* ✅ IST fix: createdAt date */}
                              <p className="text-xs text-gray-400 mt-0.5">
                                Created {formatDateIST(exam.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1
                            rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}
                              ${exam.status === "active" ? "animate-pulse" : ""}`} />
                            {s.label}
                          </span>
                        </td>

                        {/* Questions */}
                        <td className="px-5 py-4 text-sm text-gray-600 font-medium">
                          {exam.questionCount ?? 0}
                        </td>

                        {/* Marks/Q */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1
                            rounded-full text-xs font-bold ${ds.light} ${ds.text} border ${ds.border}`}>
                            <FiStar className="w-3 h-3" />
                            {exam.marksPerQuestion ?? 1}
                          </span>
                        </td>

                        {/* Total Marks */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-gray-800">{totalMarks}</span>
                          <span className="text-xs text-gray-400 ml-1">marks</span>
                        </td>

                        {/* Duration */}
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1.5 text-sm text-gray-600">
                            <FiClock className="w-3.5 h-3.5 text-gray-400" />
                            {exam.duration} min
                          </span>
                        </td>

                        {/* ✅ Start Time — IST */}
                        <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatIST(exam.startTime)}
                        </td>

                        {/* ✅ End Time — IST (new column) */}
                        <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {formatIST(exam.endTime)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">

                            {/* Edit */}
                            <button
                              onClick={() => navigate(`/admin/exams/${exam._id}/edit`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                                text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                              <FiEdit2 className="w-3.5 h-3.5" /> Edit
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteTarget(exam)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                                text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                              <FiTrash2 className="w-3.5 h-3.5" /> Delete
                            </button>

                            {/* View Attempts */}
                            <button
                              onClick={() => navigate(`/admin/exams/${exam._id}/attempts`)}
                              title="View student attempts"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                                text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
                              <FiUsers className="w-3.5 h-3.5" /> Attempts
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamList;