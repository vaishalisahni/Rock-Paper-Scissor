import { useCallback, useEffect, useRef, useState } from "react";
import CameraView from "./components/CameraView.jsx";
import Scoreboard from "./components/Scoreboard.jsx";
import Controls from "./components/Controls.jsx";
import { useHandLandmarker } from "./hooks/useHandLandmarker.js";
import { decide, randomMove, LABELS } from "./lib/rps.js";
import "./App.css";

const RESULT_MS = 2600;

export default function App() {
  const { landmarker, status } = useHandLandmarker();

  const [phase, setPhase] = useState("idle"); // idle | countdown | shoot | result
  const [count, setCount] = useState(3);
  const [liveMove, setLiveMove] = useState(null);
  const [round, setRound] = useState(null); // { outcome, player, computer }
  const [score, setScore] = useState({ player: 0, computer: 0, ties: 0 });
  const [cameraOn, setCameraOn] = useState(true);

  const liveMoveRef = useRef(null);
  const ready = status === "ready";

  const play = useCallback(() => {
    setPhase((p) => (p === "idle" || p === "result" ? "countdown" : p));
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOn((on) => !on);
    setPhase("idle"); // cancel any round in progress
  }, []);

  const reset = useCallback(() => {
    setScore({ player: 0, computer: 0, ties: 0 });
    setRound(null);
    setPhase("idle");
  }, []);

  // Countdown 3 -> 2 -> 1 -> shoot.
  useEffect(() => {
    if (phase !== "countdown") return;
    setCount(3);
    setRound(null);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setPhase("shoot");
      } else {
        setCount(n);
      }
    }, 800);
    return () => clearInterval(id);
  }, [phase]);

  // "Shoot": read the currently detected gesture and resolve the round.
  useEffect(() => {
    if (phase !== "shoot") return;
    const player = liveMoveRef.current;
    const computer = randomMove();

    if (!player) {
      setRound({ outcome: "no_hand", computer });
    } else {
      const outcome = decide(player, computer);
      setRound({ outcome, player, computer });
      setScore((s) => ({
        player: s.player + (outcome === "win" ? 1 : 0),
        computer: s.computer + (outcome === "lose" ? 1 : 0),
        ties: s.ties + (outcome === "tie" ? 1 : 0),
      }));
    }
    setPhase("result");
  }, [phase]);

  // Clear the result after a moment.
  useEffect(() => {
    if (phase !== "result") return;
    const id = setTimeout(() => setPhase("idle"), RESULT_MS);
    return () => clearTimeout(id);
  }, [phase]);

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

      <Scoreboard player={score.player} computer={score.computer} ties={score.ties} />

      <main className="stage">
        <CameraView
          landmarkerRef={landmarker}
          active={ready}
          cameraOn={cameraOn}
          liveMoveRef={liveMoveRef}
          onLiveMove={setLiveMove}
        />

        <Overlay
          status={status}
          phase={phase}
          count={count}
          round={round}
          cameraOn={cameraOn}
        />

        <div className="detecting">
          {ready ? (
            <>
              detecting:{" "}
              <strong className={liveMove ? "hit" : ""}>{liveMove ?? "—"}</strong>
            </>
          ) : (
            " "
          )}
        </div>
      </main>

      <Controls
        onPlay={play}
        onReset={reset}
        onToggleCamera={toggleCamera}
        cameraOn={cameraOn}
        disabled={!ready}
        playing={phase === "countdown" || phase === "shoot"}
      />

      <footer className="app__footer">
        Press <kbd>Space</kbd> or <b>Play round</b>, then show ✊ ✋ or ✌️ on “Shoot”.
      </footer>
    </div>
  );
}

function Overlay({ status, phase, count, round, cameraOn }) {
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
        <div className="overlay__count">{count}</div>
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
  if (phase === "idle") {
    if (!cameraOn) return null; // CameraView already shows "Camera is off"
    return (
      <div className="overlay overlay--hint">
        <p>Press Play to start</p>
      </div>
    );
  }
  return null;
}
