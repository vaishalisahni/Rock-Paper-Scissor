export default function StatsPanel({ stats, onReset }) {
  const total = stats.wins + stats.losses + stats.ties;
  const winRate = total ? Math.round((stats.wins / total) * 100) : 0;

  return (
    <div className="stats">
      <span className="stats__title">Lifetime</span>
      <span className="stats__item stats__item--win">W {stats.wins}</span>
      <span className="stats__item stats__item--loss">L {stats.losses}</span>
      <span className="stats__item">T {stats.ties}</span>
      <span className="stats__sep" />
      <span className="stats__item">
        Matches {stats.matchesWon}–{stats.matchesLost}
      </span>
      <span className="stats__sep" />
      <span className="stats__item">{winRate}% win rate</span>
      <button className="stats__reset" onClick={onReset} title="Clear lifetime stats">
        clear
      </button>
    </div>
  );
}
