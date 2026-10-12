import { impactPose } from "./impacts.js";
import * as THREE from "three";
import {
  centerAt,
  heightAt,
  halfWidthAt,
  flyoverLift,
  makeTraffic,
  makeStreetCrossings,
  forkAt,
} from "./game.js";

// A fictional Bengaluru streetscape: all traffic leaves a navigable cycling line.
export class BengaluruWorld {
  constructor(w) {
    this.w = w;
    this.c = w.course;
    const c = this.c;
    for (let s = -15, i = 0; s < c.length + 30; s += 18, i++) {
      if (forkAt(s, c, 24)) continue;
      const ground = 75 - s * c.slope;
      for (const side of [-1, 1]) {
        const x = centerAt(s, c) + side * 13,
          h = 7 + (i % 4) * 3;
        w.box(x, ground + h / 2, -s, 7, h, 10, c.colors[i % c.colors.length]);
        for (let floor = 2; floor < h; floor += 3)
          for (let dx = -2; dx <= 2; dx += 2)
            w.box(x + dx, ground + floor, -s + 5.05, 1.1, 1.4, 0.1, 0x3b555c);
        w.box(x, ground + 0.9, -s + 5.1, 5.6, 1.8, 0.15, 0x687a73);
        if (i % 3 === 0) {
          w.frontSign(
            side > 0 ? "DARSHINI / COFFEE" : "BENGALURU / MARKET",
            x,
            ground + 3,
            -s + 5.2,
            5,
            0.7,
            "#ffd46f",
          );
        }
        if (i % 2 === 0 && flyoverLift(s) < 0.2) this.stall(s, side, i);
      }
    }
    // The ride itself climbs two flyovers; pillars descend to a separate ground plane.
    for (const start of [260, 790]) {
      for (let s = start + 8; s < start + 172; s += 5) {
        const x = centerAt(s, c),
          y = heightAt(s, c),
          half = halfWidthAt(s, c);
        for (const side of [-1, 1])
          w.box(
            x + side * (half + 0.15),
            y + 0.42,
            -s,
            0.28,
            0.84,
            5.2,
            0xc8c3af,
          );
        if ((s - start - 8) % 20 === 0) {
          const lift = flyoverLift(s);
          w.box(x, y - lift / 2 - 0.2, -s, 1.5, lift + 0.4, 1.5, 0x9c9d94);
          w.box(x, y - 0.35, -s, half * 2, 0.55, 2, 0x9c9d94);
        }
      }
      w.frontSign(
        "FLYOVER / KEEP MOVING",
        centerAt(start - 10, c),
        heightAt(start - 10, c) + 4.4,
        -start + 10,
        6,
        0.8,
        "#ffffff",
      );
    }
    this.vehicles = makeTraffic(c).map((v) => this.vehicle(v));
    this.crossers = makeStreetCrossings(c).map((a) => this.crosser(a));
    for (const a of makeStreetCrossings(c)) {
      for (let x = -4; x < 5; x += 1.3)
        w.box(
          centerAt(a.s, c) + x,
          heightAt(a.s, c) + 0.035,
          -a.s,
          0.7,
          0.03,
          3,
          0xe0dbc7,
        );
      w.frontSign(
        a.kind === "pedestrian"
          ? "PEOPLE CROSSING"
          : a.kind === "dog"
            ? "DOGS / SLOW"
            : "COWS / SLOW",
        centerAt(a.s - 22, c) + 5.7,
        heightAt(a.s - 22, c) + 2,
        -a.s + 22,
        2.4,
        0.65,
        "#ffd46f",
      );
    }
    w.frontSign(
      "BENGALURU / RUSH HOUR",
      centerAt(22, c),
      heightAt(22, c) + 4.3,
      -22,
      7,
      1,
      "#ffd46f",
    );
  }
  box(g, color, pos, size) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      this.w.getMat(color),
    );
    m.position.set(...pos);
    m.castShadow = true;
    g.add(m);
    return m;
  }
  ball(g, color, pos, size) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 6),
      this.w.getMat(color),
    );
    m.position.set(...pos);
    m.scale.set(...size);
    g.add(m);
    return m;
  }
  vehicle(v) {
    const g = new THREE.Group(),
      bus = v.kind === "bus",
      auto = v.kind === "auto",
      width = v.radius * 2,
      length = v.halfLength * 2,
      color = bus
        ? 0x318caa
        : auto
          ? 0xe2b331
          : [0xd7d9cc, 0xad5550, 0x639197, 0xe0bd78][v.id % 4];
    const body = this.box(g, color, [0, 0.65, 0], [width, 1, length]);
    body.material = body.material.clone();
    g.userData.body = body;
    this.box(
      g,
      auto ? 0x285747 : color,
      [0, bus ? 1.65 : 1.22, -0.2],
      [width * 0.92, bus ? 1.5 : 0.75, length * 0.65],
    );
    this.box(
      g,
      0x28404a,
      [0, bus ? 1.9 : 1.4, length * 0.325 - 0.18],
      [width * 0.8, bus ? 0.7 : 0.4, 0.035],
    );
    if (bus)
      for (let z = -2.4; z < 2.5; z += 1)
        for (const side of [-1, 1])
          this.box(
            g,
            0x274852,
            [side * (width / 2 + 0.01), 1.95, z],
            [0.03, 0.65, 0.7],
          );
    for (const side of [-1, 1]) {
      for (const z of [-length * 0.31, length * 0.31])
        this.ball(
          g,
          0x202b2c,
          [side * width * 0.49, 0.35, z],
          [0.16, 0.34, 0.34],
        );
      this.box(
        g,
        0xe46548,
        [side * width * 0.32, 0.67, length / 2 + 0.02],
        [0.24, 0.16, 0.04],
      );
    }
    this.w.level.add(g);
    return g;
  }
  crosser(a) {
    const g = new THREE.Group(),
      legs = [];
    if (a.kind === "pedestrian") {
      this.box(g, a.id % 2 ? 0xc28354 : 0x729cad, [0, 1, 0], [0.43, 0.65, 0.3]);
      this.ball(g, 0xa77d59, [0, 1.55, 0], [0.19, 0.23, 0.18]);
      for (const side of [-1, 1]) {
        legs.push(
          this.box(g, 0x343f4a, [side * 0.13, 0.37, 0], [0.16, 0.65, 0.18]),
        );
        this.box(g, 0xa77d59, [side * 0.3, 1, 0], [0.13, 0.6, 0.14]);
      }
    } else {
      const cow = a.kind === "cow",
        k = cow ? 1 : 0.48,
        col = cow ? 0xd6ccb3 : 0xa58159;
      this.ball(g, col, [0, 0.85 * k, 0], [0.85 * k, 0.43 * k, 0.35 * k]);
      this.ball(g, col, [0.8 * k, 1 * k, 0], [0.34 * k, 0.35 * k, 0.26 * k]);
      for (const x of [-0.55, 0.52])
        for (const z of [-0.24, 0.24])
          legs.push(
            this.box(
              g,
              col,
              [x * k, 0.35 * k, z * k],
              [0.14 * k, 0.7 * k, 0.14 * k],
            ),
          );
      for (const side of [-1, 1]) {
        this.ball(
          g,
          col,
          [0.85 * k, 1.2 * k, side * 0.3 * k],
          [0.22 * k, 0.1 * k, 0.13 * k],
        );
        this.ball(
          g,
          0x263632,
          [1 * k, 1.08 * k, side * 0.21 * k],
          [0.03, 0.035, 0.03],
        );
        if (cow)
          this.box(g, 0x6b6556, [0.7, 1.4, side * 0.2], [0.09, 0.3, 0.09]);
      }
      this.box(g, col, [-0.9 * k, 0.75 * k, 0], [0.45 * k, 0.08 * k, 0.09 * k]);
    }
    this.w.level.add(g);
    return { group: g, legs };
  }
  stall(s, side, i) {
    const w = this.w,
      x = centerAt(s, this.c) + side * 7,
      y = heightAt(s, this.c);
    w.box(x, y + 0.65, -s, 2.1, 1.3, 1.5, 0x4f876f);
    w.box(x, y + 2.2, -s, 2.6, 0.16, 2, i % 4 ? 0xddaa52 : 0xb96754);
    for (const dx of [-1, 1])
      w.box(x + dx, y + 1.2, -s - 0.5, 0.07, 2.4, 0.07, 0x59635a);
    for (let j = 0; j < 5; j++)
      w.addGeom(
        new THREE.SphereGeometry(0.16, 6, 4),
        j % 2 ? 0xe6bd49 : 0x9aaf55,
        [x - 0.8 + j * 0.4, y + 1.4, -s],
      );
    w.frontSign(
      i % 4 ? "CHAI / COFFEE" : "FRESH FRUIT",
      x,
      y + 1.9,
      -s + 1.05,
      2.2,
      0.4,
      "#ffe6a6",
    );
    const vendor = this.crosser({ kind: "pedestrian", id: i });
    vendor.group.position.set(x, y, -s - 1.4);
  }
  update(run, time, menu) {
    const c = this.c;
    (run.traffic || makeTraffic(c)).forEach((v, i) => {
      const g = this.vehicles[i];
      g.visible = v.s < c.length + 8 && Math.abs(v.s - run.s) < 170;
      g.position.set(centerAt(v.s, c) + v.x, heightAt(v.s, c) + 0.05, -v.s);
      g.rotation.y =
        -Math.atan2(centerAt(v.s + 1, c) - centerAt(v.s - 1, c), 2) +
        impactPose(v, run.elapsed || 0).spin;
      g.userData.body.scale.z = 1 - (v.damage || 0) * 0.15;
      g.userData.body.material.color.setHex(
        v.damage
          ? 0x6d6260
          : v.kind === "bus"
            ? 0x318caa
            : v.kind === "auto"
              ? 0xe2b331
              : [0xd7d9cc, 0xad5550, 0x639197, 0xe0bd78][v.id % 4],
      );
    });
    (run.crossings || makeStreetCrossings(c)).forEach((a, i) => {
      const m = this.crossers[i];
      m.group.visible = Math.abs(a.s - run.s) < 150;
      const p = impactPose(a, run.elapsed || 0);
      m.group.position.set(
        centerAt(a.s, c) + a.x + p.x,
        heightAt(a.s, c) + p.y,
        -a.s,
      );
      m.group.rotation.z = p.tilt;
      m.group.rotation.y =
        a.kind === "pedestrian" ? 0 : a.side > 0 ? Math.PI : 0;
      m.legs.forEach(
        (leg, j) =>
          (leg.rotation.x =
            a.progress > 0 && a.progress < 1
              ? Math.sin(time * 7 + j * Math.PI) * 0.3
              : 0),
      );
    });
  }
}
