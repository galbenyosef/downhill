// src__game 05 — run
// Lines 1286-1333 of readable/src__game.pretty.js (statement-aligned).
export function recoverRider(run, c) {
  const bodies = [
    ...run.traffic,
    ...run.obstacles.filter((o) => !o.hit && o.kind !== "ramp"),
    ...run.crossings,
    ...run.animals,
    ...run.zombies,
    ...run.rivals.map((r) => ({ ...r, x: r.lateral, radius: 0.4 })),
  ];
  for (let back = 0; back <= 24; back += 2) {
    const s = Math.max(0, run.s - back),
      edge = halfWidthAt(s, c) - 0.45;
    for (const x of [0, -edge * 0.5, edge * 0.5, -edge, edge]) {
      if (
        bodies.some(
          (b) =>
            Math.abs(b.s - s) < (b.halfLength || 1) + 1.4 &&
            Math.abs((b.x || 0) - x) < (b.radius || 0.5) + 0.65,
        )
      )
        continue;
      run.s = s;
      run.lateral = x;
      run.route = "main";
      run.forkId = forkAt(s, c)?.id ?? null;
      run.down = false;
      run.recoverTime = 0.45;
      run.steer = 0;
      run.speed = 0;
      run.hitCooldown = 0.5;
      run.event = "recovered";
      return true;
    }
  }
  run.event = "recovery-blocked";
  return false;
}
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}
export function medalFor(time, course) {
  return time <= course.par
    ? "GOLD"
    : time <= course.par * 1.3
      ? "SILVER"
      : "BRONZE";
}
