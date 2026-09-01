import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUserPlus,
  FiUsers,
  FiBarChart2,
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiSettings,
  FiList,
} from "react-icons/fi";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { path: "/admin/dashboard", name: "Dashboard", icon: <FiHome /> },
    { path: "/admin/add-student", name: "Add Student", icon: <FiUserPlus /> },
    { path: "/admin/view-students", name: "View Students", icon: <FiUsers /> },
    { path: "/admin/student-scores", name: "Scores", icon: <FiBarChart2 /> },
    { path: "/admin/create-exam", name: "Create Exam", icon: <FiFileText /> },
    { path: "/admin/get-exams", name: "Exam List", icon: <FiList /> },
    //  { path: "/admin/exams/:id/attempts", name: "Exam attempts", icon: <FiList /> },
  ];

  const bottomItems = [
    // { path: "/admin/setting", name: "Settings", icon: <FiSettings /> },
    { path: "/logout", name: "Logout", icon: <FiLogOut /> },
  ];

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo-container">
          <span className="logo-icon">📚</span>
          {!collapsed && <h3 className="logo-text">ExamPortal</h3>}
        </div>
        <button 
          className="collapse-btn" 
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="user-info">
          <div className="user-avatar">A</div>
          <div className="user-details">
            <p className="user-name">Admin User</p>
            <p className="user-role">Administrator</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && <p className="nav-section-title">MAIN MENU</p>}
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              title={collapsed ? item.name : ""}
            >
              <span className="icon">{item.icon}</span>
              {!collapsed && <span className="label">{item.name}</span>}
            </NavLink>
          ))}
        </div>

        <div className="nav-section">
          {!collapsed && <p className="nav-section-title">ACCOUNT</p>}
          {bottomItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              title={collapsed ? item.name : ""}
            >
              <span className="icon">{item.icon}</span>
              {!collapsed && <span className="label">{item.name}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <p className="version">Version 2.0.0</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;