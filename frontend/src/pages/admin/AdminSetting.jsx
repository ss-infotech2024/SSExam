import React, { useState, useEffect } from "react";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiSave, FiUsers } from "react-icons/fi";  // ← added FiUsers

const AdminSetting = () => {
  const [adminDetails, setAdminDetails] = useState({
    email: "",
    department: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("adminEmail") || "admin@example.com";
    const department = localStorage.getItem("adminDepartment") || "Not assigned";

    setAdminDetails({ email, department });
  }, []);

  const handleChangePassword = (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setPasswordError("Both fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setSuccessMessage("Password updated successfully! (demo)");
    setPasswordError("");
    setNewPassword("");
    setConfirmPassword("");

    setTimeout(() => setSuccessMessage(""), 4000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Admin Settings</h1>
        <p className="text-gray-600 mb-10">Manage your account and security</p>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow border overflow-hidden mb-10">
          <div className="bg-indigo-600 text-white px-6 py-5">
            <h2 className="text-xl font-semibold">Profile Information</h2>
          </div>

          <div className="p-6 space-y-8">
            {/* Email */}
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <FiMail className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Admin Email / ID</label>
                <p className="text-xl font-medium text-gray-900 mt-1">{adminDetails.email}</p>
              </div>
            </div>

            {/* Department */}
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FiUsers className="w-7 h-7 text-blue-600" />  {/* ← now imported */}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Department</label>
                <p className="text-xl font-medium text-gray-900 mt-1">{adminDetails.department}</p>
              </div>
            </div>

            {/* Password */}
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <FiLock className="w-7 h-7 text-amber-600" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-500">Current Password</label>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xl font-medium">{showPassword ? "••••••••••••" : "••••••••"}</p>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="bg-amber-600 text-white px-6 py-5">
            <h2 className="text-xl font-semibold">Change Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {passwordError && (
              <p className="text-red-600 bg-red-50 p-3 rounded-lg">{passwordError}</p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <FiSave /> Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSetting;