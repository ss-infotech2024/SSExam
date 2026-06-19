// pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Users, FileText, Award, Monitor, TrendingUp, Star,
  PlusCircle, Eye, Clock, Calendar, RefreshCw, AlertCircle,
} from "lucide-react";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminDepartment, setAdminDepartment] = useState("CS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalStudents: 1,
    totalExams: 1,
    averageScore: 100,
    activeExams: 1,
    totalResults: 1,
    passRate: 100,
  });
  const [recentExams, setRecentExams] = useState([]);
  const [recentResults, setRecentResults] = useState([]);

  useEffect(() => {
    const dept = localStorage.getItem("adminDepartment") || "CS";
    setAdminDepartment(dept);
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [studentsRes, examsRes, resultsRes] = await Promise.all([
        api.get("/admin/students"),
        api.get("/admin/exams"),
        api.get("/admin/results"),
      ]);

      const students = studentsRes.data.students || [];
      const exams = examsRes.data.exams || [];
      const results = resultsRes.data.results || [];

      // Stats
      const totalStudents = students.length;
      const totalExams = exams.length;
      const activeExams = exams.filter((e) => e.status === "active").length;
      const totalResults = results.length;

      let totalScore = 0;
      results.forEach(r => totalScore += r.percentage || 0);
      const averageScore = totalResults > 0 ? Math.round(totalScore / totalResults) : 0;
      const passRate = totalResults > 0 
        ? Math.round((results.filter(r => (r.percentage || 0) >= 40).length / totalResults) * 100) 
        : 0;

      setStats({
        totalStudents,
        totalExams,
        averageScore,
        activeExams,
        totalResults,
        passRate,
      });

      // Recent Exams (latest 3)
      const recentE = [...exams]
        .sort((a, b) => new Date(b.createdAt || b.startTime) - new Date(a.createdAt || a.startTime))
        .slice(0, 3);
      setRecentExams(recentE);

      // Recent Results (latest 3)
      const recentR = [...results]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 3);
      setRecentResults(recentR);

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-600", change: "+12%" },
    { title: "Total Exams", value: stats.totalExams, icon: FileText, color: "text-green-600", change: "+8%" },
    { title: "Average Score", value: `${stats.averageScore}%`, icon: Award, color: "text-amber-600", change: "Excellent" },
    { title: "Active Exams", value: stats.activeExams, icon: Monitor, color: "text-purple-600", change: "Live Now" },
    { title: "Total Results", value: stats.totalResults, icon: TrendingUp, color: "text-indigo-600", change: "Submitted" },
    { title: "Pass Rate", value: `${stats.passRate}%`, icon: Star, color: "text-emerald-600", change: "Good" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Welcome, Admin</h1>
            <p className="text-xl text-gray-600 mt-1">
              Managing <span className="font-semibold text-blue-600">{adminDepartment}</span> Department
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
          {statCards.map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <span className="text-xs font-medium text-gray-400">{stat.change}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.title}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Exams */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Recent Exams
              </h2>
              <button 
                onClick={() => navigate("/admin/exams")}
                className="text-blue-600 text-sm hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {recentExams.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No exams yet</p>
              ) : (
                recentExams.map((exam) => (
                  <div key={exam._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-semibold text-gray-900">{exam.subject}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                        <span>{exam.duration} min</span>
                        <span>{exam.questions?.length || 0} Qs</span>
                        <span>{new Date(exam.startTime).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Recent Results
              </h2>
              <button 
                onClick={() => navigate("/admin/student-scores")}
                className="text-blue-600 text-sm hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {recentResults.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No results yet</p>
              ) : (
                recentResults.map((result) => (
                  <div key={result._id} className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {result.studentName || result.student?.name || "tejas khope"}
                          <span className="text-emerald-600 font-bold">{result.grade}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-0.5">{result.examName || result.exam?.subject || "sdsd"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">
                          {result.score}/{result.totalMarks}
                        </div>
                        <div className="text-xs text-gray-500">{result.percentage}%</div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600">
                      {result.correctCount} correct • {result.wrongCount} wrong
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString('en-IN') : "07/04/2026"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;