// src__main 02 — context
// Lines 321-460 of readable/src__main.pretty.js (statement-aligned).
window.addEventListener("keydown", (event) => {
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      event.code,
    )
  )
    event.preventDefault();
  if (document.querySelector(".help-panel")) {
    if (event.code === "Escape") action("close-help");
    return;
  }
  keys.add(event.code);
  if (event.repeat) return;
  if (
    (event.code === "Space" || event.code === "ArrowUp") &&
    mode === "riding" &&
    run.down
  ) {
    recoverRequested = true;
    return;
  }
  if (event.code === "Enter" && mode === "menu") start();
  else if (event.code === "Escape" || event.code === "KeyP") {
    if (mode === "paused") resume();
    else if (mode === "riding" || mode === "countdown") pause();
  } else if (event.code === "KeyC") {
    event.preventDefault();
    action("camera");
  } else if (event.code === "KeyR" && mode !== "menu") start();
  else if (event.code === "Space" && mode === "riding") jumpRequested = true;
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
  clearInput();
  if (mode === "riding" || mode === "countdown") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && (mode === "riding" || mode === "countdown")) pause();
});
// Keep keyboard focus inside the active dialog.
document.addEventListener("keydown", (e) => {
  if (e.code !== "Tab") return;
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return;
  const buttons = [...dialog.querySelectorAll("button")];
  const first = buttons[0],
    last = buttons.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

function setupAudio() {
  if (!soundEnabled) return;
  try {
    if (!audio) {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = context.createBuffer(
          1,
          context.sampleRate * 2,
          context.sampleRate,
        ),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start();
      const crowdSource = context.createBufferSource();
      crowdSource.buffer = buffer;
      crowdSource.loop = true;
      const crowdFilter = context.createBiquadFilter();
      crowdFilter.type = "bandpass";
      crowdFilter.frequency.value = 850;
      crowdFilter.Q.value = 0.55;
      const crowdGain = context.createGain();
      crowdGain.gain.value = 0;
      crowdSource.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(context.destination);
      crowdSource.start();
      const voices = [];
      for (let i = 0; i < 4; i++) {
        const oscillator = context.createOscillator(),
          voiceGain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = 260 + i * 73;
        voiceGain.gain.value = 0;
        oscillator.connect(voiceGain);
        voiceGain.connect(context.destination);
        oscillator.start();
        voices.push({ oscillator, gain: voiceGain });
      }
      audio = { context, filter, gain, crowdGain, voices };
    }
    audio.context.resume();
  } catch {
    /* Audio is optional when the browser blocks it. */
  }
}
function beep(frequency, duration) {
  if (!audio || !soundEnabled) return;
  const o = audio.context.createOscillator(),
    g = audio.context.createGain();
  o.frequency.value = frequency;
  g.gain.setValueAtTime(0.065, audio.context.currentTime);
  g.gain.exponentialRampToValueAtTime(
    0.001,
    audio.context.currentTime + duration,
  );
  o.connect(g);
  g.connect(audio.context.destination);
  o.start();
  o.stop(audio.context.currentTime + duration);
}

let world;
try {
  world = new World(document.querySelector("#world"));
  world.load(course());
  renderMenu();
} catch (error) {
  console.error(error);
  app.innerHTML =
    '<div class="fallback panel"><h1>READY TO RIDE?</h1><p>This 3D game needs WebGL. Open it in a recent Chrome, Edge, Firefox, or Safari with graphics acceleration enabled.</p><button class="launch-button" onclick="location.reload()">TRY AGAIN ↗</button></div>';
}
let previous = performance.now(),
  frame = 0;
