// src__game 04 — run
// Lines 948-1285 of readable/src__game.pretty.js (statement-aligned).
export function stepRun(run, course, input, dt) {
  if (run.finished) return;
  if (course.terrain === "sky") return stepSkyRun(run, course, input, dt);
  dt = Math.min(0.04, Math.max(0, dt));
  run.event = null;
  run.elapsed += dt;
  updateAnimals(run, course);
  updateZombies(run, course);
  updateStreetTraffic(run, course, dt);
  run.hitCooldown = Math.max(0, run.hitCooldown - dt);
  run.recoverTime = Math.max(0, (run.recoverTime || 0) - dt);
  if (run.down) {
    run.downTime += dt;
    run.speed = 0;
    stepRivals(run, course, dt);
    run.position = racePosition(run);
    if (run.downTime >= 0.7 && (input.recover || input.jump))
      recoverRider(run, course);
    return;
  }
  const choice = (course.forks || []).find(
    (f) => run.s >= f.start - 20 && run.s < f.start + 5,
  );
  if (choice) {
    if ((input.right - input.left) * choice.side > 0)
      run.forkIntent = choice.id;
    else if ((input.right - input.left) * choice.side < 0)
      run.forkIntent = null;
  }
  chooseFork(run, course, true);
  const shortcut = isShortcut(run, course),
    route = shortcut ? "shortcut" : "main";
  const targetSteer = input.right - input.left;
  run.steer += (targetSteer - run.steer) * Math.min(1, dt * 9);
  run.onStairs = !!stairAt(run.s, course);
  run.curve = routeCurvatureAt(run.s, course, route);
  const grade = Math.max(
    0.05,
    (heightAt(run.s, course) - heightAt(run.s + 2, course)) / 2,
  );
  const acceleration =
    2.45 +
    grade * 9 +
    (input.pedal ? 5.2 : 0) -
    run.speed * 0.17 -
    (input.brake ? 14.5 : 0);
  run.speed = Math.max(0, Math.min(25, run.speed + acceleration * dt));
  run.lateral += run.steer * (0.7 + run.speed * 0.23) * dt;
  // Cornering inertia pushes the rider to the outside; braking reduces it quadratically.
  run.lateral -=
    run.curve *
    run.speed *
    run.speed *
    (course.terrain === "snow" ? 0.34 : 0.25) *
    dt;
  const fork = forkAt(run.s, course),
    upcomingGap =
      shortcut && fork?.gaps.find(([a]) => a > run.s && a - run.s < 16);
  if (input.jump && upcomingGap && run.jump <= 0.002) {
    run.queuedShortcutHop = upcomingGap[0];
    run.event = "jump-queued";
  }
  const launchQueued =
    shortcut &&
    run.queuedShortcutHop !== null &&
    run.s >= run.queuedShortcutHop - 3;
  if (
    ((input.jump && !upcomingGap) || launchQueued) &&
    run.jump <= 0.002 &&
    run.speed > 2
  ) {
    run.verticalVelocity = shortcut ? 5.8 : 4.7;
    run.queuedShortcutHop = null;
    run.jump = 0.015;
    run.event = "jump";
  }
  if (run.jump > 0 || run.verticalVelocity > 0) {
    run.verticalVelocity -= 12 * dt;
    run.jump = Math.max(0, run.jump + run.verticalVelocity * dt);
    run.airtime += dt;
    if (run.jump === 0) {
      run.verticalVelocity = 0;
      run.event = "land";
    }
  }
  const oldS = run.s;
  run.s = Math.min(
    course.length,
    run.s + (run.speed * dt) / routeMetric(run.s, course, route),
  );
  run.distance += run.s - oldS;
  stepRivals(run, course, dt);
  for (const animal of run.animals || []) {
    if (
      !animal.hit &&
      animal.progress > 0 &&
      animal.progress < 1 &&
      Math.abs(run.s - animal.s) < 1.25 &&
      Math.abs(run.lateral - animal.x) < 0.95 &&
      run.jump < 1.3
    ) {
      crash(run, animal);
      if (run.down) run.event = "wildlife-contact";
      return;
    }
  }
  if (!shortcut) {
    for (const v of run.traffic || [])
      if (
        run.speed > 0.5 &&
        Math.abs(run.s - v.s) < v.halfLength + 0.6 &&
        Math.abs(run.lateral - v.x) < v.radius + 0.3
      ) {
        crash(run, v);
        run.event = "traffic-contact";
        return;
      }
    for (const a of run.crossings || [])
      if (
        !a.hit &&
        a.progress > 0 &&
        a.progress < 1 &&
        Math.abs(run.s - a.s) < 1.3 &&
        Math.abs(run.lateral - a.x) < a.radius + 0.35
      ) {
        crash(run, a);
        if (run.down) run.event = "crossing-contact";
        return;
      }
  }
  for (const zombie of run.zombies || [])
    if (
      run.hitCooldown === 0 &&
      Math.abs(run.s - zombie.s) < 1 &&
      Math.abs(run.lateral - zombie.x) < 0.65
    ) {
      crash(run, zombie);
      if (run.down) run.event = "zombie-contact";
      return;
    }
  for (const rider of run.rivals) {
    if (
      !rider.finished &&
      run.hitCooldown === 0 &&
      Math.abs(run.s - rider.s) < 1.2 &&
      Math.abs(
        routeCenterAt(run.s, course, route) +
          run.lateral -
          routeCenterAt(run.s, course, rider.route) -
          rider.lateral,
      ) < 0.42 &&
      Math.abs(run.jump - rider.jump) < 0.65
    ) {
      crash(run, rider);
      rider.speed *= 0.35;
      run.event = "rider-contact";
      return;
    }
  }
  if (shortcut && fork) {
    const gap = fork.gaps.find(([a, b]) => oldS < b && run.s > a);
    if (
      (gap && run.jump < 0.18) ||
      Math.abs(run.lateral) > routeHalfWidthAt(run.s, course, "shortcut") - 0.18
    )
      bailShortcut(run);
    else if (oldS < fork.end - 3 && run.s >= fork.end - 3) {
      run.shortcutsCleared++;
      run.event = "shortcut-clear";
    }
  }
  const edge =
    routeHalfWidthAt(
      run.s,
      course,
      isShortcut(run, course) ? "shortcut" : "main",
    ) - 0.29;
  if (Math.abs(run.lateral) > edge) {
    run.lateral = Math.sign(run.lateral) * edge;
    if (run.hitCooldown === 0 && run.speed > 3) {
      crash(run);
      return;
    }
  }
  for (const obstacle of run.obstacles) {
    if (obstacle.cleared || obstacle.hit || obstacle.s < oldS - 2) continue;
    if (
      oldS <= obstacle.s + 1 &&
      run.s >= obstacle.s - 0.8 &&
      Math.abs(run.lateral - obstacle.x) < obstacle.radius + 0.3
    ) {
      if (obstacle.kind === "ramp") {
        if (run.jump < 0.15) {
          run.jump = 0.04;
          run.verticalVelocity = Math.max(4.5, run.speed * 0.43);
          run.event = "jump";
        }
        obstacle.cleared = true;
      } else if (run.jump > 0.85) {
        obstacle.cleared = true;
        run.event = "clear";
      } else if (run.hitCooldown === 0) {
        obstacle.hit = true;
        crash(run, obstacle);
        return;
      }
    }
  }
  const checkpoint = Math.min(3, Math.floor(run.s / (course.length / 4)));
  if (checkpoint > run.checkpoint) {
    run.checkpoint = checkpoint;
    run.event = "checkpoint";
  }
  run.position = racePosition(run);
  if (run.s >= course.length) {
    run.finished = true;
    run.event = "finish";
  }
}
function stepSkyRun(run, course, input, dt) {
  dt = Math.min(0.04, Math.max(0, dt));
  run.event = null;
  if (run.falling) {
    run.fallTime += dt;
    if (run.fallTime >= 1.1) {
      run.finished = true;
      run.failed = true;
      run.event = "fall";
    }
    return;
  }
  dt = Math.min(dt, Math.max(0, course.duration - run.elapsed));
  run.elapsed = Math.min(course.duration, run.elapsed + dt);
  const target = input.right - input.left;
  run.steer += (target - run.steer) * Math.min(1, dt * 12);
  run.curve = curvatureAt(run.s, course);
  const grade = heightAt(run.s, course) - heightAt(run.s + 1, course);
  run.speed = Math.max(
    20,
    Math.min(
      37,
      run.speed +
        (grade * 8 +
          2 +
          (input.pedal ? 4 : 0) -
          run.speed * 0.09 -
          (input.brake ? 12 : 0)) *
          dt,
    ),
  );
  run.lateral +=
    (run.steer * (1 + run.speed * 0.19) -
      run.curve * run.speed * run.speed * 0.14 * Math.min(1, run.s / 45)) *
    dt;
  const upcoming = course.gaps.find(([a]) => a > run.s && a - run.s <= 45);
  if (input.jump && run.jump === 0 && upcoming && run.gapGrace === 0) {
    run.queuedGap = upcoming[0];
    run.event = "jump-queued";
  }
  const launchQueued = run.queuedGap !== null && run.s >= run.queuedGap - 7;
  const launchManual = input.jump && !upcoming;
  if (run.jump === 0 && (launchQueued || launchManual)) {
    run.verticalVelocity = 5.8;
    run.jump = 0.015;
    run.queuedGap = null;
    run.event = "jump";
  }
  if (run.jump > 0) {
    run.verticalVelocity -= 12 * dt;
    run.jump = Math.max(0, run.jump + run.verticalVelocity * dt);
    run.airtime += dt;
  }
  const oldS = run.s;
  run.s += run.speed * dt;
  run.distance = run.s;
  const gap = course.gaps.some(([a, b]) => oldS < b && run.s > a);
  if (run.jump >= 0.12) run.gapGrace = 0;
  else if (gap || run.gapGrace > 0) run.gapGrace += dt;
  if (
    Math.abs(run.lateral) > halfWidthAt(run.s, course) - 0.16 ||
    run.gapGrace >= 0.18
  ) {
    run.falling = true;
    run.failed = true;
    run.event = "fall";
    return;
  }
  if (run.elapsed >= course.duration - 1e-8) {
    run.elapsed = course.duration;
    run.finished = true;
    run.event = "finish";
  }
}
export function causesFall(body) {
  return (
    !!body &&
    (!!body.name ||
      ["car", "auto", "bus", "cow", "rock", "barrier", "crate"].includes(
        body.kind,
      ) ||
      (body.kind === "animal" && body.species === "tapir"))
  );
}
function crash(run, body = null) {
  if (run.down) return;
  const speed = run.speed;
  run.fallSide = run.lateral >= (body?.x ?? 0) ? 1 : -1;
  if (body) {
    impactBody(body, speed, -run.fallSide, run.elapsed);
    if (
      body.kind === "animal" ||
      ["dog", "cow", "pedestrian"].includes(body.kind)
    )
      body.hit = true;
    // Resolve the bike outside the contacted body's rear face before falling.
    if (causesFall(body))
      run.s = Math.max(
        0,
        Math.min(run.s, body.s - (body.halfLength || 0.65) - 0.75),
      );
  }
  if (!causesFall(body)) {
    run.speed = body ? Math.min(run.speed * 0.6, 5) : run.speed * 0.8;
    run.hitCooldown = 0.8;
    run.event = body ? "minor-contact" : "edge-scrape";
    return;
  }
  run.down = true;
  run.downTime = 0;
  run.speed = 0;
  run.jump = 0;
  run.verticalVelocity = 0;
  run.queuedShortcutHop = null;
  run.crashes++;
  run.penalty += 2;
  run.hitCooldown = 1.6;
  run.event = "crash";
}
