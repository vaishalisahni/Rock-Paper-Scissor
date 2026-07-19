import { useCallback, useEffect, useRef, useState } from "react";
import CameraView from "./components/CameraView.jsx";
import CpuPanel from "./components/CpuPanel.jsx";
import Scoreboard from "./components/Scoreboard.jsx";
import Controls from "./components/Controls.jsx";
import StatsPanel from "./components/StatsPanel.jsx";
import ModePicker, { MODES, modeTarget } from "./components/ModePicker.jsx";
import { useHandLandmarker } from "./hooks/useHandLandmarker.js";
import { useLocalStats } from "./hooks/useLocalStats.js";
import { decide, randomMove, LABELS } from "./lib/rps.js";
import { GESTURE_ICONS } from "./lib/gesture.js";
import {
  unlockAudio,
  setMuted,
  speak,
  playWin,
  playLose,
  playTie,
  playMatchWin,
  playMatchLose,
} from "./lib/sound.js";
import "./App.css";

const RESULT_MS = 2200;
const CHANT = ["Rock", "Paper", "Scissors"];
const CHANT_ICONS = ["✊", "✋", "✌️"];
const CHANT_STEP_MS = 700;
const SHOOT_WINDOW_MS = 650; // time to throw your hand after "Shoot!"
const HOLD_MS = 900; // how long a menu gesture must be held to trigger

export default function App() {
  const { landmarker, status } = useHandLandmarker();
  const { stats, addRound, addMatch, resetStats } = useLocalStats();

  // idle | countdown | shoot | result | matchover
  const [phase, setPhase] = useState("idle");
  const [step, setStep] = useState(0); // chant index during countdown
  const [live, setLive] = useState({ move: null, gesture: null, confidence: 0, fps: 0 });
  const [round, setRound] = useState(null); // { outcome, player, computer }
  const [score, setScore] = useState({ player: 0, computer: 0, ties: 0 });
  const [cameraOn, setCameraOn] = useState(true);
  const [mode, setMode] = useState("bo3");
  const [matchWinner, setMatchWinner] = useState(null); // "player" | "computer"
  const [soundOn, setSoundOn] = useState(true);
  const [hold, setHold] = useState(null); // { gesture, pct } while a menu gesture is held

  const liveMoveRef = useRef(null);
  const holdRef = useRef({ gesture: null, since: 0, fired: false });
  const phaseRef = useRef(phase);
  const modeRef = useRef(mode);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const ready = status === "ready";
  const target = modeTarget(mode);
  const playing = phase === "countdown" || phase === "shoot";

  const play = useCallback(() => {
    unlockAudio();
    setPhase((p) => {
      if (p === "matchover") {
        // new match
        setScore({ player: 0, computer: 0, ties: 0 });
        setMatchWinner(null);
        setRound(null);
        return "countdown";
      }
      return p === "idle" || p === "result" ? "countdown" : p;
    });
  }, []);

  const reset = useCallback(() => {
    setScore({ player: 0, computer: 0, ties: 0 });
    setRound(null);
    setMatchWinner(null);
    setPhase("idle");
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOn((on) => !on);
    setPhase((p) => (p === "matchover" ? p : "idle")); // cancel round in progress
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      setMuted(on); // muted = previous "on" value
      return !on;
    });
  }, []);

  const changeMode = useCallback((id) => {
    setMode(id);
    // A different match length means a fresh match.
    setScore({ player: 0, computer: 0, ties: 0 });
    setRound(null);
    setMatchWinner(null);
    setPhase("idle");
  }, []);

  const cycleMode = useCallback(() => {
    const ids = MODES.map((m) => m.id);
    const next = ids[(ids.indexOf(modeRef.current) + 1) % ids.length];
    changeMode(next);
    speak(MODES.find((m) => m.id === next)?.label ?? "");
  }, [changeMode]);

  // Live detection feed: HUD + touch-free menu gestures (hold to trigger).
  const handleDetect = useCallback(
    (d) => {
      setLive(d);

      const p = phaseRef.current;
      const menuPhase = p === "idle" || p === "matchover" || p === "result";
      const g = menuPhase ? d.gesture : null;
      const isMenuGesture =
        g === "thumbs_up" || g === "thumbs_down" || g === "point";

      const now = performance.now();
      const h = holdRef.current;

      if (!isMenuGesture) {
        holdRef.current = { gesture: null, since: 0, fired: false };
        setHold(null);
        return;
      }

      if (g !== h.gesture) {
        holdRef.current = { gesture: g, since: now, fired: false };
        setHold({ gesture: g, pct: 0 });
        return;
      }

      const pct = Math.min(1, (now - h.since) / HOLD_MS);
      setHold({ gesture: g, pct });

      if (pct >= 1 && !h.fired) {
        h.fired = true;
        setHold(null);
        if (g === "thumbs_up") play();
        else if (g === "thumbs_down") reset();
        else if (g === "point" && p === "idle") cycleMode();
      }
    },
    [play, reset, cycleMode]
  );

  // Countdown chant: Rock -> Paper -> Scissors -> shoot.
  useEffect(() => {
    if (phase !== "countdown") return;
    setStep(0);
    setRound(null);
    speak(CHANT[0]);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i >= CHANT.length) {
        clearInterval(id);
        setPhase("shoot");
      } else {
        setStep(i);
        speak(CHANT[i]);
      }
    }, CHANT_STEP_MS);
    return () => clearInterval(id);
  }, [phase]);

  // "Shoot!": brief window to throw, then read the gesture and resolve.
  useEffect(() => {
    if (phase !== "shoot") return;
    speak("Shoot!");
    const id = setTimeout(() => {
      const player = liveMoveRef.current;
      const computer = randomMove();

      if (!player) {
        setRound({ outcome: "no_hand", computer });
        playTie();
        setPhase("result");
        return;
      }

      const outcome = decide(player, computer);
      const next = {
        player: score.player + (outcome === "win" ? 1 : 0),
        computer: score.computer + (outcome === "lose" ? 1 : 0),
        ties: score.ties + (outcome === "tie" ? 1 : 0),
      };
      setRound({ outcome, player, computer });
      setScore(next);
      addRound(outcome);

      // Did this round decide the match?
      const winner =
        target && next.player >= target
          ? "player"
          : target && next.computer >= target
            ? "computer"
            : null;
      setMatchWinner(winner);

      if (outcome === "win") playWin();
      else if (outcome === "lose") playLose();
      else playTie();

      setPhase("result");
    }, SHOOT_WINDOW_MS);
    return () => clearTimeout(id);
  }, [phase, score, target, addRound]);

  // After showing the round result: match over, or back to idle.
  useEffect(() => {
    if (phase !== "result") return;
    const id = setTimeout(() => {
      if (matchWinner) {
        setPhase("matchover");
        addMatch(matchWinner === "player");
        if (matchWinner === "player") playMatchWin();
        else playMatchLose();
        speak(matchWinner === "player" ? "You win the match!" : "Computer wins the match");
      } else {
        setPhase("idle");
      }
    }, RESULT_MS);
    return () => clearTimeout(id);
  }, [phase, matchWinner, addMatch]);

  // Spacebar to play.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (ready && cameraOn) play();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, cameraOn, play]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          Rock <span className="dim">·</span> Paper <span className="dim">·</span>{" "}
          Scissors
        </h1>
        <p className="subtitle">Play against the computer using your webcam ✋</p>
      </header>

      <ModePicker mode={mode} onChange={changeMode} disabled={playing} />

      <Scoreboard
        player={score.player}
        computer={score.computer}
        ties={score.ties}
        target={target}
      />

      <main className="arena">
        <section
          className={`panel ${
            phase === "result" && round?.outcome === "win" ? "panel--glow-win" : ""
          }`}
        >
          <div className="panel__title">YOU</div>
          <div className="panel__body">
            <CameraView
              landmarkerRef={landmarker}
              active={ready}
              cameraOn={cameraOn}
              liveMoveRef={liveMoveRef}
              onDetect={handleDetect}
            />
            {ready && cameraOn && (
              <div className="hud">
                {live.fps > 0 ? `${live.fps} FPS` : "– FPS"} ·{" "}
                {live.confidence > 0
                  ? `${Math.round(live.confidence * 100)}%`
                  : "no hand"}
              </div>
            )}
            <div className="detecting">
              {ready ? (
                <>
                  detecting:{" "}
                  <strong className={live.gesture ? "hit" : ""}>
                    {live.gesture
                      ? `${GESTURE_ICONS[live.gesture] ?? ""} ${live.gesture}`
                      : "—"}
                  </strong>
                </>
              ) : (
                " "
              )}
            </div>
            {hold && (
              <div className="hold">
                <span>{GESTURE_ICONS[hold.gesture]}</span>
                <div className="hold__bar">
                  <div
                    className="hold__fill"
                    style={{ width: `${Math.round(hold.pct * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          className={`panel ${
            phase === "result" && round?.outcome === "lose" ? "panel--glow-lose" : ""
          }`}
        >
          <div className="panel__title">CPU</div>
          <div className="panel__body panel__body--cpu">
            <CpuPanel phase={phase} round={round} matchWinner={matchWinner} />
          </div>
        </section>

        <Overlay
          status={status}
          phase={phase}
          step={step}
          round={round}
          cameraOn={cameraOn}
          matchWinner={matchWinner}
          score={score}
        />
      </main>

      <div className="gesture-hints">
        <span>👍 hold — play</span>
        <span>👎 hold — reset</span>
        <span>👉 hold — change mode</span>
      </div>

      <Controls
        onPlay={play}
        onReset={reset}
        onToggleCamera={toggleCamera}
        onToggleSound={toggleSound}
        cameraOn={cameraOn}
        soundOn={soundOn}
        disabled={!ready}
        playing={playing}
        matchOver={phase === "matchover"}
      />

      <StatsPanel stats={stats} onReset={resetStats} />

      <footer className="app__footer">
        Press <kbd>Space</kbd> or hold 👍, then show ✊ ✋ or ✌️ on “Shoot!”.
      </footer>
    </div>
  );
}

function Overlay({ status, phase, step, round, cameraOn, matchWinner, score }) {
  if (status === "loading") {
    return (
      <div className="overlay">
        <div className="overlay__spinner" />
        <p>Loading hand-tracking model…</p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="overlay">
        <p>⚠️ Failed to load the model.</p>
        <p className="overlay__sub">Check your connection and reload.</p>
      </div>
    );
  }
  if (phase === "countdown") {
    return (
      <div className="overlay">
        <div className="overlay__chant" key={step}>
          {CHANT_ICONS[step]} {CHANT[step]}
        </div>
        <p>get your hand ready…</p>
      </div>
    );
  }
  if (phase === "shoot") {
    return (
      <div className="overlay">
        <div className="overlay__shoot">SHOOT!</div>
      </div>
    );
  }
  if (phase === "result" && round) {
    if (round.outcome === "no_hand") {
      return (
        <div className="overlay">
          <p className="overlay__sub">No hand detected — try again</p>
          <p>CPU played {LABELS[round.computer]}</p>
        </div>
      );
    }
    const cls =
      round.outcome === "win" ? "win" : round.outcome === "lose" ? "lose" : "tie";
    const text =
      round.outcome === "win" ? "YOU WIN!" : round.outcome === "lose" ? "YOU LOSE" : "TIE";
    return (
      <div className="overlay">
        <p className="overlay__matchup">
          You {LABELS[round.player]} &nbsp;vs&nbsp; CPU {LABELS[round.computer]}
        </p>
        <div className={`overlay__result overlay__result--${cls}`}>{text}</div>
      </div>
    );
  }
  if (phase === "matchover") {
    const won = matchWinner === "player";
    return (
      <div className="overlay">
        <div className="overlay__trophy">{won ? "🏆" : "🤖"}</div>
        <div className={`overlay__result overlay__result--${won ? "win" : "lose"}`}>
          {won ? "YOU WIN THE MATCH!" : "CPU WINS THE MATCH"}
        </div>
        <p className="overlay__matchup">
          Final score {score.player} – {score.computer}
        </p>
        <p className="overlay__sub">👍 new match &nbsp;·&nbsp; 👎 back</p>
      </div>
    );
  }
  if (phase === "idle") {
    if (!cameraOn) return null; // CameraView already shows "Camera is off"
    return (
      <div className="overlay overlay--hint">
        <p>Hold 👍 or press Play to start</p>
      </div>
    );
  }
  return null;
}
