// src__impacts 01 — math
// Lines 1-57 of readable/src__impacts.pretty.js (statement-aligned).
export function impactBody(body, speed, side, time) {
  const vehicle = ["car", "auto", "bus"].includes(body.kind),
    living =
      ["animal", "cow", "dog", "pedestrian", "zombie"].includes(body.kind) ||
      !!body.name;
  const mass =
    body.kind === "bus"
      ? 7000
      : body.kind === "car"
        ? 1400
        : body.kind === "auto"
          ? 420
          : body.kind === "rock"
            ? 300
            : body.kind === "cow"
              ? 500
              : living
                ? 75
                : 18;
  const force = (Math.min(25, speed) * 85) / (85 + mass);
  body.impact = { time, side, force, vehicle, living, mass };
  if (vehicle) {
    body.damage = Math.min(1, (body.damage || 0) + speed / 45);
    body.stoppedUntil = time + 2 + speed * 0.13;
  }
  return body.impact;
}
export function impactPose(body, time) {
  const i = body?.impact;
  if (!i) return { x: 0, y: 0, z: 0, spin: 0, tilt: 0 };
  const t = Math.max(0, time - i.time),
    settle = 1 - Math.exp(-t * 3);
  if (i.vehicle)
    return {
      x: i.side * Math.min(0.35, i.force * 0.15) * settle,
      y: 0,
      z: 0,
      spin: i.side * Math.min(0.25, i.force * 0.16) * settle,
      tilt: 0,
    };
  if (i.living)
    return {
      x: i.side * Math.min(1.2, i.force * 0.13) * settle,
      y: Math.max(0, Math.min(1, i.force * 0.1) * t - 4.9 * t * t),
      z: 0,
      spin: 0,
      tilt: i.side * Math.sin(Math.min(1, t / 1.2) * Math.PI) * 0.35,
    };
  const lift = Math.min(4.5, i.force * 0.32);
  return {
    x: i.side * Math.min(2, i.force * 0.17) * settle,
    y: Math.max(0, lift * t - 4.9 * t * t),
    z: -Math.min(1.5, i.force * 0.14) * settle,
    spin: i.side * Math.min(4, i.force * 0.35) * settle,
    tilt: Math.min(1.3, i.force * 0.2) * settle,
  };
}
