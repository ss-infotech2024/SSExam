// pages/admin/CreateExam.jsx
import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  createExam,
  createExamFromExcel,
  downloadExamTemplate,
  clearActionError,
} from "../../store/slices/examSlices";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiStar,
  FiUploadCloud,
  FiDownload,
  FiFileText,
  FiEdit3,
} from "react-icons/fi";

// ─── IST Timezone Helpers ─────────────────────────────────────────────────────
const localToIST_ISO = (localStr) => {
  if (!localStr) return "";
  const [datePart, timePart] = localStr.split("T");
  const [year, month, day]   = datePart.split("-").map(Number);
  const [hour, minute]       = timePart.split(":").map(Number);
  const utcMs =
    Date.UTC(year, month - 1, day, hour, minute) - (5 * 60 + 30) * 60 * 1000;
  return new Date(utcMs).toISOString();
};

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

export const isoToLocalInput = (isoString) => {
  if (!isoString) return "";
  const utcMs = new Date(isoString).getTime();
  const istMs = utcMs + (5 * 60 + 30) * 60 * 1000;
  const ist   = new Date(istMs);
  const pad   = (n) => String(n).padStart(2, "0");
  return (
    `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}` +
    `T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`
  );
};

// ─── Draft Persistence ────────────────────────────────────────────────────────
const DRAFT_KEY = "createExamDraft";
const loadDraft  = () => { try { const r = localStorage.getItem(DRAFT_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const saveDraft  = (d) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ } };
const clearDraft = ()  => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed top-5 right-5 z-50 flex items-start gap-3 px-5 py-3.5
      rounded-xl shadow-2xl text-sm font-semibold max-w-sm
      ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}
  >
    {type === "success"
      ? <FiCheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
      : <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
    <span className="flex-1 whitespace-pre-line leading-relaxed">{message}</span>
    <button onClick={onClose} className="shrink-0 mt-0.5">
      <FiX className="w-4 h-4 opacity-70 hover:opacity-100" />
    </button>
  </div>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const EMPTY_EXAM    = { subject: "", duration: "", startTime: "", endTime: "", marksPerQuestion: "" };
const MARKS_OPTIONS = [1, 2, 3, 4, 5];
const makeQuestion  = () => ({ id: Date.now() + Math.random(), text: "", options: ["", "", "", ""], correctAnswer: null });

// ─── Helper: extract user-friendly message from rejected thunk payload ─────────
const getErrorMessage = (payload) => {
  if (!payload) return "Something went wrong. Please try again.";
  if (typeof payload === "string") return payload;
  if (payload.message) {
    if (payload.errors && Array.isArray(payload.errors) && payload.errors.length > 0) {
      return `${payload.message}\n${payload.errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}`;
    }
    return payload.message;
  }
  return "Something went wrong. Please try again.";
};

// ─── Excel Upload Panel ───────────────────────────────────────────────────────
const ExcelPanel = ({ onSuccess, showToast }) => {
  const dispatch   = useDispatch();
  const { excelUploading, templateDownloading } = useSelector((s) => s.exams);

  const [dragOver,      setDragOver]      = useState(false);
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [uploadErrors,  setUploadErrors]  = useState([]);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    setUploadErrors([]);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setUploadErrors(["Only .xlsx files are accepted. Please use the provided template."]);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadErrors(["File is too large. Maximum size is 5 MB."]);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const res = await dispatch(createExamFromExcel(selectedFile));

    if (res.meta.requestStatus === "fulfilled") {
      showToast(
        `Exam "${res.payload?.exam?.subject || res.payload?.subject || 'New Exam'}" created with ${res.payload?.exam?.questionCount || res.payload?.questionCount || 0} questions!`,
        "success"
      );
      setSelectedFile(null);
      setUploadErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onSuccess?.();
    } else {
      const msg = getErrorMessage(res.payload);
      // Split by newlines for display as bullet list
      const lines = msg.split("\n").filter(Boolean);
      setUploadErrors(lines.length > 0 ? lines : [msg]);
      showToast(lines[0] || msg, "error");
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await dispatch(downloadExamTemplate());
    if (res.meta.requestStatus === "rejected") {
      showToast(getErrorMessage(res.payload), "error");
    }
  };

  return (
    <div className="space-y-5">

      {/* Step callout */}
      <div className="flex items-start gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
        <span className="text-2xl">📋</span>
        <div className="text-sm text-indigo-800">
          <p className="font-bold mb-1">How to use Excel upload</p>
          <ol className="list-decimal list-inside space-y-1 text-indigo-700">
            <li>Download the template below.</li>
            <li>Fill in <strong>Exam Info</strong> and <strong>Questions</strong> sheets.</li>
            <li>Upload the completed file — the exam is created instantly.</li>
          </ol>
        </div>
      </div>

      {/* Download template button */}
      <button
        type="button"
        onClick={handleDownloadTemplate}
        disabled={templateDownloading}
        className="w-full flex items-center justify-center gap-2.5 py-3 px-5
          border-2 border-indigo-300 text-indigo-700 font-semibold rounded-xl
          hover:bg-indigo-50 hover:border-indigo-400 transition-colors text-sm
          disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {templateDownloading ? (
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <FiDownload className="w-4 h-4" />
        )}
        {templateDownloading ? "Downloading…" : "Download Excel Template (.xlsx)"}
      </button>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${dragOver
            ? "border-indigo-500 bg-indigo-50 scale-[1.01]"
            : selectedFile
              ? "border-emerald-400 bg-emerald-50"
              : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-emerald-700">{selectedFile.name}</p>
            <p className="text-xs text-emerald-600">
              {(selectedFile.size / 1024).toFixed(1)} KB — ready to upload
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setUploadErrors([]); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="text-xs text-red-500 hover:text-red-700 font-medium mt-1 underline"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <FiUploadCloud className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600">
              Drop your .xlsx file here, or <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="text-xs text-gray-400">Only .xlsx files · max 5 MB</p>
          </div>
        )}
      </div>

      {/* Per-row validation errors */}
      {uploadErrors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1.5">
            <FiAlertCircle className="w-4 h-4" /> Fix these errors in your file and re-upload:
          </p>
          <ul className="space-y-1">
            {uploadErrors.map((err, i) => (
              <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">•</span>{err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || excelUploading}
        className="w-full flex items-center justify-center gap-2.5 py-3 px-5
          bg-indigo-600 text-white font-semibold rounded-xl
          hover:bg-indigo-700 transition-colors shadow-md text-sm
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {excelUploading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating exam…
          </>
        ) : (
          <>
            <FiUploadCloud className="w-4 h-4" />
            Upload & Create Exam
          </>
        )}
      </button>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
const CreateExam = () => {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { actionLoading, actionError } = useSelector((s) => s.exams);

  // "manual" | "excel"
  const [mode, setMode] = useState("manual");

  const draft = loadDraft();

  React.useEffect(() => {
    const role  = localStorage.getItem("userRole");
    const dept  = localStorage.getItem("adminDepartment");
    const token = localStorage.getItem("token");
    if (!token || role !== "admin" || !dept) navigate("/");
    dispatch(clearActionError());
  }, []); // eslint-disable-line

  const adminDept = localStorage.getItem("adminDepartment") || "";

  const [step,      setStep]      = useState(draft?.step ?? 1);
  const [examData,  setExamData]  = useState(draft?.examData ?? EMPTY_EXAM);
  const [questions, setQuestions] = useState(draft?.questions ?? []);
  const [errors,    setErrors]    = useState({});
  const [toast,     setToast]     = useState(null);

  React.useEffect(() => {
    if (draft && (draft.questions?.length > 0 || draft.examData?.subject)) {
      showToast("Restored your unsaved exam draft.", "success");
    }
  }, []); // eslint-disable-line

  const questionRefs = useRef([]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  React.useEffect(() => {
    if (actionError) {
      const msg = getErrorMessage(actionError);
      showToast(msg, "error");
    }
  }, [actionError, showToast]);

  React.useEffect(() => {
    saveDraft({ step, examData, questions });
  }, [step, examData, questions]);

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
    if (!examData.subject.trim())                               e.subject         = "Subject name is required";
    if (!examData.duration || Number(examData.duration) <= 0)  e.duration         = "Enter a valid duration in minutes";
    if (!examData.startTime)                                    e.startTime        = "Start time is required";
    if (!examData.endTime)                                      e.endTime          = "End time is required";
    if (
      examData.startTime &&
      examData.endTime &&
      new Date(examData.endTime) <= new Date(examData.startTime)
    )                                                           e.endTime          = "End time must be after start time";
    if (!examData.marksPerQuestion)                             e.marksPerQuestion = "Please select marks per question";
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
        if (field === "option")        { const opts = [...q.options]; opts[optIdx] = value; return { ...q, options: opts }; }
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

  // ── Submit (manual) ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (questions.length === 0) { showToast("Please add at least one question.", "error"); return; }
    if (!validateQuestions())   { showToast("Fix the errors shown in the questions.", "error"); return; }

    const payload = {
      subject:          examData.subject.trim(),
      duration:         Number(examData.duration),
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
      clearDraft();
    }
  };

  const handleDiscardDraft = () => {
    if (!window.confirm("Discard this exam draft? This cannot be undone.")) return;
    setExamData(EMPTY_EXAM);
    setQuestions([]);
    setStep(1);
    setErrors({});
    clearDraft();
    showToast("Draft discarded.", "success");
  };

  // Called by ExcelPanel after a successful upload so the admin can see the list
  const handleExcelSuccess = () => {
    setTimeout(() => navigate("/admin/exams"), 2000);
  };

  const totalMarks       = questions.length * (Number(examData.marksPerQuestion) || 0);
  const hasDraftContent  = examData.subject || questions.length > 0;

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
                Fill exam details manually, or upload a completed Excel file
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {adminDept && (
                <span className="bg-indigo-500 border border-indigo-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                  {adminDept} Department
                </span>
              )}
              {mode === "manual" && examData.marksPerQuestion && questions.length > 0 && (
                <span className="bg-indigo-700 border border-indigo-500 text-indigo-100 text-xs font-bold px-3 py-1.5 rounded-lg">
                  Total: {totalMarks} marks
                </span>
              )}
              {mode === "manual" && hasDraftContent && (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-xs text-indigo-200 hover:text-white underline"
                >
                  Discard draft
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Mode Toggle ─────────────────────────────────────────────────── */}
        <div className="flex border-b bg-gray-50">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex items-center gap-2 py-4 px-8 font-semibold text-sm transition-colors border-b-4
              ${mode === "manual"
                ? "border-indigo-600 text-indigo-700 bg-white"
                : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            <FiEdit3 className="w-4 h-4" />
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setMode("excel")}
            className={`flex items-center gap-2 py-4 px-8 font-semibold text-sm transition-colors border-b-4
              ${mode === "excel"
                ? "border-indigo-600 text-indigo-700 bg-white"
                : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            <FiUploadCloud className="w-4 h-4" />
            Upload Excel
          </button>

          {/* Step tabs — only shown in manual mode */}
          {mode === "manual" && (
            <>
              <div className="w-px bg-gray-200 my-2 mx-2" />
              {[
                { n: 1, label: "Exam Information" },
                { n: 2, label: `Questions (${questions.length})` },
              ].map(({ n, label }) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => (n === 1 ? setStep(1) : validateStep1() && setStep(2))}
                  className={`py-4 px-6 font-semibold text-sm transition-colors border-b-4
                    ${step === n
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                  {n}. {label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* ══ EXCEL MODE ══════════════════════════════════════════════════════ */}
        {mode === "excel" && (
          <div className="p-8">
            <ExcelPanel onSuccess={handleExcelSuccess} showToast={showToast} />
          </div>
        )}

        {/* ══ MANUAL MODE — STEP 1 ════════════════════════════════════════════ */}
        {mode === "manual" && step === 1 && (
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
                  <span className="ml-2 text-xs text-indigo-500 font-normal">(IST — Asia/Kolkata)</span>
                </label>
                <input
                  type="datetime-local" name="startTime" value={examData.startTime}
                  onChange={handleInfoChange}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${errors.startTime ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                />
                {errors.startTime && <p className="text-red-600 text-xs mt-1">{errors.startTime}</p>}
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
                {examData.endTime && (
                  <p className="text-indigo-600 text-xs mt-1.5 font-medium">
                    🕐 Will be saved as: {formatIST(localToIST_ISO(examData.endTime))}
                  </p>
                )}
              </div>
            </div>

            {/* Marks Per Question */}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">or custom:</span>
                  <input
                    type="number" min="1" max="10" placeholder="e.g. 3"
                    value={MARKS_OPTIONS.includes(examData.marksPerQuestion) ? "" : examData.marksPerQuestion || ""}
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
                  <strong>{examData.marksPerQuestion} mark{examData.marksPerQuestion > 1 ? "s" : ""}</strong>
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

        {/* ══ MANUAL MODE — STEP 2 ════════════════════════════════════════════ */}
        {mode === "manual" && step === 2 && (
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

            {/* IST schedule preview */}
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
                <button onClick={addQuestion}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold shadow-sm">
                  + Add 1
                </button>
                <button onClick={addTenQuestions}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold shadow-sm">
                  + Add 10
                </button>
              </div>
            </div>

            {/* Empty state */}
            {questions.length === 0 && (
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <p className="text-gray-500 mb-4">No questions added yet</p>
                <div className="flex justify-center gap-3">
                  <button onClick={addQuestion}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold">
                    + Add First Question
                  </button>
                  <button onClick={addTenQuestions}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold">
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