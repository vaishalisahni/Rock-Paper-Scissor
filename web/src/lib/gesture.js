// Rule-based hand-gesture classification from MediaPipe hand landmarks.
//
//   Rock     -> fist            (0 fingers up)
//   Paper    -> open hand       (4-5 fingers up)
//   Scissors -> index + middle  (exactly those two up)
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

// Bone connections between the 21 landmarks, for drawing the skeleton.
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index
  [5, 9], [9, 10], [10, 11], [11, 12], // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17], // palm base
];

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

/** Classify a single hand. Returns "rock" | "paper" | "scissors" | null. */
export function classifyHand(landmarks, handedness = "Right") {
  if (!landmarks || landmarks.length < 21) return null;

  const [thumb, index, middle, ring, pinky] = fingersUp(landmarks, handedness);
  const extended = thumb + index + middle + ring + pinky;

  if (index && middle && !ring && !pinky) return "scissors";
  if (index + middle + ring + pinky === 0) return "rock";
  if (extended >= 4) return "paper";
  return null;
}
