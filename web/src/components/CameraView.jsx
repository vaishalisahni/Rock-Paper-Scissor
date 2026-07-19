import { useEffect, useRef, useState } from "react";
import { classifyHand, HAND_CONNECTIONS } from "../lib/gesture.js";

/**
 * Renders the webcam feed with a hand-skeleton overlay and continuously
 * classifies the gesture.
 *
 * Props:
 *   landmarkerRef  - ref holding the MediaPipe HandLandmarker (or null)
 *   active         - whether detection should run
 *   cameraOn       - whether the webcam stream should be running
 *   liveMoveRef    - ref the parent reads at "shoot" time (latest game move)
 *   onDetect       - throttled callback { move, gesture, confidence, fps }
 */
export default function CameraView({
  landmarkerRef,
  active,
  cameraOn,
  liveMoveRef,
  onDetect,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const lastEmitRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const fpsRef = useRef(0);
  const lastFrameTsRef = useRef(0);
  const [camError, setCamError] = useState(null);

  // Start/stop the webcam when cameraOn changes.
  //
  // Careful with async races here: React StrictMode mounts twice in dev, and
  // getUserMedia resolves *after* the first cleanup has already run. So the
  // cleanup flips `cancelled`, and the late-resolving stream is stopped
  // immediately instead of leaking (which previously left the device "busy"
  // and made the second mount fail with a stuck error message).
  useEffect(() => {
    if (!cameraOn) {
      setCamError(null);
      return;
    }

    let cancelled = false;
    let stream = null;

    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 960, height: 720, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          // Effect already cleaned up (StrictMode remount / camera toggled
          // off mid-request): release the device right away.
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        // play() can reject with AbortError if we unmount mid-call; harmless.
        await video.play().catch(() => {});
        if (!cancelled) setCamError(null); // success — clear any stale error
      } catch (err) {
        console.error("Camera error:", err);
        if (!cancelled) setCamError(err);
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [cameraOn]);

  // Detection loop.
  useEffect(() => {
    function clearOverlay() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    }

    function drawOverlay(landmarks) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const w = video.videoWidth || canvas.width;
      const h = video.videoHeight || canvas.height;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      if (!landmarks) return;

      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
        ctx.stroke();
      }
      ctx.fillStyle = "#3cd2fa";
      for (const p of landmarks) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick() {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (video && landmarker && video.readyState >= 2) {
        // Only re-run detection when the frame actually advanced.
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;

          // Smoothed processing FPS.
          const now = performance.now();
          if (lastFrameTsRef.current) {
            const inst = 1000 / (now - lastFrameTsRef.current);
            fpsRef.current = fpsRef.current
              ? fpsRef.current * 0.9 + inst * 0.1
              : inst;
          }
          lastFrameTsRef.current = now;

          const result = landmarker.detectForVideo(video, now);
          const landmarks = result.landmarks?.[0] ?? null;
          const handedInfo = result.handednesses?.[0]?.[0];
          const handed = handedInfo?.categoryName ?? "Right";
          const confidence = landmarks ? (handedInfo?.score ?? 0) : 0;
          const { move, gesture } = landmarks
            ? classifyHand(landmarks, handed)
            : { move: null, gesture: null };

          liveMoveRef.current = move;
          drawOverlay(landmarks);

          // Throttle updates to ~7/sec to avoid excess re-renders.
          if (now - lastEmitRef.current > 140) {
            lastEmitRef.current = now;
            onDetect?.({
              move,
              gesture,
              confidence,
              fps: Math.round(fpsRef.current),
            });
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    if (active && cameraOn) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      liveMoveRef.current = null;
      onDetect?.({ move: null, gesture: null, confidence: 0, fps: 0 });
      clearOverlay();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, cameraOn, landmarkerRef, liveMoveRef, onDetect]);

  return (
    <div className="camera">
      <video ref={videoRef} className="camera__video" playsInline muted />
      <canvas ref={canvasRef} className="camera__overlay" />
      {!cameraOn && (
        <div className="camera__off">
          <span className="camera__off-icon">📷</span>
          <p>Camera is off</p>
        </div>
      )}
      {cameraOn && camError && (
        <div className="camera__error">
          <p>📷 Can't access the camera.</p>
          <p className="camera__error-detail">
            Allow camera permission and reload. On a deployed site this must be
            served over HTTPS.
          </p>
        </div>
      )}
    </div>
  );
}
