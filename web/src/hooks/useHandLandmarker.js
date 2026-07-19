import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Pin the WASM runtime to the same version as the npm package so they match.
const MP_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/" +
  "hand_landmarker/float16/1/hand_landmarker.task";

/**
 * Loads the MediaPipe HandLandmarker once and exposes it.
 * Returns { landmarker, status, error } where status is
 * "loading" | "ready" | "error".
 */
export function useHandLandmarker() {
  const landmarkerRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setStatus("ready");
      } catch (err) {
        console.error("Failed to load HandLandmarker:", err);
        if (!cancelled) {
          setError(err);
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  return { landmarker: landmarkerRef, status, error };
}
