import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Award, CheckCircle, XCircle, FileText, Calendar,
  RefreshCw, AlertCircle, Inbox, Star, TrendingUp,
} from "lucide-react";
import { StudentLayout } from "../../components/student/StudentLayout";

// ─── Axios Instance (Same as StudentDashboard.jsx) ─────────────────────────────
const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || "https://tgpexambackend.onrender.com/api" 
});

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("token");
  if (t) {
    cfg.headers.Authorization = `Bearer ${t}`;
  } else {
    window.location.href = "/";
    return Promise.reject();
  }
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

// ─── Grade Styles ─────────────────────────────────────────────────────────────
const GRADE_STYLE = {
  'A+': { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", label: "Outstanding" },
  'A':  { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    label: "Excellent"   },
  'B+': { bg: "bg-indigo-100",  text: "text-indigo-700",  border: "border-indigo-200",  label: "Very Good"   },
  'B':  { bg: "bg-indigo-100",  text: "text-indigo-700",  border: "border-indigo-200",  label: "Good"        },
  'C':  { bg: "bg-yellow-100",  text: "text-yellow-700",  border: "border-yellow-200",  label: "Average"     },
  'D':  { bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-200",  label: "Pass"        },
  'F':  { bg: "bg-red-100",     text: "text-red-700",     border: "border-red-200",     label: "Fail"        },
};

const fmt = (iso) => iso 
  ? new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    }) 
  : "—";

// ─── Progress Ring ────────────────────────────────────────────────────────────
const Ring = ({ pct, grade }) => {
  const gs = GRADE_STYLE[grade] || GRADE_STYLE["F"];
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const colorMap = { 
    'A+': "#10b981", 'A': "#3b82f6", 'B+': "#6366f1", 'B': "#6366f1",
    'C': "#eab308", 'D': "#f97316", 'F': "#ef4444" 
  };
  const color = colorMap[grade] || "#6b7280";

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-black text-gray-800">{pct}%</span>
        <span className={`text-xs font-bold ${gs.text}`}>{grade}</span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentResults = () => {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadResults = async () => {
    setLoading(true);
    setError("");

    // Same check as StudentDashboard
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");

    if (!token || role !== "student") {
      setError("Please login as a student to view results.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/student/results");
      setResults(res.data.results || []);
    } catch (err) {
      console.error("Results fetch error:", err.response?.data || err);

      const msg = err.response?.data?.message || err.message || "Failed to load results";

      if (msg.toLowerCase().includes("access denied") || msg.includes("403")) {
        setError("You don't have permission to view results. Please make sure you are logged in with a student account.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load results on mount
  useEffect(() => {
    loadResults();
  }, []);

  // Summary Stats
  const totalExams = results.length;
  const avgScore = totalExams > 0 
    ? Math.round(results.reduce((sum, r) => sum + (r.percentage || 0), 0) / totalExams) 
    : 0;
  const passed = results.filter(r => (r.percentage || 0) >= 40).length;
  const best = results.reduce((b, r) => (r.percentage || 0) > (b?.percentage || -1) ? r : b, null);

  return (
    <StudentLayout>
      <div className="p-6 max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
            <p className="text-sm text-gray-500">View all your exam performances</p>
          </div>
          <button 
            onClick={loadResults} 
            disabled={loading}
            className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-700">{error}</p>
              <p className="text-sm text-red-600 mt-1">
                Make sure you are logged in with a student account.
              </p>
            </div>
            <button 
              onClick={loadResults}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && (
          <div className="text-center py-20">
            <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-500">No results yet</p>
            <p className="text-gray-400 mt-2">Your submitted exam results will appear here</p>
          </div>
        )}

        {/* Results List */}
        {!loading && results.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Exams", val: totalExams, icon: FileText, color: "text-gray-700", bg: "bg-gray-100" },
                { label: "Average Score", val: `${avgScore}%`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Passed", val: passed, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
                { label: "Best Score", val: best ? `${best.percentage}%` : "—", icon: Award, color: "text-indigo-600", bg: "bg-indigo-50" },
              ].map(({ label, val, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Result Cards */}
            <div className="space-y-4">
              {results.map(r => {
                const gs = GRADE_STYLE[r.grade] || GRADE_STYLE["F"];
                return (
                  <div 
                    key={r._id} 
                    className="bg-white border border-gray-100 hover:border-gray-300 rounded-2xl p-6 flex items-center gap-6 transition-all"
                  >
                    <Ring pct={r.percentage} grade={r.grade} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-lg text-gray-900">{r.subject}</p>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${gs.bg} ${gs.text} ${gs.border}`}>
                          {r.grade}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500" /> 
                          {r.correctCount || 0} Correct
                        </span>
                        <span className="flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-red-500" /> 
                          {r.wrongCount || 0} Wrong
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-yellow-500" /> 
                          {r.marksPerQuestion} marks/Q
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" /> 
                          {fmt(r.submittedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-3xl font-bold text-gray-900">{r.score}</p>
                      <p className="text-sm text-gray-500">/ {r.totalMarks}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentResults;