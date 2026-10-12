// src__game 03 — rider
// Lines 694-947 of readable/src__game.pretty.js (statement-aligned).
export function halfWidthAt(s, course) {
  if (course.terrain === "sky") {
    // Give riders an opening stretch to settle in, then taper smoothly through the run.
    const t = Math.max(0, Math.min(1, (s - 60) / 560));
    const blend = t * t * (3 - 2 * t);
    return (course.width + (course.endWidth - course.width) * blend) * 0.5;
  }
  const fork = forkAt(s, course);
  if (fork) {
    const blend = Math.min(1, (s - fork.start) / 12, (fork.end - s) / 12);
    return course.width * 0.5 + (3.3 - course.width * 0.5) * blend;
  }
  const squeeze = Math.max(0, Math.sin(s * 0.033 - 1.7));
  const normal =
    course.width * 0.5 - squeeze * (course.id === "alpine" ? 0.3 : 0.5);
  const chute = rockChuteAt(s, course);
  if (!chute) return normal;
  const blend = Math.max(
    0,
    Math.min(1, (s - chute.start) / 12, (chute.end - s) / 12),
  );
  return normal + (1.08 - normal) * blend * blend * (3 - 2 * blend);
}
export function makeObstacles(course) {
  if (course.terrain === "sky" || course.id === "bengaluru") return [];
  const result = [];
  for (let s = 65, i = 0; s < course.length - 45; s += 33 + (i % 3) * 8, i++) {
    if (rockChuteAt(s, course) || forkAt(s, course, 12)) continue;
    const kind =
      course.id === "halloween"
        ? "pumpkin"
        : i % 6 === 2
          ? "ramp"
          : course.environment === "wild"
            ? "rock"
            : i % 3 === 0
              ? "barrier"
              : "crate";
    result.push({
      s,
      x:
        kind === "ramp"
          ? i % 2
            ? 0.65
            : -0.65
          : (i % 2 ? 1 : -1) * (halfWidthAt(s, course) - 0.8),
      kind,
      radius: kind === "ramp" ? 0.8 : 0.55,
      hit: false,
      cleared: false,
    });
  }
  return result;
}
export function makeAnimals(course) {
  if (course.id !== "amazon") return [];
  return [75, 225, 395, 570, 760, 975]
    .map((s, i) => ({
      s,
      id: i,
      kind: "animal",
      species: i % 2 ? "tapir" : "capybara",
      side: i % 2 ? 1 : -1,
      x: (i % 2 ? 1 : -1) * (halfWidthAt(s, course) + 2.5),
      startedAt: null,
      progress: 0,
      hit: false,
      radius: 0.8,
    }))
    .map((a) => {
      const f = forkAt(a.s, course, 12);
      if (f) {
        a.s = f.end + 22;
        a.x = a.side * (halfWidthAt(a.s, course) + 2.5);
      }
      return a;
    });
}
export function updateAnimals(run, course) {
  for (const animal of run.animals || []) {
    if (animal.startedAt === null && run.s >= animal.s - 34)
      animal.startedAt = run.elapsed;
    if (animal.startedAt !== null) {
      animal.progress = Math.max(
        0,
        Math.min(1, (run.elapsed - animal.startedAt) / 4.5),
      );
      animal.x =
        animal.side *
        (halfWidthAt(animal.s, course) + 2.5) *
        (1 - 2 * animal.progress);
    }
  }
}
export function freshRun(course) {
  return {
    down: false,
    downTime: 0,
    fallSide: 1,
    recoverTime: 0,
    route: "main",
    forkId: null,
    forkIntent: null,
    queuedShortcutHop: null,
    shortcutsTaken: 0,
    shortcutBails: 0,
    shortcutsCleared: 0,
    s: 0,
    lateral: 0,
    speed: course.terrain === "sky" ? 29 : 0,
    elapsed: 0,
    jump: 0,
    verticalVelocity: 0,
    airtime: 0,
    crashes: 0,
    penalty: 0,
    hitCooldown: 0,
    steer: 0,
    distance: 0,
    checkpoint: 0,
    finished: false,
    obstacles: makeObstacles(course),
    animals: makeAnimals(course),
    zombies: makeZombies(course),
    traffic: makeTraffic(course),
    crossings: makeStreetCrossings(course),
    event: null,
    onStairs: false,
    curve: 0,
    rivals: course.terrain === "sky" ? [] : makeRivals(),
    position: course.terrain === "sky" ? 1 : 5,
    falling: false,
    fallTime: 0,
    failed: false,
    queuedGap: null,
    gapGrace: 0,
  };
}
export const RIVAL_ROSTER = [
  { name: "ARJUN", color: 0xf3a65c, skill: 0.92 },
  { name: "MAYA", color: 0x69d2ca, skill: 1.01 },
  { name: "NICO", color: 0xe889a1, skill: 0.97 },
  { name: "KAI", color: 0xa6b5f0, skill: 1.06 },
];
export function makeRivals() {
  return RIVAL_ROSTER.map((rider, i) => ({
    ...rider,
    route: "main",
    forkId: null,
    queuedShortcutHop: null,
    id: i,
    s: 5 + i * 3,
    lateral: (i % 2 ? 1 : -1) * 0.62,
    speed: 0,
    jump: 0,
    verticalVelocity: 0,
    finished: false,
    finishTime: null,
    turn: 0,
  }));
}
export function racePosition(run) {
  return (
    1 + run.rivals.filter((rider) => rider.finished || rider.s > run.s).length
  );
}
export function stepRivals(run, course, dt) {
  for (const rider of run.rivals) {
    if (rider.finished) continue;
    chooseFork(rider, course);
    const shortcut = isShortcut(rider, course),
      route = shortcut ? "shortcut" : "main";
    const curve = Math.max(
      Math.abs(routeCurvatureAt(rider.s + 5, course, route)),
      Math.abs(routeCurvatureAt(rider.s + 12, course, route)),
    );
    const stair = stairAt(rider.s + 4, course);
    let targetSpeed = Math.min(
      (21.5 * rider.skill) / (1 + curve * 16),
      stair ? 14.5 * rider.skill : 24,
    );
    const obstacles = [
      ...run.obstacles,
      ...(run.traffic || []),
      ...(run.crossings || []).filter((a) => a.progress > 0 && a.progress < 1),
      ...(run.zombies || []),
      ...(run.animals || []).filter((a) => a.progress > 0 && a.progress < 1),
    ].filter((ob) => ob.s > rider.s - 1 && ob.s < rider.s + 19);
    let targetLane = Math.sin(rider.s * 0.036 + rider.id * 2) * 0.65;
    for (const obstacle of obstacles)
      if (obstacle.kind !== "ramp")
        targetLane =
          -(Math.sign(obstacle.x) || 1) * (halfWidthAt(rider.s, course) - 0.42);
    for (const other of run.rivals)
      if (
        other !== rider &&
        other.route === rider.route &&
        other.s > rider.s &&
        other.s - rider.s < 4 &&
        Math.abs(other.lateral - rider.lateral) < 0.6
      ) {
        targetLane = other.lateral > 0 ? -0.7 : 0.7;
        targetSpeed = Math.min(targetSpeed, other.speed + 1);
      }
    if (
      run.route === rider.route &&
      Math.abs(run.s - rider.s) < 4 &&
      Math.abs(run.lateral - rider.lateral) < 0.7
    )
      targetLane = run.lateral > 0 ? -0.8 : 0.8;
    const edge = routeHalfWidthAt(rider.s, course, route) - 0.35;
    targetLane = Math.max(-edge, Math.min(edge, targetLane));
    const laneChange = (targetLane - rider.lateral) * Math.min(1, dt * 2.5);
    rider.lateral += laneChange;
    rider.turn = laneChange / Math.max(dt, 0.001);
    rider.speed +=
      Math.max(-8, Math.min(4.5, (targetSpeed - rider.speed) * 2)) * dt;
    const previousS = rider.s;
    rider.s = Math.min(
      course.length,
      rider.s + (rider.speed * dt) / routeMetric(rider.s, course, route),
    );
    for (const obstacle of obstacles)
      if (
        obstacle.kind === "ramp" &&
        previousS < obstacle.s &&
        rider.s >= obstacle.s &&
        Math.abs(rider.lateral - obstacle.x) < 1
      ) {
        rider.jump = 0.03;
        rider.verticalVelocity = 5;
      }
    const f = forkAt(rider.s, course),
      gap =
        shortcut && f?.gaps.find(([a, b]) => rider.s >= a - 4 && rider.s < b);
    if (gap && rider.jump === 0 && rider.s < gap[0]) {
      rider.jump = 0.03;
      rider.verticalVelocity = 5.8;
    }
    if (rider.jump > 0) {
      rider.verticalVelocity -= 12 * dt;
      rider.jump = Math.max(0, rider.jump + rider.verticalVelocity * dt);
    }
    if (shortcut && gap && rider.s >= gap[0] && rider.jump < 0.18) {
      rider.route = "main";
      rider.lateral = 0;
      rider.speed *= 0.25;
    }
    if (rider.s >= course.length) {
      rider.finished = true;
      rider.finishTime = run.elapsed;
    }
  }
}
