export default function Controls({
  onPlay,
  onReset,
  onToggleCamera,
  cameraOn,
  disabled,
  playing,
}) {
  return (
    <div className="controls">
      <button
        className="btn btn--primary"
        onClick={onPlay}
        disabled={disabled || playing || !cameraOn}
        title={!cameraOn ? "Turn the camera on to play" : undefined}
      >
        {playing ? "Playing…" : "▶ Play round"}
      </button>
      <button
        className={`btn ${cameraOn ? "btn--ghost" : "btn--warn"}`}
        onClick={onToggleCamera}
        disabled={playing}
      >
        {cameraOn ? "📷 Camera off" : "📷 Camera on"}
      </button>
      <button className="btn btn--ghost" onClick={onReset} disabled={disabled}>
        ↺ Reset
      </button>
    </div>
  );
}
