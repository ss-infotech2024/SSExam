// pages/student/ExamInterface.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Camera,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Flag,
} from "lucide-react";

// Use environment variable or fallback to render.com backend
const API_URL = import.meta.env.VITE_API_URL || "https://tgpexambackend.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  } else {
    window.location.href = "/";
  }
  return cfg;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error);
    } else if (!error.response) {
      console.error('Network error - backend might be down:', error);
    }
    return Promise.reject(error);
  }
);

const MAX_WARNINGS = 5;
const FACE_CHECK_INTERVAL = 8000;

const ExamInterface = ({ exam, onExamEnd }) => {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const submitInProgress = useRef(false);
  const isMountedRef = useRef(true);

  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeLeft, setTimeLeft] = useState((exam?.duration || 60) * 60);

  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(true);
  const [warnings, setWarnings] = useState(0);
  const [warningMsg, setWarningMsg] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [loadingMessage, setLoadingMessage] = useState("Loading exam...");
  const [networkError, setNetworkError] = useState(false);

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Start Camera
  const startCamera = useCallback(async () => {
    if (!isMountedRef.current) return false;
    
    setLoadingMessage("Requesting camera access...");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        audio: false,
      });
      
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return false;
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Camera Error:", err);
      let errorMsg = "Unable to access camera.";
      if (err.name === "NotAllowedError") {
        errorMsg = "Camera permission denied. Please allow camera access and refresh.";
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found on this device.";
      }
      if (isMountedRef.current) {
        alert(errorMsg + " You can still take the exam, but proctoring will be disabled.");
      }
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Face Detection
  const detectFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    try {
      const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
      canvasRef.current.width = 80;
      canvasRef.current.height = 60;
      ctx.drawImage(videoRef.current, 0, 0, 80, 60);

      const data = ctx.getImageData(20, 15, 40, 30).data;
      let brightness = 0, skin = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        brightness += (r + g + b) / 3;
        if (r > 80 && g > 40 && b < 180 && r > g && r > b) skin++;
      }

      const avgBrightness = brightness / (data.length / 4);
      const skinRatio = skin / (data.length / 4);

      const hasFace = avgBrightness > 35 && skinRatio > 0.12;
      setFaceDetected(hasFace);

      if (!hasFace && isMountedRef.current) {
        setWarnings((prev) => {
          const newWarnings = prev + 1;
          setWarningMsg("Face not detected! Please keep your face visible.");
          setShowWarning(true);
          setTimeout(() => {
            if (isMountedRef.current) setShowWarning(false);
          }, 4000);

          if (newWarnings >= MAX_WARNINGS) {
            handleAutoSubmit("Too many face detection violations");
          }
          return newWarnings;
        });
      }
    } catch (e) {
      console.warn("Face detection skipped:", e);
    }
  }, [cameraReady]);

  // Load Exam Questions
  useEffect(() => {
    if (!exam?._id) {
      setPhase("error");
      setNetworkError(true);
      return;
    }

    const loadExam = async () => {
      try {
        setLoadingMessage("Fetching exam questions...");
        console.log("Loading exam with ID:", exam._id);
        console.log("API URL:", API_URL);
        
        const res = await api.get(`/student/exams/${exam._id}`);
        console.log("Exam loaded:", res.data);
        
        const data = res.data.exam || res.data;
        if (isMountedRef.current) {
          setQuestions(data.questions || []);
          setTimeLeft((data.duration || exam.duration || 60) * 60);
          setPhase("ready");
          setNetworkError(false);
        }
      } catch (err) {
        console.error("Load Exam Error:", err);
        console.error("Error details:", err.response?.data);
        
        if (isMountedRef.current) {
          setPhase("error");
          setNetworkError(true);
          
          if (err.response?.status === 401) {
            localStorage.removeItem("token");
            navigate("/");
          } else if (err.code === 'ECONNABORTED') {
            setLoadingMessage("Request timeout. Please check your connection.");
          } else if (!err.response) {
            setLoadingMessage("Cannot connect to server. Please check if the backend is running.");
          } else {
            setLoadingMessage(err.response?.data?.message || "Failed to load exam");
          }
        }
      }
    };

    loadExam();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [exam?._id, navigate]);

  // Start Camera after ready
  useEffect(() => {
    if (phase === "ready") {
      startCamera().then((success) => {
        if (isMountedRef.current) {
          setPhase(success ? "running" : "running"); // Continue even if camera fails
        }
      });
    }
  }, [phase, startCamera]);

  // Timer
  useEffect(() => {
    if (phase !== "running" || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit("Time expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  // Face Detection Interval
  useEffect(() => {
    if (phase !== "running" || !cameraReady) return;
    const interval = setInterval(detectFace, FACE_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [phase, cameraReady, detectFace]);

  // ==================== SUBMIT EXAM ====================
  const submitExam = useCallback(async (isAuto = false, reason = "") => {
    if (submitInProgress.current || submitting) return;

    submitInProgress.current = true;
    setSubmitting(true);
    stopCamera();

    // Format answers exactly as backend expects
    const formattedAnswers = questions.map((_, index) => {
      const answer = answers[index];
      return {
        questionId: questions[index]?._id,
        selectedOption: answer !== undefined && answer !== null ? answer : null,
      };
    });

    try {
      const payload = {
        answers: formattedAnswers,
        terminatedBy: isAuto ? "proctor" : null,
        terminationReason: reason || undefined,
      };

      console.log("Submitting exam:", exam._id);
      console.log("Payload:", payload);

      const res = await api.post(`/student/exams/${exam._id}/submit`, payload);
      console.log("Submit response:", res.data);

      const resultData = res.data.result || res.data;
      
      // Calculate counts if not provided
      const correctCount = resultData.correctCount || 
        (resultData.answers?.filter(a => a.isCorrect).length || 0);
      const wrongCount = resultData.wrongCount ||
        (resultData.answers?.filter(a => !a.isCorrect && a.userAnswer !== -1).length || 0);
      const unansweredCount = questions.length - correctCount - wrongCount;

      if (isMountedRef.current) {
        setResult({
          ...resultData,
          correctCount,
          wrongCount,
          unansweredCount,
          subject: exam?.subject,
        });
        setPhase("result");
      }

      if (onExamEnd) onExamEnd(resultData);

    } catch (err) {
      console.error("Submit Error:", err);
      console.error("Error response:", err.response?.data);

      let errorMsg = err.response?.data?.message || "Failed to submit exam";

      if (err.response?.status === 409 || errorMsg.includes("already submitted")) {
        // Already submitted - show result if available
        const data = err.response?.data;
        if (data && isMountedRef.current) {
          setResult({
            score: data.score || 0,
            totalMarks: data.totalMarks || 0,
            percentage: data.percentage || 0,
            grade: data.grade || "F",
            correctCount: data.correctCount || 0,
            wrongCount: data.wrongCount || 0,
            unansweredCount: data.unansweredCount || 0,
            subject: exam?.subject,
          });
          setPhase("result");
        } else {
          alert("You have already submitted this exam.");
          navigate("/student/dashboard");
        }
      } else if (!err.response) {
        alert("Network error. Please check your connection and try again.");
        setPhase("running");
      } else {
        alert(errorMsg);
        setPhase("running");
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
      submitInProgress.current = false;
      setShowSubmitModal(false);
    }
  }, [questions, answers, exam?._id, exam?.subject, submitting, onExamEnd, navigate, stopCamera]);

  const handleAutoSubmit = useCallback((reason) => {
    submitExam(true, reason);
  }, [submitExam]);

  const confirmSubmit = () => {
    setShowSubmitModal(false);
    submitExam(false);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  // ==================== RESULT SCREEN ====================
  if (phase === "result" && result) {
    const isPass = (result.percentage || 0) >= 40;
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999] p-4">
        <div className="bg-zinc-900 text-white rounded-3xl max-w-md w-full overflow-hidden">
          <div className="pt-10 pb-8 text-center">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center text-5xl font-black mb-4 ${isPass ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {result.grade || (isPass ? "PASS" : "FAIL")}
            </div>
            <h2 className="text-2xl font-bold">{result.subject || exam?.subject}</h2>
            <p className="text-zinc-400 mt-1">{isPass ? "Congratulations!" : "Better luck next time"}</p>
          </div>

          <div className="bg-zinc-950 mx-6 rounded-2xl p-6 mb-8">
            <div className="text-center mb-6">
              <p className="text-xs text-zinc-500">YOUR SCORE</p>
              <p className="text-5xl font-black mt-1">
                {result.score || 0} <span className="text-2xl text-zinc-500">/ {result.totalMarks || 0}</span>
              </p>
              <p className="text-4xl font-bold text-emerald-400 mt-2">{result.percentage || 0}%</p>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-emerald-400 text-2xl font-bold">{result.correctCount || 0}</p>
                <p className="text-xs text-zinc-500">Correct</p>
              </div>
              <div>
                <p className="text-red-400 text-2xl font-bold">{result.wrongCount || 0}</p>
                <p className="text-xs text-zinc-500">Wrong</p>
              </div>
              <div>
                <p className="text-zinc-400 text-2xl font-bold">{result.unansweredCount || 0}</p>
                <p className="text-xs text-zinc-500">Unanswered</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/student/dashboard")}
            className="w-full py-5 bg-white text-black font-bold text-lg rounded-b-3xl hover:bg-zinc-100"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==================== ERROR SCREEN ====================
  if (phase === "error") {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-[9990] p-6">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Exam</h2>
          <p className="text-zinc-400 mb-6">{loadingMessage}</p>
          <p className="text-xs text-zinc-500 mb-6">
            Backend URL: {API_URL}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/student/dashboard")}
              className="px-6 py-3 bg-zinc-800 text-white rounded-xl hover:bg-zinc-700"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== LOADING SCREEN ====================
  if (phase === "loading" || phase === "ready") {
    return (
      <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center z-[9990]">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white">{loadingMessage}</p>
          <p className="text-xs text-zinc-500 mt-2">Backend: {API_URL}</p>
        </div>
      </div>
    );
  }

  // ==================== RUNNING EXAM ====================
  const currentQuestion = questions[currentQ];

  if (!currentQuestion && questions.length > 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-zinc-950 text-white flex flex-col z-[9990]">
      <canvas ref={canvasRef} className="hidden" />

      {/* Warning Toast */}
      {showWarning && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[9999]">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p>{warningMsg}</p>
            <p className="text-xs opacity-80">Warning {warnings}/{MAX_WARNINGS}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold">{exam?.subject}</h1>
          <p className="text-xs text-zinc-400">Question {currentQ + 1} of {totalQuestions}</p>
          <p className="text-xs text-zinc-500 mt-1">{answeredCount} answered</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {cameraReady ? <Camera className="w-4 h-4 text-emerald-400" /> : <CameraOff className="w-4 h-4 text-red-500" />}
            <span className={faceDetected ? "text-emerald-400" : "text-red-500"}>
              {faceDetected ? "Face OK" : "No Face"}
            </span>
          </div>

          <div className={`font-mono font-bold px-4 py-2 rounded-xl flex items-center gap-2 ${timeLeft < 300 ? "bg-red-600" : "bg-zinc-800"}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>

          <div className="bg-amber-900/50 px-3 py-1 rounded-xl text-amber-400 text-xs font-bold flex items-center gap-1">
            <Shield className="w-4 h-4" /> {warnings}/{MAX_WARNINGS}
          </div>
        </div>
      </div>

      {/* Camera Preview */}
      <div className="absolute top-20 right-6 z-50">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-44 h-28 rounded-2xl border-2 border-zinc-700 object-cover shadow-2xl bg-zinc-800"
        />
      </div>

      {/* Question Area */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8">
            <p className="text-xl leading-relaxed font-medium mb-8">{currentQuestion?.text || "Loading question..."}</p>

            <div className="space-y-4">
              {currentQuestion?.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers((prev) => ({ ...prev, [currentQ]: i }))}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex gap-4 items-start
                    ${answers[currentQ] === i ? "border-blue-500 bg-blue-950" : "border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900"}`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                    ${answers[currentQ] === i ? "bg-blue-600 border-blue-400" : "border-zinc-600"}`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-base pt-0.5 flex-1">{opt}</span>
                  {answers[currentQ] === i && <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />}
                </button>
              ))}
            </div>
            
            {/* Flag button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setFlagged(prev => ({ ...prev, [currentQ]: !prev[currentQ] }))}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-colors
                  ${flagged[currentQ] ? "bg-amber-900/50 border-amber-700 text-amber-400" : "border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}
              >
                <Flag className="w-4 h-4" />
                {flagged[currentQ] ? "Flagged" : "Flag for review"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-zinc-900 border-t border-zinc-700 p-4">
        <div className="max-w-3xl mx-auto flex justify-between">
          <button
            onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
            disabled={currentQ === 0}
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl disabled:opacity-50 flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" /> Previous
          </button>

          <div className="flex gap-2 overflow-x-auto px-2 max-w-[300px]">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQ(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all
                  ${idx === currentQ ? "bg-blue-600 scale-110" 
                    : answers[idx] !== undefined ? "bg-emerald-800 hover:bg-emerald-700"
                    : flagged[idx] ? "bg-amber-800 hover:bg-amber-700"
                    : "bg-zinc-800 hover:bg-zinc-700"}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentQ === totalQuestions - 1 ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={submitting}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" /> Submit Exam
            </button>
          ) : (
            <button
              onClick={() => setCurrentQ((p) => Math.min(totalQuestions - 1, p + 1))}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2"
            >
              Next <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
          <div className="bg-zinc-900 rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-4">Submit Exam?</h3>
            <p className="text-zinc-400 mb-2">
              Answered: <strong className="text-white">{answeredCount}</strong> / {totalQuestions}
            </p>
            {answeredCount < totalQuestions && (
              <p className="text-amber-400 text-sm mb-6">
                ⚠ {totalQuestions - answeredCount} question{totalQuestions - answeredCount !== 1 ? "s" : ""} unanswered
              </p>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-3 border border-zinc-700 rounded-xl hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmit}
                disabled={submitting}
                className="flex-1 py-3 bg-green-600 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamInterface;