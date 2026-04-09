import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  FileText, 
  Building2, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  GraduationCap,
  UserCog,
  Shield,
  Menu,
  BookOpen,
  TrendingUp,
  Award
} from "lucide-react";

const Sidebar = ({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuItems = [
    // { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/superadmin/dashboard" },
    { id: "admins", label: "Admin Management", icon: UserCog, path: "/superadmin/admins" },
    { id: "students", label: "Student Counts", icon: GraduationCap, path: "/superadmin/students" },
    { id: "departments", label: "Department Results", icon: Building2, path: "/superadmin/departments" },
  ];

  const handleNavigation = (item) => {
    setActiveTab(item.id);
    if (item.path) {
      navigate(item.path);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear local storage
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("user");
      localStorage.removeItem("adminDepartment");
      localStorage.removeItem("studentName");
      localStorage.removeItem("studentId");
      
      // Navigate to login
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = user.fullName || user.name || "Super Admin";
  const userEmail = user.email || "admin@examportal.com";
  const userRole = user.role || "Super Admin";

  return (
    <div 
      className={`${
        sidebarOpen ? 'w-72' : 'w-20'
      } bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transition-all duration-300 min-h-screen shadow-2xl fixed left-0 top-0 z-50 flex flex-col`}
    >
      {/* Logo Section */}
      <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
        {sidebarOpen ? (
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-blue-200 bg-clip-text text-transparent">
                ExamPortal
              </span>
              <p className="text-xs text-gray-400 mt-0.5">Super Admin Panel</p>
            </div>
          </div>
        ) : (
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mx-auto shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
        )}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-105"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || location.pathname === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={`w-full flex items-center ${
                sidebarOpen ? 'space-x-3 px-4' : 'justify-center px-2'
              } py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${sidebarOpen ? '' : 'mx-auto'} ${isActive ? 'text-white' : ''}`} />
              {sidebarOpen && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {!sidebarOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {item.label}
                </div>
              )}
              {isActive && (
                <div className="absolute right-0 w-1 h-8 bg-white rounded-l-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-700/50">
      

        {/* Logout Button */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center ${
              sidebarOpen ? 'space-x-3 px-4' : 'justify-center'
            } py-3 rounded-xl text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group relative ${
              isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoggingOut ? (
              <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <LogOut className={`w-5 h-5 ${sidebarOpen ? '' : 'mx-auto'}`} />
            )}
            {sidebarOpen && (
              <span className="text-sm font-medium">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            )}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Logout
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;