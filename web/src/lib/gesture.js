// Rule-based hand-gesture classification from MediaPipe hand landmarks.
//
// Game moves:
//   rock       -> fist (thumb tucked sideways)
//   paper      -> open hand (4-5 fingers up)
//   scissors   -> index + middle up
//
// Menu gestures (for touch-free navigation):
//   thumbs_up   -> thumb clearly above the hand, all fingers curled
//   thumbs_down -> thumb clearly below the hand, all fingers curled
//   point       -> index finger only
//
// `landmarks` is an array of 21 { x, y, z } normalized points (MediaPipe Web).
// `handedness` is the category name for the hand: "Left" or "Right".

// Fingertip index -> PIP joint index for the four non-thumb fingers.
const FINGER_TIPS = [
  [8, 6], // index
  [12, 10], // middle
  [16, 14], // ring
  [20, 18], // pinky
];
const THUMB_TIP = 4;
const THUMB_IP = 3;
const THUMB_MCP = 2;
const WRIST = 0;
const MIDDLE_MCP = 9;

// Bone connections between the 21 landmarks, for drawing the skeleton.
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];

export const GESTURE_ICONS = {
  rock: "✊",
  paper: "✋",
  scissors: "✌️",
  thumbs_up: "👍",
  thumbs_down: "👎",
  point: "👉",
};

/** Return [thumb, index, middle, ring, pinky] as 1 (up) / 0 (down). */
function fingersUp(landmarks, handedness) {
  const fingers = [];

  // Thumb: compare tip vs IP joint on the x-axis. Direction depends on which
  // hand it is (the video is shown mirrored, but MediaPipe reports handedness
  // for the raw frame, so this stays consistent).
  if (handedness === "Right") {
    fingers.push(landmarks[THUMB_TIP].x < landmarks[THUMB_IP].x ? 1 : 0);
  } else {
    fingers.push(landmarks[THUMB_TIP].x > landmarks[THUMB_IP].x ? 1 : 0);
  }

  // Other four fingers: tip is above (smaller y) its PIP joint when extended.
  for (const [tip, pip] of FINGER_TIPS) {
    fingers.push(landmarks[tip].y < landmarks[pip].y ? 1 : 0);
  }
  return fingers;
}

/**
 * Classify a single hand.
 * Returns { move, gesture } where:
 *   move    - "rock" | "paper" | "scissors" | null   (what counts in a round)
 *   gesture - move or "thumbs_up" | "thumbs_down" | "point" | null
 */
export function classifyHand(landmarks, handedness = "Right") {
  if (!landmarks || landmarks.length < 21) return { move: null, gesture: null };

  const [thumb, index, middle, ring, pinky] = fingersUp(landmarks, handedness);
  const others = index + middle + ring + pinky;
  const extended = thumb + others;

  // Scissors: index and middle up, ring and pinky down.
  if (index && middle && !ring && !pinky) {
    return { move: "scissors", gesture: "scissors" };
  }

  // Pointing: index only.
  if (index && !middle && !ring && !pinky) {
    return { move: null, gesture: "point" };
  }

  // All four fingers curled: fist, thumbs-up, or thumbs-down.
  if (others === 0) {
    // Hand size as a scale reference (wrist -> middle knuckle).
    const size = Math.hypot(
      landmarks[MIDDLE_MCP].x - landmarks[WRIST].x,
      landmarks[MIDDLE_MCP].y - landmarks[WRIST].y
    );
    const rise = landmarks[THUMB_MCP].y - landmarks[THUMB_TIP].y; // + = tip higher
    if (rise > 0.28 * size) return { move: null, gesture: "thumbs_up" };
    if (rise < -0.28 * size) return { move: null, gesture: "thumbs_down" };
    return { move: "rock", gesture: "rock" };
  }

  // Paper: most fingers open.
  if (extended >= 4) {
    return { move: "paper", gesture: "paper" };
  }

  return { move: null, gesture: null };
}
