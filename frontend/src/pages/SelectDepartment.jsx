import React from "react";
import { useNavigate } from "react-router-dom";

const SelectDepartment = () => {
  const navigate = useNavigate();

  const departments = [
    {
      name: "Super Admin",
      role: "superadmin",
      path: "/superadmin/login",
      color: "from-purple-500 to-indigo-600",
    },
    {
      name: "Admin",
      role: "admin",
      path: "/admin/login",
      color: "from-blue-500 to-cyan-600",
    },
    {
      name: "Student",
      role: "student",
      path: "/student/login",
      color: "from-green-500 to-emerald-600",
    },
  ];

  const handleSelect = (path) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-center mb-10 text-gray-800">
          Select Your Department
        </h1>

        <div className="grid md:grid-cols-3 gap-8">
          {departments.map((dept) => (
            <div
              key={dept.role}
              onClick={() => handleSelect(dept.path)}
              className={`cursor-pointer bg-gradient-to-r ${dept.color} text-white rounded-2xl p-8 shadow-lg hover:scale-105 transform transition duration-300`}
            >
              <h2 className="text-2xl font-semibold mb-3">
                {dept.name}
              </h2>
              <p className="text-sm opacity-90">
                Click to login as {dept.name}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => navigate("/")}
            className="text-gray-600 hover:text-gray-900 underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectDepartment;
