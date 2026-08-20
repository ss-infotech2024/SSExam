import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiAlertCircle, FiUsers, FiTrendingUp, FiAward,
  FiDownload, FiSearch, FiRefreshCw,
  FiChevronLeft, FiBarChart2, FiStar,FiChevronDown,FiChevronUp,
  FiUser, FiHash, FiX, FiFilter
} from "react-icons/fi";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://ssexam.onrender.com/api",
});

api.interceptors.request.use((cfg) => {
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
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

// ─── CSV helper ───────────────────────────────────────────────────────────────
const downloadCSV = (rows, filename) => {
  if (!rows.length) {
    alert("No data to download");
    return;
  }

  const headers = [
    "Student Name",
    "Roll Number",
    "Email",
    "College",
    "Exam",
    "Department",
    "Score",
    "Total Marks",
    "Percentage",
    "Grade",
    "Correct",
    "Wrong",
    "Skipped",
    "Status",
    "Submitted At",
  ];

  const escape = (val) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvContent = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.student?.name || r.student?.fullName || "",
        r.student?.rollNumber || r.student?.studentId || "",
        r.student?.email || "",
        r.student?.college || "",
        r.exam?.subject || "",
        r.exam?.department || "",
        r.score ?? "",
        r.totalMarks ?? "",
        r.percentage ?? "",
        r.grade || "",
        r.correctCount ?? "",
        r.wrongCount ?? "",
        r.skippedCount ?? r.unansweredCount ?? "",
        (r.percentage ?? 0) >= 40 ? "Pass" : "Fail",
        r.submittedAt
          ? new Date(r.submittedAt).toLocaleString("en-IN")
          : "",
      ]
        .map(escape)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const StudentScores = () => {
  const navigate = useNavigate();
  const [adminDepartment, setAdminDepartment] = useState("");
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exams, setExams] = useState([]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [selectedExam, setSelectedExam] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [passFailFilter, setPassFailFilter] = useState(""); // "" | "pass" | "fail"
  const [minPercentage, setMinPercentage] = useState("");
  const [maxPercentage, setMaxPercentage] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(true);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const dept = localStorage.getItem("adminDepartment");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (dept) {
      setAdminDepartment(dept);
      fetchExams();
      fetchAllResults();
    } else if (user.department) {
      setAdminDepartment(user.department);
      fetchExams();
      fetchAllResults();
    } else {
      setError("Department not found. Please login again.");
      setLoading(false);
    }
  }, []);

  const fetchExams = async () => {
    try {
      const response = await api.get("/admin/exams");
      setExams(response.data.exams || []);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  const fetchAllResults = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/results");
      setResults(response.data.results || []);
      setSummary(response.data.summary || {});
    } catch (err) {
      console.error("Error fetching results:", err);
      setError(err.response?.data?.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const fetchExamResults = async (examId) => {
    if (!examId) {
      fetchAllResults();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/admin/results/exam/${examId}`);
      setResults(response.data.results || []);
      setSummary({
        totalResults: response.data.summary?.totalStudents || 0,
        averageScore: response.data.summary?.averageScore || 0,
        passCount: response.data.summary?.passCount || 0,
        failCount: response.data.summary?.failCount || 0,
        passRate: response.data.summary?.passRate || 0,
        highestScore: response.data.summary?.highestScore || 0,
        lowestScore: response.data.summary?.lowestScore || 0,
      });
    } catch (err) {
      console.error("Error fetching exam results:", err);
      setError(err.response?.data?.message || "Failed to load exam results");
    } finally {
      setLoading(false);
    }
  };

  const handleExamFilter = (examId) => {
    setSelectedExam(examId);
    setCurrentPage(1);
    if (examId) fetchExamResults(examId);
    else fetchAllResults();
  };

  // Unique colleges from results (if field exists)
  const colleges = useMemo(() => {
    const set = new Set();
    results.forEach((r) => {
      const c = r.student?.college;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [results]);

  // Unique exam dates from existing exams
    const examDates = useMemo(() => {
      const dateMap = new Map();

      exams.forEach((exam) => {
        if (!exam.startTime) return;

        const date = new Date(exam.startTime);

        if (isNaN(date.getTime())) return;

        // YYYY-MM-DD for filtering
        const dateKey = date.toISOString().split("T")[0];

        // Display date
        const displayDate = date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        dateMap.set(dateKey, displayDate);
      });

      return Array.from(dateMap.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([value, label]) => ({
          value,
          label,
        }));
    }, [exams]);

  // ── Client-side filtering ─────────────────────────────────────────────────
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const studentName = (
        result.student?.name ||
        result.student?.fullName ||
        ""
      ).toLowerCase();
      const rollNumber = String(
        result.student?.rollNumber || result.student?.studentId || ""
      ).toLowerCase();
      const examSubject = (result.exam?.subject || "").toLowerCase();
      const email = (result.student?.email || "").toLowerCase();

      const matchSearch =
        !searchLower ||
        studentName.includes(searchLower) ||
        rollNumber.includes(searchLower) ||
        examSubject.includes(searchLower) ||
        email.includes(searchLower);

      const pct = result.percentage ?? 0;
      const isPass = pct >= 40;

      const matchPassFail =
        !passFailFilter ||
        (passFailFilter === "pass" && isPass) ||
        (passFailFilter === "fail" && !isPass);

      const matchMinPct =
        minPercentage === "" || pct >= Number(minPercentage);
      const matchMaxPct =
        maxPercentage === "" || pct <= Number(maxPercentage);

      let matchDate = true;

      if (dateFrom || dateTo) {
        const examStartTime = result.exam?.startTime;
        const examDate = examStartTime ? new Date(examStartTime) : null;

        if (!examDate || isNaN(examDate.getTime())) {
          matchDate = false;
        } else {
          if (dateFrom) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);

            if (examDate < from) {
              matchDate = false;
            }
          }

          if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);

            if (examDate > to) {
              matchDate = false;
            }
          }
        }
      }

      const matchCollege =
        !collegeFilter ||
        (result.student?.college || "") === collegeFilter;

      return (
        matchSearch &&
        matchPassFail &&
        matchMinPct &&
        matchMaxPct &&
        matchDate &&
        matchCollege
      );
    });
  }, [
    results,
    searchTerm,
    passFailFilter,
    minPercentage,
    maxPercentage,
    dateFrom,
    dateTo,
    collegeFilter,
  ]);

  // Filtered summary (for cards)
  const filteredSummary = useMemo(() => {
    if (!filteredResults.length) {
      return {
        totalResults: 0,
        averageScore: 0,
        passCount: 0,
        failCount: 0,
        passRate: 0,
        highestScore: 0,
        lowestScore: 0,
      };
    }
    const pcts = filteredResults.map((r) => r.percentage ?? 0);
    const passCount = pcts.filter((p) => p >= 40).length;
    const failCount = pcts.length - passCount;
    const avg =
      pcts.reduce((a, b) => a + b, 0) / pcts.length;
    return {
      totalResults: pcts.length,
      averageScore: Math.round(avg * 10) / 10,
      passCount,
      failCount,
      passRate: Math.round((passCount / pcts.length) * 1000) / 10,
      highestScore: Math.max(...pcts),
      lowestScore: Math.min(...pcts),
    };
  }, [filteredResults]);

  // Pagination
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResults = filteredResults.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    passFailFilter,
    minPercentage,
    maxPercentage,
    dateFrom,
    dateTo,
    collegeFilter,
    selectedExam,
  ]);

  const clearFilters = () => {
    setSearchTerm("");
    setPassFailFilter("");
    setMinPercentage("");
    setMaxPercentage("");
    setDateFrom("");
    setDateTo("");
    setCollegeFilter("");
    setSelectedExam("");
    setCurrentPage(1);
    fetchAllResults();
  };

  const activeFilterCount = [
    searchTerm,
    passFailFilter,
    minPercentage,
    maxPercentage,
    dateFrom,
    dateTo,
    collegeFilter,
    selectedExam,
  ].filter(Boolean).length;

  // ── Download handlers ─────────────────────────────────────────────────────
  const handleDownloadAll = useCallback(() => {
    const name = selectedExam
      ? `results_exam_${selectedExam}_${Date.now()}.csv`
      : `all_results_${adminDepartment || "dept"}_${Date.now()}.csv`;
    downloadCSV(results, name);
  }, [results, selectedExam, adminDepartment]);

  const handleDownloadFiltered = useCallback(() => {
    const name = `filtered_results_${Date.now()}.csv`;
    downloadCSV(filteredResults, name);
  }, [filteredResults]);

  const getScoreColor = (percentage) => {
    if (percentage >= 70) return "text-green-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (percentage) => {
    if (percentage >= 70) return "bg-green-100";
    if (percentage >= 40) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case "O":
      case "A+":
        return "text-emerald-600 bg-emerald-100";
      case "A":
        return "text-blue-600 bg-blue-100";
      case "B+":
      case "B":
        return "text-indigo-600 bg-indigo-100";
      case "C":
        return "text-yellow-600 bg-yellow-100";
      case "D":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-red-600 bg-red-100";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Student Results
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Department:{" "}
                <span className="font-semibold text-blue-600">
                  {adminDepartment || "Loading..."}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownloadAll}
                disabled={!results.length}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <FiDownload className="w-4 h-4" />
                Download All
              </button>
              <button
                onClick={handleDownloadFiltered}
                disabled={!filteredResults.length}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <FiDownload className="w-4 h-4" />
                Download Filtered ({filteredResults.length})
              </button>
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <FiChevronLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={fetchAllResults}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats Cards — based on FILTERED data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <FiUsers className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-600">
                Total Results
              </h3>
            </div>
            <p className="text-4xl font-bold text-blue-700">
              {filteredSummary.totalResults}
            </p>
            {activeFilterCount > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                of {results.length} total
              </p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <FiTrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-medium text-gray-600">
                Average Score
              </h3>
            </div>
            <p className="text-4xl font-bold text-green-600">
              {filteredSummary.averageScore}%
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <FiAward className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-600">Pass Rate</h3>
            </div>
            <p className="text-4xl font-bold text-purple-600">
              {filteredSummary.passRate}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {filteredSummary.passCount} passed /{" "}
              {filteredSummary.failCount} failed
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <FiBarChart2 className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-medium text-gray-600">
                Highest Score
              </h3>
            </div>
            <p className="text-4xl font-bold text-orange-600">
              {filteredSummary.highestScore}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Lowest: {filteredSummary.lowestScore}%
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-6">
          {/* Filter Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
            >
              <FiFilter className="w-4 h-4" />

              <span>Filters</span>

              {activeFilterCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}

              {showFilters ? (
                <FiChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <FiChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  <FiX className="w-3.5 h-3.5" />
                  Clear All
                </button>
              )}

              <button
                onClick={
                  selectedExam
                    ? () => handleExamFilter(selectedExam)
                    : fetchAllResults
                }
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Refresh"
              >
                <FiRefreshCw
                  className={`w-4 h-4 text-gray-600 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex items-end gap-3 mt-3 overflow-x-auto pb-1">

              {/* Exam */}
              <div className="min-w-[180px] flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Exam
                </label>

                <select
                  value={selectedExam}
                  onChange={(e) => handleExamFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Exams</option>

                  {exams.map((exam) => (
                    <option key={exam._id} value={exam._id}>
                      {exam.subject} ({exam.questionCount ?? "?"} Q)
                    </option>
                  ))}
                </select>
              </div>

              {/* Pass / Fail */}
              <div className="min-w-[150px] flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pass / Fail
                </label>

                <select
                  value={passFailFilter}
                  onChange={(e) => setPassFailFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="pass">Pass (≥ 40%)</option>
                  <option value="fail">Fail (&lt; 40%)</option>
                </select>
              </div>

              {/* College */}
              {colleges.length > 0 && (
                <div className="min-w-[180px] flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    College
                  </label>

                  <select
                    value={collegeFilter}
                    onChange={(e) => setCollegeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Colleges</option>

                    {colleges.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Search */}
              <div className="min-w-[220px] flex-[1.3]">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Search
                </label>

                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

                  <input
                    type="text"
                    placeholder="Name, roll, email, subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Min % */}
              <div className="min-w-[120px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Min %
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 40"
                  value={minPercentage}
                  onChange={(e) => setMinPercentage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Max % */}
              <div className="min-w-[120px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Max %
                </label>

                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 90"
                  value={maxPercentage}
                  onChange={(e) => setMaxPercentage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Exam Date From */}
                <div className="min-w-[150px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Exam From
                  </label>

                  <select
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Dates</option>

                    {examDates.map((date) => (
                      <option key={date.value} value={date.value}>
                        {date.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exam Date To */}
                <div className="min-w-[150px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Exam To
                  </label>

                  <select
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Dates</option>

                    {examDates.map((date) => (
                      <option key={date.value} value={date.value}>
                        {date.label}
                      </option>
                    ))}
                  </select>
                </div>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
              <p className="text-gray-600">Loading results...</p>
            </div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
            <FiAlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              No Results Found
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {results.length === 0
                ? `No student results in ${adminDepartment || "this"} department yet.`
                : "No results match your current filters. Try clearing some filters."}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Details
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exam
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedResults.map((result, index) => {
                      const isPass = (result.percentage ?? 0) >= 40;
                      return (
                        <tr
                          key={result._id || index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {(
                                    result.student?.name ||
                                    result.student?.fullName ||
                                    "?"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <FiUser className="w-3 h-3 text-gray-400" />
                                  <div className="text-sm font-medium text-gray-900">
                                    {result.student?.name ||
                                      result.student?.fullName ||
                                      "Unknown Student"}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <FiHash className="w-3 h-3 text-gray-400" />
                                  <div className="text-xs text-gray-500">
                                    Roll:{" "}
                                    {result.student?.rollNumber ||
                                      result.student?.studentId ||
                                      "N/A"}
                                  </div>
                                </div>
                                {result.student?.college && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {result.student.college}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {result.exam?.subject || "Unknown Subject"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {result.exam?.department}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-900">
                              {result.score}/{result.totalMarks}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreBg(
                                result.percentage
                              )} ${getScoreColor(result.percentage)}`}
                            >
                              {result.percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getGradeColor(
                                result.grade
                              )}`}
                            >
                              {result.grade || "F"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                                isPass
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {isPass ? "Pass" : "Fail"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <FiStar className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs text-gray-600">
                                {result.correctCount || 0} correct
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {result.wrongCount || 0} wrong ·{" "}
                              {result.skippedCount ??
                                result.unansweredCount ??
                                0}{" "}
                              skipped
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {result.submittedAt
                              ? new Date(
                                  result.submittedAt
                                ).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-3">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to{" "}
                {Math.min(
                  startIndex + itemsPerPage,
                  filteredResults.length
                )}{" "}
                of {filteredResults.length} results
              </div>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentScores;