"""Pure Rock-Paper-Scissors rules. No third-party dependencies, fully testable."""

from __future__ import annotations

MOVES = ("rock", "paper", "scissors")

# Key beats value.
BEATS = {"rock": "scissors", "paper": "rock", "scissors": "paper"}


def decide(player: str, computer: str) -> str:
    """Return 'win' / 'lose' / 'tie' from the player's perspective."""
    if player == computer:
        return "tie"
    return "win" if BEATS[player] == computer else "lose"
