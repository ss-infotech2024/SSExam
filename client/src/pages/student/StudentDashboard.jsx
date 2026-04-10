import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Clock, Calendar, CheckCircle, BookOpen, Play, AlertCircle,
  Camera, X, ChevronRight, Award, FileText, Zap, RefreshCw, Trophy, BarChart3, Lock,
} from "lucide-react";
import { StudentLayout } from "../../components/student/StudentLayout";
import ExamInterface from "./ExamInterface";

// ─── IST Timezone Helpers (Consistent with EditExam.jsx) ─────────────────────

const formatISTDateTime = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatISTTime = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatISTFull = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ─── Axios ─────────────────────────────────────────────────────────────────────
const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || "https://tgpexambackend.onrender.com/api" 
});

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  else { window.location.href = "/"; return Promise.reject(); }
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { 
    localStorage.clear(); 
    window.location.href = "/"; 
  }
  return Promise.reject(new Error(err.response?.data?.message || err.message));
});

// ─── Countdown Hook ───────────────────────────────────────────────────────────
const useCountdown = (targetISO) => {
  const calc = () => {
    if (!targetISO) return { h: 0, m: 0, s: 0, over: true };
    const diff = new Date(targetISO) - new Date();
    if (diff <= 0) return { h: 0, m: 0, s: 0, over: true };
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      over: false,
    };
  };

  const [cd, setCd] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setCd(calc()), 1000);
    return () => clearInterval(t);
  }, [targetISO]);

  return cd;
};

// ─── Status Config ────────────────────────────────────────────────────────────
const statusCfg = {
  active:    { label: "Live Now",  bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
  upcoming:  { label: "Upcoming",  bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"  },
  completed: { label: "Completed", bg: "bg-gray-100",   text: "text-gray-500",   dot: "bg-gray-400"  },
};

// ─── StatCard Component (This was missing - causing the error) ───────────────
const StatCard = ({ label, value, icon: Icon, color, bg, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  </div>
);

// ─── Countdown Badge ─────────────────────────────────────────────────────────
const CountdownBadge = ({ startTime }) => {
  const { h, m, s, over } = useCountdown(startTime);
  if (over) return <span className="text-xs font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Starting now…</span>;

  return (
    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
      {h > 0 ? `${h}h ` : ""}{String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
    </span>
  );
};

// ─── Guidelines Modal ────────────────────────────────────────────────────────
const GuidelinesModal = ({ exam, onStart, onClose, starting }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
      <div className="p-6 border-b flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Before You Begin</h2>
          <p className="text-sm text-blue-600 font-semibold mt-0.5">{exam?.subject}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Clock,    label: "Duration",  val: `${exam?.duration} min`,       bg: "bg-blue-50 text-blue-600"   },
            { icon: FileText, label: "Questions", val: exam?.questionCount ?? "—",     bg: "bg-purple-50 text-purple-600"},
            { icon: Award,    label: "Per Q",     val: `${exam?.marksPerQuestion || 1} marks`, bg: "bg-green-50 text-green-600" },
            { icon: Calendar, label: "Ends",      val: formatISTTime(exam?.endTime), bg: "bg-orange-50 text-orange-600" },
          ].map(({ icon: Icon, label, val, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3.5 flex items-center gap-3`}>
              <Icon className="w-4 h-4 shrink-0" />
              <div>
                <p className="text-[11px] font-medium opacity-70">{label}</p>
                <p className="text-sm font-bold">{val}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Exam Rules</p>
          <ul className="space-y-2">
            {[
              "⚠️ You can attempt this exam ONLY ONCE",
              "Camera must stay active — face must be visible at all times",
              "Do not switch tabs or exit fullscreen during the exam",
              "Only one person should be visible to the camera",
              "No negative marking — attempt all questions",
              "5 proctoring violations = automatic termination",
            ].map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">{i+1}</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 font-medium">
            Clicking "Start Exam" will request camera access and enter fullscreen mode.
          </p>
        </div>
      </div>

      <div className="p-5 border-t flex gap-3">
        <button 
          onClick={onClose}
          className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Not Now
        </button>
        <button 
          onClick={onStart} 
          disabled={starting}
          className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
        >
          {starting ? <><RefreshCw className="w-4 h-4 animate-spin" />Starting…</> : <><Camera className="w-4 h-4" />Start Exam</>}
        </button>
      </div>
    </div>
  </div>
);

// ─── ExamCard (Fixed with proper IST formatting) ─────────────────────────────
const ExamCard = ({ exam, onStart, onViewResult, attempted }) => {
  const s = statusCfg[exam.status] || statusCfg.upcoming;
  const isActive = exam.status === "active";
  const isUpcoming = exam.status === "upcoming";
  const isDone = exam.status === "completed";
  const isAttempted = attempted === true;

  return (
    <div className={`bg-white rounded-2xl border-2 ${isActive ? "border-green-300 shadow-green-100" : "border-gray-100"}
      shadow-sm hover:shadow-md transition-all overflow-hidden ${isAttempted ? "opacity-75" : ""}`}>
      
      <div className={`h-1 ${isActive ? "bg-green-500" : isUpcoming ? "bg-blue-500" : "bg-gray-300"}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base truncate">{exam.subject}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{exam.department} Department</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${s.bg} ${s.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${isActive ? "animate-pulse" : ""}`} />
              {s.label}
            </span>
            {isAttempted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                <CheckCircle className="w-3 h-3" /> Attempted
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1.5 rounded-lg">
            <Clock className="w-3 h-3" /> {exam.duration} min
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1.5 rounded-lg">
            <FileText className="w-3 h-3" /> {exam.questionCount} Qs
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1.5 rounded-lg">
            <Award className="w-3 h-3" /> {exam.questionCount * (exam.marksPerQuestion || 1)} marks
          </span>
        </div>

        {/* Fixed Time Display - Consistent with Admin EditExam */}
        <div className="mb-4 p-3 bg-gray-50 rounded-xl space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Starts</span>
            <span className="font-semibold text-gray-700">
              {formatISTDateTime(exam.startTime)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Ends</span>
            <span className="font-semibold text-gray-700">
              {formatISTDateTime(exam.endTime)}
            </span>
          </div>
          {isUpcoming && (
            <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
              <span className="text-gray-400">Starts in</span>
              <CountdownBadge startTime={exam.startTime} />
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        {isActive && !isAttempted && (
          <button 
            onClick={() => onStart(exam)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
          >
            <Play className="w-4 h-4 fill-white" /> Start Exam Now
          </button>
        )}
        {isActive && isAttempted && (
          <div className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-500 text-sm font-bold rounded-xl">
            <Lock className="w-4 h-4" /> Already Attempted
          </div>
        )}
        {isUpcoming && (
          <div className="w-full py-2.5 text-center text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-100 font-medium">
            Not started yet
          </div>
        )}
        {isDone && (
          <button 
            onClick={() => onViewResult(exam)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-xl transition-colors"
          >
            <BarChart3 className="w-4 h-4" /> View Result
          </button>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const StudentDashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem("token");
    const r = localStorage.getItem("userRole");
    if (!t || r !== "student") navigate("/");
  }, [navigate]);

  const studentName = localStorage.getItem("studentName") || "Student";
  const studentId = localStorage.getItem("studentId") || "";

  const [exams, setExams] = useState([]);
  const [attemptMap, setAttemptMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExam, setSelectedExam] = useState(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [starting, setStarting] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/student/exams");
      const examList = res.data.exams || [];
      setExams(examList);

      const attemptStatuses = {};
      await Promise.all(
        examList.map(async (exam) => {
          try {
            const statusRes = await api.get(`/student/exams/${exam._id}/attempt-status`);
            if (statusRes.data.attempted) {
              attemptStatuses[exam._id] = true;
            }
          } catch (err) {
            console.error(`Failed to fetch attempt status for exam ${exam._id}:`, err);
          }
        })
      );
      setAttemptMap(attemptStatuses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const isToday = (iso) => {
    if (!iso) return false;
    const examDate = new Date(iso);
    const now = new Date();
    return (
      examDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) ===
      now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
    );
  };

  const activeExams = exams.filter(e => e.status === "active");
  const upcomingExams = exams.filter(e => e.status === "upcoming");
  const completedExams = exams.filter(e => e.status === "completed");
  const todayExams = upcomingExams.filter(e => isToday(e.startTime));

  const handleStartExam = (exam) => {
    if (attemptMap[exam._id]) {
      alert("You have already attempted this exam. You cannot take it again.");
      return;
    }
    setSelectedExam(exam);
    setShowGuidelines(true);
  };

  const beginExam = async () => {
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      await document.documentElement.requestFullscreen?.().catch(() => {});
      setShowGuidelines(false);
      setExamStarted(true);
    } catch {
      alert("Please allow camera access to start the exam.");
    } finally {
      setStarting(false);
    }
  };

  const handleExamEnd = () => {
    setExamStarted(false);
    setSelectedExam(null);
    loadExams();
  };

  if (examStarted && selectedExam) {
    return <ExamInterface exam={selectedExam} onExamEnd={handleExamEnd} />;
  }

  const greet = () => {
    const h = currentTime.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <StudentLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 mb-7 text-white shadow-xl">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-10 -right-16 w-56 h-56 bg-white/5 rounded-full" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-blue-200 text-sm font-medium">{greet()},</p>
              <h1 className="text-2xl font-bold mt-0.5">{studentName.split(" ")[0]} 👋</h1>
              <p className="text-blue-100 text-sm mt-2">
                {activeExams.length > 0
                  ? `🔴 ${activeExams.length} exam${activeExams.length > 1 ? "s" : ""} LIVE right now`
                  : todayExams.length > 0
                  ? `📅 ${todayExams.length} exam${todayExams.length > 1 ? "s" : ""} scheduled for today`
                  : `You have ${upcomingExams.length} upcoming exam${upcomingExams.length !== 1 ? "s" : ""}.`}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-blue-200">Student ID</p>
                <p className="font-mono font-bold text-lg">{studentId}</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-blue-200">Current IST</p>
                <p className="font-mono font-bold text-lg">
                  {currentTime.toLocaleTimeString("en-IN", { 
                    timeZone: "Asia/Kolkata", 
                    hour: "2-digit", 
                    minute: "2-digit", 
                    hour12: true 
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatCard label="TOTAL EXAMS" value={loading ? "—" : exams.length} icon={BookOpen} color="text-gray-700" bg="bg-gray-100" />
          <StatCard label="UPCOMING" value={loading ? "—" : upcomingExams.length} icon={Calendar} color="text-blue-600" bg="bg-blue-50" sub={todayExams.length ? `${todayExams.length} today` : undefined} />
          <StatCard label="LIVE NOW" value={loading ? "—" : activeExams.length} icon={Zap} color="text-green-600" bg="bg-green-50" />
          <StatCard label="COMPLETED" value={loading ? "—" : completedExams.length} icon={CheckCircle} color="text-purple-600" bg="bg-purple-50" />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={loadExams} className="ml-auto text-xs text-red-600 underline font-medium">Retry</button>
          </div>
        )}

        {/* Live Exams */}
        {activeExams.length > 0 && (
          <section className="mb-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <h2 className="text-base font-bold text-gray-800">Live Exams</h2>
              <span className="text-xs bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded-full">
                {activeExams.length} Active
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeExams.map(e => (
                <ExamCard 
                  key={e._id} 
                  exam={e} 
                  onStart={handleStartExam} 
                  onViewResult={() => navigate("/student/results")} 
                  attempted={attemptMap[e._id]} 
                />
              ))}
            </div>
          </section>
        )}

        {/* Today's Exams */}
        {todayExams.length > 0 && (
          <section className="mb-7">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-bold text-gray-800">Today's Exams</h2>
              <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">
                {todayExams.length} Scheduled
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {todayExams.map(e => (
                <ExamCard 
                  key={e._id} 
                  exam={e} 
                  onStart={handleStartExam} 
                  onViewResult={() => navigate("/student/results")} 
                  attempted={attemptMap[e._id]} 
                />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Exams List */}
        {upcomingExams.filter(e => !isToday(e.startTime)).length > 0 && (
          <section className="mb-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Upcoming Exams</h2>
              <button 
                onClick={() => navigate("/student/exams")}
                className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {upcomingExams.filter(e => !isToday(e.startTime)).slice(0, 5).map((exam, i, arr) => (
                <div key={exam._id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                  <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{exam.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatISTFull(exam.startTime)} · {exam.duration} min · {exam.questionCount} Qs
                    </p>
                  </div>
                  <CountdownBadge startTime={exam.startTime} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Completed Exams */}
        {completedExams.length > 0 && (
          <section className="mb-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">Recent Results</h2>
              <button 
                onClick={() => navigate("/student/results")}
                className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1"
              >
                View All Results <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {completedExams.slice(0, 4).map((exam, i, arr) => (
                <div key={exam._id} className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                  <div className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{exam.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatISTDateTime(exam.endTime)} · {exam.questionCount} Questions
                    </p>
                  </div>
                  <button 
                    onClick={() => navigate("/student/results")}
                    className="text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    Results <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!loading && exams.length === 0 && !error && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-9 h-9 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold text-lg mb-1">No exams yet</p>
            <p className="text-gray-400 text-sm">Your department has no scheduled exams at the moment.</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-16 bg-gray-100 rounded-xl mb-3" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        )}
      </div>

      {showGuidelines && selectedExam && (
        <GuidelinesModal 
          exam={selectedExam} 
          onStart={beginExam}
          onClose={() => { setShowGuidelines(false); setSelectedExam(null); }}
          starting={starting} 
        />
      )}
    </StudentLayout>
  );
};

export default StudentDashboard;