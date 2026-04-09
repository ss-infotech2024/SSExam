// pages/admin/DepartmentResults.jsx
import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Award, 
  BarChart3,
  Download,
  Search,
  Eye,
  Calendar,
  ChevronDown,
  X,
  Building2,
  UserCheck,
  UserX
} from "lucide-react";
import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://tgpexambackend.onrender.com/api",
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const DepartmentResults = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentDetails, setDepartmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("studentCount");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch department-wise stats from backend
  const fetchDepartmentStats = async () => {
    setLoading(true);
    try {
      const res = await api.get("/superadmin/department-stats");
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error("Error fetching department stats:", err);
      alert("Failed to load department statistics. Please try again.");
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
      alert(`Failed to load details for ${deptName} department`);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentStats();
  }, []);

  // Filter and sort departments
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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDepartments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);

  const DepartmentCard = ({ dept }) => {
    const passRateColor = dept.passRate >= 75 ? 'text-green-600' 
                        : dept.passRate >= 50 ? 'text-yellow-600' 
                        : 'text-red-600';

    return (
      <div 
        onClick={() => fetchDepartmentDetails(dept.department)}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              {dept.department}
            </h3>
            <p className="text-sm text-gray-500 mt-1">Department Performance</p>
          </div>
          <Building2 className="w-8 h-8 text-blue-500 opacity-80" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="text-xs text-gray-500">Students</p>
            <p className="text-2xl font-bold text-gray-800">{dept.studentCount}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="text-xs text-gray-500">Exams</p>
            <p className="text-2xl font-bold text-gray-800">{dept.totalExams}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Average Score</span>
              <span className="font-medium">{dept.averageScore}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(dept.averageScore, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pass Rate</span>
            <span className={`font-semibold ${passRateColor}`}>
              {dept.passRate}%
            </span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t flex justify-center">
          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm">
            <Eye className="w-4 h-4" />
            View Full Report
          </button>
        </div>
      </div>
    );
  };

  const DepartmentDetailModal = ({ deptData, onClose }) => {
    if (!deptData) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <div>
              <h2 className="text-2xl font-bold">{deptData.department} Department</h2>
              <p className="text-blue-100 mt-1">Detailed Performance Analysis</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-5 rounded-2xl">
                <p className="text-blue-600 text-sm">Total Students</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{deptData.totalStudents}</p>
              </div>
              <div className="bg-green-50 p-5 rounded-2xl">
                <p className="text-green-600 text-sm">Appeared</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{deptData.totalAttempts}</p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-2xl">
                <p className="text-emerald-600 text-sm">Average Score</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">{deptData.averageScore || 0}%</p>
              </div>
              <div className="bg-purple-50 p-5 rounded-2xl">
                <p className="text-purple-600 text-sm">Pass Rate</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">{deptData.passRate || 0}%</p>
              </div>
            </div>

            {/* Results Table */}
            <h3 className="font-semibold text-lg mb-4">Student Exam Results</h3>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Roll No.</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Exam</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Score</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Percentage</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Grade</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deptData.results?.map((result, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{result.student.fullName}</td>
                      <td className="px-6 py-4 font-mono text-sm">{result.student.rollNumber}</td>
                      <td className="px-6 py-4">{result.exam.subject}</td>
                      <td className="px-6 py-4 font-semibold">
                        {result.score} / {result.totalMarks}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${result.percentage >= 70 ? 'text-green-600' : result.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {result.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">{result.grade}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(result.submittedAt).toLocaleDateString('en-IN')}
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
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Results</h1>
          <p className="text-gray-500 mt-1">Comprehensive performance analysis across all departments</p>
        </div>
        <button 
          onClick={fetchDepartmentStats}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50"
        >
          <BarChart3 className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-5 rounded-2xl shadow-sm">
        <div className="flex-1 min-w-[280px] flex items-center border rounded-xl px-4 py-3">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search department..." 
            className="flex-1 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="border rounded-xl px-4 py-3 min-w-[200px]"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="studentCount">Sort by Students</option>
          <option value="averageScore">Sort by Avg Score</option>
          <option value="passRate">Sort by Pass Rate</option>
        </select>
      </div>

      {/* Department Cards */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : currentItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((dept) => (
            <DepartmentCard key={dept.department} dept={dept} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No departments found matching your search</p>
        </div>
      )}

      {/* Department Detail Modal */}
      {selectedDepartment && departmentDetails && (
        <DepartmentDetailModal 
          dept={departmentDetails} 
          onClose={() => {
            setSelectedDepartment(null);
            setDepartmentDetails(null);
          }} 
        />
      )}
    </div>
  );
};

export default DepartmentResults;