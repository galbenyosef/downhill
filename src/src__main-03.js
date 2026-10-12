// src__main 03 — run
// Lines 461-704 of readable/src__main.pretty.js (statement-aligned).
function tick(now) {
  requestAnimationFrame(tick);
  if (!world?.course) return;
  const dt = Math.min((now - previous) / 1000, 0.04);
  previous = now;
  frame++;
  if (mode === "countdown") {
    const old = Math.ceil(countdown);
    countdown -= dt;
    if (Math.ceil(countdown) !== old && countdown > 0) {
      document.querySelector("#countdown strong").textContent =
        Math.ceil(countdown);
      beep(330, 0.09);
    }
    if (countdown <= 0) {
      mode = "riding";
      document.querySelector("#countdown").innerHTML = "";
      toast(
        course().terrain === "sky"
          ? "SURVIVE 20 SECONDS. HOP THE GAPS."
          : "RACE ON. CATCH THE PACK.",
      );
      beep(620, 0.2);
    }
  }
  if (mode === "riding") {
    const input = {
      left:
        keys.has("KeyA") || keys.has("ArrowLeft") || touch.has("left") ? 1 : 0,
      right:
        keys.has("KeyD") || keys.has("ArrowRight") || touch.has("right")
          ? 1
          : 0,
      pedal: keys.has("KeyW") || keys.has("ArrowUp") || touch.has("pedal"),
      brake: keys.has("KeyS") || keys.has("ArrowDown") || touch.has("brake"),
      jump: jumpRequested,
      recover: recoverRequested,
    };
    jumpRequested = false;
    recoverRequested = false;
    stepRun(run, course(), input, dt);
    const recovery = document.querySelector("#crash-recovery");
    if (recovery) {
      recovery.hidden = !run.down;
      recovery.querySelector("button").disabled = run.downTime < 0.7;
    }
    if (run.event === "edge-scrape")
      toast("EDGE SCRAPE / STEER BACK ONTO THE ROAD");
    if (run.event === "minor-contact") toast("SMALL BUMP / KEEP YOUR BALANCE");
    if (run.event === "recovered") {
      clearInput();
      toast("BACK ON THE BIKE");
    }
    if (run.event === "recovery-blocked") toast("WAIT FOR TRAFFIC TO CLEAR");
    if (
      [
        "crash",
        "rider-contact",
        "traffic-contact",
        "crossing-contact",
        "wildlife-contact",
        "zombie-contact",
      ].includes(run.event)
    ) {
      toast(
        run.event === "rider-contact"
          ? "RIDER CONTACT  /  +2 SEC"
          : "CONTACT  /  +2 SEC",
      );
      document.querySelector(".hit-flash").classList.remove("active");
      void document.querySelector(".hit-flash").offsetWidth;
      document.querySelector(".hit-flash").classList.add("active");
      beep(100, 0.15);
    }
    if (run.event === "checkpoint") {
      toast(`CHECKPOINT ${run.checkpoint} / 3`);
      beep(490, 0.12);
    }
    if (run.event === "shortcut-enter") toast("SHORTCUT / 2 JUMPS · SAVE TIME");
    if (run.event === "safe-route") toast("SAFE ROUTE / WIDE & LONG");
    if (run.event === "shortcut-clear") toast("CLEAN SHORTCUT");
    if (run.event === "shortcut-bail")
      toast("MISSED SHORTCUT / +6 SEC / BACK TO SAFE");
    if (run.event === "fall") toast("OFF THE EDGE");
    if (run.event === "jump-queued") toast("HOP QUEUED / KEEP YOUR LINE");
    if (run.event === "zombie-contact") toast("ZOMBIE CONTACT / +2 SEC");
    if (run.event === "wildlife-brake") toast("WILDLIFE CROSSING / SLOW DOWN");
    if (run.event === "clear") toast("CLEAN HOP");
    if (run.event === "land") world.bump = -0.045;
    if (frame % 3 === 0) {
      if (course().terrain === "sky") {
        document.querySelector("#time").textContent = Math.max(
          0,
          20 - run.elapsed,
        ).toFixed(2);
        document.querySelector("#speed").textContent = Math.round(
          run.speed * 3.6,
        );
        document.querySelector("#speed-meter").style.width =
          `${(run.speed / 37) * 100}%`;
        document.querySelector("#progress").style.width =
          `${(run.elapsed / 20) * 100}%`;
        const next = course().gaps.find(([a]) => a > run.s);
        document.querySelector("#ride-status").textContent = run.falling
          ? "OFF THE EDGE"
          : run.queuedGap !== null
            ? "HOP QUEUED / KEEP YOUR LINE"
            : next && next[0] - run.s < 45
              ? "GAP AHEAD / PRESS SPACE OR HOP"
              : Math.abs(run.curve) > 0.01
                ? "SHARP BEND / BRAKE"
                : "HOLD YOUR LINE";
      } else {
        document.querySelector("#race-position").textContent = run.position;
        const ahead = run.rivals
          .filter((r) => r.s > run.s && !r.finished)
          .sort((a, b) => a.s - b.s)[0];
        document.querySelector("#next-rider").textContent = ahead
          ? `${ahead.name} · ${Math.round(ahead.s - run.s)} m ahead`
          : run.position === 1
            ? "YOU LEAD THE PACK"
            : "CHASE THE FINISH";
        updateRaceMap(run, course());
        document.querySelector("#speed").textContent = Math.round(
          run.speed * 3.6,
        );
        document.querySelector("#speed-meter").style.width =
          `${(run.speed / 25) * 100}%`;
        document.querySelector("#time").textContent = formatTime(
          run.elapsed + run.penalty,
        );
        document.querySelector("#penalty").textContent = run.penalty
          ? `+${run.penalty}s CONTACT PENALTY`
          : `GOLD TARGET ${formatTime(course().par)}`;
        document.querySelector("#progress").style.width =
          `${(run.s / course().length) * 100}%`;
        document.querySelector("#distance").textContent =
          `${Math.floor(run.s)} / ${course().length} m`;
        document.querySelector("#checkpoints").textContent =
          `CHECKPOINT ${run.checkpoint} / 3`;
        const routeHint = forkHint(run, course()),
          prompt = document.querySelector("#fork-prompt");
        prompt.hidden = !routeHint;
        prompt.textContent = routeHint;
        const streetCrossing = (run.crossings || []).find(
          (a) => a.s > run.s && a.s - run.s < 40 && a.progress < 1,
        );
        const crossing = (run.animals || []).find(
          (a) => a.s > run.s && a.s - run.s < 34 && a.progress < 1,
        );
        document.querySelector("#ride-status").textContent = run.down
          ? "RIDER DOWN / SPACE OR ↑ TO GET UP"
          : routeHint
            ? routeHint.startsWith("FORK AHEAD")
              ? "STEER TO CHOOSE / ORANGE SHORTCUT · BLUE SAFE"
              : run.route === "shortcut"
                ? "HOLD YOUR LINE / SPACE OR HOP AT GAPS"
                : "FOLLOW THE BLUE MARKERS"
            : streetCrossing
              ? "CROSSING AHEAD / BRAKE & YIELD"
              : course().id === "bengaluru"
                ? "FIND A GAP / WATCH THE TRAFFIC"
                : course().id === "halloween"
                  ? "FOLLOW THE REFLECTORS / DODGE THE UNDEAD"
                  : crossing
                    ? "WILDLIFE AHEAD / BRAKE"
                    : run.jump > 0.1
                      ? "AIRBORNE"
                      : input.brake
                        ? "ON THE BRAKES"
                        : run.onStairs
                          ? "STAIR FLIGHT / HOLD YOUR LINE"
                          : Math.abs(run.curve) > 0.018 && run.speed > 13
                            ? "SHARP BEND / BRAKE"
                            : run.speed > 19
                              ? "FULL SEND"
                              : input.pedal
                                ? "BUILDING SPEED"
                                : "FIND YOUR LINE";
      }
    }
    if (run.finished) {
      if (course().terrain !== "sky") updateRaceMap(run, course());
      finish();
    }
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0)
      document.querySelector("#toast")?.classList.remove("visible");
  }
  if (audio) {
    const riding = mode === "riding" && soundEnabled;
    audio.gain.gain.setTargetAtTime(
      riding ? 0.008 + run.speed * 0.0025 : 0,
      audio.context.currentTime,
      0.1,
    );
    audio.filter.frequency.setTargetAtTime(
      riding ? 180 + run.speed * 75 : 100,
      audio.context.currentTime,
      0.1,
    );
    const cheer =
      riding &&
      course().terrain !== "sky" &&
      course().id !== "amazon" &&
      course().id !== "halloween"
        ? Math.pow(0.5 + 0.5 * Math.cos(((run.s - 21) / 63) * Math.PI * 2), 3)
        : 0;
    audio.crowdGain.gain.setTargetAtTime(
      cheer * 0.045 * (0.8 + 0.2 * Math.sin(now * 0.008)),
      audio.context.currentTime,
      0.15,
    );
    audio.voices.forEach((voice, i) => {
      voice.oscillator.frequency.setTargetAtTime(
        270 + i * 73 + Math.sin(now * 0.002 + i) * 80,
        audio.context.currentTime,
        0.08,
      );
      voice.gain.gain.setTargetAtTime(
        cheer * 0.0025 * (0.6 + 0.4 * Math.sin(now * 0.005 + i)),
        audio.context.currentTime,
        0.1,
      );
    });
  }
  if (mode === "menu")
    world.update(
      {
        s: 17 + Math.sin(now * 0.00013) * 0.15,
        lateral: 0,
        speed: 0,
        jump: 0,
        steer: 0,
        hitCooldown: 0,
      },
      now / 1000,
      true,
    );
  else world.update(run, now / 1000);
}
requestAnimationFrame(tick);
