// pages/student/ExamInterface.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  AlertTriangle, CameraOff, ChevronLeft, ChevronRight,
  Clock, Flag, Shield, CheckCircle, XCircle, RefreshCw, AlertCircle,
  Star, Award, TrendingUp, FileText,
} from "lucide-react";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "https://tgpexambackend.onrender.com/api" });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  else { window.location.href = "/"; return Promise.reject(); }
  return cfg;
});

const MAX_WARNINGS = 5;
const FACE_TIMEOUT = 10;

// ─── Toasts & Modals ─────────────────────────────────────────────────────────
const WarningToast = ({ msg, count }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
    <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[320px] animate-bounce">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div>
        <p className="font-bold text-sm">{msg}</p>
        <p className="text-xs text-red-200">Warning {count}/{MAX_WARNINGS} — {MAX_WARNINGS - count} left</p>
      </div>
    </div>
  </div>
);

const SubmitModal = ({ answered, total, onConfirm, onCancel, submitting }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9997] p-4">
    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-7 h-7 text-green-600" />
      </div>
      <h3 className="text-lg font-bold text-center text-gray-800 mb-1">Submit Exam?</h3>
      <p className="text-center text-sm text-gray-500 mb-1">
        Answered: <strong className="text-gray-800">{answered}/{total}</strong>
      </p>
      {answered < total && (
        <p className="text-center text-xs text-amber-600 mb-3">
          ⚠ {total - answered} question{total - answered !== 1 ? "s" : ""} unanswered — you cannot change answers after submitting
        </p>
      )}
      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} disabled={submitting}
          className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          Go Back
        </button>
        <button onClick={onConfirm} disabled={submitting}
          className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50
            flex items-center justify-center gap-2">
          {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit"}
        </button>
      </div>
    </div>
  </div>
);

// ─── Result Card ─────────────────────────────────────────────────────────────
const GRADE_COLORS = {
  O: { bg: "bg-emerald-900", ring: "ring-emerald-500", text: "text-emerald-300", label: "Outstanding" },
  A: { bg: "bg-blue-900",    ring: "ring-blue-500",    text: "text-blue-300",    label: "Excellent"   },
  B: { bg: "bg-indigo-900",  ring: "ring-indigo-500",  text: "text-indigo-300",  label: "Good"        },
  C: { bg: "bg-yellow-900",  ring: "ring-yellow-500",  text: "text-yellow-300",  label: "Average"     },
  D: { bg: "bg-orange-900",  ring: "ring-orange-500",  text: "text-orange-300",  label: "Pass"        },
  F: { bg: "bg-red-900",     ring: "ring-red-500",     text: "text-red-300",     label: "Fail"        },
};

const ResultScreen = ({ result, onClose }) => {
  const gc = GRADE_COLORS[result?.grade] || GRADE_COLORS["F"];
  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[9990] p-4 overflow-y-auto">
      <div className="w-full max-w-md py-8">

        {/* Grade circle */}
        <div className="text-center mb-8">
          <div className={`w-28 h-28 ${gc.bg} ring-4 ${gc.ring} rounded-full flex flex-col items-center
            justify-center mx-auto mb-4 shadow-2xl`}>
            <span className={`text-4xl font-black ${gc.text}`}>{result?.grade}</span>
            <span className={`text-xs font-bold ${gc.text} opacity-70`}>{gc.label}</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-1">{result?.subject}</h2>
          <p className="text-slate-400 text-sm">
            {result?.status === "terminated" ? "⚠ Exam was terminated due to proctoring violations" : "Exam submitted successfully"}
          </p>
        </div>

        {/* Score breakdown */}
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-5 mb-4 space-y-4">
          {/* Big score */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-700">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Total Score</p>
              <p className="text-3xl font-black text-white mt-1">
                {result?.score} <span className="text-slate-400 text-lg font-normal">/ {result?.totalMarks}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Percentage</p>
              <p className={`text-3xl font-black mt-1 ${gc.text}`}>{result?.percentage}%</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: CheckCircle, label: "Correct",    val: result?.correctCount,    color: "text-emerald-400" },
              { icon: XCircle,     label: "Wrong",      val: result?.wrongCount,      color: "text-red-400"     },
              { icon: FileText,    label: "Unanswered", val: result?.unansweredCount, color: "text-slate-400"   },
            ].map(({ icon: Icon, label, val, color }) => (
              <div key={label} className="bg-slate-800 rounded-xl p-3 text-center">
                <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                <p className={`text-lg font-black ${color}`}>{val}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Marks per question */}
          <div className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-slate-300">Marks per question</span>
            </div>
            <span className="text-sm font-bold text-yellow-400">{result?.marksPerQuestion}</span>
          </div>

          {/* Submitted at */}
          <p className="text-center text-xs text-slate-500">
            Submitted at {result?.submittedAt ? new Date(result.submittedAt).toLocaleString("en-IN") : "—"}
          </p>
        </div>

        <button onClick={onClose}
          className="w-full py-3.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

// ─── Face presence hook ───────────────────────────────────────────────────────
const useFacePresence = ({ videoRef, canvasRef, enabled, onAbsent, onPresent }) => {
  const absRef     = useRef(0);
  const intervalRef = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const video = videoRef.current, canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext("2d");
      canvas.width = 80; canvas.height = 60;
      ctx.drawImage(video, 0, 0, 80, 60);
      const d = ctx.getImageData(20, 15, 40, 30).data;
      let brightness = 0, skin = 0;
      for (let i = 0; i < d.length; i += 4) {
        brightness += (d[i] + d[i+1] + d[i+2]) / 3;
        if (d[i] > 80 && d[i+1] > 40 && d[i+2] < 180 && d[i] > d[i+1] && d[i] > d[i+2]) skin++;
      }
      brightness /= (d.length / 4);
      const skinRatio = skin / (d.length / 4);
      if (brightness > 30 && skinRatio > 0.08) { absRef.current = 0; onPresent(); }
      else { absRef.current += 1; onAbsent(absRef.current); if (absRef.current >= FACE_TIMEOUT) absRef.current = 0; }
    };
    intervalRef.current = setInterval(check, 1000);
    return () => clearInterval(intervalRef.current);
  }, [enabled, videoRef, canvasRef, onAbsent, onPresent]);
};

// ═════════════════════════════════════════════════════════════════════════════
const ExamInterface = ({ exam, onExamEnd }) => {
  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const streamRef    = useRef(null);
  const warningsRef  = useRef(0);
  const answersRef   = useRef({}); // mirror of answers state for use in callbacks

  const [questions,    setQuestions]    = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError,   setFetchError]   = useState("");

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [warnings,    setWarnings]    = useState(0);
  const [warningMsg,  setWarningMsg]  = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [faceAbsSec,  setFaceAbsSec]  = useState(0);

  const [phase,       setPhase]       = useState("loading");
  const [termReason,  setTermReason]  = useState("");

  const [timeLeft,    setTimeLeft]    = useState((exam?.duration || 30) * 60);
  const [currentQ,    setCurrentQ]    = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [flagged,     setFlagged]     = useState({});
  const [showSubmit,  setShowSubmit]  = useState(false);

  // Result after submission
  const [result,      setResult]      = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  // Keep answersRef in sync
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const issueWarning = useCallback((msg) => {
    warningsRef.current += 1;
    const next = warningsRef.current;
    setWarnings(next);
    setWarningMsg(msg);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 4500);
    if (next >= MAX_WARNINGS) {
      setTermReason(`${MAX_WARNINGS} violations: "${msg}"`);
      setPhase("terminating"); // triggers auto-submit with terminated status
    }
  }, []);

  useFacePresence({
    videoRef, canvasRef,
    enabled: phase === "running",
    onAbsent:  useCallback((sec) => { setFaceAbsSec(sec); if (sec >= FACE_TIMEOUT) issueWarning("Face not detected for 10 seconds"); }, [issueWarning]),
    onPresent: useCallback(() => setFaceAbsSec(0), []),
  });

  // Fetch questions
  useEffect(() => {
    if (!exam?._id) return;
    const load = async () => {
      try {
        const res = await api.get(`/student/exams/${exam._id}`);
        const data = res.data.exam;
        setQuestions(data?.questions || []);
        setTimeLeft((data?.duration || exam?.duration || 30) * 60);
      } catch (e) {
        setFetchError(e.response?.data?.message || e.message || "Failed to load questions");
      } finally {
        setFetchLoading(false);
      }
    };
    load();
  }, [exam?._id]);

  // Start camera + enter fullscreen once loaded
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setCameraReady(true);
    } catch { setCameraError("Camera denied — allow camera and reload"); }
  }, []);

  useEffect(() => {
    if (!fetchLoading && !fetchError && questions.length > 0 && phase === "loading") {
      startCamera().then(() => {
        document.documentElement.requestFullscreen?.().catch(() => {});
        setPhase("running");
      });
    }
  }, [fetchLoading, fetchError, questions, phase, startCamera]);

  // Tab / fullscreen guards
  useEffect(() => {
    if (phase !== "running") return;
    const fn = () => { if (document.hidden) issueWarning("Tab switch detected"); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [phase, issueWarning]);

  useEffect(() => {
    if (phase !== "running") return;
    const fn = () => { if (!document.fullscreenElement) { issueWarning("Fullscreen exited"); document.documentElement.requestFullscreen?.().catch(() => {}); } };
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, [phase, issueWarning]);

  // Countdown
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); doSubmit(false, "Time up"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]); // eslint-disable-line

  // Auto-submit when terminated
  useEffect(() => {
    if (phase === "terminating") doSubmit(true, termReason);
  }, [phase]); // eslint-disable-line

  // ── Core submit function — posts to backend ───────────────────────────────
  const doSubmit = useCallback(async (terminated = false, reason = "") => {
    if (submitting) return;
    setSubmitting(true);
    stopCamera();
    document.exitFullscreen?.().catch(() => {});

    const currentAnswers = answersRef.current;
    const payload = {
      answers: questions.map((q, i) => ({
        questionId:     q._id,
        selectedOption: currentAnswers[i] ?? null,
      })),
      terminatedBy: terminated ? "proctor" : null,
    };

    try {
      const res = await api.post(`/student/exams/${exam._id}/submit`, payload);
      setResult(res.data.result);
      setPhase("result");
    } catch (err) {
      // 409 = already submitted — still show result from error body
      if (err.response?.status === 409) {
        setResult({
          subject:         exam?.subject,
          score:           err.response.data.score           ?? 0,
          totalMarks:      err.response.data.totalMarks      ?? 0,
          marksPerQuestion: exam?.marksPerQuestion            ?? 1,
          percentage:      err.response.data.percentage      ?? 0,
          grade:           "—",
          gradeLabel:      "Already submitted",
          correctCount:    0, wrongCount: 0, unansweredCount: 0,
          submittedAt:     err.response.data.submittedAt,
          status:          "submitted",
        });
        setPhase("result");
      } else {
        // Server error — show error, allow retry
        setPhase("submitError");
        setFetchError(err.response?.data?.message || "Failed to submit. Please contact admin.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [questions, exam, stopCamera, submitting]);

  const confirmSubmit = useCallback(() => {
    setShowSubmit(false);
    doSubmit(false);
  }, [doSubmit]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const pct     = (timeLeft / ((exam?.duration || 30) * 60)) * 100;
  const total   = questions.length;
  const answered = Object.keys(answers).length;

  // ══ LOADING ═══════════════════════════════════════════════════════════════
  if (phase === "loading") {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[9990] p-6">
        <div className="text-center max-w-sm">
          {fetchError ? (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">Failed to load exam</h2>
              <p className="text-slate-400 text-sm mb-6">{fetchError}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { stopCamera(); onExamEnd?.(); }}
                  className="px-5 py-2.5 border border-slate-600 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-800">Exit</button>
                <button onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Retry</button>
              </div>
            </>
          ) : (
            <>
              <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
              <h2 className="text-white font-bold text-lg mb-1">Loading Exam</h2>
              <p className="text-slate-400 text-sm">Fetching questions and starting camera…</p>
              {cameraError && <div className="mt-4 bg-red-950 border border-red-700 rounded-xl p-3 flex items-center gap-2"><CameraOff className="w-4 h-4 text-red-400 shrink-0" /><p className="text-xs text-red-300">{cameraError}</p></div>}
            </>
          )}
        </div>
      </div>
    );
  }

  // ══ RESULT ════════════════════════════════════════════════════════════════
  if (phase === "result") {
    return <ResultScreen result={result} onClose={() => { stopCamera(); onExamEnd?.(); }} />;
  }

  // ══ SUBMIT ERROR ══════════════════════════════════════════════════════════
  if (phase === "submitError") {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[9990] p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">Submission Failed</h2>
          <p className="text-slate-400 text-sm mb-6">{fetchError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { stopCamera(); onExamEnd?.(); }}
              className="px-6 py-3 border border-slate-600 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-800">Exit</button>
            <button onClick={() => { setPhase("running"); setFetchError(""); startCamera(); }}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">Retry Submit</button>
          </div>
        </div>
      </div>
    );
  }

  // ══ RUNNING ═══════════════════════════════════════════════════════════════
  const q = questions[currentQ];

  return (
    <div className="fixed inset-0 bg-slate-950 z-[9990] flex flex-col overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />
      {showWarning && <WarningToast msg={warningMsg} count={warnings} />}
      {showSubmit && (
        <SubmitModal answered={answered} total={total}
          onConfirm={confirmSubmit} onCancel={() => setShowSubmit(false)} submitting={submitting} />
      )}

      {/* TOP BAR */}
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{exam?.subject}</p>
          <p className="text-slate-400 text-xs">Q{currentQ + 1}/{total} · {answered} answered</p>
        </div>
        {faceAbsSec > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${(faceAbsSec / FACE_TIMEOUT) * 100}%` }} />
            </div>
            <span className="text-red-400 text-xs font-bold">{faceAbsSec}s</span>
          </div>
        )}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm border shrink-0
          ${timeLeft <= 300 ? "bg-red-900/60 text-red-300 border-red-700" : "bg-slate-800 text-white border-slate-700"}`}>
          <Clock className="w-3.5 h-3.5" />{fmtTime(timeLeft)}
        </div>
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0
          ${warnings > 0 ? "bg-amber-900/50 border-amber-700 text-amber-300" : "bg-slate-800 border-slate-700 text-slate-400"}`}>
          <Shield className="w-3.5 h-3.5" />{warnings}/{MAX_WARNINGS}
        </div>
        <div className="relative shrink-0">
          <video ref={videoRef} muted playsInline className="w-16 h-12 rounded-lg object-cover border border-slate-600 bg-slate-800" />
          <div className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-slate-900 ${cameraReady ? "bg-green-500" : "bg-red-500"}`} />
          {faceAbsSec > 0 && <div className="absolute inset-0 rounded-lg border-2 border-red-500 animate-pulse pointer-events-none" />}
        </div>
      </div>

      <div className="h-1 bg-slate-800 shrink-0">
        <div className={`h-full transition-all duration-1000 ${pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${pct}%` }} />
      </div>

      {/* QUESTION */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-white font-black text-sm">{currentQ + 1}</span>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Question {currentQ + 1} of {total}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {answers[currentQ] !== undefined ? "✅ Answered" : "⬜ Not answered"}
                  {flagged[currentQ] ? " · 🚩 Flagged" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {exam?.marksPerQuestion && (
                <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-900/40 border border-yellow-700 px-2.5 py-1.5 rounded-lg">
                  <Star className="w-3 h-3" /> {exam.marksPerQuestion} mark{exam.marksPerQuestion > 1 ? "s" : ""}
                </span>
              )}
              <button onClick={() => setFlagged(p => ({ ...p, [currentQ]: !p[currentQ] }))}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors
                  ${flagged[currentQ] ? "bg-amber-900/50 border-amber-700 text-amber-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-400"}`}>
                <Flag className="w-3.5 h-3.5" />{flagged[currentQ] ? "Flagged" : "Flag"}
              </button>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 mb-5">
            <p className="text-white text-base sm:text-lg font-semibold leading-relaxed">{q?.text || "Question not available"}</p>
          </div>

          <div className="space-y-3">
            {(q?.options || []).map((opt, i) => {
              const isSelected = answers[currentQ] === i;
              return (
                <button key={i} onClick={() => setAnswers(p => ({ ...p, [currentQ]: i }))}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                    ${isSelected ? "border-blue-500 bg-blue-900/40 text-white shadow-lg" : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800"}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border-2 transition-colors
                    ${isSelected ? "bg-blue-600 border-blue-400 text-white" : "bg-slate-700 border-slate-600 text-slate-400"}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm font-medium leading-relaxed flex-1">{opt}</span>
                  {isSelected && <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />}
                </button>
              );
            })}
          </div>
          {answers[currentQ] === undefined && (
            <p className="text-xs text-slate-500 text-center mt-5">Click an option to select your answer</p>
          )}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div className="bg-slate-900 border-t border-slate-700 px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => setCurrentQ(p => Math.max(p - 1, 0))} disabled={currentQ === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-600 rounded-xl text-sm font-semibold text-slate-300
              hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-1.5 min-w-max px-1 py-1">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrentQ(i)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all shrink-0
                    ${i === currentQ ? "bg-blue-600 text-white scale-110"
                      : answers[i] !== undefined ? flagged[i] ? "bg-amber-700 text-amber-100" : "bg-emerald-800 text-emerald-100"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
          {currentQ < total - 1 ? (
            <button onClick={() => setCurrentQ(p => Math.min(p + 1, total - 1))}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shrink-0">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setShowSubmit(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shrink-0">
              <CheckCircle className="w-4 h-4" /> Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamInterface;