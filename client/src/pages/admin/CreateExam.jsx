// pages/admin/CreateExam.jsx
import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createExam, clearActionError } from "../../store/slices/examSlices";
import { FiCheckCircle, FiAlertCircle, FiX, FiStar } from "react-icons/fi";

// ─── IST Timezone Helpers ─────────────────────────────────────────────────────

/**
 * Converts a datetime-local string (e.g. "2025-04-09T16:50")
 * to a UTC ISO string, treating the input as IST (UTC+5:30).
 * Always use this before sending startTime / endTime to the backend.
 */
const localToIST_ISO = (localStr) => {
  if (!localStr) return "";
  const [datePart, timePart] = localStr.split("T");
  const [year, month, day]   = datePart.split("-").map(Number);
  const [hour, minute]       = timePart.split(":").map(Number);
  // IST = UTC + 5:30  →  UTC = IST - 5:30
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute) - (5 * 60 + 30) * 60 * 1000;
  return new Date(utcMs).toISOString();
};

/**
 * Formats a UTC ISO string from the DB into a readable IST string.
 * e.g. "2025-04-09T11:20:00.000Z"  →  "09 Apr 2025, 04:50 PM IST"
 *
 * Export and use this in every component that displays exam start/end times
 * (ExamCard, ExamList, StudentDashboard, etc.) so times always show correctly.
 */
export const formatIST = (isoString) => {
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

/**
 * Converts a UTC ISO string back to the value needed by datetime-local input.
 * Use this when pre-filling the form from existing exam data.
 * e.g. "2025-04-09T11:20:00.000Z"  →  "2025-04-09T16:50"
 */
export const isoToLocalInput = (isoString) => {
  if (!isoString) return "";
  const utcMs  = new Date(isoString).getTime();
  const istMs  = utcMs + (5 * 60 + 30) * 60 * 1000;
  const ist    = new Date(istMs);
  const pad    = (n) => String(n).padStart(2, "0");
  return (
    `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}` +
    `T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5
      rounded-xl shadow-2xl text-sm font-semibold max-w-sm
      ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}
  >
    {type === "success"
      ? <FiCheckCircle className="w-4 h-4 shrink-0" />
      : <FiAlertCircle className="w-4 h-4 shrink-0" />}
    <span className="flex-1">{message}</span>
    <button onClick={onClose}>
      <FiX className="w-4 h-4 opacity-70 hover:opacity-100" />
    </button>
  </div>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_EXAM    = { subject: "", duration: "", startTime: "", endTime: "", marksPerQuestion: "" };
const MARKS_OPTIONS = [1, 2, 3, 4, 5];

const makeQuestion = () => ({
  id:            Date.now() + Math.random(),
  text:          "",
  options:       ["", "", "", ""],
  correctAnswer: null,
});

// ═════════════════════════════════════════════════════════════════════════════
const CreateExam = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { actionLoading, actionError } = useSelector((s) => s.exams);

  React.useEffect(() => {
    const role  = localStorage.getItem("userRole");
    const dept  = localStorage.getItem("adminDepartment");
    const token = localStorage.getItem("token");
    if (!token || role !== "admin" || !dept) navigate("/");
    dispatch(clearActionError());
  }, []); // eslint-disable-line

  const adminDept = localStorage.getItem("adminDepartment") || "";

  const [step,      setStep]      = useState(1);
  const [examData,  setExamData]  = useState(EMPTY_EXAM);
  const [questions, setQuestions] = useState([]);
  const [errors,    setErrors]    = useState({});
  const [toast,     setToast]     = useState(null);

  const questionRefs = useRef([]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  React.useEffect(() => {
    if (actionError) showToast(actionError, "error");
  }, [actionError, showToast]);

  // ── Step 1 handlers ────────────────────────────────────────────────────────
  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setExamData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const selectMarks = (val) => {
    setExamData((p) => ({ ...p, marksPerQuestion: val }));
    if (errors.marksPerQuestion) setErrors((p) => ({ ...p, marksPerQuestion: "" }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!examData.subject.trim())                               e.subject          = "Subject name is required";
    if (!examData.duration || Number(examData.duration) <= 0)  e.duration          = "Enter a valid duration in minutes";
    if (!examData.startTime)                                    e.startTime         = "Start time is required";
    if (!examData.endTime)                                      e.endTime           = "End time is required";
    if (
      examData.startTime &&
      examData.endTime &&
      new Date(examData.endTime) <= new Date(examData.startTime)
    )                                                           e.endTime           = "End time must be after start time";
    if (!examData.marksPerQuestion)                             e.marksPerQuestion  = "Please select marks per question";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step 2 handlers ────────────────────────────────────────────────────────
  const addQuestion = () => {
    const q = makeQuestion();
    setQuestions((p) => [...p, q]);
    setTimeout(() => questionRefs.current[questions.length]?.focus(), 80);
  };

  const addTenQuestions = () => {
    setQuestions((p) => [...p, ...Array.from({ length: 10 }, makeQuestion)]);
    setTimeout(() => questionRefs.current[questions.length]?.focus(), 80);
  };

  const removeQuestion = (id) => setQuestions((p) => p.filter((q) => q.id !== id));

  const updateQuestion = (id, field, value, optIdx = null) => {
    setQuestions((p) =>
      p.map((q) => {
        if (q.id !== id) return q;
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
    const key = field === "option" ? `q-${id}-opt${optIdx}` : `q-${id}-${field}`;
    if (errors[key]) setErrors((p) => { const u = { ...p }; delete u[key]; return u; });
  };

  const validateQuestions = () => {
    const e = {};
    questions.forEach((q) => {
      if (!q.text.trim())           e[`q-${q.id}-text`]    = "Question text is required";
      q.options.forEach((opt, i) => {
        if (!opt.trim())            e[`q-${q.id}-opt${i}`] = `Option ${i + 1} cannot be empty`;
      });
      if (q.correctAnswer === null) e[`q-${q.id}-correct`] = "Select the correct answer";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (questions.length === 0) { showToast("Please add at least one question.", "error"); return; }
    if (!validateQuestions())   { showToast("Fix the errors shown in the questions.", "error"); return; }

    const payload = {
      subject:          examData.subject.trim(),
      duration:         Number(examData.duration),
      // ✅ FIX: Explicitly convert datetime-local (treated as IST) → UTC ISO string
      startTime:        localToIST_ISO(examData.startTime),
      endTime:          localToIST_ISO(examData.endTime),
      marksPerQuestion: Number(examData.marksPerQuestion),
      questions: questions.map((q) => ({
        text:          q.text.trim(),
        options:       q.options.map((o) => o.trim()),
        correctAnswer: q.correctAnswer,
      })),
    };

    const res = await dispatch(createExam(payload));
    if (res.meta.requestStatus === "fulfilled") {
      showToast(
        `Exam "${examData.subject}" created! Total marks: ${questions.length * Number(examData.marksPerQuestion)}`,
        "success"
      );
      setExamData(EMPTY_EXAM);
      setQuestions([]);
      setStep(1);
      setErrors({});
    }
  };

  const totalMarks = questions.length * (Number(examData.marksPerQuestion) || 0);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-indigo-600 text-white px-8 py-7">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create New Exam</h1>
              <p className="mt-1 text-indigo-200 text-sm">
                Fill exam details and add questions for your students
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {adminDept && (
                <span className="bg-indigo-500 border border-indigo-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  {adminDept} Department
                </span>
              )}
              {examData.marksPerQuestion && questions.length > 0 && (
                <span className="bg-indigo-700 border border-indigo-500 text-indigo-100 text-xs font-bold px-3 py-1.5 rounded-lg">
                  Total: {totalMarks} marks
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Step Tabs ───────────────────────────────────────────────────── */}
        <div className="flex border-b px-8 bg-gray-50">
          {[
            { n: 1, label: "Exam Information" },
            { n: 2, label: `Questions (${questions.length})` },
          ].map(({ n, label }) => (
            <button
              key={n}
              type="button"
              onClick={() => (n === 1 ? setStep(1) : validateStep1() && setStep(2))}
              className={`py-4 px-8 font-semibold text-sm transition-colors border-b-4
                ${step === n
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              {n}. {label}
            </button>
          ))}
        </div>

        {/* ══ STEP 1 ══════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subject / Paper Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="subject" value={examData.subject}
                  onChange={handleInfoChange}
                  placeholder="e.g. Data Structures and Algorithms"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${errors.subject ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                />
                {errors.subject && <p className="text-red-600 text-xs mt-1">{errors.subject}</p>}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" name="duration" value={examData.duration} min="1"
                  onChange={handleInfoChange} placeholder="e.g. 60"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${errors.duration ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                />
                {errors.duration && <p className="text-red-600 text-xs mt-1">{errors.duration}</p>}
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Start Time <span className="text-red-500">*</span>
                  {/* ✅ IST label so admin always knows the timezone */}
                  <span className="ml-2 text-xs text-indigo-500 font-normal">(IST — Asia/Kolkata)</span>
                </label>
                <input
                  type="datetime-local" name="startTime" value={examData.startTime}
                  onChange={handleInfoChange}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${errors.startTime ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                />
                {errors.startTime && <p className="text-red-600 text-xs mt-1">{errors.startTime}</p>}
                {/* ✅ Live IST preview — confirm exactly what will be saved */}
                {examData.startTime && (
                  <p className="text-indigo-600 text-xs mt-1.5 font-medium">
                    🕐 Will be saved as: {formatIST(localToIST_ISO(examData.startTime))}
                  </p>
                )}
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  End Time <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-indigo-500 font-normal">(IST — Asia/Kolkata)</span>
                </label>
                <input
                  type="datetime-local" name="endTime" value={examData.endTime}
                  onChange={handleInfoChange}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${errors.endTime ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                />
                {errors.endTime && <p className="text-red-600 text-xs mt-1">{errors.endTime}</p>}
                {/* ✅ Live IST preview */}
                {examData.endTime && (
                  <p className="text-indigo-600 text-xs mt-1.5 font-medium">
                    🕐 Will be saved as: {formatIST(localToIST_ISO(examData.endTime))}
                  </p>
                )}
              </div>
            </div>

            {/* ── Marks Per Question ──────────────────────────────────────────── */}
            <div
              className={`p-5 rounded-xl border-2
                ${errors.marksPerQuestion ? "border-red-300 bg-red-50" : "border-indigo-100 bg-indigo-50"}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <FiStar className="w-4 h-4 text-indigo-600" />
                <label className="text-sm font-bold text-indigo-800">
                  Marks Per Question <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-indigo-500 ml-1">(cannot be changed after creation)</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {MARKS_OPTIONS.map((val) => (
                  <button
                    key={val} type="button" onClick={() => selectMarks(val)}
                    className={`w-14 h-14 rounded-xl font-black text-lg border-2 transition-all
                      ${examData.marksPerQuestion === val
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg scale-105"
                        : "bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"}`}
                  >
                    {val}
                  </button>
                ))}
                {/* Custom value */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">or custom:</span>
                  <input
                    type="number" min="1" max="10" placeholder="e.g. 3"
                    value={
                      MARKS_OPTIONS.includes(examData.marksPerQuestion)
                        ? ""
                        : examData.marksPerQuestion || ""
                    }
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (v >= 1 && v <= 10) selectMarks(v);
                      else if (e.target.value === "") setExamData((p) => ({ ...p, marksPerQuestion: "" }));
                    }}
                    className={`w-20 px-3 py-2 border-2 rounded-xl text-sm font-bold text-center
                      focus:outline-none focus:ring-2 focus:ring-indigo-500
                      ${!MARKS_OPTIONS.includes(examData.marksPerQuestion) && examData.marksPerQuestion
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-gray-200"}`}
                  />
                </div>
              </div>
              {errors.marksPerQuestion && (
                <p className="text-red-600 text-xs mt-2">{errors.marksPerQuestion}</p>
              )}
              {examData.marksPerQuestion && (
                <p className="text-indigo-600 text-xs mt-2 font-medium">
                  ✓ Each question ={" "}
                  <strong>
                    {examData.marksPerQuestion} mark{examData.marksPerQuestion > 1 ? "s" : ""}
                  </strong>
                </p>
              )}
            </div>

            {/* Dept info */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-lg">🏫</span>
              <p className="text-sm text-gray-600">
                This exam will be visible only to <strong>{adminDept}</strong> department students.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { if (validateStep1()) setStep(2); }}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md text-sm"
              >
                Next: Add Questions →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 2 ══════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="p-8">

            {/* Marks summary banner */}
            <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiStar className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-bold text-indigo-800">
                    {examData.marksPerQuestion} mark{Number(examData.marksPerQuestion) > 1 ? "s" : ""} per question
                    <span className="text-xs font-normal text-indigo-500 ml-2">(locked)</span>
                  </p>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    {questions.length} question{questions.length !== 1 ? "s" : ""} added so far
                  </p>
                </div>
              </div>
              {questions.length > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-700">{totalMarks}</p>
                  <p className="text-xs text-indigo-500">total marks</p>
                </div>
              )}
            </div>

            {/* ✅ IST schedule preview on step 2 */}
            {examData.startTime && examData.endTime && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <span className="text-lg">🕐</span>
                <div className="text-sm text-amber-800">
                  <p className="font-bold mb-1">Exam Schedule (IST)</p>
                  <p>Starts: <strong>{formatIST(localToIST_ISO(examData.startTime))}</strong></p>
                  <p>Ends:&nbsp;&nbsp; <strong>{formatIST(localToIST_ISO(examData.endTime))}</strong></p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Questions <span className="text-gray-400 font-normal">({questions.length})</span>
                </h2>
                <p className="text-gray-500 text-sm mt-0.5">Add MCQ questions with 4 options each</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={addQuestion}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold shadow-sm"
                >
                  + Add 1
                </button>
                <button
                  onClick={addTenQuestions}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold shadow-sm"
                >
                  + Add 10
                </button>
              </div>
            </div>

            {/* Empty state */}
            {questions.length === 0 && (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 mb-4">No questions added yet</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={addQuestion}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold"
                  >
                    + Add First Question
                  </button>
                  <button
                    onClick={addTenQuestions}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold"
                  >
                    + Add 10 Questions
                  </button>
                </div>
              </div>
            )}

            {/* Question cards */}
            {questions.map((q, index) => (
              <div key={q.id} className="mb-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-black">
                      {index + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-gray-800">Question {index + 1}</span>
                      <span className="ml-2 text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                        {examData.marksPerQuestion} mark{Number(examData.marksPerQuestion) > 1 ? "s" : ""}
                      </span>
                      <span className="ml-1 text-xs text-gray-400">
                        {q.correctAnswer !== null ? "✅" : "⚠️ No answer"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* Question text */}
                <div className="mb-4">
                  <input
                    type="text"
                    ref={(el) => (questionRefs.current[index] = el)}
                    value={q.text}
                    onChange={(e) => updateQuestion(q.id, "text", e.target.value)}
                    placeholder={`Question ${index + 1} — type here...`}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                      ${errors[`q-${q.id}-text`] ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                  />
                  {errors[`q-${q.id}-text`] && (
                    <p className="text-red-600 text-xs mt-1">{errors[`q-${q.id}-text`]}</p>
                  )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors
                        ${q.correctAnswer === optIdx ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50"}`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="radio" name={`correct-${q.id}`} value={optIdx}
                          checked={q.correctAnswer === optIdx}
                          onChange={(e) => updateQuestion(q.id, "correctAnswer", e.target.value)}
                          className="w-4 h-4 accent-green-600"
                        />
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center
                            ${q.correctAnswer === optIdx ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"}`}
                        >
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
                  <p className="text-red-600 text-xs mt-2 bg-red-50 p-2 rounded-lg">
                    ⚠️ {errors[`q-${q.id}-correct`]}
                  </p>
                )}
              </div>
            ))}

            {/* Bottom actions */}
            {questions.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-8 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 text-sm"
                >
                  ← Back to Exam Details
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-8 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700
                    shadow-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating…
                    </>
                  ) : (
                    `✓ Create Exam · ${questions.length} questions · ${totalMarks} marks`
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateExam;