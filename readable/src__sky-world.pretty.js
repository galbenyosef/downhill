import * as THREE from "three";
import { centerAt, heightAt, halfWidthAt } from "./game.js";

export function buildSkyRoad(w) {
  const c = w.course;
  w.scene.fog = new THREE.FogExp2(c.fog, 0.00013);
  w.sun.intensity = 3.2;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = 256;
  const ctx = textureCanvas.getContext("2d");
  ctx.fillStyle = "#aa8556";
  ctx.fillRect(0, 0, 256, 256);
  // Packed earth, loose gravel, and worn tyre tracks tile along the trail.
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = ["#907047", "#c0a276", "#a58b63", "#735e41"][i % 4];
    ctx.beginPath();
    ctx.ellipse(
      w.rand() * 256,
      w.rand() * 256,
      1 + w.rand() * 4,
      1 + w.rand() * 2,
      w.rand() * 3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (const x of [68, 188]) {
    ctx.strokeStyle = "#80674455";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 9, 80, x - 8, 170, x, 256);
    ctx.stroke();
    ctx.strokeStyle = "#65583d55";
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 9) {
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y + 3);
      ctx.stroke();
    }
  }
  const dirt = new THREE.CanvasTexture(textureCanvas);
  dirt.colorSpace = THREE.SRGBColorSpace;
  dirt.wrapS = dirt.wrapT = THREE.RepeatWrapping;
  dirt.anisotropy = w.renderer.capabilities.getMaxAnisotropy();
  let start = -35;
  for (const [a, b] of [...c.gaps, [c.length + 80, c.length + 80]]) {
    const deck = w.surface(
      (s) => -halfWidthAt(s, c),
      (s) => halfWidthAt(s, c),
      c.road,
      0,
      start,
      a,
    );
    deck.material.map = dirt;
    deck.material.roughness = 1;
    start = b;
  }
  // Crumbling rocky shoulders border the floating dirt trail; gaps stay open.
  for (let s = -30; s < c.length + 65; s += 2) {
    if (c.gaps.some(([a, b]) => s > a - 2 && s < b + 2)) continue;
    const x = centerAt(s, c),
      y = heightAt(s, c),
      half = halfWidthAt(s, c);
    for (const side of [-1, 1]) {
      const chip = new THREE.DodecahedronGeometry(0.09 + w.rand() * 0.07, 0);
      chip.scale(0.9, 0.5, 1.6);
      w.addGeom(chip, 0x947c58, [x + side * (half - 0.045), y - 0.035, -s]);
    }
    for (let j = 0; j < 3; j++) {
      const gravel = new THREE.DodecahedronGeometry(
        0.025 + w.rand() * 0.035,
        0,
      );
      gravel.scale(1, 0.4, 1.3);
      w.addGeom(
        gravel,
        [0xb6a381, 0x8a795c, 0x746b53][j],
        [x + (w.rand() - 0.5) * half * 1.6, y + 0.008, -s],
        [0, w.rand() * 3, 0],
      );
    }
  }
  for (let s = 18; s < c.length; s += 29) {
    if (c.gaps.some(([a, b]) => s > a - 4 && s < b + 4)) continue;
    const x = centerAt(s, c),
      y = heightAt(s, c),
      side = Math.round(s) % 2 ? 1 : -1;
    // Scratched markings remain flat along the rocky trail edges.
    const marks = document.createElement("canvas");
    marks.width = 256;
    marks.height = 128;
    const p = marks.getContext("2d");
    p.strokeStyle = "#413f38";
    p.lineWidth = 5;
    p.beginPath();
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 4) / 5;
      const px = 64 + 45 * Math.cos(a),
        py = 64 + 45 * Math.sin(a);
      if (i === 0) p.moveTo(px, py);
      else p.lineTo(px, py);
    }
    p.stroke();
    p.font = "bold 25px monospace";
    p.fillStyle = "#5e473b";
    p.fillText("VOID", 125, 62);
    p.fillText("///", 143, 98);
    const tex = new THREE.CanvasTexture(marks);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.8),
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        roughness: 1,
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.set(x + side * (halfWidthAt(s, c) - 0.23), y + 0.013, -s);
    mesh.rotation.x = -Math.PI / 2;
    w.level.add(mesh);
    if (Math.floor(s / 29) % 3 === 0) {
      const patch = w.surface(
        (v) => -halfWidthAt(v, c) * (0.35 + 0.12 * Math.sin(v * 1.7)),
        (v) => halfWidthAt(v, c) * (0.2 + 0.1 * Math.sin(v * 1.3)),
        0x9d8056,
        0.008,
        s + 1,
        s + 6,
      );
      patch.material.roughness = 1;
    }
  }
  // Valley floor sits over 3,000 metres below even at the end of the ride.
  const ground = new THREE.PlaneGeometry(14000, 14000, 60, 60),
    pos = ground.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.0016) * 110 + Math.cos(z * 0.0013) * 90);
  }
  ground.computeVertexNormals();
  const valley = new THREE.Mesh(ground, w.material(0x526e5e));
  valley.rotation.x = -Math.PI / 2;
  valley.position.set(0, -300, -1600);
  w.level.add(valley);
  for (let i = 0; i < 70; i++) {
    const x = (w.rand() - 0.5) * 11000,
      z = (w.rand() - 0.5) * 11000 - 1200,
      h = 150 + w.rand() * 420;
    w.addGeom(
      new THREE.ConeGeometry(350 + w.rand() * 650, h, 6),
      [0x607b68, 0x6c826d, 0x496959][i % 3],
      [x, -280 + h * 0.35, z],
      [0, w.rand() * 3, 0],
    );
  }
  const river = [];
  for (let i = 0; i < 100; i++) {
    const z = -7000 + i * 140;
    river.push(new THREE.Vector3(Math.sin(z * 0.0011) * 650 + 300, -85, z));
  }
  const curve = new THREE.CatmullRomCurve3(river);
  w.addGeom(
    new THREE.TubeGeometry(curve, 180, 20, 6, false),
    0x82b7bb,
    [0, 0, 0],
  );
  for (let i = 0; i < 50; i++) {
    const x = (w.rand() - 0.5) * 6000,
      z = -6000 + w.rand() * 9000;
    w.box(
      x,
      -170,
      z,
      100 + w.rand() * 180,
      3,
      140 + w.rand() * 240,
      [0x7a8f68, 0x92a07b, 0x58725d][i % 3],
    );
  }
}

export function addHandDetails(bike, material) {
  for (const side of [-1, 1]) {
    const wrist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.059, 0.06, 0.095, 12),
      material(0x151a1b, { roughness: 0.55 }),
    );
    wrist.rotation.x = Math.PI / 4;
    wrist.position.set(side * 0.6, -0.16, -0.665);
    bike.add(wrist);
    for (let j = 0; j < 5; j++) {
      const stud = new THREE.Mesh(
        new THREE.ConeGeometry(0.009, 0.014, 4),
        material(0x9ca6a3, { metalness: 0.75, roughness: 0.35 }),
      );
      stud.position.set(side * 0.6 + (j - 2) * 0.021, -0.1, -0.655);
      bike.add(stud);
    }
    const inkCanvas = document.createElement("canvas");
    inkCanvas.width = inkCanvas.height = 128;
    const p = inkCanvas.getContext("2d");
    p.strokeStyle = "#203536";
    p.lineWidth = 7;
    p.beginPath();
    p.moveTo(15, 70);
    p.lineTo(40, 35);
    p.lineTo(61, 90);
    p.lineTo(85, 30);
    p.lineTo(112, 66);
    p.stroke();
    p.beginPath();
    p.arc(64, 62, 30, 0, Math.PI * 2);
    p.stroke();
    const ink = new THREE.Mesh(
      new THREE.PlaneGeometry(0.078, 0.075),
      new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(inkCanvas),
        transparent: true,
        depthWrite: false,
        roughness: 1,
      }),
    );
    ink.position.set(side * 0.575, -0.061, -0.705);
    ink.rotation.x = -Math.PI / 2;
    bike.add(ink);
  }
}
