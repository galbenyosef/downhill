// src__halloween-world 02 — side
// Lines 13-382 of readable/src__halloween-world.pretty.js (statement-aligned).
export class HalloweenWorld {
  constructor(w) {
    this.w = w;
    this.c = w.course;
    const c = this.c,
      rand = w.rand;
    w.level.traverse((o) => {
      if (o.isHemisphereLight) o.intensity = 0.12;
    });
    w.sun.intensity = 0.08;
    w.scene.fog.density = 0.008;
    w.renderer.toneMappingExposure = 1.15;
    this.sky = new THREE.Group();
    w.level.add(this.sky);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xffddb0,
      fog: false,
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(19, 32, 24), moonMat);
    moon.position.set(-55, 78, -230);
    this.sky.add(moon);
    for (let i = 0; i < 14; i++) {
      const crater = new THREE.Mesh(
        new THREE.CircleGeometry(1 + rand() * 2, 12),
        new THREE.MeshBasicMaterial({
          color: 0xc8ae92,
          transparent: true,
          opacity: 0.25,
          fog: false,
        }),
      );
      const x = (rand() - 0.5) * 23,
        y = (rand() - 0.5) * 23;
      crater.position.set(
        -55 + x,
        78 + y,
        -230 + Math.sqrt(19 * 19 - x * x - y * y) + 0.1,
      );
      this.sky.add(crater);
    }
    const stars = [];
    for (let i = 0; i < 450; i++) {
      const a = rand() * Math.PI * 2,
        e = 0.13 + rand() * 1.4;
      stars.push(
        Math.cos(a) * Math.cos(e) * 360,
        Math.sin(e) * 360,
        Math.sin(a) * Math.cos(e) * 360,
      );
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
    this.sky.add(
      new THREE.Points(
        sg,
        new THREE.PointsMaterial({ color: 0xfce4c5, size: 0.8, fog: false }),
      ),
    );
    this.lamps = [];
    for (let s = 0; s < c.length + 25; s += 84) {
      const x = centerAt(s, c) + halfWidthAt(s, c) + 0.7,
        y = heightAt(s, c);
      w.cylinder([x, y, -s], [x, y + 6, -s], 0.075, 0x3b3038);
      w.cylinder([x, y + 6, -s], [x - 1.4, y + 6, -s], 0.055, 0x3b3038);
      w.box(x - 1.4, y + 5.85, -s, 0.55, 0.13, 0.65, 0xffa342, 0, true);
      this.lamps.push({ s, x: x - 1.4, y: y + 5.8 });
    }
    this.lights = Array.from({ length: 4 }, () => {
      const l = new THREE.PointLight(0xff8a30, 95, 23, 1.3);
      w.level.add(l);
      return l;
    });
    for (let s = -12; s < c.length + 30; s += 4) {
      const x = centerAt(s, c),
        y = heightAt(s, c),
        half = halfWidthAt(s, c);
      for (const side of [-1, 1])
        w.box(
          x + side * (half - 0.13),
          y + 0.06,
          -s,
          0.13,
          0.06,
          0.25,
          0xff8a32,
          0,
          true,
        );
      if (s % 12 === 0)
        w.box(x, y + 0.05, -s, 0.1, 0.04, 0.22, 0xffcc7a, 0, true);
    }
    for (let s = -20, i = 0; s < c.length + 40; s += 18, i++)
      for (const side of [-1, 1]) {
        if (forkAt(s, c, 16)) continue;
        const x = centerAt(s, c) + side * (halfWidthAt(s, c) + 7),
          y = heightAt(s, c),
          h = 4 + rand() * 5;
        w.box(x, y + h / 2, -s, 5, h, 6, i % 2 ? 0x35202b : 0x442a26);
        w.addGeom(
          new THREE.ConeGeometry(4.1, 3, 4),
          0x211823,
          [x, y + h + 1.4, -s],
          [0, Math.PI / 4, 0],
        );
        const face = x - side * 2.55;
        for (let z = -2; z <= 2; z += 4) {
          w.box(
            face,
            y + 2.8,
            -s + z,
            0.04,
            1.2,
            0.65,
            i % 3 ? 0x211821 : 0xef7020,
            0,
            i % 3 === 0,
          );
          w.box(
            face - side * 0.035,
            y + 2.8,
            -s + z,
            0.06,
            0.05,
            0.7,
            0x18131b,
          );
        }
        w.box(face, y + 1, -s, 0.05, 2, 1, 0x18121b);
        this.pumpkin(
          centerAt(s, c) + side * (halfWidthAt(s, c) + 0.45),
          y + 0.3,
          -s,
          0.36,
        );
        if (i % 3 === 0) {
          const tx = x + side * 4;
          w.cylinder([tx, y, -s], [tx + 0.3, y + 7, -s], 0.2, 0x261c27);
          for (let j = 0; j < 3; j++)
            w.cylinder(
              [tx + 0.2, y + 3 + j, -s],
              [tx + side * (2 + j * 0.4), y + 5 + j, -s + j - 1],
              0.07,
              0x261c27,
            );
        }
      }
    for (const ob of makeObstacles(c)) {
      const group = new THREE.Group();
      w.level.add(group);
      w.obstacleModels.push({ group, ob });
      w.objectGroup = group;
      this.pumpkin(0, 0.46, 0, 0.58);
      w.objectGroup = null;
    }
    this.zombies = makeZombies(c).map((z) => this.zombie(z));
    this.bats = Array.from({ length: 24 }, (_, i) => this.bat(i));
    // Orange arches replace the ordinary lime race gates.
    for (let i = 0; i <= 4; i++) {
      const s = i === 0 ? 8 : (i * c.length) / 4;
      if (forkAt(s, c, 10)) continue;
      const x = centerAt(s, c),
        y = heightAt(s, c),
        h = halfWidthAt(s, c) + 0.5;
      for (const side of [-1, 1])
        w.box(x + side * h, y + 1.8, -s, 0.12, 3.6, 0.12, 0xff792a, 0, true);
      w.frontSign(
        i === 0 ? "HALLOW’S DESCENT" : i === 4 ? "FINISH" : "CHECKPOINT " + i,
        x,
        y + 3.6,
        -s,
        h * 1.8,
        0.6,
      );
    }
  }
  pumpkin(x, y, z, r) {
    const w = this.w;
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4,
        g = new THREE.SphereGeometry(r * 0.66, 8, 6);
      g.scale(1, 1.2, 1);
      w.addGeom(g, 0xd9570a, [
        x + Math.cos(a) * r * 0.38,
        y,
        z + Math.sin(a) * r * 0.38,
      ]);
    }
    w.box(x, y + r * 0.88, z, 0.09, r * 0.35, 0.1, 0x625631);
    for (const side of [-1, 1]) {
      const g = new THREE.ConeGeometry(r * 0.15, r * 0.25, 3);
      w.addGeom(
        g,
        0xffbd46,
        [x + side * r * 0.3, y + r * 0.15, z + r * 0.95],
        [0, 0, Math.PI],
        true,
      );
    }
    w.box(
      x,
      y - r * 0.29,
      z + r * 0.96,
      r * 0.65,
      r * 0.12,
      0.04,
      0xffa52b,
      0,
      true,
    );
    for (let j = -1; j <= 1; j++)
      w.box(
        x + j * r * 0.18,
        y - r * 0.21,
        z + r,
        0.055,
        r * 0.1,
        0.05,
        0x6b290d,
      );
  }
  oval(g, color, pos, size, glow = false) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1, 10, 8),
      this.w.getMat(color, glow),
    );
    m.position.set(...pos);
    m.scale.set(...size);
    g.add(m);
    return m;
  }
  limb(g, a, b, r, color) {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b),
      m = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, av.distanceTo(bv), 7),
        this.w.getMat(color),
      );
    m.position.copy(av).add(bv).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      bv.sub(av).normalize(),
    );
    g.add(m);
    return m;
  }
  zombie(z) {
    const g = new THREE.Group(),
      skin = 0x778765,
      shirt = z.id % 2 ? 0x61443e : 0x41443e;
    this.oval(g, shirt, [0, 1.03, 0], [0.24, 0.35, 0.15]);
    this.oval(g, skin, [0.03, 1.58, -0.04], [0.17, 0.21, 0.16]);
    for (const side of [-1, 1]) {
      this.oval(
        g,
        0xff9c38,
        [side * 0.07, 1.61, -0.19],
        [0.028, 0.025, 0.02],
        true,
      );
      this.limb(
        g,
        [side * 0.21, 1.25, 0],
        [side * 0.24, 1.1, -0.52],
        0.06,
        skin,
      );
      this.oval(g, skin, [side * 0.24, 1.1, -0.53], [0.065, 0.045, 0.1]);
    }
    this.oval(g, 0x231e1e, [0, 1.46, -0.19], [0.07, 0.04, 0.025]);
    const legs = [-1, 1].map((side) =>
      this.limb(
        g,
        [side * 0.13, 0.85, 0],
        [side * 0.14, 0.12, 0.08],
        0.075,
        0x343138,
      ),
    );
    this.w.level.add(g);
    return { group: g, legs };
  }
  bat(i) {
    const g = new THREE.Group();
    this.oval(g, 0x352038, [0, 0, 0], [0.09, 0.13, 0.2]);
    const wings = [];
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(side * 0.7, 0.18);
      shape.lineTo(side * 0.55, -0.1);
      shape.lineTo(side * 0.4, -0.04);
      shape.lineTo(side * 0.26, -0.23);
      shape.lineTo(side * 0.13, -0.12);
      shape.lineTo(0, -0.25);
      const wing = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({
          color: 0x624654,
          side: THREE.DoubleSide,
        }),
      );
      g.add(wing);
      wings.push(wing);
    }
    for (const side of [-1, 1])
      this.oval(
        g,
        0xff8430,
        [side * 0.04, 0.04, 0.16],
        [0.016, 0.016, 0.016],
        true,
      );
    this.w.level.add(g);
    return { group: g, wings, s: 20 + i * 45 };
  }
  update(run, time, menu) {
    const c = this.c,
      s = run.s;
    this.sky.position.set(centerAt(s, c), heightAt(s, c), -s);
    this.sky.rotation.y = -Math.atan(
      (centerAt(s + 13, c) - centerAt(s, c)) / 13,
    );
    const nearest = [...this.lamps].sort(
      (a, b) => Math.abs(a.s - s) - Math.abs(b.s - s),
    );
    this.lights.forEach((l, i) => {
      const a = nearest[i];
      l.position.set(a.x, a.y, -a.s);
    });
    const states = run.zombies || makeZombies(c);
    states.forEach((z, i) => {
      const m = this.zombies[i],
        t = menu ? time : run.elapsed,
        x = menu
          ? Math.sin(t * 0.48 + z.phase) * (halfWidthAt(z.s, c) + 0.65)
          : z.x;
      m.group.visible = Math.abs(z.s - s) < 130;
      m.group.position.set(
        centerAt(z.s, c) + x,
        heightAt(z.s, c) + Math.abs(Math.sin(t * 2 + i)) * 0.025,
        -z.s,
      );
      m.group.rotation.set(
        0.12,
        Math.cos(t * 0.48 + z.phase) > 0 ? -Math.PI / 2 : Math.PI / 2,
        Math.sin(t * 1.5 + i) * 0.08,
      );
      const hit = impactPose(z, run.elapsed || 0);
      m.group.position.x += hit.x;
      m.group.position.y += hit.y;
      m.group.rotation.z += hit.tilt;
      m.legs.forEach(
        (l, j) => (l.rotation.x = Math.sin(t * 2 + j * Math.PI + i) * 0.23),
      );
    });
    this.bats.forEach((b, i) => {
      const bs = b.s + Math.sin(time * 0.7 + i) * 5;
      b.group.visible = Math.abs(bs - s) < 140;
      b.group.position.set(
        centerAt(bs, c) + Math.sin(time * 1.3 + i) * 5,
        heightAt(bs, c) + 3.5 + (i % 4),
        -bs,
      );
      b.wings.forEach(
        (wing, j) =>
          (wing.rotation.y = Math.sin(time * 13 + i) * (j ? 1 : -1) * 0.8),
      );
    });
  }
}
