import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getRegistrationQR,
  registerStudentFromQR,
} from "../../services/api";

const StudentRegistration = () => {
  const { token } = useParams();

  const [validQR, setValidQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    college: "",
    password: "",
    confirmPassword: "",
    rollNumber: "",
  });

  // ==========================================
  // VERIFY QR
  // ==========================================

  useEffect(() => {
    const verifyQR = async () => {
      try {
        const response = await getRegistrationQR(token);

        if (response.data.success) {
          setValidQR(true);
        }
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Invalid registration QR"
        );
      } finally {
        setLoading(false);
      }
    };

    verifyQR();
  }, [token]);

  // ==========================================
  // INPUT
  // ==========================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================
  // PASSWORD VALIDATION
  // ==========================================

  const passwordChecks = {
    length: form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
  };

  const isStrongPassword =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.number &&
    passwordChecks.special;

  const passwordsMatch =
    form.password.length > 0 &&
    form.password === form.confirmPassword;

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await registerStudentFromQR(token, {
        fullName: form.fullName,
        email: form.email,
        mobile: form.mobile,
        college: form.college,
        password: form.password,
        rollNumber: form.rollNumber,
      });

      if (response.data.success) {
        setSuccess(response.data.student);
      }
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // ==========================================
  // INVALID QR
  // ==========================================

  if (!validQR) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">

        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">

          <h1 className="text-xl font-bold text-red-600">
            Invalid QR Code
          </h1>

          <p className="mt-3 text-gray-500">
            This registration QR is invalid or expired.
          </p>

        </div>

      </div>
    );
  }

  // ==========================================
  // SUCCESS
  // ==========================================

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">

        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">

          <div className="mb-4 text-5xl">
            ✅
          </div>

          <h1 className="text-2xl font-bold text-green-600">
            Registration Successful
          </h1>

          <p className="mt-4 text-gray-500">
            Your Student ID is:
          </p>

          <div className="mt-2 rounded-lg bg-gray-100 p-4 text-2xl font-bold">
            {success.studentId}
          </div>

          <p className="mt-4 text-gray-600">
            {success.name}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {success.email}
          </p>

        </div>

      </div>
    );
  }

  // ==========================================
  // FORM
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-50 p-5">

      <div className="mx-auto max-w-lg">

        <div className="rounded-xl bg-white p-6 shadow">

          <h1 className="text-2xl font-bold text-gray-800">
            Student Registration
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Fill your details to create your student account
          </p>


          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >

           <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={form.fullName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border p-3"
            />


            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border p-3"
            />


            <input
              type="tel"
              name="mobile"
              placeholder="Mobile Number"
              value={form.mobile}
              onChange={handleChange}
              required
              className="w-full rounded-lg border p-3"
            />


            <input
              type="text"
              name="college"
              placeholder="College Name"
              value={form.college}
              onChange={handleChange}
              className="w-full rounded-lg border p-3"
            />

            {/* ==========================================
                  PASSWORD
              ========================================== */}

              <div>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border p-3"
                />

                {/* Password Checklist */}

                {form.password.length > 0 && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-4">

                    <p className="mb-3 text-sm font-semibold text-gray-700">
                      Password must contain:
                    </p>

                    <div className="space-y-2 text-sm">

                      <div
                        className={
                          passwordChecks.length
                            ? "text-green-600"
                            : "text-gray-500"
                        }
                      >
                        {passwordChecks.length ? "✓" : "○"} At least 8 characters
                      </div>

                      <div
                        className={
                          passwordChecks.uppercase
                            ? "text-green-600"
                            : "text-gray-500"
                        }
                      >
                        {passwordChecks.uppercase ? "✓" : "○"} One uppercase letter (A-Z)
                      </div>

                      <div
                        className={
                          passwordChecks.lowercase
                            ? "text-green-600"
                            : "text-gray-500"
                        }
                      >
                        {passwordChecks.lowercase ? "✓" : "○"} One lowercase letter (a-z)
                      </div>

                      <div
                        className={
                          passwordChecks.number
                            ? "text-green-600"
                            : "text-gray-500"
                        }
                      >
                        {passwordChecks.number ? "✓" : "○"} One number (0-9)
                      </div>

                      <div
                        className={
                          passwordChecks.special
                            ? "text-green-600"
                            : "text-gray-500"
                        }
                      >
                        {passwordChecks.special ? "✓" : "○"} One special character (!@#$%)
                      </div>

                    </div>

                  </div>
                )}
              </div>

              {/* ==========================================
                    CONFIRM PASSWORD
                ========================================== */}

                <div>

                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    className={`w-full rounded-lg border p-3 ${
                      form.confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-green-500"
                          : "border-red-500"
                        : "border-gray-300"
                    }`}
                  />

                  {form.confirmPassword.length > 0 && (
                    <p
                      className={`mt-2 text-sm ${
                        passwordsMatch
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {passwordsMatch
                        ? "✓ Passwords match"
                        : "✗ Passwords do not match"}
                    </p>
                  )}

                </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
              <button
                type="submit"
                disabled={
                  submitting ||
                  !isStrongPassword ||
                  !passwordsMatch
                }
                className="w-full rounded-lg bg-blue-600 p-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
              {submitting
                ? "Creating Student..."
                : "Register"}
            </button>

          </form>

        </div>

      </div>

    </div>
  );
};

export default StudentRegistration;