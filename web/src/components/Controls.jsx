export default function Controls({
  onPlay,
  onReset,
  onToggleCamera,
  onToggleSound,
  cameraOn,
  soundOn,
  disabled,
  playing,
  matchOver,
}) {
  return (
    <div className="controls">
      <button
        className="btn btn--primary"
        onClick={onPlay}
        disabled={disabled || playing || !cameraOn}
        title={!cameraOn ? "Turn the camera on to play" : undefined}
      >
        {playing ? "Playing…" : matchOver ? "🔁 New match" : "▶ Play round"}
      </button>
      <button
        className={`btn ${cameraOn ? "btn--ghost" : "btn--warn"}`}
        onClick={onToggleCamera}
        disabled={playing}
      >
        {cameraOn ? "📷 Camera off" : "📷 Camera on"}
      </button>
      <button
        className="btn btn--ghost"
        onClick={onToggleSound}
        title={soundOn ? "Mute sounds" : "Unmute sounds"}
      >
        {soundOn ? "🔊" : "🔇"}
      </button>
      <button className="btn btn--ghost" onClick={onReset} disabled={disabled}>
        ↺ Reset
      </button>
    </div>
  );
}
