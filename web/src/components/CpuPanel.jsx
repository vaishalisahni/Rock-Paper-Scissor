import { GESTURE_ICONS } from "../lib/gesture.js";

/**
 * The computer's side of the arena.
 * - idle:               robot, waiting
 * - countdown / shoot:  shaking fist (its move is still secret)
 * - result:             reveals the hand it played, tinted by outcome
 * - matchover:          celebrates or slumps
 */
export default function CpuPanel({ phase, round, matchWinner }) {
  let icon = "🤖";
  let caption = "Waiting…";
  let cls = "";

  if (phase === "countdown" || phase === "shoot") {
    icon = "✊";
    caption = "…";
    cls = "cpu__hand--shake";
  } else if (phase === "result" && round) {
    icon = GESTURE_ICONS[round.computer] ?? "🤖";
    caption = `CPU played ${round.computer}`;
    // Outcome from the player's perspective: CPU glows green when IT wins.
    cls =
      round.outcome === "lose"
        ? "cpu__hand--reveal cpu__hand--won"
        : round.outcome === "win"
          ? "cpu__hand--reveal cpu__hand--lost"
          : "cpu__hand--reveal";
  } else if (phase === "matchover") {
    const cpuWon = matchWinner === "computer";
    icon = cpuWon ? "🏆" : "😵";
    caption = cpuWon ? "CPU takes the match!" : "CPU is defeated!";
    cls = "cpu__hand--reveal";
  }

  return (
    <div className="cpu">
      <div className={`cpu__hand ${cls}`} key={`${phase}-${icon}`}>
        {icon}
      </div>
      <p className="cpu__caption">{caption}</p>
    </div>
  );
}
