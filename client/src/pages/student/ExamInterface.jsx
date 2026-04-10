// pages/student/ExamInterface.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock, AlertCircle, Flag, ChevronLeft, ChevronRight,
  AlertTriangle, Shield, Zap, Users, Video,
  CheckCircle, XCircle, Award, BarChart3, Download, Home,
  Eye, EyeOff, UserCheck, UserX, Wifi, WifiOff, Camera, Play
} from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "https://tgpexambackend.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// ─── Script loader ────────────────────────────────────────────────────────────
const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });

// ─── Constants ────────────────────────────────────────────────────────────────
const FACEAPI_CDN  = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const WEIGHTS_URL  = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
const VIOLATION_COOLDOWN_MS  = 8000;
const DETECTION_INTERVAL_MS  = 2000;
const MAX_WARNINGS = 3;

// ─── Google Fonts ─────────────────────────────────────────────────────────────
const FontLink = () => (
  <link
    href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ExamInterface = ({ exam, onExamEnd = () => {} }) => {

  // ── state ──────────────────────────────────────────────────────────────────
  const [questions,        setQuestions]        = useState([]);
  const [currentQuestion,  setCurrentQuestion]  = useState(0);
  const [answers,          setAnswers]          = useState({});
  const [markedForReview,  setMarkedForReview]  = useState([]);
  const [timeRemaining,    setTimeRemaining]    = useState(0);
  const [showSubmitConfirm,setShowSubmitConfirm]= useState(false);
  const [showResult,       setShowResult]       = useState(false);
  const [resultData,       setResultData]       = useState(null);
  const [showWarning,      setShowWarning]      = useState(false);
  const [warningMessage,   setWarningMessage]   = useState("");

  // phase: "loading" | "fetching" | "preflight" | "running" | "error"
  const [phase,        setPhase]        = useState("loading");
  const [loadError,    setLoadError]    = useState("");
  const [fetchStatus,  setFetchStatus]  = useState("Initialising...");
  const [camStatus,    setCamStatus]    = useState("idle"); // idle|requesting|ok|denied|error

  // proctoring
  const [cameraActive,  setCameraActive]  = useState(false);
  const [cameraError,   setCameraError]   = useState("");
  const [modelStatus,   setModelStatus]   = useState("loading");
  const [faceDetected,  setFaceDetected]  = useState(true);
  const [multipleFaces, setMultipleFaces] = useState(false);
  const [eyesOpen,      setEyesOpen]      = useState(true);
  const [lookingAway,   setLookingAway]   = useState(false);
  const [violations,    setViolations]    = useState(0);
  const [violationHistory, setViolationHistory] = useState([]);

  // ── refs ───────────────────────────────────────────────────────────────────
  const videoRef           = useRef(null);
  const canvasRef          = useRef(null);
  const streamRef          = useRef(null);
  const intervalRef        = useRef(null);
  const warningTimerRef    = useRef(null);
  const violationsRef      = useRef(0);
  const lastViolationTimeRef = useRef(0);
  const examEndedRef       = useRef(false);
  const cameraActiveRef    = useRef(false);
  const isMountedRef       = useRef(true);
  const faceAbsenceCount   = useRef(0);
  const timerStartedRef    = useRef(false);

  useEffect(() => { violationsRef.current = violations; }, [violations]);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  // ── formatters ─────────────────────────────────────────────────────────────
  const fmt = (s) => {
    if (s == null) return "00:00:00";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };
  const fmtTaken = (s) => {
    if (s == null) return "0s";
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    if (h) return `${h}h ${m}m`; if (m) return `${m}m ${sec}s`; return `${sec}s`;
  };

  // ── violation handler ──────────────────────────────────────────────────────
  const handleViolation = useCallback((reason) => {
    if (examEndedRef.current) return;
    const now = Date.now();
    if (now - lastViolationTimeRef.current < VIOLATION_COOLDOWN_MS) return;
    lastViolationTimeRef.current = now;

    const newCount = violationsRef.current + 1;
    setWarningMessage(`Warning ${newCount}/3: ${reason}`);
    setShowWarning(true);
    clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setShowWarning(false), 4500);

    setViolations(newCount);
    violationsRef.current = newCount;
    setViolationHistory(prev => [...prev, { reason, time: now }]);

    if (newCount >= MAX_WARNINGS) {
      examEndedRef.current = true;
      setTimeout(() => {
        alert(`Exam Terminated!\nReason: Too many violations (3/3)\nLast: ${reason}`);
        triggerResult(true);
      }, 600);
    }
  }, []); // eslint-disable-line

  // ── face-api detection ─────────────────────────────────────────────────────
  const runFaceAPIDetection = useCallback(async () => {
    const faceapi = window.faceapi;
    const video   = videoRef.current;
    if (!video || !faceapi || !cameraActiveRef.current || video.readyState < 2) return;
    try {
      const opts       = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
      const detections = await faceapi.detectAllFaces(video, opts).withFaceLandmarks();

      const canvas = canvasRef.current;
      if (canvas && video.videoWidth) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, detections);
        faceapi.draw.drawFaceLandmarks(canvas, detections);
      }

      if (detections.length === 0) {
        setFaceDetected(false); setMultipleFaces(false); setEyesOpen(false); setLookingAway(false);
        faceAbsenceCount.current++;
        if (faceAbsenceCount.current >= 2) {
          handleViolation("No face detected - position your face in front of the camera");
          faceAbsenceCount.current = 0;
        }
        return;
      }
      faceAbsenceCount.current = 0;
      if (detections.length > 1) {
        setFaceDetected(true); setMultipleFaces(true); setLookingAway(false);
        handleViolation("Multiple faces detected - only you should be visible");
        return;
      }
      setFaceDetected(true); setMultipleFaces(false);

      const det = detections[0], box = det.detection.box;
      const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
      const cx = (box.x + box.width / 2) / vw, cy = (box.y + box.height / 2) / vh;
      const sizeRatio = (box.width * box.height) / (vw * vh);
      const centered  = cx > 0.2 && cx < 0.8 && cy > 0.1 && cy < 0.9;
      const properDist= sizeRatio > 0.04 && sizeRatio < 0.45;

      if (!centered || !properDist) {
        setLookingAway(true);
        handleViolation(!centered ? "Looking away - please face the camera" : "Adjust your distance from the camera");
      } else { setLookingAway(false); }

      if (det.landmarks) {
        const le = det.landmarks.getLeftEye(), re = det.landmarks.getRightEye();
        if (le && re && le.length >= 6 && re.length >= 6) {
          const eyeH = (p) => Math.abs(((p[1]?.y+p[2]?.y)/2) - ((p[4]?.y+p[5]?.y)/2));
          const eyeW = (p) => Math.abs(p[0]?.x - p[3]?.x) || 1;
          if (eyeH(le)/eyeW(le) < 0.15 && eyeH(re)/eyeW(re) < 0.15) {
            setEyesOpen(false);
            handleViolation("Eyes appear closed - please keep your eyes open");
          } else { setEyesOpen(true); }
        }
      }
    } catch (err) { console.error("[face-api]", err); }
  }, [handleViolation]);

  // ── motion fallback ────────────────────────────────────────────────────────
  const runMotionDetection = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraActiveRef.current || video.readyState < 2) return;
    const tmp = document.createElement("canvas");
    tmp.width = 160; tmp.height = 120;
    const ctx = tmp.getContext("2d");
    ctx.drawImage(video, 0, 0, 160, 120);
    const frame = ctx.getImageData(0, 0, 160, 120);
    let skin = 0, total = 0;
    for (let i = 0; i < frame.data.length; i += 4) {
      const r = frame.data[i], g = frame.data[i+1], b = frame.data[i+2];
      total++;
      if (r>60 && g>40 && b<200 && r>g && r>b && Math.abs(r-g)>10) skin++;
    }
    const hasFace = skin/total > 0.08;
    setFaceDetected(hasFace);
    if (!hasFace) {
      faceAbsenceCount.current++;
      if (faceAbsenceCount.current >= 3) {
        handleViolation("No face detected - ensure your face is visible");
        faceAbsenceCount.current = 0;
      }
    } else { faceAbsenceCount.current = 0; }
  }, [handleViolation]);

  const startDetection = useCallback((useFaceAPI) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(
      useFaceAPI ? runFaceAPIDetection : runMotionDetection,
      DETECTION_INTERVAL_MS
    );
  }, [runFaceAPIDetection, runMotionDetection]);

  // ── STEP 1: Fetch exam (no camera yet) ───────────────────────────────────
  useEffect(() => {
    if (!exam?._id) { setLoadError("Invalid exam ID"); setPhase("error"); return; }
    setPhase("fetching");
    setFetchStatus("Fetching exam questions...");

    api.get(`/student/exams/${exam._id}`)
      .then(res => {
        const examData = res.data.exam || res.data.data || res.data;
        if (!examData?.questions) throw new Error("Invalid exam data structure");
        if (isMountedRef.current) {
          setQuestions(examData.questions || []);
          setTimeRemaining((examData.duration || exam.duration || 60) * 60);
          setFetchStatus("Ready to begin!");
          setPhase("preflight");
        }
      })
      .catch(err => {
        if (!isMountedRef.current) return;
        setPhase("error");
        if (err.response?.status === 401) {
          setLoadError("Session expired. Please login again.");
          localStorage.removeItem("token");
          setTimeout(() => { window.location.href = "/"; }, 2000);
        } else if (err.response?.status === 404) {
          setLoadError("Exam not found.");
        } else {
          setLoadError(err.response?.data?.message || "Failed to load exam. Please try again.");
        }
      });
  }, [exam]);

  // ── STEP 2: User clicks "Start" — camera requested HERE (user gesture!) ──
  const handleStartExam = useCallback(async () => {
    setCamStatus("requesting");
    setFetchStatus("Requesting camera access...");

    // --- camera (MUST be called from a click handler) ---
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      const vid = videoRef.current;
      if (vid) {
        vid.srcObject = stream;
        await new Promise((resolve, reject) => {
          if (vid.readyState >= 2) { vid.play().then(resolve).catch(reject); return; }
          vid.onloadedmetadata = () => vid.play().then(resolve).catch(reject);
          vid.onerror = reject;
        });
        cameraActiveRef.current = true;
        setCameraActive(true);
        setCameraError("");
        setCamStatus("ok");
      }
    } catch (err) {
      console.error("[camera]", err);
      cameraActiveRef.current = false;
      const isDenied = err.name === "NotAllowedError";
      setCamStatus(isDenied ? "denied" : "error");
      setCameraError(
        isDenied
          ? "Camera permission denied. Allow camera in browser settings and retry."
          : err.name === "NotFoundError"
          ? "No camera found on this device."
          : "Camera unavailable - exam will continue without proctoring."
      );
      setCameraActive(false);
    }

    // --- face-api models ---
    setFetchStatus("Loading AI proctoring models...");
    try {
      await loadScript(FACEAPI_CDN);
      if (window.faceapi) {
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(WEIGHTS_URL);
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(WEIGHTS_URL);
        setModelStatus("ready");
        startDetection(true);
      } else throw new Error("faceapi not on window");
    } catch (err) {
      console.warn("[face-api] fallback:", err.message);
      setModelStatus("fallback");
      startDetection(false);
    }

    // --- security hooks ---
    const goFS = () => document.documentElement.requestFullscreen?.().catch(() => {});
    goFS();

    const onFS    = () => { if (!document.fullscreenElement && !examEndedRef.current) { handleViolation("Exited fullscreen"); goFS(); } };
    const onVis   = () => { if (document.hidden && !examEndedRef.current) handleViolation("Tab switched - do not switch tabs during exam"); };
    const onKey   = (e) => {
      if (["Escape","F11"].includes(e.key)
        || (e.ctrlKey && ["w","r","t"].includes(e.key))
        || (e.altKey && e.key === "Tab")) {
        e.preventDefault(); handleViolation("Forbidden key combination detected");
      }
    };
    const onCtx = (e) => { e.preventDefault(); handleViolation("Right-click detected"); };

    document.addEventListener("fullscreenchange", onFS);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keydown", onKey);
    document.addEventListener("contextmenu", onCtx);

    window.__examCleanup = () => {
      document.removeEventListener("fullscreenchange", onFS);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("contextmenu", onCtx);
      document.exitFullscreen?.().catch(() => {});
    };

    setPhase("running");
  }, [startDetection, handleViolation]);

  // ── global cleanup ─────────────────────────────────────────────────────────
  useEffect(() => () => {
    examEndedRef.current = true;
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    window.__examCleanup?.();
  }, []);

  // ── timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "running" || timeRemaining <= 0 || timerStartedRef.current) return;
    timerStartedRef.current = true;
    const t = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { clearInterval(t); triggerResult(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timeRemaining]); // eslint-disable-line

  // ── result ─────────────────────────────────────────────────────────────────
  const triggerResult = useCallback((auto = false) => {
    if (examEndedRef.current && !auto) return;
    examEndedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    window.__examCleanup?.();

    const totalMarks = questions.reduce((s, q) => s + (q.marks || 2), 0);
    let obtained = 0;
    const qResults = questions.map(q => {
      const ua = answers[q._id || q.id];
      const correct = ua === q.correctAnswer;
      if (correct) obtained += (q.marks || 2);
      return { ...q, userAnswer: ua ?? -1, isCorrect: correct, isAttempted: ua !== undefined };
    });
    const pct = totalMarks > 0 ? ((obtained / totalMarks) * 100).toFixed(1) : 0;
    setResultData({
      totalMarks, obtainedMarks: obtained, percentage: pct,
      correctCount:     qResults.filter(q => q.isCorrect).length,
      incorrectCount:   qResults.filter(q => q.isAttempted && !q.isCorrect).length,
      unattemptedCount: qResults.filter(q => !q.isAttempted).length,
      qResults, violations: violationsRef.current, violationHistory,
      timeTaken: ((exam?.duration || 60) * 60) - timeRemaining,
      submittedAt: new Date().toLocaleString(),
    });
    setShowResult(true);
  }, [questions, answers, exam?.duration, timeRemaining, violationHistory]);

  // ── derived ────────────────────────────────────────────────────────────────
  const answeredCount = Object.keys(answers).length;
  const markedCount   = markedForReview.length;
  const notVisited    = questions.length - answeredCount - markedCount;
  const currentQ      = questions[currentQuestion];
  const progress      = questions.length ? (answeredCount / questions.length) * 100 : 0;
  const timeColor     = timeRemaining < 300
    ? { bg:"#fee2e2", text:"#dc2626", border:"#fca5a5" }
    : timeRemaining < 600
    ? { bg:"#fef3c7", text:"#d97706", border:"#fcd34d" }
    : { bg:"#d1fae5", text:"#059669", border:"#6ee7b7" };

  // ══════════════════════════════════════════════════════════════════════════
  // ── SCREEN: loading / fetching ────────────────────────────────────────────
  if (phase === "loading" || phase === "fetching") {
    return (
      <>
        <FontLink />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={S.fullDark}>
          <div style={{ textAlign:"center" }}>
            <div style={S.spinner} />
            <p style={{ color:"#e2e8f0", fontFamily:"'DM Sans',sans-serif", fontSize:15, margin:0 }}>{fetchStatus}</p>
          </div>
        </div>
      </>
    );
  }

  // ── SCREEN: error ─────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <>
        <FontLink />
        <div style={S.fullDark}>
          <div style={{ textAlign:"center", maxWidth:400 }}>
            <AlertTriangle size={56} color="#ef4444" style={{ marginBottom:16 }} />
            <h2 style={{ color:"#f1f5f9", fontFamily:"'DM Sans',sans-serif", fontSize:20, fontWeight:700, margin:"0 0 8px" }}>Failed to Load Exam</h2>
            <p style={{ color:"#94a3b8", fontFamily:"'DM Sans',sans-serif", fontSize:14, margin:"0 0 24px" }}>{loadError}</p>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button onClick={onExamEnd} style={S.btnDark}>Go Back</button>
              <button onClick={() => window.location.reload()} style={S.btnPrimary}>Retry</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── SCREEN: preflight — camera + "Start Exam" button ─────────────────────
  // The <video ref={videoRef}> is mounted HERE so the ref is valid when the
  // user clicks the button and we call getUserMedia inside the click handler.
  if (phase === "preflight") {
    return (
      <>
        <FontLink />
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
        `}</style>
        <div style={S.fullDark}>
          <div style={{ animation:"fadeUp .45s ease", textAlign:"center", maxWidth:480, width:"100%", padding:"0 20px" }}>

            {/* ── Camera preview box (video ref lives here) ── */}
            <div style={{ borderRadius:16, overflow:"hidden", background:"#1e293b", position:"relative", aspectRatio:"4/3", marginBottom:28, border:"2px solid #334155" }}>
              <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)", display:"block" }}
              />
              <canvas
                ref={canvasRef}
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", transform:"scaleX(-1)" }}
              />
              {/* overlay when not yet active */}
              {!cameraActive && (
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, background:"rgba(15,23,42,.92)" }}>
                  {camStatus === "requesting" ? (
                    <>
                      <div style={{ ...S.spinner, width:36, height:36, borderWidth:3 }} />
                      <span style={{ color:"#94a3b8", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>Requesting camera...</span>
                    </>
                  ) : camStatus === "denied" || camStatus === "error" ? (
                    <>
                      <WifiOff size={32} color="#ef4444" />
                      <span style={{ color:"#fca5a5", fontSize:12, fontFamily:"'DM Sans',sans-serif", padding:"0 20px", lineHeight:1.5, textAlign:"center" }}>{cameraError}</span>
                    </>
                  ) : (
                    <>
                      <Camera size={32} color="#475569" />
                      <span style={{ color:"#64748b", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>Camera preview will appear here</span>
                    </>
                  )}
                </div>
              )}
              {cameraActive && (
                <div style={{ position:"absolute", top:10, left:10, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#ef4444", animation:"pulse-dot 1.5s ease infinite", display:"block" }} />
                  <span style={{ color:"#fff", fontSize:11, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>LIVE</span>
                </div>
              )}
            </div>

            {/* ── Exam info ── */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius:12, padding:"8px 18px", marginBottom:14 }}>
                <Shield size={18} color="#fff" />
                <span style={{ color:"#fff", fontWeight:700, fontSize:15, fontFamily:"'DM Sans',sans-serif" }}>{exam?.subject || exam?.title || "Exam"}</span>
              </div>
              <h2 style={{ color:"#f1f5f9", fontFamily:"'DM Sans',sans-serif", fontSize:22, fontWeight:700, margin:"0 0 6px" }}>Ready to begin?</h2>
              <p style={{ color:"#94a3b8", fontFamily:"'DM Sans',sans-serif", fontSize:14, margin:"0 0 4px" }}>
                {questions.length} questions &nbsp;·&nbsp; {exam?.duration || 60} minutes
              </p>
              <p style={{ color:"#64748b", fontFamily:"'DM Sans',sans-serif", fontSize:12, margin:0 }}>
                Your camera will be activated when you click Start.
              </p>
            </div>

            {/* ── Rules checklist ── */}
            <div style={{ background:"#1e293b", borderRadius:14, border:"1px solid #334155", padding:"14px 18px", marginBottom:20, textAlign:"left" }}>
              {[
                "Sit in a well-lit area with your face clearly visible",
                "No other person should appear in the camera frame",
                "Do not switch tabs or exit fullscreen during the exam",
                "Keep your eyes open and face the camera at all times",
              ].map((rule, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"5px 0" }}>
                  <CheckCircle size={13} color="#10b981" style={{ marginTop:2, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:"#94a3b8", fontFamily:"'DM Sans',sans-serif" }}>{rule}</span>
                </div>
              ))}
            </div>

            {/* ── Camera denied notice ── */}
            {(camStatus === "denied" || camStatus === "error") && (
              <div style={{ background:"#450a0a", border:"1px solid #7f1d1d", borderRadius:12, padding:"10px 14px", marginBottom:14, textAlign:"left" }}>
                <p style={{ margin:0, fontSize:12, color:"#fca5a5", fontFamily:"'DM Sans',sans-serif" }}>
                  Camera access failed. You may still take the exam, but proctoring will be limited.
                </p>
              </div>
            )}

            {/* ── Start button ── */}
            <button
              onClick={handleStartExam}
              disabled={camStatus === "requesting"}
              style={{
                width:"100%", padding:14, borderRadius:14, border:"none",
                cursor: camStatus === "requesting" ? "wait" : "pointer",
                background: camStatus === "requesting" ? "#1e3a5f" : "linear-gradient(135deg,#1d4ed8,#3b82f6)",
                color:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:16, fontWeight:700,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                boxShadow:"0 8px 24px rgba(29,78,216,.35)", transition:"opacity .15s",
              }}
            >
              {camStatus === "requesting"
                ? <><div style={{ ...S.spinner, width:20, height:20, borderWidth:2, margin:0 }} /> Preparing...</>
                : <><Play size={18} /> Start Exam</>
              }
            </button>

            {/* Continue without camera (shown after denial) */}
            {(camStatus === "denied" || camStatus === "error") && (
              <button
                onClick={handleStartExam}
                style={{ marginTop:10, width:"100%", padding:11, borderRadius:12, border:"1px solid #334155", background:"transparent", color:"#94a3b8", fontFamily:"'DM Sans',sans-serif", fontSize:14, cursor:"pointer" }}
              >
                Continue without camera
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  if (!currentQ && questions.length > 0) return null;

  // ══════════════════════════════════════════════════════════════════════════
  // ── SCREEN: running exam ──────────────────────────────────────────────────

  const SubmitModal = () => (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
            <AlertTriangle size={26} color="#f59e0b" />
          </div>
          <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:"#111827", fontFamily:"'DM Sans',sans-serif" }}>Submit Exam?</h3>
          <p style={{ margin:"6px 0 0", fontSize:13, color:"#6b7280", fontFamily:"'DM Sans',sans-serif" }}>
            {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? "s" : ""} unanswered
          </p>
        </div>
        <div style={{ background:"#f9fafb", borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
          {[
            { label:"Answered",          val:answeredCount,                    color:"#059669" },
            { label:"Marked for review", val:markedCount,                      color:"#d97706" },
            { label:"Unanswered",        val:questions.length - answeredCount, color:"#ef4444" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f3f4f6" }}>
              <span style={{ fontSize:13, color:"#6b7280", fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{val}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => setShowSubmitConfirm(false)} style={{ ...S.btnSecondary, flex:1 }}>Cancel</button>
          <button onClick={() => { setShowSubmitConfirm(false); triggerResult(); }} style={{ ...S.btnPrimary, flex:1, background:"#059669" }}>Submit Exam</button>
        </div>
      </div>
    </div>
  );

  const ResultModal = () => {
    if (!resultData) return null;
    const pct   = parseFloat(resultData.percentage);
    const grade = pct >= 70
      ? { label:"Passed", emoji:"🎉", grad:"linear-gradient(135deg,#059669,#0d9488)", light:"#d1fae5", border:"#6ee7b7", text:"#065f46" }
      : pct >= 40
      ? { label:"Average", emoji:"📊", grad:"linear-gradient(135deg,#d97706,#ea580c)", light:"#fef3c7", border:"#fcd34d", text:"#92400e" }
      : { label:"Needs Work", emoji:"📚", grad:"linear-gradient(135deg,#dc2626,#be123c)", light:"#fee2e2", border:"#fca5a5", text:"#991b1b" };
    return (
      <div style={S.overlay}>
        <div style={{ ...S.modal, maxWidth:600, maxHeight:"90vh", overflowY:"auto", padding:0 }}>
          <div style={{ background:grade.grad, padding:"28px 28px 24px", borderRadius:"16px 16px 0 0", color:"#fff" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <p style={{ margin:0, fontSize:12, opacity:.8, fontFamily:"'DM Sans',sans-serif", letterSpacing:1, textTransform:"uppercase" }}>{exam?.subject||exam?.title}</p>
                <h2 style={{ margin:"4px 0 0", fontSize:22, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>Exam Complete {grade.emoji}</h2>
              </div>
              <Award size={36} style={{ opacity:.8 }} />
            </div>
          </div>
          <div style={{ padding:28 }}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:120, height:120, borderRadius:"50%", border:`4px solid ${grade.border}`, background:grade.light, marginBottom:10 }}>
                <span style={{ fontSize:30, fontWeight:800, color:grade.text, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{resultData.percentage}%</span>
                <span style={{ fontSize:11, fontWeight:700, color:grade.text, fontFamily:"'DM Sans',sans-serif", marginTop:2 }}>{grade.label}</span>
              </div>
              <p style={{ margin:0, fontSize:16, fontWeight:700, color:"#111827", fontFamily:"'DM Sans',sans-serif" }}>{resultData.obtainedMarks} / {resultData.totalMarks} marks</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {[
                { label:"Correct",    val:resultData.correctCount,     Icon:CheckCircle, bg:"#d1fae5", border:"#6ee7b7", tc:"#065f46", ic:"#059669" },
                { label:"Incorrect",  val:resultData.incorrectCount,   Icon:XCircle,     bg:"#fee2e2", border:"#fca5a5", tc:"#991b1b", ic:"#dc2626" },
                { label:"Skipped",    val:resultData.unattemptedCount, Icon:AlertCircle, bg:"#f3f4f6", border:"#e5e7eb", tc:"#374151", ic:"#6b7280" },
                { label:"Time Taken", val:fmtTaken(resultData.timeTaken), Icon:Clock,   bg:"#dbeafe", border:"#93c5fd", tc:"#1e3a8a", ic:"#3b82f6" },
              ].map(({ label, val, Icon, bg, border, tc, ic }) => (
                <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                    <Icon size={14} color={ic} />
                    <span style={{ fontSize:11, fontWeight:600, color:ic, fontFamily:"'DM Sans',sans-serif", textTransform:"uppercase", letterSpacing:.5 }}>{label}</span>
                  </div>
                  <p style={{ margin:0, fontSize:26, fontWeight:800, color:tc, fontFamily:"'DM Mono',monospace" }}>{val}</p>
                </div>
              ))}
            </div>
            {violationHistory.length > 0 && (
              <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
                <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:"#991b1b", fontFamily:"'DM Sans',sans-serif", textTransform:"uppercase" }}>Violations ({resultData.violations}/3)</p>
                {violationHistory.map((v, i) => <p key={i} style={{ margin:"3px 0", fontSize:12, color:"#b91c1c", fontFamily:"'DM Sans',sans-serif" }}>• {v.reason}</p>)}
              </div>
            )}
            <div style={{ marginBottom:24 }}>
              <h4 style={{ margin:"0 0 12px", fontSize:13, fontWeight:700, color:"#374151", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:6, textTransform:"uppercase" }}>
                <BarChart3 size={14} color="#3b82f6" /> Question Analysis
              </h4>
              <div style={{ maxHeight:220, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
                {resultData.qResults.map((q, i) => (
                  <div key={q._id||q.id} style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:13, color:"#374151", fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>Q{i+1}: {(q.text||q.question)?.slice(0,50)}...</span>
                      <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, flexShrink:0, fontWeight:600, fontFamily:"'DM Sans',sans-serif", background:q.isCorrect?"#d1fae5":q.isAttempted?"#fee2e2":"#f3f4f6", color:q.isCorrect?"#065f46":q.isAttempted?"#991b1b":"#6b7280" }}>
                        {q.isCorrect ? "✓ Correct" : q.isAttempted ? "✗ Wrong" : "Skipped"}
                      </span>
                    </div>
                    <p style={{ margin:0, fontSize:12, color:"#9ca3af", fontFamily:"'DM Sans',sans-serif" }}>Your answer: {q.userAnswer !== -1 ? (q.options||[])[q.userAnswer] : "—"}</p>
                    {!q.isCorrect && q.isAttempted && <p style={{ margin:"3px 0 0", fontSize:12, color:"#059669", fontFamily:"'DM Sans',sans-serif" }}>Correct: {(q.options||[])[q.correctAnswer]}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button
                onClick={() => {
                  const txt = `EXAM RESULT\n${exam?.subject||exam?.title}\n${resultData.submittedAt}\n\nScore: ${resultData.obtainedMarks}/${resultData.totalMarks} (${resultData.percentage}%)\nCorrect: ${resultData.correctCount} | Wrong: ${resultData.incorrectCount} | Skipped: ${resultData.unattemptedCount}\nViolations: ${resultData.violations}/3\n\nQ&A:\n${resultData.qResults.map((q,i)=>`Q${i+1} [${q.isCorrect?"✓":"✗"}] ${q.text||q.question}`).join("\n")}`;
                  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt])); a.download = `result-${Date.now()}.txt`; a.click();
                }}
                style={{ ...S.btnSecondary, flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
              ><Download size={15}/> Download</button>
              <button onClick={() => { setShowResult(false); onExamEnd(); }} style={{ ...S.btnPrimary, flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Home size={15}/> Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <FontLink />
      <style>{`
        *{box-sizing:border-box} body{margin:0;font-family:'DM Sans',sans-serif}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        .opt-card:hover{border-color:#3b82f6!important;background:#eff6ff!important}
        .nav-btn:hover{opacity:.85}
        @keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ position:"fixed", inset:0, background:"#f1f5f9", display:"flex", zIndex:50, userSelect:"none" }}>

        {showWarning && (
          <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:9999, animation:"slideDown .3s ease" }}>
            <div style={{ background:"#dc2626", color:"#fff", padding:"12px 20px", borderRadius:12, boxShadow:"0 8px 32px rgba(220,38,38,.4)", display:"flex", alignItems:"center", gap:10, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:500 }}>
              <AlertTriangle size={18}/> {warningMessage}
            </div>
          </div>
        )}

        {showSubmitConfirm && <SubmitModal />}
        {showResult        && <ResultModal />}

        {/* LEFT */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, background:"#f8fafc" }}>
          {/* top bar */}
          <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Shield size={18} color="#fff"/>
              </div>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:14, color:"#111827", fontFamily:"'DM Sans',sans-serif" }}>{exam?.subject||exam?.title||"Exam"}</p>
                <p style={{ margin:0, fontSize:11, color:"#9ca3af", fontFamily:"'DM Sans',sans-serif" }}>Question {currentQuestion+1} of {questions.length}</p>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:10, background:timeColor.bg, border:`1px solid ${timeColor.border}` }}>
                {timeRemaining < 300 ? <Zap size={15} color={timeColor.text}/> : <Clock size={15} color={timeColor.text}/>}
                <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:15, color:timeColor.text }}>{fmt(timeRemaining)}</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:cameraActive?"#10b981":"#ef4444", animation:cameraActive?"pulse-dot 2s ease infinite":"none" }}/>
                <div style={{ display:"flex", gap:4 }}>
                  {[1,2,3].map(i => <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:i<=violations?"#ef4444":"#e5e7eb", transition:"background .3s" }}/>)}
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:violations>=2?"#dc2626":"#9ca3af", fontFamily:"'DM Mono',monospace" }}>{violations}/3</span>
              </div>
            </div>
          </div>

          {/* question */}
          <div style={{ flex:1, overflowY:"auto", padding:24 }}>
            <div style={{ maxWidth:680, margin:"0 auto" }}>
              <div style={{ background:"#fff", borderRadius:16, border:"1px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,.04)", padding:28 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", color:"#fff", fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:8, fontFamily:"'DM Sans',sans-serif" }}>Q{currentQuestion+1}</span>
                    <span style={{ fontSize:12, color:"#9ca3af", fontFamily:"'DM Sans',sans-serif" }}>{currentQ?.marks||2} marks</span>
                  </div>
                  <button
                    onClick={() => setMarkedForReview(prev => prev.includes(currentQ?._id||currentQ?.id) ? prev.filter(id=>id!==(currentQ?._id||currentQ?.id)) : [...prev, currentQ?._id||currentQ?.id])}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif", background:markedForReview.includes(currentQ?._id||currentQ?.id)?"#fef3c7":"#f3f4f6", color:markedForReview.includes(currentQ?._id||currentQ?.id)?"#b45309":"#6b7280" }}
                  >
                    <Flag size={13}/> {markedForReview.includes(currentQ?._id||currentQ?.id) ? "Marked" : "Mark for Review"}
                  </button>
                </div>
                <h3 style={{ margin:"0 0 24px", fontSize:16, fontWeight:600, color:"#111827", lineHeight:1.6, fontFamily:"'DM Sans',sans-serif" }}>
                  {currentQ?.text||currentQ?.question}
                </h3>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {(currentQ?.options||[]).map((opt, i) => {
                    const sel = answers[currentQ?._id||currentQ?.id] === i;
                    return (
                      <div key={i} className="opt-card"
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQ?._id||currentQ?.id]: i }))}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", border:`2px solid ${sel?"#3b82f6":"#e5e7eb"}`, borderRadius:12, cursor:"pointer", transition:"all .15s ease", background:sel?"#eff6ff":"#fff", boxShadow:sel?"0 0 0 3px rgba(59,130,246,.1)":"none" }}
                      >
                        <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${sel?"#3b82f6":"#d1d5db"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {sel && <div style={{ width:10, height:10, borderRadius:"50%", background:"#3b82f6" }}/>}
                        </div>
                        <span style={{ fontSize:14, fontFamily:"'DM Sans',sans-serif", color:sel?"#1e40af":"#374151", fontWeight:sel?500:400, flex:1 }}>{opt}</span>
                        {sel && <span style={{ fontSize:11, background:"#dbeafe", color:"#1e40af", padding:"2px 8px", borderRadius:20, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>Selected</span>}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:28, paddingTop:20, borderTop:"1px solid #f3f4f6" }}>
                  <button onClick={() => setCurrentQuestion(p=>p-1)} disabled={currentQuestion===0}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", border:"1px solid #e5e7eb", borderRadius:10, background:"#fff", cursor:currentQuestion===0?"not-allowed":"pointer", opacity:currentQuestion===0?.4:1, fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:500, color:"#374151" }}>
                    <ChevronLeft size={15}/> Previous
                  </button>
                  <span style={{ fontSize:12, color:"#9ca3af", fontFamily:"'DM Mono',monospace" }}>{currentQuestion+1} / {questions.length}</span>
                  <button onClick={() => setCurrentQuestion(p=>p+1)} disabled={currentQuestion===questions.length-1}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", border:"1px solid #e5e7eb", borderRadius:10, background:"#fff", cursor:currentQuestion===questions.length-1?"not-allowed":"pointer", opacity:currentQuestion===questions.length-1?.4:1, fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:500, color:"#374151" }}>
                    Next <ChevronRight size={15}/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT sidebar — videoRef lives here during the running phase */}
        <div style={{ width:288, background:"#fff", borderLeft:"1px solid #e2e8f0", display:"flex", flexDirection:"column", overflowY:"auto" }}>
          <div style={{ padding:16, flex:1 }}>
            {/* camera */}
            <div style={{ borderRadius:14, overflow:"hidden", background:"#0f172a", position:"relative", aspectRatio:"4/3", marginBottom:14 }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:"scaleX(-1)", display:"block" }}/>
              <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", transform:"scaleX(-1)" }}/>
              <div style={{ position:"absolute", top:8, left:8, display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:cameraActive?"#ef4444":"#64748b", animation:cameraActive?"pulse-dot 1.5s ease infinite":"none", display:"block" }}/>
                <span style={{ color:"#fff", fontSize:11, fontWeight:700, fontFamily:"'DM Sans',sans-serif", textShadow:"0 1px 3px rgba(0,0,0,.5)" }}>LIVE</span>
              </div>
              {!cameraActive && (
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"rgba(15,23,42,.85)", gap:6 }}>
                  <WifiOff size={22} color="#94a3b8"/>
                  <span style={{ color:"#94a3b8", fontSize:11, fontFamily:"'DM Sans',sans-serif", textAlign:"center", padding:"0 12px", lineHeight:1.4 }}>{cameraError || "Camera unavailable"}</span>
                </div>
              )}
              <div style={{ position:"absolute", bottom:8, right:8 }}>
                {modelStatus==="loading"  && <span style={S.badge("#fbbf24")}>Loading AI...</span>}
                {modelStatus==="ready"    && <span style={S.badge("#34d399")}>● AI Active</span>}
                {(modelStatus==="fallback"||modelStatus==="error") && <span style={S.badge("#fbbf24")}>Motion Mode</span>}
              </div>
            </div>

            {/* proctoring status */}
            <div style={{ background:"#f8fafc", borderRadius:12, border:"1px solid #e2e8f0", padding:"12px 14px", marginBottom:14 }}>
              <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, color:"#94a3b8", fontFamily:"'DM Sans',sans-serif", textTransform:"uppercase", letterSpacing:.8, display:"flex", alignItems:"center", gap:5 }}>
                <Video size={11}/> Proctoring Status
              </p>
              {[
                { label:"Camera",        ok:cameraActive,   okText:"Active",   failText:"Off",       OkIcon:Wifi,        FailIcon:WifiOff    },
                { label:"Face",          ok:faceDetected,   okText:"Detected", failText:"Not found", OkIcon:UserCheck,   FailIcon:UserX      },
                { label:"Eyes",          ok:eyesOpen,       okText:"Open",     failText:"Closed",    OkIcon:Eye,         FailIcon:EyeOff     },
                { label:"Single person", ok:!multipleFaces, okText:"Verified", failText:"Multiple!", OkIcon:UserCheck,   FailIcon:Users      },
                { label:"Attention",     ok:!lookingAway,   okText:"Focused",  failText:"Away",      OkIcon:CheckCircle, FailIcon:AlertCircle},
              ].map(({ label, ok, okText, failText, OkIcon, FailIcon }) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid #f1f5f9" }}>
                  <span style={{ fontSize:12, color:"#64748b", fontFamily:"'DM Sans',sans-serif" }}>{label}</span>
                  <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, fontFamily:"'DM Sans',sans-serif", color:ok?"#059669":"#dc2626", animation:!ok?"pulse-dot 1.5s ease infinite":"none" }}>
                    {ok ? <OkIcon size={11}/> : <FailIcon size={11}/>} {ok ? okText : failText}
                  </span>
                </div>
              ))}
            </div>

            {/* violations */}
            {violations > 0 && (
              <div style={{ borderRadius:12, padding:"11px 13px", marginBottom:14, background:violations===1?"#fef3c7":violations===2?"#fff7ed":"#fee2e2", border:`1px solid ${violations===1?"#fcd34d":violations===2?"#fb923c":"#fca5a5"}` }}>
                <div style={{ display:"flex", gap:8 }}>
                  <AlertTriangle size={14} color={violations===1?"#d97706":violations===2?"#ea580c":"#dc2626"} style={{ marginTop:1, flexShrink:0 }}/>
                  <div>
                    <p style={{ margin:0, fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif", color:violations===1?"#92400e":violations===2?"#9a3412":"#991b1b" }}>
                      {violations===1?"Warning 1 of 3":violations===2?"Final Warning!":"Terminating..."}
                    </p>
                    <p style={{ margin:"2px 0 0", fontSize:11, color:"#6b7280", fontFamily:"'DM Sans',sans-serif" }}>{3-violations} strike{3-violations!==1?"s":""} remaining</p>
                  </div>
                </div>
              </div>
            )}

            {/* navigator */}
            <div style={{ marginBottom:14 }}>
              <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:700, color:"#94a3b8", fontFamily:"'DM Sans',sans-serif", textTransform:"uppercase", letterSpacing:.8 }}>Navigator</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:5, marginBottom:10 }}>
                {questions.map((q, i) => {
                  const qId = q._id||q.id;
                  let bg="#f1f5f9", col="#64748b";
                  if (i===currentQuestion)                { bg="#1d4ed8"; col="#fff"; }
                  else if (markedForReview.includes(qId)) { bg="#f59e0b"; col="#fff"; }
                  else if (answers[qId] !== undefined)    { bg="#10b981"; col="#fff"; }
                  return (
                    <button key={qId} className="nav-btn" onClick={() => setCurrentQuestion(i)}
                      style={{ background:bg, color:col, border:"none", borderRadius:8, padding:"7px 0", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono',monospace", transition:"all .15s" }}>
                      {i+1}
                    </button>
                  );
                })}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"5px 12px" }}>
                {[["#10b981","Answered"],["#f59e0b","Marked"],["#1d4ed8","Current"],["#e2e8f0","Not visited"]].map(([bg,lbl]) => (
                  <span key={lbl} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#94a3b8", fontFamily:"'DM Sans',sans-serif" }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:bg, display:"inline-block" }}/> {lbl}
                  </span>
                ))}
              </div>
            </div>

            {/* progress */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:11, color:"#94a3b8", fontFamily:"'DM Sans',sans-serif" }}>Progress</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#475569", fontFamily:"'DM Mono',monospace" }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ width:"100%", background:"#f1f5f9", borderRadius:99, height:6 }}>
                <div style={{ width:`${progress}%`, background:"linear-gradient(90deg,#10b981,#059669)", height:6, borderRadius:99, transition:"width .4s ease" }}/>
              </div>
            </div>

            {/* stats */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
              {[
                { val:answeredCount, label:"Done",   bg:"#d1fae5", border:"#6ee7b7", color:"#065f46" },
                { val:markedCount,   label:"Marked", bg:"#fef3c7", border:"#fcd34d", color:"#92400e" },
                { val:notVisited,    label:"Left",   bg:"#f1f5f9", border:"#e2e8f0", color:"#475569" },
              ].map(({ val, label, bg, border, color }) => (
                <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                  <p style={{ margin:0, fontSize:20, fontWeight:800, color, fontFamily:"'DM Mono',monospace" }}>{val}</p>
                  <p style={{ margin:"2px 0 0", fontSize:10, color, fontFamily:"'DM Sans',sans-serif", opacity:.8 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* submit */}
          <div style={{ padding:"14px 16px", borderTop:"1px solid #f1f5f9", background:"#f8fafc" }}>
            <button
              onClick={() => { answeredCount < questions.length ? setShowSubmitConfirm(true) : triggerResult(); }}
              style={{ width:"100%", background:"linear-gradient(135deg,#059669,#0d9488)", color:"#fff", padding:13, borderRadius:12, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:7, boxShadow:"0 4px 12px rgba(5,150,105,.3)", transition:"opacity .15s" }}
            >
              <CheckCircle size={16}/> Submit Exam
            </button>
            <p style={{ textAlign:"center", fontSize:11, color:"#94a3b8", margin:"8px 0 0", fontFamily:"'DM Sans',sans-serif" }}>{answeredCount}/{questions.length} answered</p>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Style tokens ─────────────────────────────────────────────────────────────
const S = {
  fullDark: {
    position:"fixed", inset:0, background:"#0f172a",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:9990, padding:24,
  },
  spinner: {
    width:56, height:56, borderRadius:"50%",
    border:"3px solid #1e40af", borderTopColor:"#3b82f6",
    margin:"0 auto 20px", animation:"spin 0.8s linear infinite",
    display:"block",
  },
  overlay: {
    position:"fixed", inset:0, background:"rgba(0,0,0,.65)",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:9999, padding:16, backdropFilter:"blur(4px)",
  },
  modal: {
    background:"#fff", borderRadius:20, width:"100%", maxWidth:380,
    boxShadow:"0 24px 64px rgba(0,0,0,.25)", padding:28,
  },
  btnPrimary: {
    padding:"10px 22px", background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",
    color:"#fff", border:"none", borderRadius:10, cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:600,
  },
  btnSecondary: {
    padding:"10px 22px", background:"#f8fafc", color:"#374151",
    border:"1px solid #e5e7eb", borderRadius:10, cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:500,
  },
  btnDark: {
    padding:"10px 22px", background:"#1e293b", color:"#e2e8f0",
    border:"1px solid #334155", borderRadius:10, cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif", fontSize:14,
  },
  badge: (color) => ({
    background:"rgba(0,0,0,.6)", color,
    fontSize:10, padding:"3px 8px", borderRadius:20,
    fontFamily:"'DM Sans',sans-serif",
  }),
};

export default ExamInterface;