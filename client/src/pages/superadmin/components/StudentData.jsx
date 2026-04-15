// pages/admin/StudentData.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Search, Download, Eye, Mail, Phone, GraduationCap, Calendar,
  TrendingUp, TrendingDown, X, UserCheck, UserX, BarChart2, Users
} from "lucide-react";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://onlineexamportal-uvvx.onrender.com/api",
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const StudentData = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentDetails, setDepartmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("studentCount");

  // Fetch department-wise stats
  const fetchDepartmentStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/superadmin/department-stats");
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error("Error fetching department stats:", err);
      alert("Failed to load department data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed results for a specific department
  const fetchDepartmentDetails = async (deptName) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/superadmin/department/${deptName}/results`);
      setDepartmentDetails(res.data);
      setSelectedDepartment(deptName);
    } catch (err) {
      console.error("Error fetching department details:", err);
      alert("Failed to load department details");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentStats();
  }, []);

  const filteredDepartments = departments
    .filter(dept => 
      dept.department.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "studentCount") return b.studentCount - a.studentCount;
      if (sortBy === "averageScore") return b.averageScore - a.averageScore;
      if (sortBy === "passRate") return b.passRate - a.passRate;
      return 0;
    });

  const StudentDetailModal = ({ deptData, onClose }) => {
    if (!deptData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div>
              <h2 className="text-2xl font-bold">{deptData.department} Department</h2>
              <p className="text-blue-100">Student Performance Overview</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-xl border">
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-3xl font-bold text-blue-600">{deptData.totalStudents}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border">
                <p className="text-sm text-gray-500">Total Exams</p>
                <p className="text-3xl font-bold">{deptData.totalExams}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border">
                <p className="text-sm text-gray-500">Total Attempts</p>
                <p className="text-3xl font-bold text-green-600">{deptData.totalAttempts}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border">
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-3xl font-bold text-amber-600">{deptData.averageScore || 0}%</p>
              </div>
            </div>

            {/* Results Table */}
            <h3 className="text-lg font-semibold mb-4">Student Exam Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Roll No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Exam</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Percentage</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Grade</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deptData.results?.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium">{result.student.fullName}</td>
                      <td className="px-4 py-4 font-mono text-sm">{result.student.rollNumber}</td>
                      <td className="px-4 py-4">{result.exam.subject}</td>
                      <td className="px-4 py-4 font-semibold">
                        {result.score} / {result.totalMarks}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`font-bold ${result.percentage >= 70 ? 'text-green-600' : result.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {result.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold">{result.grade}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(result.submittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Department-wise Student Data</h1>
          <p className="text-gray-500 mt-1">Overview of all departments and student performance</p>
        </div>
        <button 
          onClick={fetchDepartmentStats}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <BarChart2 className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-xl shadow-sm">
        <div className="flex-1 flex items-center border rounded-lg px-4 py-2.5">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search by department name..." 
            className="flex-1 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="border rounded-lg px-4 py-2.5 text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="studentCount">Sort by Student Count</option>
          <option value="averageScore">Sort by Average Score</option>
          <option value="passRate">Sort by Pass Rate</option>
        </select>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading departments...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => (
            <div 
              key={dept.department}
              onClick={() => fetchDepartmentDetails(dept.department)}
              className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {dept.department}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Department</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{dept.studentCount}</div>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
              </div>

              {/* <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold">{dept.totalExams}</p>
                  <p className="text-xs text-gray-500">Exams</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-600">{dept.averageScore}%</p>
                  <p className="text-xs text-gray-500">Avg Score</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-emerald-600">{dept.passRate}%</p>
                  <p className="text-xs text-gray-500">Pass Rate</p>
                </div>
              </div> */}
            </div>
          ))}
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedDepartment && departmentDetails && (
        <StudentDetailModal 
          deptData={departmentDetails} 
          onClose={() => {
            setSelectedDepartment(null);
            setDepartmentDetails(null);
          }} 
        />
      )}
    </div>
  );
};

export default StudentData;