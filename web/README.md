# Rock-Paper-Scissors — Web (deployable)

A browser version of the game. All computer vision runs **client-side** with
[MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe) (WebAssembly), so
there is **no backend** — every visitor plays with their own webcam. That makes
it a plain static site you can deploy anywhere for free.

```
Browser: webcam → MediaPipe HandLandmarker (WASM) → gesture → game logic → UI
```

## Tech stack

- **React 18 + Vite** — UI and build tooling
- **@mediapipe/tasks-vision** (pinned to `0.10.35`) — in-browser hand tracking
- No server, no database, no API keys

## Run locally

Requires Node 18+ and a webcam.

```bash
cd web
npm install
npm run dev
```

Open the printed URL (e.g. http://localhost:5173) and **allow camera access**.
Click **Play round** (or press <kbd>Space</kbd>), then show ✊ ✋ or ✌️ on "Shoot".

> Camera access needs a **secure context**: `localhost` works in dev, and any
> deployed site must be served over **HTTPS** (all the hosts below are HTTPS).

## Build

```bash
npm run build      # outputs a static site to web/dist/
npm run preview    # preview the production build locally
```

## Deploy

The build in `dist/` is fully static. Pick one:

### Netlify / Vercel (easiest)
- Connect the repo, set **base directory** = `web`, **build command** =
  `npm run build`, **publish/output directory** = `dist`. Done — every push
  redeploys.
- Or drag-and-drop the `web/dist` folder onto <https://app.netlify.com/drop>.

### GitHub Pages
```bash
npm run build
npx gh-pages -d dist        # publishes dist/ to the gh-pages branch
```
`vite.config.js` uses `base: "./"` (relative paths), so it works from a project
subpath like `username.github.io/repo/` without extra config.

## Project layout

```
web/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx                  # game state machine (idle → countdown → shoot → result)
    ├── App.css / index.css
    ├── lib/
    │   ├── rps.js              # pure game rules (decide, randomMove)
    │   └── gesture.js          # landmarks → rock/paper/scissors
    ├── hooks/
    │   └── useHandLandmarker.js # loads the MediaPipe model (WASM + .task)
    └── components/
        ├── CameraView.jsx      # webcam + detection loop + skeleton overlay
        ├── Scoreboard.jsx
        └── Controls.jsx
```

## Notes

- The gesture rules mirror the Python version: fist → rock, open hand → paper,
  index+middle → scissors (`src/lib/gesture.js`).
- The WASM runtime and hand-landmark model load from a CDN on first visit, so
  the initial load needs a network connection; after that the browser caches them.
- To tune detection, tweak the thresholds in `classifyHand()`.
