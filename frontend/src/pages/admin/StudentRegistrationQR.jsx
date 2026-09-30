import React, { useState } from "react";
import QRCode from "qrcode";

import { generateRegistrationQR } from "../../services/api";

const StudentRegistrationQR = () => {
  const [qrImage, setQrImage] = useState("");
  const [registrationURL, setRegistrationURL] = useState("");
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  

  const handleGenerateQR = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await generateRegistrationQR();
      console.log("QR API RESPONSE:", response);
      console.log("QR API DATA:", response.data);
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message);
      }

      const url = data.registrationURL;

      const qrDataURL = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
      });

      setQrImage(qrDataURL);
      setRegistrationURL(url);
      setCount(0);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "Failed to generate QR"
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrImage) return;

    const link = document.createElement("a");

    link.href = qrImage;
    link.download = "student-registration-qr.png";

    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-4xl">

        {/* Header */}

        <div className="mb-6">

          <h1 className="text-2xl font-bold text-gray-800">
            Student Registration QR
          </h1>

          <p className="mt-1 text-gray-500">
            Generate a QR code for new student registration
          </p>

        </div>


        {/* Generate */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <button
            type="button"
            onClick={handleGenerateQR}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Generating..."
              : "Generate Registration QR"}
          </button>


          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-600">
              {error}
            </div>
          )}


          {qrImage && (
            <div className="mt-8 text-center">

              <h2 className="mb-4 text-xl font-semibold">
                Scan to Register
              </h2>


              {/* QR */}

              <div className="mx-auto w-fit rounded-xl border bg-white p-5 shadow-sm">

                <img
                  src={qrImage}
                  alt="Student Registration QR"
                  className="h-80 w-80"
                />

              </div>


              {/* Count */}

              <div className="mt-6">

                <p className="text-sm text-gray-500">
                  Students Registered
                </p>

                <p className="text-4xl font-bold text-blue-600">
                  {count}
                </p>

              </div>


              {/* URL */}

              <div className="mx-auto mt-6 max-w-xl">

                <p className="mb-2 text-sm text-gray-500">
                  Registration URL
                </p>

                <div className="break-all rounded-lg bg-gray-100 p-3 text-sm">
                  {registrationURL}
                </div>

              </div>


              {/* Download */}

              <button
                type="button"
                onClick={downloadQR}
                className="mt-6 rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
              >
                Download QR
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default StudentRegistrationQR;