import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../store/slices/authSlice";
import API from "../services/api";
import { Eye, EyeOff, GraduationCap, Shield, Crown, Loader2 } from "lucide-react";

const ROLES = [
  {
    key:   "student",
    label: "Student",
    icon:  GraduationCap,
    grad:  "from-emerald-600 to-teal-600",
    ring:  "focus:ring-emerald-500",
    light: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    key:   "admin",
    label: "Admin",
    icon:  Shield,
    grad:  "from-blue-600 to-indigo-600",
    ring:  "focus:ring-blue-500",
    light: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key:   "superadmin",
    label: "Super Admin",
    icon:  Crown,
    grad:  "from-purple-600 to-violet-600",
    ring:  "focus:ring-purple-500",
    light: "bg-purple-50 border-purple-200 text-purple-700",
  },
];

const Input = ({ label, type = "text", value, onChange, placeholder, ring, disabled }) => {
  const [show, setShow] = useState(false);
  const isPwd = type === "password";
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={isPwd ? (show ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required
          className={`w-full border border-gray-200 bg-gray-50 px-4 py-3 rounded-xl text-sm
            focus:outline-none focus:ring-2 focus:bg-white transition-all disabled:opacity-50
            ${ring} ${isPwd ? "pr-11" : ""}`}
        />
        {isPwd && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [role,    setRole]    = useState("student");
  const [email,   setEmail]   = useState("");
  const [password,setPassword]= useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const active = ROLES.find(r => r.key === role);

  const switchRole = (r) => {
    setRole(r); setError("");
    setEmail(""); setPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);

    try {
      // ── STUDENT LOGIN ───────────────────────────────────────────────────────
      if (role === "student") {
        const res = await API.post("/auth/student/login", {
          email:      email.trim(),
          password,
        });
        const { token, user } = res.data;

        // Store extra student fields for sidebar display
        localStorage.setItem("studentName", user.fullName   || "");
        localStorage.setItem("studentId",   user.studentId  || "");
        localStorage.setItem("studentDept", user.department || "");

        dispatch(loginSuccess({ token, role: "student", user }));
        navigate("/student/dashboard");
        return;
      }

      // ── ADMIN LOGIN ─────────────────────────────────────────────────────────
      if (role === "admin") {
        const res = await API.post("/auth/admin/login", {
          email: email.trim(), password,
        });
        const { token, user } = res.data;

        if (!user?.department) {
          setError("No department assigned to your account. Contact superadmin.");
          setLoading(false); return;
        }

        dispatch(loginSuccess({ token, role: "admin", user }));
        navigate("/admin/dashboard");
        return;
      }

      // ── SUPERADMIN LOGIN ────────────────────────────────────────────────────
      if (role === "superadmin") {
        const res = await API.post("/auth/login", {
          email: email.trim(), password,
        });
        dispatch(loginSuccess({ token: res.data.token, role: "superadmin", user: res.data.user }));
        navigate("/superadmin/admins");
        return;
      }

    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = {
    student:    "Sign in as Student",
    admin:      "Sign in as Admin",
    superadmin: "Sign in as Super Admin",
  }[role];

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div className={`hidden lg:flex w-[42%] bg-gradient-to-br ${active.grad}
        flex-col items-center justify-center p-14 relative overflow-hidden`}>
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-24 -right-16 w-96 h-96 bg-white/5 rounded-full" />

        <div className="relative z-10 text-center text-white max-w-sm">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center
            mx-auto mb-6 backdrop-blur-sm shadow-xl">
            <active.icon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black mb-3">SS Exam Portal</h2>
          <p className="text-white/70 text-sm leading-relaxed mb-8">
            A secure, proctored examination platform for students and educators.
          </p>
          <div className="flex flex-col gap-3 text-left">
            {[
              "AI-powered proctoring system",
              "Real-time exam monitoring",
              "Department-scoped access control",
              "Instant result analytics",
            ].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm text-white/80">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold">✓</span>
                </div>
                {f}
              </div>
            ))}
          </div>

          {/* Role-specific note */}
          <div className="mt-10 p-4 bg-white/10 rounded-2xl backdrop-blur-sm text-left border border-white/20">
            {role === "student" && (
              <>
                <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-1">Student Access</p>
                <p className="text-sm text-white/80">Your account is created by your department admin. Use the credentials they provided.</p>
              </>
            )}
            {role === "admin" && (
              <>
                <p className="text-xs font-bold text-white/60 uppercase tracking-wide mb-1">Admin Access</p>
                <p className="text-sm text-white/80">You manage students and exams within your assigned department only.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className={`w-14 h-14 bg-gradient-to-br ${active.grad} rounded-2xl
              flex items-center justify-center mx-auto mb-3 shadow-lg`}>
              <active.icon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-black text-gray-900">SS Exam Portal</h1>
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-7">Sign in to continue to your portal</p>

          {/* Role tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 gap-1">
            {ROLES.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" onClick={() => switchRole(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                  text-xs font-bold transition-all duration-200
                  ${role === key ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600"}`}>
                <Icon className="w-3.5 h-3.5" />
                {key === "superadmin" ? "Super" : label}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3
              text-sm text-red-700 flex items-start gap-2">
              <span className="shrink-0">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <Input label="Email Address" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" ring={active.ring} disabled={loading} />

            {/* Password */}
            <Input label="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" ring={active.ring} disabled={loading} />

            {/* Info notes */}
            {role === "student" && (
              <div className={`p-3 border rounded-xl text-xs flex items-start gap-2 ${active.light}`}>
                <span className="shrink-0 mt-0.5">ℹ️</span>
                Your account is created by your department admin. Contact them if you don't have login credentials.
              </div>
            )}
            {role === "admin" && (
              <div className={`p-3 border rounded-xl text-xs flex items-start gap-2 ${active.light}`}>
                <span className="shrink-0 mt-0.5">ℹ️</span>
                Your department is assigned by the superadmin. You can only manage students in your department.
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className={`w-full bg-gradient-to-r ${active.grad} text-white py-3 rounded-xl
                font-bold text-sm shadow-md hover:opacity-90 transition-all
                disabled:opacity-50 flex items-center justify-center gap-2 mt-2`}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : submitLabel
              }
            </button>
          </form>

          <p className="text-center text-xs text-gray-300 mt-10">
              · SS Exam Portal · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;