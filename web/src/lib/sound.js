// Sound effects with zero audio assets:
//  - Voice chant ("Rock, Paper, Scissors, Shoot!") via the browser's built-in
//    SpeechSynthesis API.
//  - Win/lose/tie jingles synthesized with the Web Audio API.
//
// Browsers only allow audio after a user gesture, so `unlockAudio()` is called
// from the Play button click before any sound plays.

let ctx = null;
let muted = false;

function ensureCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Call from a click handler so the browser lets us play audio. */
export function unlockAudio() {
  if (!muted) ensureCtx();
}

export function setMuted(m) {
  muted = m;
  if (m && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Speak a word/phrase with the browser's TTS voice. */
export function speak(text, rate = 1.15) {
  if (muted || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = 1.05;
  window.speechSynthesis.cancel(); // don't queue behind a previous word
  window.speechSynthesis.speak(u);
}

/** Schedule one enveloped oscillator tone. */
function tone(freq, startSec, durSec, type = "sine", volume = 0.2) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + startSec;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durSec);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + durSec + 0.05);
}

/** Round won: quick ascending arpeggio. */
export function playWin() {
  if (muted) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone(f, i * 0.11, 0.25, "triangle", 0.22)
  );
}

/** Round lost: sad two-note descent. */
export function playLose() {
  if (muted) return;
  tone(330, 0, 0.3, "sawtooth", 0.13);
  tone(247, 0.26, 0.5, "sawtooth", 0.13);
}

/** Tie: neutral double blip. */
export function playTie() {
  if (muted) return;
  tone(440, 0, 0.13, "sine", 0.18);
  tone(440, 0.18, 0.13, "sine", 0.18);
}

/** Match won: longer victory fanfare. */
export function playMatchWin() {
  if (muted) return;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
    tone(f, i * 0.12, 0.3, "triangle", 0.22)
  );
  tone(1568, 0.62, 0.55, "triangle", 0.18);
}

/** Match lost: slow descending walk. */
export function playMatchLose() {
  if (muted) return;
  [392, 330, 262, 196].forEach((f, i) =>
    tone(f, i * 0.16, 0.38, "sawtooth", 0.12)
  );
}
