import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

import {
  scanStudentQR,
  getQRScanCount,
  getQRScans,
} from "../../services/api";

const QRScanner = () => {
  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const [examId, setExamId] = useState("");

  const [student, setStudent] = useState(null);

  const [isScanning, setIsScanning] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [counts, setCounts] = useState({
    totalScanned: 0,
    added: 0,
    duplicate: 0,
  });

  // =====================================
  // START SCANNER
  // =====================================

  const startScanner = async () => {
    if (!examId) {
      setError("Please select an exam first.");
      return;
    }

    setError("");
    setMessage("");

    try {
      const scanner = new Html5Qrcode("qr-reader");

      scannerRef.current = scanner;

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },

        async (decodedText) => {
          if (processingRef.current) {
            return;
          }

          processingRef.current = true;

          await processQRCode(decodedText);

          setTimeout(() => {
            processingRef.current = false;
          }, 1500);
        },

        () => {
          // QR not detected
        }
      );

      setIsScanning(true);
    } catch (error) {
      console.error(error);

      setError(
        "Camera start nahi ho paya. Please camera permission allow karein."
      );
    }
  };

  // =====================================
  // STOP SCANNER
  // =====================================

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const scanner = scannerRef.current;

        await scanner.stop();

        scanner.clear();

        scannerRef.current = null;
      }
    } catch (error) {
      console.log("Scanner stop error:", error);
    }

    setIsScanning(false);
  };

  // =====================================
  // PROCESS QR
  // =====================================

  const processQRCode = async (qrData) => {
    try {
      setError("");
      setMessage("");

      /*
        QR should contain:

        STU001

        OR

        {
          "studentId": "STU001"
        }
      */

      let studentId = qrData;

      // If QR contains JSON
      try {
        const parsedData = JSON.parse(qrData);

        if (parsedData.studentId) {
          studentId = parsedData.studentId;
        }
      } catch {
        // QR contains simple student ID
      }

      studentId = studentId.trim();

      if (!studentId) {
        throw new Error("Invalid QR code");
      }

      const response = await scanStudentQR(
        studentId,
        examId
      );

      const data = response.data;

      if (data.duplicate) {
        setStudent(data.student);

        setMessage(
          "⚠️ Student already scanned for this exam."
        );

        await loadCounts();

        return;
      }

      if (data.success) {
        setStudent(data.student);

        setMessage(
          "✅ Student added successfully."
        );

        await loadCounts();
      }
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to process QR code."
      );
    }
  };

  // =====================================
  // LOAD COUNT
  // =====================================

  const loadCounts = async () => {
    try {
      if (!examId) return;

      const response = await getQRScanCount(examId);

      if (response.data.success) {
        setCounts(response.data.count);
      }
    } catch (error) {
      console.error("Count error:", error);
    }
  };

  // =====================================
  // LOAD COUNT WHEN EXAM CHANGES
  // =====================================

  useEffect(() => {
    if (examId) {
      loadCounts();
    }
  }, [examId]);

  // =====================================
  // CLEANUP
  // =====================================

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-6xl">

        {/* Header */}

        <div className="mb-6">

          <h1 className="text-2xl font-bold text-gray-800">
            QR Scanner
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Scan student QR to add them for examination
          </p>

        </div>


        {/* Exam Selection */}

        <div className="mb-6 rounded-xl border bg-white p-5">

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Exam ID
          </label>

          <input
            type="text"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            placeholder="Enter Exam ID"
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
          />

        </div>


        {/* Counts */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl border bg-white p-5">

            <p className="text-sm text-gray-500">
              Total Scanned
            </p>

            <h2 className="mt-2 text-3xl font-bold text-blue-600">
              {counts.totalScanned}
            </h2>

          </div>


          <div className="rounded-xl border bg-white p-5">

            <p className="text-sm text-gray-500">
              Added for Exam
            </p>

            <h2 className="mt-2 text-3xl font-bold text-green-600">
              {counts.added}
            </h2>

          </div>


          <div className="rounded-xl border bg-white p-5">

            <p className="text-sm text-gray-500">
              Duplicate
            </p>

            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {counts.duplicate}
            </h2>

          </div>

        </div>


        {/* Main */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">


          {/* Scanner */}

          <div className="rounded-xl border bg-white p-6">

            <h2 className="mb-4 text-lg font-semibold">
              Scan Student QR
            </h2>

            <div
              id="qr-reader"
              className="mx-auto w-full max-w-md overflow-hidden rounded-lg"
            />

            {!isScanning ? (

              <button
                type="button"
                onClick={startScanner}
                className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
              >
                Start Scanner
              </button>

            ) : (

              <button
                type="button"
                onClick={stopScanner}
                className="mt-5 w-full rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700"
              >
                Stop Scanner
              </button>

            )}

            {error && (

              <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>

            )}

            {message && (

              <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                {message}
              </div>

            )}

          </div>


          {/* Student */}

          <div className="rounded-xl border bg-white p-6">

            <h2 className="mb-4 text-lg font-semibold">
              Student Details
            </h2>

            {!student ? (

              <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-gray-50">

                <p className="text-center text-gray-400">
                  Scan a QR code to display
                  <br />
                  student information
                </p>

              </div>

            ) : (

              <div className="space-y-4">

                <div>
                  <p className="text-sm text-gray-500">
                    Student ID
                  </p>

                  <p className="font-semibold">
                    {student.studentId}
                  </p>
                </div>


                <div>
                  <p className="text-sm text-gray-500">
                    Name
                  </p>

                  <p className="font-semibold">
                    {student.name}
                  </p>
                </div>


                <div>
                  <p className="text-sm text-gray-500">
                    Email
                  </p>

                  <p>
                    {student.email || "-"}
                  </p>
                </div>


                <div>
                  <p className="text-sm text-gray-500">
                    Mobile
                  </p>

                  <p>
                    {student.mobile || "-"}
                  </p>
                </div>


                <div>
                  <p className="text-sm text-gray-500">
                    Department
                  </p>

                  <p>
                    {student.department || "-"}
                  </p>
                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default QRScanner;