// src__race-map 01 — rider
// Lines 1-136 of readable/src__race-map.pretty.js (statement-aligned).
import { centerAt, shortcutCenterAt, routeCenterAt } from "./game.js";

export const PLAYER_MAP_COLOR = "#c3ef67";

// A local view of the entire pack keeps close riders visible instead of shrinking
// their separation down to a few pixels on a kilometer-long course overview.
export function raceMapState(run, course) {
  const riders = [
    ...run.rivals.map((rider) => ({
      ...rider,
      key: String(rider.id),
      color: `#${rider.color.toString(16).padStart(6, "0")}`,
    })),
    {
      key: "you",
      name: "YOU",
      route: run.route,
      s: run.s,
      lateral: run.lateral,
      finished: run.finished,
      finishTime: run.finished ? run.elapsed : null,
      color: PLAYER_MAP_COLOR,
    },
  ].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished !== b.finished) return a.finished ? -1 : 1;
    return b.s - a.s || (a.key === "you" ? -1 : 1);
  });
  let start = Math.max(0, Math.min(...riders.map((r) => r.s)) - 24);
  let end = Math.min(course.length, Math.max(...riders.map((r) => r.s)) + 24);
  if (end - start < 80) {
    const middle = (start + end) / 2;
    start = Math.max(0, Math.min(course.length - 80, middle - 40));
    end = Math.min(course.length, start + 80);
  }
  const samples = Array.from(
    { length: 65 },
    (_, i) => start + (i / 64) * (end - start),
  );
  const xs = samples.flatMap((s) => [
    centerAt(s, course),
    shortcutCenterAt(s, course),
  ]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const scale = Math.min(1.25, 60 / Math.max(1, maxX - minX));
  const xAt = (s) => 60 + (centerAt(s, course) - (minX + maxX) / 2) * scale;
  const yAt = (s) => 145 - ((s - start) / Math.max(1, end - start)) * 125;
  const path = samples
    .map((s, i) => `${i ? "L" : "M"}${xAt(s).toFixed(1)} ${yAt(s).toFixed(1)}`)
    .join(" ");
  const shortcuts = (course.forks || [])
    .filter((f) => f.end >= start && f.start <= end)
    .map((f) =>
      Array.from({ length: 33 }, (_, i) => {
        const s =
          Math.max(start, f.start) +
          ((Math.min(end, f.end) - Math.max(start, f.start)) * i) / 32;
        return `${i ? "L" : "M"}${(60 + (shortcutCenterAt(s, course) - (minX + maxX) / 2) * scale).toFixed(1)} ${yAt(s).toFixed(1)}`;
      }).join(" "),
    )
    .join(" ");
  return {
    start,
    end,
    path,
    shortcuts,
    leader: riders[0].name,
    riders: riders.map((rider, index) => ({
      ...rider,
      rank: index + 1,
      x:
        60 +
        (routeCenterAt(rider.s, course, rider.route) - (minX + maxX) / 2) *
          scale +
        Math.max(-5, Math.min(5, rider.lateral * 2)),
      y: yAt(rider.s),
      gap:
        rider.key === "you"
          ? `${index + 1} / ${riders.length}`
          : rider.finished
            ? "FIN"
            : `${rider.s >= run.s ? "+" : "−"}${Math.round(Math.abs(rider.s - run.s))} m`,
    })),
  };
}

export function renderRaceMap(run, course) {
  const state = raceMapState(run, course);
  const dots = [...state.riders].sort(
    (a, b) => Number(a.key === "you") - Number(b.key === "you"),
  );
  return `<section class="live-map" aria-label="Live race map">
    <div class="map-heading"><span>RACE MAP</span><span>↑ FINISH</span></div>
    <div class="map-content">
      <svg class="race-route" viewBox="0 0 120 165" role="img" aria-label="Live rider positions. Ahead is up; you are lime green.">
        <path class="race-route-shadow" d="${state.path}"/>
        <path class="race-route-line" d="${state.path}"/><path class="race-route-shortcut" d="${state.shortcuts}" fill="none" stroke="#ffa64d" stroke-width="2" stroke-dasharray="3 2"/>
        <circle id="map-leader-ring" cx="${state.riders[0].x}" cy="${state.riders[0].y}" r="8" fill="none" stroke="white" stroke-width="1" stroke-dasharray="2 2"/>
        ${dots.map((rider) => `<g class="race-map-dot ${rider.key === "you" ? "is-you" : ""}" data-map-rider="${rider.key}" transform="translate(${rider.x} ${rider.y})"><title>${rider.name} — position ${rider.rank}</title><circle r="${rider.key === "you" ? "5.7" : "4.7"}" fill="${rider.color}" stroke="${rider.key === "you" ? "#fff" : "#13261e"}" stroke-width="${rider.key === "you" ? "2" : "1.6"}"/>${rider.key === "you" ? '<text x="10" y="3">YOU</text>' : ""}</g>`).join("")}
      </svg>
      <ol class="map-standings" aria-label="Race order">${state.riders.map((rider) => `<li data-map-standing="${rider.key}" class="${rider.key === "you" ? "is-you" : ""}"><span class="standing-rank">${rider.rank}</span><i style="--rider-color:${rider.color}"></i><span class="standing-name">${rider.name}</span><span class="standing-gap">${rider.gap}</span></li>`).join("")}</ol>
    </div>
    <div class="map-footer"><span class="map-leader-label">LEADER: ${state.leader}</span><span>+ AHEAD / − BEHIND</span></div>
  </section>`;
}

export function updateRaceMap(run, course) {
  const root = document.querySelector(".live-map");
  if (!root) return;
  const state = raceMapState(run, course);
  root.querySelector(".race-route-shortcut").setAttribute("d", state.shortcuts);
  root
    .querySelectorAll(".race-route-line,.race-route-shadow")
    .forEach((path) => path.setAttribute("d", state.path));
  const ring = root.querySelector("#map-leader-ring");
  ring.setAttribute("cx", state.riders[0].x);
  ring.setAttribute("cy", state.riders[0].y);
  root.querySelector(".map-leader-label").textContent =
    `LEADER: ${state.leader}`;
  const standings = root.querySelector(".map-standings");
  for (const rider of state.riders) {
    const dot = root.querySelector(`[data-map-rider="${rider.key}"]`);
    dot.setAttribute(
      "transform",
      `translate(${rider.x.toFixed(2)} ${rider.y.toFixed(2)})`,
    );
    dot.querySelector("title").textContent =
      `${rider.name} — position ${rider.rank}`;
    const row = root.querySelector(`[data-map-standing="${rider.key}"]`);
    if (standings.children[rider.rank - 1] !== row)
      standings.insertBefore(row, standings.children[rider.rank - 1] || null);
    row.querySelector(".standing-rank").textContent = rider.rank;
    row.querySelector(".standing-gap").textContent = rider.gap;
  }
}
