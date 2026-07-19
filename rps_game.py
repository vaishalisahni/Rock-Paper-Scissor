"""Rock-Paper-Scissors played with your webcam.

Show a hand gesture to the camera; the game reads it with computer vision,
picks its own move, and keeps score.

Controls
    SPACE / P : start a round (3-2-1 countdown, then it reads your hand)
    R         : reset the score
    Q / ESC   : quit
"""

from __future__ import annotations

import random
import time

import cv2

from gesture import GestureRecognizer
from logic import BEATS, MOVES, decide

EMOJI = {"rock": "[ Rock ]", "paper": "[ Paper ]", "scissors": "[ Scissors ]"}

# Colors (BGR)
WHITE = (255, 255, 255)
GREEN = (80, 220, 120)
RED = (80, 80, 240)
YELLOW = (60, 210, 250)
GREY = (170, 170, 170)
DARK = (30, 30, 30)


def _banner(frame, text, color, y, scale=1.1, thickness=2):
    """Draw centered text with a dark backing bar for readability."""
    w = frame.shape[1]
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, thickness)
    x = (w - tw) // 2
    cv2.rectangle(frame, (x - 14, y - th - 12), (x + tw + 14, y + 12), DARK, -1)
    cv2.putText(frame, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)


class Game:
    STATE_IDLE = "idle"
    STATE_COUNTDOWN = "countdown"
    STATE_RESULT = "result"

    def __init__(self, camera_index: int = 0):
        self.cap = cv2.VideoCapture(camera_index)
        if not self.cap.isOpened():
            raise RuntimeError(
                f"Could not open camera {camera_index}. "
                "Is a webcam connected and not in use by another app?"
            )
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 960)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        self.recognizer = GestureRecognizer()

        self.player_score = 0
        self.computer_score = 0
        self.ties = 0

        self.state = self.STATE_IDLE
        self.countdown_start = 0.0
        self.result_shown_at = 0.0
        self.last_result: dict | None = None

    # -- round flow -----------------------------------------------------------

    def start_round(self):
        if self.state != self.STATE_COUNTDOWN:
            self.state = self.STATE_COUNTDOWN
            self.countdown_start = time.time()
            self.last_result = None

    def _resolve(self, player_move: str | None):
        computer_move = random.choice(MOVES)
        if player_move is None:
            self.last_result = {"outcome": "no_hand", "computer": computer_move}
        else:
            outcome = decide(player_move, computer_move)
            if outcome == "win":
                self.player_score += 1
            elif outcome == "lose":
                self.computer_score += 1
            else:
                self.ties += 1
            self.last_result = {
                "outcome": outcome,
                "player": player_move,
                "computer": computer_move,
            }
        self.state = self.STATE_RESULT
        self.result_shown_at = time.time()

    def reset_score(self):
        self.player_score = self.computer_score = self.ties = 0
        self.state = self.STATE_IDLE
        self.last_result = None

    # -- rendering ------------------------------------------------------------

    def _draw_scoreboard(self, frame, live_move):
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 46), DARK, -1)
        cv2.putText(
            frame,
            f"YOU {self.player_score}   -   {self.computer_score} CPU   (ties {self.ties})",
            (16, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            WHITE,
            2,
            cv2.LINE_AA,
        )
        move_txt = f"detecting: {live_move}" if live_move else "detecting: --"
        cv2.putText(
            frame,
            move_txt,
            (frame.shape[1] - 300, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            GREEN if live_move else GREY,
            2,
            cv2.LINE_AA,
        )

    def _draw_footer(self, frame):
        cv2.putText(
            frame,
            "SPACE play   R reset   Q quit",
            (16, frame.shape[0] - 18),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            GREY,
            1,
            cv2.LINE_AA,
        )

    def _render_result(self, frame):
        r = self.last_result
        if r["outcome"] == "no_hand":
            _banner(frame, "No hand detected - try again", YELLOW, 110)
            _banner(frame, f"CPU played {EMOJI[r['computer']]}", GREY, 170, scale=0.9)
            return
        _banner(frame, f"You {EMOJI[r['player']]}   vs   CPU {EMOJI[r['computer']]}", WHITE, 110, scale=0.9)
        if r["outcome"] == "win":
            _banner(frame, "YOU WIN!", GREEN, 180, scale=1.5, thickness=3)
        elif r["outcome"] == "lose":
            _banner(frame, "YOU LOSE", RED, 180, scale=1.5, thickness=3)
        else:
            _banner(frame, "TIE", YELLOW, 180, scale=1.5, thickness=3)

    # -- main loop ------------------------------------------------------------

    def run(self):
        window = "Rock Paper Scissors - Computer Vision"
        cv2.namedWindow(window, cv2.WINDOW_NORMAL)

        while True:
            ok, frame = self.cap.read()
            if not ok:
                print("Failed to read from camera.")
                break

            frame = cv2.flip(frame, 1)  # mirror for a natural selfie view
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.recognizer.process(rgb)
            self.recognizer.draw(frame, results)
            live_move = self.recognizer.classify(results)

            if self.state == self.STATE_COUNTDOWN:
                elapsed = time.time() - self.countdown_start
                remaining = 3 - int(elapsed)
                if remaining > 0:
                    _banner(frame, str(remaining), YELLOW, frame.shape[0] // 2, scale=4.0, thickness=6)
                    _banner(frame, "get your hand ready...", WHITE, frame.shape[0] // 2 + 70, scale=0.8)
                else:
                    _banner(frame, "SHOOT!", GREEN, frame.shape[0] // 2, scale=2.5, thickness=5)
                    if elapsed >= 3.4:  # brief beat so the player can hold the pose
                        self._resolve(live_move)

            elif self.state == self.STATE_RESULT:
                self._render_result(frame)
                if time.time() - self.result_shown_at > 3.0:
                    self.state = self.STATE_IDLE

            else:  # idle
                _banner(frame, "Press SPACE to play", WHITE, frame.shape[0] // 2, scale=1.0)

            self._draw_scoreboard(frame, live_move)
            self._draw_footer(frame)
            cv2.imshow(window, frame)

            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):  # q or ESC
                break
            if key in (ord(" "), ord("p")):
                self.start_round()
            if key == ord("r"):
                self.reset_score()

        self.cleanup()

    def cleanup(self):
        self.cap.release()
        self.recognizer.close()
        cv2.destroyAllWindows()


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Rock-Paper-Scissors with computer vision.")
    parser.add_argument("--camera", type=int, default=0, help="Camera index (default 0)")
    args = parser.parse_args()

    Game(camera_index=args.camera).run()


if __name__ == "__main__":
    main()
