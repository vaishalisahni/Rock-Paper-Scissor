import { useCallback, useState } from "react";

// Lifetime statistics persisted in localStorage.

const KEY = "rps-vision-stats";

const DEFAULTS = {
  wins: 0,
  losses: 0,
  ties: 0,
  matchesWon: 0,
  matchesLost: 0,
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Storage may be unavailable (private mode); stats just won't persist.
  }
}

export function useLocalStats() {
  const [stats, setStats] = useState(load);

  const addRound = useCallback((outcome) => {
    setStats((s) => {
      const next = {
        ...s,
        wins: s.wins + (outcome === "win" ? 1 : 0),
        losses: s.losses + (outcome === "lose" ? 1 : 0),
        ties: s.ties + (outcome === "tie" ? 1 : 0),
      };
      save(next);
      return next;
    });
  }, []);

  const addMatch = useCallback((won) => {
    setStats((s) => {
      const next = {
        ...s,
        matchesWon: s.matchesWon + (won ? 1 : 0),
        matchesLost: s.matchesLost + (won ? 0 : 1),
      };
      save(next);
      return next;
    });
  }, []);

  const resetStats = useCallback(() => {
    const next = { ...DEFAULTS };
    save(next);
    setStats(next);
  }, []);

  return { stats, addRound, addMatch, resetStats };
}
