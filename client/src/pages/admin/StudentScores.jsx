import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiAlertCircle, FiUsers, FiTrendingUp, FiAward, 
  FiDownload, FiFilter, FiSearch, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiBarChart2, FiStar,
  FiUser, FiHash
} from "react-icons/fi";

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL || "https://onlineexamportal-uvvx.onrender.com/api" 
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

const StudentScores = () => {
  const navigate = useNavigate();
  const [adminDepartment, setAdminDepartment] = useState("");
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch admin department and exams on mount
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

  // Fetch all exams for dropdown filter
  const fetchExams = async () => {
    try {
      const response = await api.get("/admin/exams");
      setExams(response.data.exams || []);
    } catch (err) {
      console.error("Error fetching exams:", err);
    }
  };

  // Fetch all results
  const fetchAllResults = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/results");
      console.log("API Response:", response.data); // Debug log
      
      setResults(response.data.results || []);
      setSummary(response.data.summary || {});
    } catch (err) {
      console.error("Error fetching results:", err);
      setError(err.response?.data?.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  // Fetch results for specific exam
  const fetchExamResults = async (examId) => {
    if (!examId) {
      fetchAllResults();
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/admin/results/exam/${examId}`);
      console.log("Exam Results Response:", response.data); // Debug log
      
      setResults(response.data.results || []);
      setSummary({
        totalResults: response.data.summary?.totalStudents || 0,
        averageScore: response.data.summary?.averageScore || 0,
        passCount: response.data.summary?.passCount || 0,
        failCount: response.data.summary?.failCount || 0,
        passRate: response.data.summary?.passRate || 0,
        highestScore: response.data.summary?.highestScore || 0,
        lowestScore: response.data.summary?.lowestScore || 0
      });
    } catch (err) {
      console.error("Error fetching exam results:", err);
      setError(err.response?.data?.message || "Failed to load exam results");
    } finally {
      setLoading(false);
    }
  };

  // Handle exam filter change
  const handleExamFilter = (examId) => {
    setSelectedExam(examId);
    setCurrentPage(1);
    if (examId) {
      fetchExamResults(examId);
    } else {
      fetchAllResults();
    }
  };

  // Export results as CSV
  const handleExport = async () => {
    if (!selectedExam) {
      alert("Please select an exam to export results");
      return;
    }
    
    try {
      window.open(`${api.defaults.baseURL}/admin/results/export/${selectedExam}?token=${localStorage.getItem("token")}`, '_blank');
    } catch (err) {
      console.error("Error exporting results:", err);
      alert("Failed to export results");
    }
  };

  // Filter results by search term
  const filteredResults = results.filter(result => {
    const searchLower = searchTerm.toLowerCase();
    const studentName = result.student?.name?.toLowerCase() || '';
    const rollNumber = result.student?.rollNumber?.toLowerCase() || '';
    const examSubject = result.exam?.subject?.toLowerCase() || '';
    
    return (
      studentName.includes(searchLower) ||
      rollNumber.includes(searchLower) ||
      examSubject.includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResults = filteredResults.slice(startIndex, startIndex + itemsPerPage);

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
    switch(grade) {
      case 'A+': return "text-emerald-600 bg-emerald-100";
      case 'A': return "text-blue-600 bg-blue-100";
      case 'B+': return "text-indigo-600 bg-indigo-100";
      case 'B': return "text-indigo-600 bg-indigo-100";
      case 'C': return "text-yellow-600 bg-yellow-100";
      case 'D': return "text-orange-600 bg-orange-100";
      default: return "text-red-600 bg-red-100";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Results</h1>
              <p className="text-lg text-gray-600 mt-2">
                Department: <span className="font-semibold text-blue-600">{adminDepartment || "Loading..."}</span>
              </p>
            </div>
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Error Message */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <FiUsers className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-600">Total Results</h3>
            </div>
            <p className="text-4xl font-bold text-blue-700">{summary.totalResults || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <FiTrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-medium text-gray-600">Average Score</h3>
            </div>
            <p className="text-4xl font-bold text-green-600">{summary.averageScore || 0}%</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <FiAward className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-medium text-gray-600">Pass Rate</h3>
            </div>
            <p className="text-4xl font-bold text-purple-600">{summary.passRate || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.passCount || 0} passed / {summary.failCount || 0} failed
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <FiBarChart2 className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-medium text-gray-600">Highest Score</h3>
            </div>
            <p className="text-4xl font-bold text-orange-600">{summary.highestScore || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">Lowest: {summary.lowestScore || 0}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Exam</label>
              <select
                value={selectedExam}
                onChange={(e) => handleExamFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Exams</option>
                {exams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.subject} ({exam.questionCount} questions, {exam.marksPerQuestion} marks/Q)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by student name, roll number, or subject..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-end">
             
              <button
                onClick={selectedExam ? () => handleExamFilter(selectedExam) : fetchAllResults}
                className="ml-2 p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FiRefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading results...</p>
            </div>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
            <FiAlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              No Results Available
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {selectedExam 
                ? "No students have submitted this exam yet."
                : `There are currently no student results recorded in the ${adminDepartment} department.`}
              <br /><br />
              Results will appear here once students complete exams.
            </p>
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
                        Performance
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedResults.map((result, index) => (
                      <tr key={result._id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {result.student?.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <FiUser className="w-3 h-3 text-gray-400" />
                                <div className="text-sm font-medium text-gray-900">
                                  {result.student?.name || 'Unknown Student'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <FiHash className="w-3 h-3 text-gray-400" />
                                <div className="text-xs text-gray-500">
                                  Roll: {result.student?.rollNumber || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {result.exam?.subject || 'Unknown Subject'}
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreBg(result.percentage)} ${getScoreColor(result.percentage)}`}>
                            {result.percentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getGradeColor(result.grade)}`}>
                            {result.grade || 'F'}
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
                            {result.wrongCount || 0} wrong · {result.skippedCount || 0} skipped
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredResults.length)} of {filteredResults.length} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentScores;