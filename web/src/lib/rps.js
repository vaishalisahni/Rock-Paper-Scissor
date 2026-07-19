// Pure Rock-Paper-Scissors rules. No dependencies, easy to unit-test.

export const MOVES = ["rock", "paper", "scissors"];

// key beats value
export const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

export const LABELS = { rock: "Rock ✊", paper: "Paper ✋", scissors: "Scissors ✌️" };

/** Return "win" | "lose" | "tie" from the player's perspective. */
export function decide(player, computer) {
  if (player === computer) return "tie";
  return BEATS[player] === computer ? "win" : "lose";
}

/** Pick a random move for the computer. */
export function randomMove() {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}
