import React, { useState } from "react";
import { 
  Users, 
  Activity, 
  CheckCircle, 
  AlertCircle,
  Building2,
  Shield,
  Bell,
  TrendingUp,
  Calendar,
  Clock,
  Award,
  BookOpen,
  UserCheck,
  UserX,
  Eye
} from "lucide-react";

const DashboardContent = () => {
  const [dateRange, setDateRange] = useState("today");

  const statsData = {
    totalAdmins: 24,
    totalStudents: 1250,
    activeExams: 8,
    completedExams: 156,
    totalDepartments: 6,
    systemUptime: "99.9%",
    activeUsers: 342,
    pendingApprovals: 3,
    totalQuestions: 12500,
    avgAttendance: "94%"
  };

  const recentActivities = [
    { id: 1, admin: "John Doe", action: "Created new exam", department: "Science", time: "5 min ago", status: "success", details: "Physics Mid-term Exam" },
    { id: 2, admin: "Jane Smith", action: "Added 50 students", department: "Commerce", time: "15 min ago", status: "success", details: "Bulk upload via CSV" },
    { id: 3, admin: "Mike Johnson", action: "Modified question bank", department: "Arts", time: "1 hour ago", status: "warning", details: "Updated 25 questions" },
    { id: 4, admin: "Sarah Wilson", action: "Deleted exam", department: "Science", time: "2 hours ago", status: "error", details: "Chemistry Quiz" },
    { id: 5, admin: "Tom Brown", action: "Updated student profile", department: "Commerce", time: "3 hours ago", status: "success", details: "Batch update" },
  ];

  const departmentStats = [
    { name: "Science", students: 450, exams: 45, passRate: 89, avgScore: 78.5 },
    { name: "Commerce", students: 380, exams: 32, passRate: 84, avgScore: 75.2 },
    { name: "Arts", students: 290, exams: 28, passRate: 91, avgScore: 82.3 },
    { name: "Engineering", students: 130, exams: 15, passRate: 88, avgScore: 76.8 },
  ];

  const upcomingExams = [
    { id: 1, name: "Physics Final", department: "Science", date: "2024-02-15", time: "10:00 AM", students: 120, duration: "2 hours" },
    { id: 2, name: "Accounts Exam", department: "Commerce", date: "2024-02-16", time: "2:00 PM", students: 95, duration: "1.5 hours" },
    { id: 3, name: "Literature Test", department: "Arts", date: "2024-02-17", time: "11:00 AM", students: 80, duration: "2 hours" },
  ];

  const StatCard = ({ icon: Icon, label, value, color, subValue, trend }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {subValue && (
            <div className="flex items-center mt-2">
              <span className="text-xs text-green-600 font-medium">{subValue}</span>
              {trend && <TrendingUp className="w-3 h-3 text-green-500 ml-1" />}
            </div>
          )}
        </div>
        <div className={`p-3 ${color} rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Welcome back, Super Admin. Here's what's happening today.</p>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            className="border rounded-lg px-3 py-2 text-sm bg-white"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <button className="p-2 hover:bg-gray-100 rounded-full relative">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center space-x-3 border-l pl-4">
            <img 
              src={`https://ui-avatars.com/api/?name=Super+Admin&background=0D8F81&color=fff&size=40`} 
              alt="Profile" 
              className="w-10 h-10 rounded-full ring-2 ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium">Super Admin</p>
              <p className="text-xs text-gray-500">admin@examportal.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Admins" value={statsData.totalAdmins} color="bg-blue-500" subValue="+3 this month" trend />
        <StatCard icon={UserCheck} label="Total Students" value={statsData.totalStudents} color="bg-green-500" subValue="+45 this week" trend />
        <StatCard icon={Activity} label="Active Exams" value={statsData.activeExams} color="bg-purple-500" subValue="8 in progress" />
        <StatCard icon={CheckCircle} label="Completed Exams" value={statsData.completedExams} color="bg-yellow-500" subValue="+12 this week" trend />
        <StatCard icon={Building2} label="Departments" value={statsData.totalDepartments} color="bg-indigo-500" subValue="All active" />
        <StatCard icon={Shield} label="System Uptime" value={statsData.systemUptime} color="bg-green-600" subValue="99.9% reliable" />
        <StatCard icon={Users} label="Active Users" value={statsData.activeUsers} color="bg-orange-500" subValue="Currently online" />
        <StatCard icon={AlertCircle} label="Pending Approvals" value={statsData.pendingApprovals} color="bg-red-500" subValue="Action required" />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Department Performance</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700">View All →</button>
          </div>
          <div className="space-y-4">
            {departmentStats.map((dept, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{dept.name}</span>
                    <span className="text-sm text-gray-600">{dept.students} Students</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Pass Rate</span>
                        <span>{dept.passRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${dept.passRate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-blue-600">
                      {dept.avgScore}% avg
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                <div className={`mt-1 w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' : 
                  activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.admin}</span> {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.details}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.department} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            View All Activities
          </button>
        </div>
      </div>

      {/* Upcoming Exams */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Upcoming Exams</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700">Schedule New Exam →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingExams.map((exam) => (
            <div key={exam.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{exam.name}</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {exam.department}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{exam.date} at {exam.time}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{exam.students} Students</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>{exam.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        <button className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all">
          <UserCheck className="w-6 h-6 mb-2" />
          <p className="font-medium">Add New Admin</p>
          <p className="text-xs opacity-90 mt-1">Create admin account</p>
        </button>
        <button className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all">
          <BookOpen className="w-6 h-6 mb-2" />
          <p className="font-medium">Create Exam</p>
          <p className="text-xs opacity-90 mt-1">Schedule new exam</p>
        </button>
        <button className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all">
          <Users className="w-6 h-6 mb-2" />
          <p className="font-medium">Bulk Upload</p>
          <p className="text-xs opacity-90 mt-1">Add students via CSV</p>
        </button>
        <button className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:shadow-lg transition-all">
          <Award className="w-6 h-6 mb-2" />
          <p className="font-medium">Generate Report</p>
          <p className="text-xs opacity-90 mt-1">Export analytics</p>
        </button>
      </div>
    </div>
  );
};

export default DashboardContent;