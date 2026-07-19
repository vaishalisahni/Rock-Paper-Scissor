export default function Scoreboard({ player, computer, ties }) {
  return (
    <div className="scoreboard">
      <div className="scoreboard__side">
        <span className="scoreboard__label">You</span>
        <span className="scoreboard__score">{player}</span>
      </div>
      <div className="scoreboard__middle">
        <span className="scoreboard__vs">vs</span>
        <span className="scoreboard__ties">ties {ties}</span>
      </div>
      <div className="scoreboard__side">
        <span className="scoreboard__label">CPU</span>
        <span className="scoreboard__score">{computer}</span>
      </div>
    </div>
  );
}
