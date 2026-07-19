export const MODES = [
  { id: "endless", label: "Endless", target: null },
  { id: "bo3", label: "Best of 3", target: 2 },
  { id: "bo5", label: "Best of 5", target: 3 },
  { id: "bo7", label: "Best of 7", target: 4 },
];

export function modeTarget(modeId) {
  return MODES.find((m) => m.id === modeId)?.target ?? null;
}

export default function ModePicker({ mode, onChange, disabled }) {
  return (
    <div className="modes" role="radiogroup" aria-label="Match mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          role="radio"
          aria-checked={mode === m.id}
          className={`modes__btn ${mode === m.id ? "modes__btn--active" : ""}`}
          onClick={() => onChange(m.id)}
          disabled={disabled}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
