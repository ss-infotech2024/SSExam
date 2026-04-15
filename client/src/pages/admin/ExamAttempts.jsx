// components/admin/ExamAttempts.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiArrowLeft, FiUsers, FiAward, FiTrendingUp, FiStar,
  FiAlertCircle, FiRefreshCw, FiCheckCircle, FiXCircle,
  FiClock, FiCalendar, FiUser, FiHash, FiTrash2, FiUserCheck, FiUserX
} from "react-icons/fi";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://onlineexamportal-uvvx.onrender.com/api",
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const ExamAttempts = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(null);
  const [activeTab, setActiveTab] = useState("attended"); // "attended" or "not-attended"

  useEffect(() => {
    if (id && id !== "undefined") {
      fetchAttendees();
    } else {
      setError("Invalid exam ID");
      setLoading(false);
    }
  }, [id]);

  const fetchAttendees = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/admin/exams/${id}/attendees`);
      console.log("Attendees API Response:", response.data);
      setData(response.data);
    } catch (err) {
      console.error("Error fetching attendees:", err);
      setError(err.response?.data?.message || "Failed to load student attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAttempt = async (studentId, studentName) => {
    if (!window.confirm(`Reset attempt for ${studentName}?`)) return;

    setResetting(studentId);
    try {
      await api.delete(`/admin/exams/${id}/attempts/${studentId}/reschedule`);
      alert(`Attempt reset successfully for ${studentName}`);
      fetchAttendees(); // Refresh data
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset attempt");
    } finally {
      setResetting(null);
    }
  };

  const getScoreColor = (percentage) => {
    if (!percentage || percentage === 0) return "text-gray-500";
    if (percentage >= 70) return "text-green-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (percentage) => {
    if (!percentage || percentage === 0) return "bg-gray-100";
    if (percentage >= 70) return "bg-green-100";
    if (percentage >= 40) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student attendance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Error</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={() => navigate("/admin/exams")}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Exams
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { exam, summary, attendedStudents = [], notAttendedStudents = [] } = data;

  const displayedStudents = activeTab === "attended" ? attendedStudents : notAttendedStudents;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/admin/exams")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-4 h-4" /> Back to Exams
          </button>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{exam.subject}</h1>
                <p className="text-gray-600 mt-1">
                  {exam.department} Department • Attendance Report
                </p>
              </div>
              <button
                onClick={fetchAttendees}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
              >
                <FiRefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {/* Exam Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-6 border-t">
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-lg font-semibold">{exam.duration} min</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Questions</p>
                <p className="text-lg font-semibold">{exam.totalQuestions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Marks</p>
                <p className="text-lg font-semibold">{exam.totalMarks}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-lg font-semibold capitalize">{exam.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <FiUsers className="w-8 h-8 text-blue-600 mb-3" />
            <div className="text-3xl font-bold">{summary.totalStudents}</div>
            <p className="text-sm text-gray-600">Total Students</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <FiUserCheck className="w-8 h-8 text-green-600 mb-3" />
            <div className="text-3xl font-bold text-green-600">{summary.attendedCount}</div>
            <p className="text-sm text-gray-600">Attended</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <FiUserX className="w-8 h-8 text-red-600 mb-3" />
            <div className="text-3xl font-bold text-red-600">{summary.notAttendedCount}</div>
            <p className="text-sm text-gray-600">Not Attended</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <FiTrendingUp className="w-8 h-8 text-purple-600 mb-3" />
            <div className="text-3xl font-bold">{summary.attendanceRate}%</div>
            <p className="text-sm text-gray-600">Attendance Rate</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("attended")}
            className={`px-6 py-3 font-medium rounded-t-xl transition-all ${
              activeTab === "attended" 
                ? "bg-white shadow-sm border border-b-white text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Attended ({attendedStudents.length})
          </button>
          <button
            onClick={() => setActiveTab("not-attended")}
            className={`px-6 py-3 font-medium rounded-t-xl transition-all ${
              activeTab === "not-attended" 
                ? "bg-white shadow-sm border border-b-white text-red-600" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Not Attended ({notAttendedStudents.length})
          </button>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-semibold">
              {activeTab === "attended" ? "Students Who Attended" : "Students Who Did Not Attend"}
            </h2>
          </div>

          {displayedStudents.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              No students in this category
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                    {activeTab === "attended" && (
                      <>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {activeTab === "attended" && (
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                            {student.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{student.fullName}</div>
                            <div className="text-xs text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600">{student.rollNumber}</td>

                      {activeTab === "attended" && (
                        <>
                          <td className="px-6 py-5 font-semibold">
                            {student.score} / {student.totalMarks}
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getScoreBg(student.percentage)} ${getScoreColor(student.percentage)}`}>
                              {student.percentage}%
                            </span>
                          </td>
                          <td className="px-6 py-5 font-bold">{student.grade}</td>
                          <td className="px-6 py-5 text-xs">
                            <div>{student.correctCount} correct</div>
                            <div className="text-red-600">{student.wrongCount} wrong</div>
                            <div className="text-gray-500">{student.skippedCount} skipped</div>
                          </td>
                        </>
                      )}

                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          student.status === 'attended' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {student.status === 'attended' ? 'Attended' : 'Not Attended'}
                        </span>
                      </td>

                      {activeTab === "attended" && (
                        <td className="px-6 py-5">
                          <button
                            onClick={() => handleResetAttempt(student._id, student.fullName)}
                            disabled={resetting === student._id}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg disabled:opacity-50"
                          >
                            {resetting === student._id ? (
                              <FiRefreshCw className="animate-spin" />
                            ) : (
                              <FiTrash2 />
                            )}
                            Reset
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamAttempts;