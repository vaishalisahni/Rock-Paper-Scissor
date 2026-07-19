# Rock-Paper-Scissors — Computer Vision

Play Rock-Paper-Scissors against the computer using your **webcam**. The game
detects your hand with MediaPipe's hand-tracking model, classifies the gesture,
picks its own move, and keeps score — no training data or model files needed.

This repo has **two versions**:

| Version | Folder | Use it for |
|---------|--------|------------|
| 🖥️ **Desktop** (Python + OpenCV) | this folder | Running locally on your own machine |
| 🌐 **Web** (React + Vite + MediaPipe Web) | [`web/`](web/) | **Deploying online** — anyone plays with their own webcam via a URL |

The rest of this file covers the desktop version. For the deployable web app,
see [`web/README.md`](web/README.md).

## How it works (desktop)

1. **OpenCV** grabs frames from your webcam.
2. **MediaPipe Hands** finds 21 landmarks on your hand.
3. A small rule-based classifier (`gesture.py`) checks which fingers are
   extended and maps the pattern to a move:

   | Move       | Gesture                         |
   |------------|---------------------------------|
   | Rock       | Closed fist                     |
   | Paper      | Open hand (4–5 fingers up)      |
   | Scissors   | Index + middle finger up        |

4. `logic.py` holds the pure win/lose/tie rules; `rps_game.py` runs the game
   loop, countdown, and on-screen UI.

Rule-based detection is used instead of a trained CNN because it is reliable
out of the box, needs no dataset, and is easy to read.

## Setup

Requires Python 3.9+ and a webcam.

```bash
cd Rock-Paper-Scissors
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python rps_game.py            # uses default camera (index 0)
python rps_game.py --camera 1 # pick a different camera
```

### Controls

| Key            | Action                              |
|----------------|-------------------------------------|
| `SPACE` / `P`  | Play a round (3-2-1 countdown)      |
| `R`            | Reset the score                     |
| `Q` / `ESC`    | Quit                                |

Press **SPACE**, wait for the countdown, then hold your gesture on "SHOOT!".
Keep your hand well-lit and inside the frame for the best detection.

## Project layout

```
Rock-Paper-Scissors/
├── rps_game.py       # main game loop + webcam UI
├── gesture.py        # MediaPipe hand detection + gesture classifier
├── logic.py          # pure RPS rules (no dependencies, unit-testable)
├── requirements.txt
└── README.md
```

## Testing the game rules

`logic.py` has no heavy dependencies, so the rules can be checked directly:

```bash
python -c "from logic import decide; print(decide('rock','scissors'))"  # win
```

## Troubleshooting

- **"Could not open camera 0"** — another app may be using the webcam, or the
  index is wrong. Try `--camera 1`.
- **Gesture not recognized** — improve lighting, show your full hand, and keep
  fingers clearly separated for scissors.
- **mediapipe install fails** — it needs a recent `pip`; run
  `python -m pip install --upgrade pip` first.
# Rock-Paper-Scissor
