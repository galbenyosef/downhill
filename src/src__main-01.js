// src__main 01 — button
// Lines 1-320 of readable/src__main.pretty.js (statement-aligned).
import { courseIndexFromLocation, courseSelectionUrl } from "./route-links.js";
import { CAMERA_MODES } from "./cameras.js";
import { World } from "./world.js";
import { renderRaceMap, updateRaceMap } from "./race-map.js";
import {
  COURSES,
  freshRun,
  stepRun,
  formatTime,
  medalFor,
  centerAt,
  forkHint,
} from "./game.js";

const app = document.querySelector("#app");
const icons = {
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12h15M13 5l7 7-7 7"/></svg>',
  volume:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H3v6h3l5 4V5zM15 8a6 6 0 010 8m3-11a10 10 0 010 14"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5L6 9H3v6h3l5 4V5zM16 9l6 6m0-6l-6 6"/></svg>',
  expand:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1114 0z"/><circle cx="12" cy="10" r="2"/></svg>',
};
let selected = courseIndexFromLocation(
    window.location.pathname,
    window.location.search,
  ),
  mode = "menu",
  run,
  countdown = 3,
  toastTimer = 0,
  soundEnabled = true;
let records = {};
try {
  records = JSON.parse(localStorage.getItem("downhill-records-v4") || "{}");
} catch {
  /* Storage can be disabled in private browsing. */
}
const keys = new Set(),
  touch = new Set();
let jumpRequested = false,
  recoverRequested = false,
  audio;
const course = () => COURSES[selected];
const categoryFor = (c) =>
  c.id === "halloween"
    ? "Halloween special"
    : c.environment === "extreme"
      ? "Extreme"
      : c.environment === "wild"
        ? "Wild trails"
        : "City streets";
const logo =
  '<span class="brand-mark"><i></i><i></i></span><span>DOWNHILL<span class="brand-dot">®</span></span>';
const bars = (n) =>
  `<span class="difficulty-bars">${(n === 5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]).map((i) => `<i class="${i <= n ? "lit" : ""}"></i>`).join("")}</span>`;

function courseArt(c) {
  if (c.id === "halloween")
    return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="#140c22"/><g fill="#f6d3a0"><circle cx="153" cy="31" r="24"/><circle cx="19" cy="13" r="1"/><circle cx="75" cy="24" r="1"/><circle cx="202" cy="10" r="1"/></g><path d="M0 45l20-17 20 17v65H0m174-44l23-19 23 19v44h-46" fill="#402735"/><path d="M96 55h21l42 55H51z" fill="#54332c"/><path d="M95 67l-3 5m-5 8l-4 7m-5 10l-5 9m47-39l3 5m5 8l4 7m5 10l5 9" stroke="#ff9b38" stroke-width="3"/><path d="M105 25l-13-5 6 10 7-2 7 2 6-10zm67 17l-12-4 5 9 7-3 7 3 5-9z" fill="#1d1327"/><g fill="#ef7420"><ellipse cx="31" cy="90" rx="22" ry="17"/><ellipse cx="186" cy="97" rx="17" ry="13"/></g><path d="M19 89l7-8 5 8m3 0l5-8 6 8M19 96l12 6 13-6" fill="#ffd177"/></svg>`;

  if (c.id === "bengaluru")
    return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="#d9c7a2"/><path d="M0 40h36v70H0m175-85h45v85h-45" fill="#879d98"/><path d="M75 45h70l65 65H10z" fill="#666e68"/><path d="M0 50q110-45 220 0v12Q110 17 0 62" fill="#b4b6a8"/><path d="M25 53v57m170-57v57" stroke="#969e96" stroke-width="8"/><rect x="58" y="63" width="32" height="41" rx="4" fill="#48a5b5"/><path d="M62 69h24v15H62" fill="#233c44"/><rect x="129" y="80" width="29" height="24" rx="5" fill="#e9bd46"/><path d="M132 84h23v9h-23" fill="#234d3f"/></svg>`;
  if (c.id === "amazon")
    return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="#102935"/><circle cx="149" cy="22" r="12" fill="#c9dbb9"/><path d="M78 36q-75 24-23 42l-30 32h47l9-26Q40 65 94 39" fill="#4d8f99"/><path d="M112 40h13l46 70H87z" fill="#8b9576"/><g stroke="#4c6854" stroke-width="7"><path d="M20 15v95M49 0v69m132-58v99m25-110v110"/></g><g fill="#2f624b"><ellipse cx="28" cy="13" rx="50" ry="21"/><ellipse cx="188" cy="6" rx="54" ry="26"/></g><path d="M103 31l8-4 8 4m-39 2l7-4 7 4" fill="none" stroke="#d0d8bb" stroke-width="2"/><ellipse cx="140" cy="90" rx="12" ry="6" fill="#ad9c7b"/><circle cx="151" cy="86" r="5" fill="#ad9c7b"/><path d="M133 94v6m12-6v6" stroke="#ad9c7b" stroke-width="3"/></svg>`;
  if (c.terrain === "sky")
    return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="#9cb7bf"/><path d="M0 85l35-33 34 43 37-29 39 26 41-38 34 31v25H0" fill="#597969"/><path d="M80 110L109 73 92 54 111 33 103 0h9l10 34-17 20 17 19-23 37" fill="#ac895c"/><path d="M85 61l38 3M96 29l27 2" stroke="#9cb7bf" stroke-width="4"/></svg>`;
  if (c.environment === "wild") {
    const snow = c.terrain === "snow",
      forest = c.terrain === "forest",
      coast = c.terrain === "coast";
    return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="${snow ? "#bdd0db" : forest ? "#8aab92" : "#9fcacb"}"/><path d="M0 81l45-59 39 41 43-54 48 55 45-38v84H0" fill="${snow ? "#dfe9e5" : forest ? "#4f7154" : "#b7b8a1"}"/>${coast ? '<path d="M0 63h94l-33 47H0" fill="#69a7ad"/>' : ""}<path d="M101 35h12l54 75H43z" fill="${snow ? "#a5bcc0" : forest ? "#927c5e" : "#bbad88"}"/>${forest ? '<g fill="#6a5740"><path d="M15 0h17v110H15m30-110h13v105H45m120-105h16v110h-16m28-110h20v110h-20"/></g><g fill="#496b4d"><ellipse cx="18" cy="3" rx="52" ry="24"/><ellipse cx="193" cy="8" rx="50" ry="26"/></g>' : '<g fill="' + (snow ? "#5e837b" : "#648669") + '"><path d="M30 39L7 89h46zm151-10l-25 62h50zM59 48L43 82h30z"/></g>'}${snow ? '<g fill="#edf2ee"><path d="M42 23L21 52l21-8 18 6zM127 9l-25 35 25-11 23 12zM181 29l-13 32h27z"/></g>' : ""}</svg>`;
  }
  if (c.id === "valpo")
    return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="#abc8c0"/><path d="M0 64l45-29 48 27 31-10 45 8 51-17v67H0" fill="#76a59b"/><path d="M89 35l34 4 62 71H42z" fill="#c6b995"/><path d="M0 18l48 9v63L0 100" fill="#bf7755"/><path d="M44 33l34 6v32l-34 9" fill="#dfa95c"/><path d="M154 34l29-10v65l-29-15" fill="#658d7c"/><path d="M178 18l42-7v99l-42-21" fill="#d6b69c"/><g fill="#46676a"><path d="M8 34l12 2v17L8 53m17-15l12 2v14l-12-1M51 43l8 2v11h-8M65 45h7v10h-7M186 34l11-2v17h-11m9-19l10-2v19h-10M186 61h11v17h-11"/></g><path d="M0 19q100 66 220-8" fill="none" stroke="#425b53"/><path d="M54 48l6 3-4 5m19-3l6 2-4 6m20-4l6 1-4 6m22-5h6l-3 6" fill="#f0c973"/></svg>`;
  if (c.id === "aizawl")
    return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="#b6c8ba"/><path d="M0 44l46-26 34 11 24-16 43 27 41-19 32 15v74H0" fill="#789382"/><path d="M93 30h29l58 80H28z" fill="#b78572"/><path d="M0 24h43v62H0m39-40h30v26H39" fill="#c2c0aa"/><path d="M163 24h57v86l-57-38" fill="#939e92"/><path d="M130 35h37v40l-37-22" fill="#cbbfa3"/><g stroke="#e0b79a" stroke-width="3"><path d="M91 39h35M83 49h50M76 59h64M67 69h81M59 80h97M50 91h114M42 101h131"/></g><g stroke="#405f50" stroke-width="3"><path d="M32 107l55-68m91 68l-50-68M45 92V75m19-7V51m98 40V75m-17-7V53"/></g><g fill="#507360"><circle cx="18" cy="86" r="21"/><circle cx="193" cy="78" r="19"/><circle cx="210" cy="62" r="15"/></g><g fill="#576d66"><path d="M8 35h9v15H8m15-15h9v15h-9m151-13h12v19h-12m21-19h12v19h-12"/></g></svg>`;
  if (c.id === "mumbai")
    return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="#bfc9bb"/><path d="M94 32h23l49 78H58z" fill="#999b87"/><path d="M0 18h57v92H0m51-74h32v74H51m88-82h33v82h-33m31-96h48v96h-48" fill="#899c8b"/><path d="M0 59h57v51H0m139-47h27v47h-27" fill="#9695ad"/><g fill="#445c57"><path d="M7 30h27v22H7m28 22h17v50H35m29-48h12v27H64m113-43h31v31h-31m-4 16h39v32h-39"/></g><path d="M0 18h58m-7 18h34m53-8h30m-6-14h58" stroke="#637579" stroke-width="7"/><path d="M0 58h42v8H0m168-9h52v10h-52" fill="#438ea6"/><g stroke="#b5b7a0" stroke-width="2"><path d="M178 74h31m-31 6h31m-31 6h31m-31 6h31"/></g><path d="M0 22q110 65 220 0M0 36q110 39 220-14" fill="none" stroke="#425b53"/><g><path d="M38 59h10v24H38m19-20h9v17h-9" fill="#bd7567"/><path d="M71 65h9v15h-9m76-14h11v22h-11" fill="#b5c9c1"/><path d="M162 61h9v28h-9" fill="#468d9b"/></g><path d="M170 91h15v19h-15" fill="#377eaf"/><ellipse cx="177.5" cy="91" rx="7.5" ry="3" fill="#73a5b8"/></svg>`;
  return `<svg viewBox="0 0 220 110" aria-hidden="true"><rect width="220" height="110" fill="#263a4b"/><path d="M91 45h26l65 65H37z" fill="#5b6d70"/><path d="M0 0h44v110H0m41 26h28v55H41m113-68h38v97h-38m-23 24h22v36h-22" fill="#415764"/><path d="M184 0h36v110h-36" fill="#394b57"/><g fill="#80c3bc"><path d="M7 14h10v14H7m16-14h10v14H23M7 43h10v14H7m16-14h10v14H23M162 24h12v19h-12m0 11h12v19h-12"/></g><path d="M36 32h13v38H36" fill="#ee98ae"/><path d="M176 10h14v52h-14" fill="#aedd91"/><path d="M61 43h9v20h-9" fill="#73d0d1"/><path d="M108 63l-9 24m8 7l-6 16" stroke="#accba8" stroke-width="2"/><path d="M143 83l48 27M86 89l-7 21" stroke="#86c8c0" opacity=".4" stroke-width="4"/></svg>`;
}
function mapSvg(c, progress = 0) {
  const points = Array.from({ length: 90 }, (_, i) => {
    const s = (i / 89) * c.length;
    return [55 + centerAt(s, c) * 1.25, 10 + (i / 89) * 112];
  });
  const path = points
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const p = points[Math.min(89, Math.floor(progress * 89))];
  return `<svg viewBox="0 0 112 135" class="route-map" aria-label="Course route"><path d="${path}" fill="none" stroke="currentColor" opacity=".20" stroke-width="7"/><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="${points[89][0]}" cy="122" r="3" fill="currentColor"/><circle class="map-rider" cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#c4f26b" stroke="#15211b" stroke-width="2"/></svg>`;
}
function topbar(inGame = false) {
  return `<header><a class="brand" href="#" aria-label="Downhill home">${logo}</a><div class="top-center"><span class="live-dot"></span>${inGame ? "LIVE RUN" : "DOWNHILL FPV RACING"}</div><div class="top-actions"><button class="icon-button" data-action="sound" aria-label="${soundEnabled ? "Mute" : "Enable"} sound">${icons[soundEnabled ? "volume" : "mute"]}</button><button class="icon-button" data-action="fullscreen" aria-label="Toggle fullscreen">${icons.expand}</button>${inGame ? `<button class="camera-button" data-action="camera" aria-label="Change camera, current view ${CAMERA_MODES[world.cameraMode]}">C · ${CAMERA_MODES[world.cameraMode]}</button><button class="icon-button" data-action="pause" aria-label="Pause game">${icons.pause}</button>` : `<button class="how-button" data-action="help">How to ride <span>↗</span></button>`}</div></header>`;
}
function renderMenu() {
  mode = "menu";
  clearInput();
  world.setMenu(true);
  document.body.className =
    "menu-mode" + (course().id === "halloween" ? " halloween-mode" : "");
  const c = course();
  app.innerHTML = `${topbar()}<main class="menu"><div class="eyebrow"><span class="small-line"></span> NO ENGINE. ALL NERVE.</div><h1>OWN THE <span>DROP.</span></h1><p class="intro">City streets, wild trails, and extreme drops. All ${COURSES.length} rides, one place.</p><section class="course-picker" aria-label="Choose your location"><div class="section-label"><span>01 — CHOOSE YOUR LOCATION</span><span>${COURSES.length} LOCATIONS</span></div><div class="course-cards">${COURSES.map((c, i) => `<button class="course-card ${i === selected ? "selected" : ""}" data-course="${i}" aria-pressed="${i === selected}"><div class="course-art">${courseArt(c)}<span class="course-number">${String(i + 1).padStart(2, "0")}</span><span class="selected-check">✓</span></div><div class="card-content"><span class="card-category">${categoryFor(c)}</span><span class="card-country">${c.country}</span><strong>${c.name}</strong><span class="card-difficulty">${bars(c.level)}${c.difficulty}</span></div></button>`).join("")}</div></section><div class="launch-row"><button class="launch-button" data-action="start"><span>LET’S RIDE<small>${c.name}</small></span>${icons.arrow}</button><span class="keyboard-hint"><kbd>↵</kbd> to drop in</span></div><div class="quick-controls"><span><kbd>W</kbd> <kbd>S</kbd> Pedal / brake</span><span><kbd>A</kbd> <kbd>D</kbd> Steer</span><span><kbd>SPACE</kbd> Jump</span></div></main><aside class="location-detail"><div class="location-tag">${icons.pin} ${c.type}</div><h2>${c.name}<span>${c.country}</span></h2><p>${c.description}</p><div class="location-stats"><div><strong>${c.duration ? 20 : (c.length / 1000).toFixed(2)}<small>${c.duration ? "s" : "km"}</small></strong><span>${c.duration ? "SURVIVAL" : "DISTANCE"}</span></div><div><strong>${c.duration ? "3,000+" : c.drop}<small>m</small></strong><span>${c.duration ? "EXPOSURE" : "VERTICAL DROP"}</span></div><div><strong>${c.level}/${c.level === 5 ? 5 : 4}</strong><span>DIFFICULTY</span></div></div><div class="route-preview">${mapSvg(c)}<div><span class="section-label">THE LINE</span>${c.features.map((f) => `<span class="feature"><i></i>${f}</span>`).join("")}<span class="feature">${c.forks?.length ? `${c.forks.length} risky shortcuts / steer to choose` : ""}</span><span class="personal-best">${c.duration ? "ONE EDGE. ONE CHANCE." : records[c.id] ? "BEST " + formatTime(records[c.id]) : "YOUR FIRST RUN STARTS HERE"}</span></div></div></aside><footer><span><i class="live-dot"></i> ${COURSES.length} LOCATIONS. ONE WAY DOWN.</span><span class="author-credit">Created by <a href="https://github.com/msreekm" target="_blank" rel="noopener noreferrer">Sree Menon</a><span aria-hidden="true">·</span><a href="https://github.com/msreekm/downhill" target="_blank" rel="noopener noreferrer">GitHub repo ↗</a></span></footer>`;
  bindCommon();
  document.querySelectorAll("[data-course]").forEach((button) =>
    button.addEventListener("click", () => {
      const scrollY = document.body.scrollTop;
      selected = Number(button.dataset.course);
      syncSelectionUrl();
      world.load(course());
      renderMenu();
      document
        .querySelector(`[data-course="${selected}"]`)
        .focus({ preventScroll: true });
      document.body.scrollTop = scrollY;
    }),
  );
}
function syncSelectionUrl() {
  history.replaceState(
    history.state,
    "",
    courseSelectionUrl(window.location.href, course()),
  );
}
function bindCommon() {
  document.querySelector(".brand")?.addEventListener("click", (event) => {
    event.preventDefault();
    if (mode === "riding" || mode === "countdown") pause();
    else if (mode === "menu") return;
    else renderMenu();
  });
  document
    .querySelectorAll("[data-action]")
    .forEach((button) =>
      button.addEventListener("click", () => action(button.dataset.action)),
    );
}
function action(name) {
  if (name === "start" || name === "restart") start();
  if (name === "recover" && mode === "riding") recoverRequested = true;
  if (name === "camera" && (mode === "riding" || mode === "countdown")) {
    const label = world.cycleCamera();
    const button = document.querySelector('[data-action="camera"]');
    if (button) {
      button.textContent = "C · " + label;
      button.setAttribute("aria-label", "Change camera, current view " + label);
    }
    toast(label.toUpperCase() + " CAMERA");
  }
  if (name === "sound") {
    soundEnabled = !soundEnabled;
    document.querySelectorAll('[data-action="sound"]').forEach((b) => {
      b.innerHTML = icons[soundEnabled ? "volume" : "mute"];
      b.setAttribute(
        "aria-label",
        soundEnabled ? "Mute sound" : "Enable sound",
      );
    });
    if (soundEnabled) setupAudio();
  }
  if (name === "fullscreen") {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen?.();
    request?.catch(() => toast("Fullscreen is unavailable in this browser."));
  }
  if (name === "help") showHelp();
  if (name === "pause") pause();
  if (name === "resume") resume();
  if (name === "menu") renderMenu();
  if (name === "close-help") {
    document.querySelector(".modal-shade")?.remove();
    document.querySelector('[data-action="help"]')?.focus();
  }
  if (name === "next") {
    selected = (selected + 1) % COURSES.length;
    syncSelectionUrl();
    world.load(course());
    renderMenu();
  }
}
function showHelp() {
  const wrapper = document.createElement("div");
  wrapper.className = "modal-shade";
  wrapper.innerHTML = `<section class="panel help-panel" role="dialog" aria-modal="true" aria-labelledby="help-title"><button class="icon-button close-modal" data-action="close-help" aria-label="Close instructions">${icons.close}</button><span class="eyebrow">A LITTLE KNOW-HOW. A LOT OF GRAVITY.</span><h2 id="help-title">FIND YOUR LINE.</h2><p>Gravity gets you moving. Brake before sharp bends: cornering inertia pushes you outward. Hold your line down stair flights, hop obstacles, and race to the finish. At signed forks, steer toward orange for a narrow shortcut with two gaps, or take the wider blue main route. Press Space or HOP when GAP AHEAD appears to queue a jump. A missed gap or shortcut edge adds six seconds and returns you to the safe route.</p><div class="help-controls"><div><span><kbd>W</kbd> / <kbd>↑</kbd></span><strong>Pedal</strong><p>Build speed on the straights.</p></div><div><span><kbd>S</kbd> / <kbd>↓</kbd></span><strong>Brake</strong><p>Brake before stairs and sharp corners.</p></div><div><span><kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd></span><strong>Steer</strong><p>Counter the drift and avoid obstacles.</p></div><div><span><kbd>SPACE</kbd></span><strong>Bunny hop</strong><p>Clear crates or catch a ramp.</p></div></div><p class="help-note">${course().terrain === "sky" ? "Dead Air is a solo 20-second challenge. You start at speed. Brake before bends. Press Space or HOP when GAP AHEAD appears to queue a jump at the edge. Stay on the exposed road. Leaving the edge ends the attempt." : "Race four AI riders to the finish. After a crash, press Space or ↑ to get up. Contact with walls, obstacles, or riders adds 2 seconds to your medal time. Race place follows finish order. Beat the target time for gold. Best times save on this device."}</p><div class="help-bottom"><span><kbd>C</kbd> FPV / aerial / behind / side &nbsp; <kbd>ESC</kbd> Pause &nbsp; <kbd>R</kbd> Restart</span><button class="text-button" data-action="close-help">GOT IT ${icons.arrow}</button></div></section>`;
  app.appendChild(wrapper);
  wrapper
    .querySelectorAll("[data-action]")
    .forEach((b) =>
      b.addEventListener("click", () => action(b.dataset.action)),
    );
  wrapper.querySelector("button").focus();
}
function renderHud() {
  const c = course();
  app.innerHTML = `${topbar(true)}<div class="hud-top"><div class="hud-location"><span class="eyebrow">${c.country} / ${String(selected + 1).padStart(2, "0")}</span><h2>${c.name}</h2><span>${c.type}</span><div class="race-position"><strong id="race-position">5</strong><span>/ 5 <small>POSITION</small></span></div><span id="next-rider" class="next-rider">ARJUN · 5 m ahead</span></div><div class="timer"><span>RUN TIME</span><strong id="time">00:00.00</strong><span id="penalty">GOLD TARGET ${formatTime(c.par)}</span></div></div><div class="progress-container"><div id="progress"></div><span id="distance">0 / ${c.length} m</span></div><div id="fork-prompt" class="fork-prompt" hidden></div><div id="countdown" class="countdown"></div><div id="toast" class="toast" role="status"></div><div class="hud-bottom"><div class="speed"><strong id="speed">0</strong><span>KM/H</span><div class="speed-track"><i id="speed-meter"></i></div></div><div class="ride-status"><span id="ride-status">FIND YOUR LINE</span><small><kbd>W</kbd> Pedal <kbd>S</kbd> Brake <kbd>SPACE</kbd> Jump <kbd>C</kbd> Camera <kbd>ESC</kbd> Pause</small></div><div class="hud-map">${renderRaceMap(run, c)}<span id="checkpoints">CHECKPOINT 0 / 3</span></div></div><div class="touch-controls"><div><button data-touch="left" aria-label="Steer left">←</button><button data-touch="right" aria-label="Steer right">→</button></div><div><button data-touch="brake" aria-label="Brake">BRAKE</button><button data-touch="jump" aria-label="Jump">HOP</button><button data-touch="pedal" aria-label="Pedal">↑</button></div></div><div class="hit-flash"></div>`;
  if (c.terrain === "sky")
    app.innerHTML = `${topbar(true)}<div class="hud-top"><div class="hud-location"><span class="eyebrow">EXTREME / SOLO SURVIVAL</span><h2>Dead Air</h2><span>3,000+ m of open air</span></div><div class="timer"><span>SURVIVE</span><strong id="time">20.00</strong><span id="penalty">SECONDS REMAINING</span></div></div><div class="progress-container"><div id="progress"></div><span id="distance">STAY ON THE ROAD · HOP THE GAPS</span></div><div id="countdown" class="countdown"></div><div id="toast" class="toast" role="status"></div><div class="wind-streaks"></div><div class="hud-bottom"><div class="speed"><strong id="speed">104</strong><span>KM/H</span><div class="speed-track"><i id="speed-meter"></i></div></div><div class="ride-status"><span id="ride-status">NO SECOND CHANCES</span><small><kbd>A</kbd> <kbd>D</kbd> Steer · <kbd>S</kbd> Brake · <kbd>SPACE</kbd> Hop</small></div></div><div class="touch-controls"><div><button data-touch="left" aria-label="Steer left">←</button><button data-touch="right" aria-label="Steer right">→</button></div><div><button data-touch="brake" aria-label="Brake">BRAKE</button><button data-touch="jump" aria-label="Jump">HOP</button></div></div><div class="hit-flash"></div>`;
  const recovery = document.createElement("div");
  recovery.className = "crash-recovery";
  recovery.id = "crash-recovery";
  recovery.hidden = true;
  recovery.innerHTML =
    '<strong>RIDER DOWN</strong><span>Space or ↑ to get back up</span><button data-action="recover">GET UP ↑</button>';
  app.appendChild(recovery);
  bindCommon();
  document.querySelectorAll("[data-touch]").forEach((button) => {
    button.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      touch.add(button.dataset.touch);
      if (button.dataset.touch === "jump") jumpRequested = true;
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(type, () => touch.delete(button.dataset.touch));
  });
}
function start() {
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
  clearInput();
  setupAudio();
  run = freshRun(course());
  countdown = 3;
  mode = "countdown";
  document.body.className =
    course().terrain === "sky" ? "riding-mode sky-mode" : "riding-mode";
  document.body.classList.toggle("halloween-mode", course().id === "halloween");
  world.setMenu(false);
  renderHud();
  document.querySelector("#countdown").innerHTML =
    "<span>READY TO DROP?</span><strong>3</strong>";
}
function pause() {
  if (mode !== "riding" && mode !== "countdown") return;
  mode = "paused";
  clearInput();
  const wrapper = document.createElement("div");
  wrapper.className = "modal-shade";
  wrapper.innerHTML = `<section class="panel pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title"><span class="eyebrow">TAKE A BREATHER</span><h2 id="pause-title">HOLD THE LINE.</h2><p>${course().name} · ${Math.floor(run.s)} m into your run</p><button class="launch-button" data-action="resume">BACK TO IT ${icons.arrow}</button><button class="secondary-button" data-action="restart">Restart run <kbd>R</kbd></button><button class="text-button" data-action="menu">Choose a location</button></section>`;
  app.appendChild(wrapper);
  wrapper
    .querySelectorAll("[data-action]")
    .forEach((b) =>
      b.addEventListener("click", () => action(b.dataset.action)),
    );
  wrapper.querySelector("button").focus();
}
function resume() {
  if (mode !== "paused") return;
  document.querySelector(".modal-shade")?.remove();
  mode = countdown > 0 ? "countdown" : "riding";
  clearInput();
}
function finish() {
  if (course().terrain === "sky") return finishSky();
  mode = "finished";
  clearInput();
  const c = course(),
    total = run.elapsed + run.penalty,
    newBest = !records[c.id] || total < records[c.id];
  if (newBest) {
    records[c.id] = total;
    try {
      localStorage.setItem("downhill-records-v4", JSON.stringify(records));
    } catch {}
  }
  const wrapper = document.createElement("div");
  wrapper.className = "modal-shade finish-shade";
  wrapper.innerHTML = `<section class="panel finish-panel" role="dialog" aria-modal="true" aria-labelledby="finish-title"><div class="medal ${medalFor(total, c).toLowerCase()}">✦</div><span class="eyebrow">${medalFor(total, c)} RUN / ${c.name.toUpperCase()}</span><h2 id="finish-title">${run.position === 1 ? "YOU WON<br>THE DROP." : "FINISH LINE.<br>FULL SEND."}</h2><p class="shortcut-result">${run.shortcutsCleared} clean shortcuts · ${run.shortcutBails} missed</p><span class="finish-place">${run.position}${["", "ST", "ND", "RD", "TH", "TH"][run.position]} PLACE / 5 RIDERS</span><strong class="finish-time">${formatTime(total)}</strong><span class="best-label">${newBest ? "NEW PERSONAL BEST" : "PERSONAL BEST " + formatTime(records[c.id])}</span><div class="result-stats"><div><strong>${run.crashes}</strong><span>CONTACTS</span></div><div><strong>+${run.penalty}s</strong><span>PENALTY</span></div><div><strong>${run.airtime.toFixed(1)}s</strong><span>AIR TIME</span></div></div><button class="launch-button" data-action="restart">RIDE IT AGAIN ${icons.arrow}</button><button class="secondary-button" data-action="next">Next location ${icons.arrow}</button><button class="text-button" data-action="menu">Back to locations</button></section>`;
  app.appendChild(wrapper);
  wrapper
    .querySelectorAll("[data-action]")
    .forEach((b) =>
      b.addEventListener("click", () => action(b.dataset.action)),
    );
  wrapper.querySelector("button").focus();
  beep(650, 0.25);
}
function finishSky() {
  mode = "finished";
  clearInput();
  const survived = !run.failed;
  const wrapper = document.createElement("div");
  wrapper.className = "modal-shade finish-shade";
  wrapper.innerHTML = `<section class="panel finish-panel" role="dialog" aria-modal="true" aria-labelledby="finish-title"><span class="eyebrow">DEAD AIR / EXTREME</span><h2 id="finish-title">${survived ? "YOU HELD<br>THE LINE." : "LOST<br>THE EDGE."}</h2><strong class="finish-time">${run.elapsed.toFixed(2)}s</strong><p>${survived ? "Twenty seconds survived above the valley." : "The run ends when you leave the road. Brake into bends and press Space or HOP when GAP AHEAD appears."}</p><button class="launch-button" data-action="restart">TRY AGAIN ${icons.arrow}</button><button class="text-button" data-action="menu">Back to locations</button></section>`;
  app.appendChild(wrapper);
  wrapper
    .querySelectorAll("[data-action]")
    .forEach((b) =>
      b.addEventListener("click", () => action(b.dataset.action)),
    );
  wrapper.querySelector("button").focus();
}
function toast(message) {
  let element = document.querySelector("#toast");
  if (!element) {
    element = document.createElement("div");
    element.id = "toast";
    element.className = "toast";
    element.setAttribute("role", "status");
    app.appendChild(element);
  }
  element.textContent = message;
  element.classList.add("visible");
  toastTimer = 2.4;
}
function clearInput() {
  keys.clear();
  touch.clear();
  jumpRequested = false;
  recoverRequested = false;
}
