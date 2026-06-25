import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Clock, AlertCircle, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Send, AlertTriangle,
  Camera, CameraOff, Trophy
} from "lucide-react";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "https://exam.ssinfotech.co.in/api" });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const Studentexams = ({ exam, onExamEnd }) => {
  const navigate = useNavigate();

  const [answers, setAnswers] = useState(() => new Array(exam.questions?.length || 0).fill(undefined));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [submitting, setSubmitting] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [faceDetected, setFaceDetected] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const faceCheckInterval = useRef(null);
  const warningTimeout = useRef(null);

  const totalQuestions = exam.questions?.length || 0;
  const marksPerQuestion = exam.marksPerQuestion || 1;
  const totalMarks = totalQuestions * marksPerQuestion;

  const answeredCount = answers.filter(a => a !== undefined && a !== null && a !== -1).length;
  const skippedCount = answers.filter(a => a === -1).length;

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Camera Setup
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraEnabled(true);
        startFaceDetection();
      } catch (err) {
        console.error("Camera error:", err);
        setCameraEnabled(false);
        alert("Camera access is required.");
      }
    };
    setupCamera();

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (faceCheckInterval.current) clearInterval(faceCheckInterval.current);
    };
  }, []);

  const startFaceDetection = () => {
    faceCheckInterval.current = setInterval(() => {
      const facePresent = Math.random() > 0.1;
      if (!facePresent && faceDetected) {
        setFaceDetected(false);
        const newWarnings = warnings + 1;
        setWarnings(newWarnings);
        if (newWarnings >= 5) handleAutoSubmit();
        else alert(`Warning ${newWarnings}/5: Face not detected!`);
      } else if (facePresent && !faceDetected) {
        setFaceDetected(true);
      }
    }, 10000);
  };

  // Fullscreen & Tab Switch Warning
  useEffect(() => {
    const handleFullscreen = () => {
      if (!document.fullscreenElement && !submitting) {
        setWarnings(prev => {
          const nw = prev + 1;
          if (nw >= 5) handleAutoSubmit();
          else alert(`Warning ${nw}/5: Please stay in fullscreen!`);
          return nw;
        });
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, [submitting]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !submitting) {
        setWarnings(prev => {
          const nw = prev + 1;
          if (nw >= 5) handleAutoSubmit();
          else alert(`Warning ${nw}/5: Do not switch tabs!`);
          return nw;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [submitting]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (qIndex, ansIndex) => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = ansIndex;
    setAnswers(newAnswers);
  };

  const handleSkip = (qIndex) => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = -1;
    setAnswers(newAnswers);
  };

  const goToNext = () => currentIndex < totalQuestions - 1 && setCurrentIndex(prev => prev + 1);
  const goToPrevious = () => currentIndex > 0 && setCurrentIndex(prev => prev - 1);
  const goToQuestion = (index) => setCurrentIndex(index);

  // ==================== FIXED VALIDATE & SUBMIT ====================
  const validateAndSubmit = async () => {
    setSubmitting(true);

    try {
      const formattedAnswers = answers.map((userAnswer, index) => {
        const question = exam.questions[index];
        const finalAnswer = (userAnswer === undefined || userAnswer === null) ? -1 : userAnswer;

        return {
          questionId: question._id,
          userAnswer: finalAnswer
        };
      });

      const response = await api.post(`/student/exams/${exam._id}/submit`, {
        answers: formattedAnswers
      });

      const result = response.data.result;

      setResultData(result);
      setShowResult(true);

      // Cleanup
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (document.fullscreenElement) document.exitFullscreen();

      if (onExamEnd) onExamEnd(result);

    } catch (error) {
      console.error('Submission error:', error);
      alert(error.response?.data?.message || "Failed to submit exam. Please try again.");
    } finally {
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (submitting) return;
    alert("Time's up! Submitting your exam...");
    await validateAndSubmit();
  };

  const getQuestionStatus = (index) => {
    const ans = answers[index];
    if (ans !== undefined && ans !== null && ans !== -1) return 'answered';
    if (ans === -1) return 'skipped';
    return 'unanswered';
  };

  const currentQuestion = exam.questions[currentIndex];

  // Determine if passed or failed
  const isPass = resultData ? resultData.percentage >= 40 : false;

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
      {/* Header - Same as before */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-gray-800">{exam.subject}</h1>
            <p className="text-xs text-gray-500">Question {currentIndex + 1} of {totalQuestions}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {cameraEnabled ? <Camera className="w-4 h-4 text-green-600" /> : <CameraOff className="w-4 h-4 text-red-600" />}
              <span className="text-xs font-medium">{faceDetected ? "Face detected" : "Face not detected"}</span>
            </div>
            {warnings > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-bold text-red-600">{warnings}/5</span>
              </div>
            )}
            <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg ${timeLeft < 300 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-800'}`}>
              <Clock className="inline w-4 h-4 mr-2" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Preview */}
      <div className="absolute top-20 right-6 z-10">
        <video ref={videoRef} autoPlay playsInline muted className="w-32 h-24 rounded-lg border-2 border-white shadow-lg object-cover" />
      </div>

      {/* Main Exam Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full gap-6 p-6 overflow-hidden">
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-4">
              <span className="text-sm font-semibold text-blue-600">Question {currentIndex + 1}</span>
              <p className="text-lg font-medium text-gray-800 mt-2">{currentQuestion?.text}</p>
            </div>

            <div className="space-y-3 mt-6">
              {currentQuestion?.options?.map((option, idx) => (
                <label key={idx} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${answers[currentIndex] === idx ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}>
                  <input type="radio" name="question" checked={answers[currentIndex] === idx} onChange={() => handleAnswer(currentIndex, idx)} className="w-4 h-4 text-blue-600" />
                  <span className="ml-3 text-gray-700">{option}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => handleSkip(currentIndex)} className="px-6 py-2 border-2 border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50">
                Skip Question
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            <button onClick={goToPrevious} disabled={currentIndex === 0} className="flex items-center gap-2 px-6 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium disabled:opacity-50 hover:bg-gray-200">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            {currentIndex === totalQuestions - 1 ? (
              <button onClick={() => setShowSubmitModal(true)} disabled={submitting} className="flex items-center gap-2 px-6 py-2 bg-green-600 rounded-lg text-white font-medium hover:bg-green-700 disabled:opacity-50">
                <Send className="w-4 h-4" /> Submit Exam
              </button>
            ) : (
              <button onClick={goToNext} className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Question Palette - Same as before */}
        <div className="w-80 bg-white rounded-xl shadow-sm p-4 overflow-y-auto">
          {/* ... (your palette code remains same) ... */}
          <div className="mb-4 pb-3 border-b">
            <h3 className="font-bold text-gray-800">Question Palette</h3>
            <div className="flex gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div><span>Answered</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div><span>Skipped</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-300 rounded"></div><span>Unanswered</span></div>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalQuestions }).map((_, idx) => {
              const status = getQuestionStatus(idx);
              return (
                <button key={idx} onClick={() => goToQuestion(idx)}
                  className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${currentIndex === idx ? 'ring-2 ring-blue-500 ring-offset-2' : ''} 
                    ${status === 'answered' ? 'bg-green-500 text-white' : status === 'skipped' ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t text-sm text-gray-600">
            <p>Answered: <strong className="text-green-600">{answeredCount}</strong></p>
            <p>Skipped: <strong className="text-yellow-600">{skippedCount}</strong></p>
            <p>Unanswered: <strong className="text-gray-600">{totalQuestions - answeredCount - skippedCount}</strong></p>
            <p className="mt-2 pt-2 border-t">Total Marks: <strong>{totalMarks}</strong></p>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-bold">Confirm Submission</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p>Are you sure you want to submit?</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p>• Total Questions: {totalQuestions}</p>
                <p>• Answered: {answeredCount}</p>
                <p>• Skipped: {skippedCount}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitModal(false)} className="flex-1 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={validateAndSubmit} disabled={submitting} className="flex-1 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700 disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BEAUTIFUL RESULT SCREEN ==================== */}
      {showResult && resultData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#0a0a0a] text-white rounded-3xl max-w-md w-full overflow-hidden">
            <div className="flex flex-col items-center pt-10 pb-8">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl font-bold mb-4
                ${isPass ? 'bg-green-600' : 'bg-red-600'}`}>
                {resultData.grade}
              </div>
              <p className="text-xl font-medium mb-1">
                {isPass ? "Congratulations!" : "Better Luck Next Time"}
              </p>
              <p className="text-gray-400">Exam submitted successfully</p>
            </div>

            <div className="bg-[#121212] mx-6 rounded-2xl p-6 mb-8">
              <div className="flex justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-400">TOTAL SCORE</p>
                  <p className="text-4xl font-bold">{resultData.score} / {resultData.totalMarks}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">PERCENTAGE</p>
                  <p className="text-4xl font-bold text-green-500">{resultData.percentage}%</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Correct</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                  <XCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Wrong</p>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                  <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Marks/Q</p>
                  <p className="font-medium">{marksPerQuestion}</p>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500 pb-8">
              Submitted at {new Date().toLocaleString()}
            </div>

            <button
              onClick={() => navigate('/student/dashboard')}
              className="w-full py-5 bg-white text-black font-semibold text-lg rounded-b-3xl hover:bg-gray-100"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Studentexams;