// components/student/StudentLayout.jsx
// Shared layout wrapper with sidebar — used by Dashboard, Exams, Results pages.

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, BookOpen, LogOut,
  ChevronLeft, ChevronRight, Shield, Menu, X, User,
} from "lucide-react";

const NAV = [
  { path: "/student/dashboard", label: "Dashboard",  icon: LayoutDashboard },
  // { path: "/student/exams",     label: "My Exams",   icon: BookOpen         },
  { path: "/student/results",   label: "Results",    icon: ClipboardList    },
];

export const StudentLayout = ({ children }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  const studentName = localStorage.getItem("studentName") || "Student";
  const studentDept = localStorage.getItem("studentDept") || "";
  const studentId   = localStorage.getItem("studentId")   || "";

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  const SidebarContent = ({ mobile = false }) => (
    <aside className={`
      ${mobile ? "w-64" : collapsed ? "w-[70px]" : "w-64"}
      bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
      text-white flex flex-col h-full transition-all duration-300 shadow-2xl
    `}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {(!collapsed || mobile) && (
            <div>
              <p className="font-bold text-sm leading-tight">ExamPortal</p>
              <p className="text-[10px] text-slate-400">Student Panel</p>
            </div>
          )}
        </div>
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Student profile card */}
      {(!collapsed || mobile) && (
        <div className="mx-3 mt-4 mb-2 p-3 bg-slate-800/60 border border-slate-700/40 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
              flex items-center justify-center text-white font-bold text-sm shrink-0 shadow">
              {studentName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{studentName}</p>
              <p className="text-[11px] text-slate-400 truncate">ID: {studentId}</p>
              <span className="inline-block mt-0.5 text-[10px] bg-blue-600/30 text-blue-300
                px-2 py-0.5 rounded-full font-medium">{studentDept}</span>
            </div>
          </div>
        </div>
      )}

      {collapsed && !mobile && (
        <div className="flex justify-center mt-4 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
            flex items-center justify-center text-white font-bold text-sm shadow">
            {studentName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => { navigate(path); if (mobile) setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 group relative
                ${collapsed && !mobile ? "px-0 justify-center py-3" : "px-4 py-3"}
                ${active
                  ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {(!collapsed || mobile) && <span className="text-sm font-medium">{label}</span>}
              {active && (!collapsed || mobile) && (
                <div className="absolute right-0 w-1 h-6 bg-white/50 rounded-l-full" />
              )}
              {/* Tooltip when collapsed */}
              {collapsed && !mobile && (
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-700 text-white text-xs
                  rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap
                  transition-opacity z-50 shadow-xl">
                  {label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`p-3 border-t border-slate-700/60`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm
            text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group relative
            ${collapsed && !mobile ? "px-0 justify-center" : ""}`}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {(!collapsed || mobile) && <span className="font-medium">Logout</span>}
          {collapsed && !mobile && (
            <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-700 text-white text-xs
              rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="h-full"><SidebarContent mobile /></div>
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top navbar */}
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-gray-800">
                {NAV.find(n => n.path === location.pathname)?.label || "Student Portal"}
              </h2>
              <p className="text-xs text-gray-400">{studentDept} Department</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {studentName.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-gray-700 leading-tight">{studentName}</p>
              <p className="text-[10px] text-gray-400">#{studentId}</p>
            </div>
          </div>
        </header>

        {/* Children */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};