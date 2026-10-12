import * as THREE from "three";
import {
  centerAt,
  heightAt,
  shortcutCenterAt,
  routeHeightAt,
  routeHalfWidthAt,
  halfWidthAt,
} from "./game.js";

export function buildForks(w) {
  const c = w.course;
  for (const f of c.forks || []) {
    // The shortcut is a raised, narrow deck. Gaps are actual holes in its mesh.
    const segments = [
      [f.start, f.gaps[0][0]],
      [f.gaps[0][1], f.gaps[1][0]],
      [f.gaps[1][1], f.end],
    ];
    for (const [start, end] of segments) {
      const vertices = [],
        indices = [];
      const steps = Math.ceil((end - start) / 0.75);
      for (let i = 0; i <= steps; i++) {
        const s = start + ((end - start) * i) / steps,
          x = shortcutCenterAt(s, c),
          y = routeHeightAt(s, c, "shortcut") + 0.075,
          h = routeHalfWidthAt(s, c, "shortcut");
        vertices.push(x - h, y, -s, x + h, y, -s);
        if (i) {
          const k = i * 2;
          indices.push(k - 2, k - 1, k, k, k - 1, k + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      w.addGeom(g, c.night ? 0x987448 : 0xba9364, [0, 0, 0]);
    }
    for (let s = f.start; s < f.end; s += 2) {
      if (f.gaps.some(([a, b]) => s > a && s < b)) continue;
      const x = shortcutCenterAt(s, c),
        y = routeHeightAt(s, c, "shortcut"),
        h = routeHalfWidthAt(s, c, "shortcut");
      for (const side of [-1, 1])
        w.box(
          x + side * (h - 0.06),
          y + 0.11,
          -s,
          0.1,
          0.075,
          0.3,
          0xff993c,
          0,
          true,
        );
      if (s > f.start + 18 && s < f.end - 18)
        w.box(x, y + 0.09, -s, h * 2, 0.02, 0.045, 0x574d3c);
    }
    // Blue markers guide the forgiving main route around the detour.
    for (let s = f.start; s <= f.end; s += 4)
      for (const side of [-1, 1])
        w.box(
          centerAt(s, c) + side * (halfWidthAt(s, c) - 0.08),
          heightAt(s, c) + 0.09,
          -s,
          0.1,
          0.06,
          0.3,
          0x69d2ca,
          0,
          true,
        );
    for (const [a, b] of f.gaps) {
      for (const s of [a - 0.3, b + 0.3]) {
        const x = shortcutCenterAt(s, c),
          y = routeHeightAt(s, c, "shortcut"),
          h = routeHalfWidthAt(s, c, "shortcut");
        w.box(x, y + 0.1, -s, h * 2, 0.05, 0.18, 0xffb34f, 0, true);
      }
      const s = a - 8,
        x = shortcutCenterAt(s, c),
        y = routeHeightAt(s, c, "shortcut");
      w.frontSign("JUMP / SPACE OR HOP", x, y + 2.3, -s, 3, 0.46, "#ffb34f");
      w.cylinder([x + 1.7, y, -s], [x + 1.7, y + 2.6, -s], 0.045, 0x7f6245);
    }
    const s = f.start - 22,
      x = centerAt(s, c),
      y = heightAt(s, c);
    w.frontSign(
      f.side > 0 ? "SAFE ←  |  SHORTCUT →" : "← SHORTCUT  |  SAFE →",
      x,
      y + 3.2,
      -s,
      7,
      0.8,
      "#f5e9c9",
    );
    for (const side of [-1, 1])
      w.cylinder(
        [x + side * 4, y, -s],
        [x + side * 4, y + 3.6, -s],
        0.06,
        0x53625a,
      );
    const gate = f.start + 20;
    for (const route of ["main", "shortcut"]) {
      const cx =
          route === "main" ? centerAt(gate, c) : shortcutCenterAt(gate, c),
        cy = routeHeightAt(gate, c, route),
        color = route === "main" ? "#69d2ca" : "#ffad4d";
      w.frontSign(
        route === "main" ? "SAFE / WIDE & LONG" : "SHORTCUT / 2 JUMPS",
        cx,
        cy + 3,
        -gate,
        4.7,
        0.65,
        color,
      );
    }
  }
}
