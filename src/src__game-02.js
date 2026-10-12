// src__game 02 — course
// Lines 349-693 of readable/src__game.pretty.js (statement-aligned).
export function makeStreetCrossings(c) {
  if (c.id !== "bengaluru") return [];
  return [100, 180, 475, 535, 720, 1000, 1100, 1180].map((s, i) => ({
    id: i,
    s,
    kind: ["pedestrian", "dog", "cow"][i % 3],
    x: (i % 2 ? 1 : -1) * 5.5,
    side: i % 2 ? 1 : -1,
    startedAt: null,
    progress: 0,
    hit: false,
    radius: i % 3 === 2 ? 0.85 : 0.4,
  }));
}
export function updateStreetTraffic(run, c, dt = 0) {
  // Process the front of each queue first, preserving clearance through bends and forks.
  const leaders = new Map();
  for (const v of [...(run.traffic || [])].sort((a, b) => b.s - a.s)) {
    const leader = leaders.get(v.lane);
    const next =
      v.s +
      ((run.elapsed < (v.stoppedUntil || 0) ? 0 : v.speed) * Math.max(0, dt)) /
        routeMetric(v.s, c);
    v.s = Math.max(
      v.s,
      leader
        ? Math.min(next, leader.s - leader.halfLength - v.halfLength - 3)
        : next,
    );
    v.x =
      v.lane * Math.min(2.35, halfWidthAt(v.s, c) - v.radius - 0.7) +
      impactPose(v, run.elapsed).x;
    leaders.set(v.lane, v);
  }
  for (const a of run.crossings || []) {
    if (a.startedAt === null && run.s >= a.s - 40) a.startedAt = run.elapsed;
    if (a.startedAt !== null) {
      a.progress = Math.min(
        1,
        (run.elapsed - a.startedAt) / (a.kind === "dog" ? 4 : 7),
      );
      a.x = a.side * 5.5 * (1 - 2 * a.progress);
    }
  }
}

export function makeZombies(course) {
  return course.id === "halloween"
    ? Array.from({ length: 14 }, (_, i) => ({
        id: i,
        s: 42 + i * 73,
        x: 0,
        kind: "zombie",
        radius: 0.45,
        phase: i * 1.8,
      })).map((z) => {
        const f = forkAt(z.s, course, 12);
        if (f) z.s = f.end + 20 + (z.id % 3) * 9;
        return z;
      })
    : [];
}
export function updateZombies(run, course) {
  for (const z of run.zombies || [])
    z.x =
      Math.sin(run.elapsed * 0.48 + z.phase) *
      (halfWidthAt(z.s, course) + 0.65);
}

const stairLayouts = {
  valpo: [
    [90, 66, 0.85, 0.12],
    [340, 52, 0.78, 0.14],
    [655, 90, 0.9, 0.16],
    [895, 48, 0.75, 0.13],
  ],
  aizawl: [
    [35, 72, 0.6, 0.14],
    [230, 80, 0.58, 0.15],
    [455, 85, 0.6, 0.16],
    [670, 75, 0.56, 0.16],
  ],
  mumbai: [
    [70, 64, 0.7, 0.14],
    [300, 72, 0.65, 0.14],
    [610, 84, 0.7, 0.17],
    [910, 66, 0.65, 0.16],
  ],
  tokyo: [
    [140, 44, 0.8, 0.13],
    [440, 65, 0.72, 0.13],
    [760, 70, 0.68, 0.15],
    [1000, 55, 0.75, 0.16],
  ],
};
const forkLayouts = {
  bengaluru: [[560, 670]],
  halloween: [
    [150, 250],
    [600, 700],
  ],
  valpo: [
    [190, 290],
    [470, 570],
  ],
  aizawl: [
    [125, 215],
    [340, 430],
  ],
  mumbai: [
    [160, 270],
    [420, 530],
  ],
  tokyo: [
    [220, 330],
    [540, 650],
  ],
  california: [
    [180, 300],
    [700, 820],
  ],
  redwoods: [
    [170, 290],
    [570, 690],
  ],
  yosemite: [
    [180, 300],
    [720, 840],
  ],
  rockies: [
    [190, 310],
    [800, 920],
  ],
  amazon: [
    [150, 270],
    [600, 720],
  ],
};
for (const course of COURSES) {
  course.forks = (forkLayouts[course.id] || []).map(([start, end], id) => ({
    id,
    start,
    end,
    side: id % 2 ? -1 : 1,
    gaps: [0.4, 0.7].map((t) => [
      start + (end - start) * t,
      start + (end - start) * t + 3.4,
    ]),
  }));
  course.stairs = (stairLayouts[course.id] || []).map(
    ([start, length, spacing, rise]) => ({ start, length, spacing, rise }),
  );
  course.drop = Math.round(
    heightAt(0, course) - heightAt(course.length, course),
  );
  course.par += course.duration ? 0 : 15;
  if (!course.environment)
    course.features =
      course.id === "aizawl"
        ? ["520+ stair steps", "Tight S-bends", "Steep drops"]
        : course.id === "valpo"
          ? ["Long stair flights", "Sharp curves", "Coastal streets"]
          : course.id === "mumbai"
            ? ["Narrow market lanes", "Rooftop crowds", "400+ stair steps"]
            : ["Neon stairways", "Tight S-bends", "Night riding"];
}

function baseCenterAt(s, course) {
  if (course.terrain === "sky")
    return Math.sin(s * 0.023) * 12 + Math.sin(s * 0.061) * 3;
  const m =
    course.id === "aizawl"
      ? 1.12
      : course.id === "tokyo"
        ? 1.22
        : course.terrain === "coast"
          ? 0.85
          : 1;
  return m * (Math.sin(s * 0.018) * 18 + Math.sin(s * 0.067) * 8);
}
export function forkAt(s, c, margin = 0) {
  return (c.forks || []).find(
    (f) => s >= f.start - margin && s <= f.end + margin,
  );
}
function forkBase(s, c, f) {
  const t = (s - f.start) / (f.end - f.start);
  return baseCenterAt(f.start, c) * (1 - t) + baseCenterAt(f.end, c) * t;
}
function forkWave(s, f) {
  return (
    Math.sin(
      Math.PI * Math.max(0, Math.min(1, (s - f.start) / (f.end - f.start))),
    ) ** 2
  );
}
export function centerAt(s, c) {
  const f = forkAt(s, c);
  return f
    ? forkBase(s, c, f) - f.side * 35 * forkWave(s, f)
    : baseCenterAt(s, c);
}
export function shortcutCenterAt(s, c) {
  const f = forkAt(s, c);
  return f
    ? forkBase(s, c, f) + f.side * 5 * forkWave(s, f)
    : baseCenterAt(s, c);
}
export function isShortcut(actor, c) {
  const f = forkAt(actor.s, c);
  return !!f && actor.route === "shortcut" && actor.forkId === f.id;
}
export function routeCenterAt(s, c, route = "main") {
  return route === "shortcut" ? shortcutCenterAt(s, c) : centerAt(s, c);
}
export function routeHeightAt(s, c, route = "main") {
  const f = forkAt(s, c);
  return (
    heightAt(s, c) + (route === "shortcut" && f ? 1.5 * forkWave(s, f) : 0)
  );
}
export function routeHalfWidthAt(s, c, route = "main") {
  const f = forkAt(s, c);
  if (!f || route !== "shortcut") return halfWidthAt(s, c);
  const blend = Math.min(1, (s - f.start) / 15, (f.end - s) / 15);
  return halfWidthAt(s, c) * (1 - blend) + 1.05 * blend;
}
export function routeCurvatureAt(s, c, route = "main") {
  const a = routeCenterAt(s - 1, c, route),
    b = routeCenterAt(s, c, route),
    d = routeCenterAt(s + 1, c, route),
    slope = (d - a) / 2;
  return (d - 2 * b + a) / Math.pow(1 + slope * slope, 1.5);
}
export function routeMetric(s, c, route = "main") {
  const f = forkAt(s, c);
  if (!f) return 1;
  const dx =
      (routeCenterAt(s + 0.25, c, route) - routeCenterAt(s - 0.25, c, route)) /
      0.5,
    dy =
      (routeHeightAt(s + 0.25, c, route) - routeHeightAt(s - 0.25, c, route)) /
      0.5;
  const blend = Math.max(0, Math.min(1, (s - f.start) / 6, (f.end - s) / 6));
  return 1 + blend * (Math.hypot(1, dx, dy) - 1);
}
function chooseFork(actor, c, isPlayer = false) {
  const f = forkAt(actor.s, c);
  if (!f) {
    actor.route = "main";
    actor.forkId = null;
    actor.queuedShortcutHop = null;
    return;
  }
  if (actor.forkId === f.id || actor.s < f.start + 4) return;
  actor.forkId = f.id;
  const take = isPlayer
    ? actor.lateral * f.side > 0.5 && actor.forkIntent === f.id
    : (actor.id + f.id) % 2 === 0;
  actor.route = take ? "shortcut" : "main";
  actor.queuedShortcutHop = null;
  if (take) {
    actor.lateral += centerAt(actor.s, c) - shortcutCenterAt(actor.s, c);
    if (isPlayer) {
      actor.shortcutsTaken++;
      actor.event = "shortcut-enter";
    }
  } else if (isPlayer) actor.event = "safe-route";
}
function bailShortcut(run) {
  run.route = "main";
  run.lateral = 0;
  run.speed *= 0.25;
  run.jump = 0;
  run.verticalVelocity = 0;
  run.queuedShortcutHop = null;
  run.penalty += 6;
  run.crashes++;
  run.shortcutBails++;
  run.hitCooldown = 2;
  run.event = "shortcut-bail";
}
export function forkHint(run, c) {
  const f = forkAt(run.s, c);
  if (f && run.forkId === f.id) {
    if (isShortcut(run, c)) {
      const gap = f.gaps.find(([a, b]) => run.s < b);
      return run.queuedShortcutHop !== null
        ? "HOP QUEUED / KEEP YOUR LINE"
        : gap && gap[0] - run.s < 16
          ? "GAP AHEAD / SPACE OR HOP"
          : "SHORTCUT / NARROW LINE";
    }
    return "SAFE ROUTE / WIDE & LONG";
  }
  const next = (c.forks || []).find(
    (f) => run.s < f.start + 4 && f.start - run.s < 45,
  );
  return next
    ? `FORK AHEAD / ${next.side > 0 ? "RIGHT" : "LEFT"} SHORTCUT · ${next.side > 0 ? "LEFT" : "RIGHT"} SAFE`
    : "";
}
export function heightAt(s, course) {
  if (course.terrain === "sky")
    return (
      3500 - s * 0.3 + Math.sin(s * 0.055 + 1.4) * 3.6 + Math.sin(s * 0.019) * 5
    );
  if (course.id === "bengaluru") return 75 - s * course.slope + flyoverLift(s);
  let steps = 0;
  for (const flight of course.stairs || []) {
    const distance = Math.max(0, Math.min(flight.length, s - flight.start));
    steps +=
      Math.floor(distance / flight.spacing) *
        (flight.rise + flight.spacing * course.slope) -
      distance * course.slope;
  }
  let rockDrop = 0;
  for (const chute of course.rockChutes || []) {
    const t = Math.max(
      0,
      Math.min(1, (s - chute.start) / (chute.end - chute.start)),
    );
    rockDrop += chute.drop * t * t * (3 - 2 * t);
  }
  return 75 - s * course.slope + Math.sin(s * 0.021) * 1.35 - steps - rockDrop;
}
export function stairAt(s, course) {
  return course.stairs.find(
    (flight) => s >= flight.start && s < flight.start + flight.length,
  );
}
export function curvatureAt(s, course) {
  const d = (centerAt(s + 1, course) - centerAt(s - 1, course)) / 2;
  return (
    (centerAt(s + 1, course) -
      2 * centerAt(s, course) +
      centerAt(s - 1, course)) /
    Math.pow(1 + d * d, 1.5)
  );
}
export function rockChuteAt(s, course) {
  return (course.rockChutes || []).find(
    (chute) => s >= chute.start && s <= chute.end,
  );
}
