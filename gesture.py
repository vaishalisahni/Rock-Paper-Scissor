"""Hand-gesture recognition for Rock-Paper-Scissors using MediaPipe.

Uses the modern MediaPipe **Tasks** API (`HandLandmarker`) — the legacy
`mediapipe.solutions` API was removed in newer mediapipe releases.

The classifier is rule-based: it looks at which fingers are extended from the
21 hand landmarks and maps the finger pattern to a move. This is far more
reliable than a small custom CNN and needs no training data.

    Rock     -> fist            (0 fingers up)
    Paper    -> open hand       (4-5 fingers up)
    Scissors -> index + middle  (exactly those two up)

The hand-landmark model (~7 MB) is downloaded automatically on first run.
"""

from __future__ import annotations

import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/"
    "hand_landmarker/float16/1/hand_landmarker.task"
)
_MODEL_PATH = Path(__file__).with_name("hand_landmarker.task")

# Landmark indices for each fingertip and the joint just below it (PIP).
_FINGER_TIPS = {
    "index": (8, 6),
    "middle": (12, 10),
    "ring": (16, 14),
    "pinky": (20, 18),
}
_THUMB_TIP, _THUMB_IP = 4, 3

# Bone connections between the 21 landmarks, for drawing the skeleton.
_HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),          # thumb
    (0, 5), (5, 6), (6, 7), (7, 8),          # index
    (5, 9), (9, 10), (10, 11), (11, 12),     # middle
    (9, 13), (13, 14), (14, 15), (15, 16),   # ring
    (13, 17), (17, 18), (18, 19), (19, 20),  # pinky
    (0, 17),                                 # palm base
]


def _ensure_model() -> str:
    """Download the hand-landmark model on first use; return its local path."""
    if not _MODEL_PATH.exists():
        print("Downloading hand-landmark model (~7 MB, one time)...")
        urllib.request.urlretrieve(_MODEL_URL, _MODEL_PATH)
        print("Model saved to", _MODEL_PATH)
    return str(_MODEL_PATH)


class GestureRecognizer:
    """Wraps MediaPipe HandLandmarker and turns landmarks into an RPS move."""

    def __init__(self, detection_confidence: float = 0.7, tracking_confidence: float = 0.5):
        options = vision.HandLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=_ensure_model()),
            num_hands=1,
            min_hand_detection_confidence=detection_confidence,
            min_hand_presence_confidence=detection_confidence,
            min_tracking_confidence=tracking_confidence,
            running_mode=vision.RunningMode.IMAGE,
        )
        self._detector = vision.HandLandmarker.create_from_options(options)

    def process(self, rgb_frame):
        """Run detection on an RGB frame and return a HandLandmarkerResult."""
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        return self._detector.detect(mp_image)

    def draw(self, bgr_frame, results):
        """Draw the hand skeleton onto a BGR frame (in place)."""
        if not results.hand_landmarks:
            return
        h, w = bgr_frame.shape[:2]
        for landmarks in results.hand_landmarks:
            pts = [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]
            for a, b in _HAND_CONNECTIONS:
                cv2.line(bgr_frame, pts[a], pts[b], (255, 255, 255), 2, cv2.LINE_AA)
            for x, y in pts:
                cv2.circle(bgr_frame, (x, y), 4, (60, 210, 250), -1, cv2.LINE_AA)

    @staticmethod
    def _fingers_up(landmarks, handedness_label: str) -> list[int]:
        """Return [thumb, index, middle, ring, pinky] as 1 (up) / 0 (down)."""
        fingers: list[int] = []

        # Thumb: compare tip vs IP joint on the x-axis. Direction depends on
        # which hand it is and the fact that the camera image is mirrored.
        if handedness_label == "Right":
            fingers.append(1 if landmarks[_THUMB_TIP].x < landmarks[_THUMB_IP].x else 0)
        else:
            fingers.append(1 if landmarks[_THUMB_TIP].x > landmarks[_THUMB_IP].x else 0)

        # Other four fingers: tip is above (smaller y) its PIP joint when up.
        for tip, pip in _FINGER_TIPS.values():
            fingers.append(1 if landmarks[tip].y < landmarks[pip].y else 0)

        return fingers

    def classify(self, results) -> str | None:
        """Classify the first detected hand. Returns 'rock'/'paper'/'scissors' or None."""
        if not results.hand_landmarks:
            return None

        landmarks = results.hand_landmarks[0]
        label = "Right"
        if results.handedness:
            label = results.handedness[0][0].category_name

        thumb, index, middle, ring, pinky = self._fingers_up(landmarks, label)
        extended = thumb + index + middle + ring + pinky

        # Scissors: index and middle up, ring and pinky down.
        if index and middle and not ring and not pinky:
            return "scissors"
        # Rock: everything curled (allow the thumb to poke out a little).
        if index + middle + ring + pinky == 0:
            return "rock"
        # Paper: most fingers open.
        if extended >= 4:
            return "paper"
        return None

    def close(self):
        self._detector.close()
