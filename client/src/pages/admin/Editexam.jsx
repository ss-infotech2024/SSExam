// pages/admin/EditExam.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchExamById, updateExam, clearSelected, clearActionError } from "../../store/slices/examSlices";
import {
  FiCheckCircle, FiAlertCircle, FiX, FiRefreshCw,
  FiTrash2, FiPlusCircle, FiSave, FiArrowLeft,
  FiBookOpen, FiClock, FiHash, FiStar, FiLock,
} from "react-icons/fi";

// ─── IST Timezone Helpers ─────────────────────────────────────────────────────

/**
 * Converts a UTC ISO string from DB → datetime-local input value in IST.
 * e.g. "2025-04-09T11:20:00.000Z"  →  "2025-04-09T16:50"
 * Used to PRE-FILL the form when editing an existing exam.
 */
const isoToLocalInput = (isoString) => {
  if (!isoString) return "";
  const utcMs = new Date(isoString).getTime();
  const istMs = utcMs + (5 * 60 + 30) * 60 * 1000; // add 5h 30m
  const ist   = new Date(istMs);
  const pad   = (n) => String(n).padStart(2, "0");
  return (
    `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}` +
    `T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`
  );
};

/**
 * Converts a datetime-local string (treated as IST) → UTC ISO string.
 * e.g. "2025-04-09T16:50"  →  "2025-04-09T11:20:00.000Z"
 * Used before sending startTime / endTime to the backend.
 */
const localToIST_ISO = (localStr) => {
  if (!localStr) return "";
  const [datePart, timePart] = localStr.split("T");
  const [year, month, day]   = datePart.split("-").map(Number);
  const [hour, minute]       = timePart.split(":").map(Number);
  // IST = UTC + 5:30  →  UTC = IST − 5:30
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute) - (5 * 60 + 30) * 60 * 1000;
  return new Date(utcMs).toISOString();
};

/**
 * Formats a UTC ISO string → readable IST string for display / preview.
 * e.g. "2025-04-09T11:20:00.000Z"  →  "09 Apr 2025, 04:50 PM IST"
 */
const formatIST = (isoString) => {
  if (!isoString) return "";
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
const DEPT_STYLE = {
  IT:  { bg: "bg-purple-600", light: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", ring: "focus:ring-purple-500" },
  CS:  { bg: "bg-blue-600",   light: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   ring: "focus:ring-blue-500"   },
  CE:  { bg: "bg-green-600",  light: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  ring: "focus:ring-green-500"  },
  ECE: { bg: "bg-yellow-500", light: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", ring: "focus:ring-yellow-500" },
};

const makeQuestion = () => ({
  _id: null,
  id:            Date.now() + Math.random(),
  text:          "",
  options:       ["", "", "", ""],
  correctAnswer: null,
});

// ═════════════════════════════════════════════════════════════════════════════
const EditExam = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const dispatch = useDispatch();
  const { selected, loading, actionLoading, actionError, error } = useSelector((s) => s.exams);

  useEffect(() => {
    const role  = localStorage.getItem("userRole");
    const dept  = localStorage.getItem("adminDepartment");
    const token = localStorage.getItem("token");
    if (!token || role !== "admin" || !dept) navigate("/");
  }, []); // eslint-disable-line

  const adminDept = localStorage.getItem("adminDepartment") || "";
  const ds        = DEPT_STYLE[adminDept] || DEPT_STYLE["DB"];

  const [examData,         setExamData]         = useState({ subject: "", duration: "", startTime: "", endTime: "" });
  const [marksPerQuestion, setMarksPerQuestion] = useState(null); // read-only after fetch
  const [questions,        setQuestions]        = useState([]);
  const [errors,           setErrors]           = useState({});
  const [toast,            setToast]            = useState(null);

  const questionRefs = useRef([]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => { if (actionError) showToast(actionError, "error"); }, [actionError, showToast]);

  useEffect(() => {
    dispatch(fetchExamById(id));
    return () => {
      dispatch(clearSelected());
      dispatch(clearActionError());
    };
  }, [id, dispatch]);

  // ✅ KEY FIX: use isoToLocalInput() to convert UTC → IST when pre-filling the form
  useEffect(() => {
    if (!selected) return;
    setExamData({
      subject:   selected.subject,
      duration:  String(selected.duration),
      startTime: isoToLocalInput(selected.startTime), // ✅ was toInputDT() — used browser local time
      endTime:   isoToLocalInput(selected.endTime),   // ✅ now explicitly converted to IST
    });
    setMarksPerQuestion(selected.marksPerQuestion ?? 1);
    setQuestions(
      (selected.questions || []).map((q) => ({
        _id:           q._id,
        id:            q._id || Date.now() + Math.random(),
        text:          q.text,
        options:       [...q.options],
        correctAnswer: q.correctAnswer,
      }))
    );
  }, [selected]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setExamData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const addQuestion = () => {
    const q = makeQuestion();
    setQuestions((p) => [...p, q]);
    setTimeout(() => questionRefs.current[questions.length]?.focus(), 80);
  };

  const addTenQuestions = () => {
    setQuestions((p) => [...p, ...Array.from({ length: 10 }, makeQuestion)]);
  };

  const removeQuestion = (lid) => setQuestions((p) => p.filter((q) => q.id !== lid));

  const updateQuestion = (lid, field, value, optIdx = null) => {
    setQuestions((p) =>
      p.map((q) => {
        if (q.id !== lid) return q;
        if (field === "text")          return { ...q, text: value };
        if (field === "option") {
          const opts = [...q.options];
          opts[optIdx] = value;
          return { ...q, options: opts };
        }
        if (field === "correctAnswer") return { ...q, correctAnswer: parseInt(value, 10) };
        return q;
      })
    );
    const key = field === "option" ? `q-${lid}-opt${optIdx}` : `q-${lid}-${field}`;
    if (errors[key]) setErrors((p) => { const u = { ...p }; delete u[key]; return u; });
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!examData.subject.trim())                              e.subject   = "Subject is required";
    if (!examData.duration || Number(examData.duration) <= 0) e.duration  = "Enter a valid duration";
    if (!examData.startTime)                                   e.startTime = "Start time is required";
    if (!examData.endTime)                                     e.endTime   = "End time is required";
    if (
      examData.startTime &&
      examData.endTime &&
      new Date(examData.endTime) <= new Date(examData.startTime)
    )                                                          e.endTime   = "End time must be after start time";
    questions.forEach((q) => {
      if (!q.text.trim())           e[`q-${q.id}-text`]    = "Question text required";
      q.options.forEach((o, i) => {
        if (!o.trim())              e[`q-${q.id}-opt${i}`] = `Option ${i + 1} required`;
      });
      if (q.correctAnswer === null) e[`q-${q.id}-correct`] = "Select the correct answer";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (questions.length === 0) { showToast("Add at least one question.", "error"); return; }
    if (!validate())            { showToast("Fix the errors before saving.", "error"); return; }

    const payload = {
      subject:   examData.subject.trim(),
      duration:  Number(examData.duration),
      // ✅ FIX: Convert datetime-local (IST) → UTC ISO string before sending to backend
      startTime: localToIST_ISO(examData.startTime),
      endTime:   localToIST_ISO(examData.endTime),
      // marksPerQuestion intentionally NOT sent — backend ignores it on update
      questions: questions.map((q) => ({
        text:          q.text.trim(),
        options:       q.options.map((o) => o.trim()),
        correctAnswer: q.correctAnswer,
      })),
    };

    const res = await dispatch(updateExam({ id, body: payload }));
    if (res.meta.requestStatus === "fulfilled") {
      showToast("Exam updated successfully!", "success");
      setTimeout(() => navigate("/admin/exams"), 1500);
    }
  };

  const totalMarks = questions.length * (marksPerQuestion ?? 1);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && !selected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <FiRefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-sm">Loading exam…</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !selected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <FiAlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Failed to load exam</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/admin/exams")}
              className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              ← Back
            </button>
            <button
              onClick={() => dispatch(fetchExamById(id))}
              className={`px-5 py-2.5 ${ds.bg} text-white rounded-xl text-sm font-semibold hover:opacity-90`}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-5xl mx-auto">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/exams")}
              className="p-2.5 border border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100">
              <FiArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Exam</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {examData.subject || "Loading…"} ·{" "}
                <span className={`font-semibold ${ds.text}`}>{adminDept}</span>
                {marksPerQuestion && (
                  <span className="ml-2 text-indigo-600">
                    · {marksPerQuestion} mark{marksPerQuestion > 1 ? "s" : ""}/q · {totalMarks} total
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={actionLoading}
            className={`flex items-center gap-2 px-6 py-2.5 ${ds.bg} text-white text-sm font-semibold rounded-xl
              hover:opacity-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}>
            {actionLoading
              ? <><FiRefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
              : <><FiSave className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>

        {/* ── Exam Info Card ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-9 h-9 ${ds.light} ${ds.border} border rounded-lg flex items-center justify-center`}>
              <FiBookOpen className={`w-4 h-4 ${ds.text}`} />
            </div>
            <h2 className="text-base font-bold text-gray-800">Exam Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Subject */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Subject / Paper Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text" name="subject" value={examData.subject}
                onChange={handleInfoChange} placeholder="e.g. Data Structures"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${ds.ring}
                  ${errors.subject ? "border-red-400 bg-red-50" : "border-gray-300"}`}
              />
              {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number" name="duration" value={examData.duration}
                  onChange={handleInfoChange} placeholder="60" min="1"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${ds.ring}
                    ${errors.duration ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                />
              </div>
              {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
            </div>

            {/* Department (locked) */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Department
              </label>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${ds.border} ${ds.light}`}>
                <span className={`text-sm font-bold ${ds.text}`}>{adminDept}</span>
                <span className="text-xs text-gray-400">— locked to your account</span>
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Start Time <span className="text-red-500">*</span>
                {/* ✅ IST label */}
                <span className="ml-2 text-indigo-500 font-normal normal-case">(IST — Asia/Kolkata)</span>
              </label>
              <input
                type="datetime-local" name="startTime" value={examData.startTime}
                onChange={handleInfoChange}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${ds.ring}
                  ${errors.startTime ? "border-red-400 bg-red-50" : "border-gray-300"}`}
              />
              {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>}
              {/* ✅ Live IST preview — confirms exactly what will be saved */}
              {examData.startTime && (
                <p className="text-indigo-600 text-xs mt-1.5 font-medium">
                  🕐 Will save as: {formatIST(localToIST_ISO(examData.startTime))}
                </p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                End Time <span className="text-red-500">*</span>
                <span className="ml-2 text-indigo-500 font-normal normal-case">(IST — Asia/Kolkata)</span>
              </label>
              <input
                type="datetime-local" name="endTime" value={examData.endTime}
                onChange={handleInfoChange}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${ds.ring}
                  ${errors.endTime ? "border-red-400 bg-red-50" : "border-gray-300"}`}
              />
              {errors.endTime && <p className="text-red-500 text-xs mt-1">{errors.endTime}</p>}
              {/* ✅ Live IST preview */}
              {examData.endTime && (
                <p className="text-indigo-600 text-xs mt-1.5 font-medium">
                  🕐 Will save as: {formatIST(localToIST_ISO(examData.endTime))}
                </p>
              )}
            </div>
          </div>

          {/* Marks locked banner */}
          {marksPerQuestion && (
            <div className={`mt-5 flex items-center gap-3 p-4 rounded-xl border ${ds.light} ${ds.border}`}>
              <div className={`w-9 h-9 ${ds.bg} rounded-lg flex items-center justify-center shrink-0`}>
                <FiStar className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${ds.text}`}>
                  {marksPerQuestion} mark{marksPerQuestion > 1 ? "s" : ""} per question
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set at creation — cannot be changed.{" "}
                  {questions.length} questions = <strong>{totalMarks} total marks</strong>
                </p>
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-xs font-semibold">
                <FiLock className="w-3.5 h-3.5" /> Locked
              </div>
            </div>
          )}
        </div>

        {/* ── Questions Card ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 ${ds.light} ${ds.border} border rounded-lg flex items-center justify-center`}>
                <FiHash className={`w-4 h-4 ${ds.text}`} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">
                  Questions{" "}
                  <span className="ml-1 text-sm font-normal text-gray-400">({questions.length})</span>
                </h2>
                <p className="text-xs text-gray-400">All questions replaced on save</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addQuestion}
                className={`flex items-center gap-1.5 px-4 py-2 ${ds.bg} text-white text-xs font-bold rounded-lg hover:opacity-90`}>
                <FiPlusCircle className="w-3.5 h-3.5" /> Add 1
              </button>
              <button
                onClick={addTenQuestions}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700">
                <FiPlusCircle className="w-3.5 h-3.5" /> Add 10
              </button>
            </div>
          </div>

          {/* Empty state */}
          {questions.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400 text-sm mb-3">No questions yet</p>
              <button
                onClick={addQuestion}
                className={`px-5 py-2 ${ds.bg} text-white text-sm font-semibold rounded-lg hover:opacity-90`}>
                + Add First Question
              </button>
            </div>
          )}

          {/* Question cards */}
          <div className="space-y-5">
            {questions.map((q, index) => (
              <div key={q.id} className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">Q{index + 1}</span>
                    {marksPerQuestion && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ds.light} ${ds.text} border ${ds.border}`}>
                        {marksPerQuestion} mark{marksPerQuestion > 1 ? "s" : ""}
                      </span>
                    )}
                    {q.correctAnswer !== null
                      ? <span className="text-xs text-green-600">✅ Answer set</span>
                      : <span className="text-xs text-amber-500">⚠️ No answer</span>}
                  </div>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2.5 py-1.5 hover:bg-red-50 rounded-lg font-semibold">
                    <FiTrash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>

                {/* Question text */}
                <input
                  type="text"
                  ref={(el) => (questionRefs.current[index] = el)}
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                  placeholder={`Question ${index + 1}…`}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 ${ds.ring} bg-white
                    ${errors[`q-${q.id}-text`] ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                />
                {errors[`q-${q.id}-text`] && (
                  <p className="text-red-500 text-xs -mt-2 mb-3">{errors[`q-${q.id}-text`]}</p>
                )}

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors
                        ${q.correctAnswer === optIdx ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"}`}>
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="radio" name={`correct-${q.id}`} value={optIdx}
                          checked={q.correctAnswer === optIdx}
                          onChange={(e) => updateQuestion(q.id, "correctAnswer", e.target.value)}
                          className="w-4 h-4 accent-green-600"
                        />
                        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center
                          ${q.correctAnswer === optIdx ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                      </label>
                      <input
                        type="text" value={opt}
                        onChange={(e) => updateQuestion(q.id, "option", e.target.value, optIdx)}
                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                        className={`flex-1 bg-transparent text-sm focus:outline-none
                          ${errors[`q-${q.id}-opt${optIdx}`] ? "placeholder-red-400" : "placeholder-gray-400"}`}
                      />
                    </div>
                  ))}
                </div>
                {errors[`q-${q.id}-correct`] && (
                  <p className="text-red-500 text-xs mt-2 p-2 bg-red-50 rounded-lg">
                    ⚠️ {errors[`q-${q.id}-correct`]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Bottom actions */}
          {questions.length > 0 && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => navigate("/admin/exams")}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
                ← Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading}
                className={`flex-1 py-3 ${ds.bg} text-white rounded-xl text-sm font-semibold hover:opacity-90 shadow-md
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}>
                {actionLoading
                  ? <><FiRefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><FiSave className="w-4 h-4" /> Save Changes ({questions.length} Q · {totalMarks} marks)</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditExam;