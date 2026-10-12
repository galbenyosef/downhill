import { impactPose } from "./impacts.js";
import * as THREE from "three";
import {
  RIVAL_ROSTER,
  centerAt,
  heightAt,
  curvatureAt,
  stairAt,
  routeCenterAt,
  routeHeightAt,
  routeCurvatureAt,
} from "./game.js";

const vertical = new THREE.Vector3(0, 1, 0);
function material(color, metal = false) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: metal ? 0.4 : 0.82,
    metalness: metal ? 0.6 : 0,
  });
}
function tube(group, a, b, r, mat) {
  const av = new THREE.Vector3(...a),
    bv = new THREE.Vector3(...b);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, av.distanceTo(bv), 8),
    mat,
  );
  mesh.position.copy(av).add(bv).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(vertical, bv.sub(av).normalize());
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
function oval(group, position, size, mat) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), mat);
  mesh.position.set(...position);
  mesh.scale.set(...size);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
function buildRider(rider, skeleton = false) {
  const group = new THREE.Group(),
    wheels = [],
    legs = [];
  const paint = material(rider.color, true),
    jersey = material(rider.color),
    rubber = material(0x192623),
    metal = material(0x809087, true),
    pants = material(0x263836),
    skin = material(0xbd9674),
    helmet = material(0xe0e7d5);
  for (const z of [-0.61, 0.57]) {
    const wheel = new THREE.Group();
    wheel.position.set(0, 0.37, z);
    wheel.rotation.y = Math.PI / 2;
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.043, 8, 24),
      rubber,
    );
    tire.castShadow = true;
    wheel.add(tire);
    wheel.add(
      new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.016, 6, 24), metal),
    );
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      tube(
        wheel,
        [0, 0, 0],
        [Math.cos(a) * 0.29, Math.sin(a) * 0.29, 0],
        0.006,
        metal,
      );
    }
    group.add(wheel);
    wheels.push(wheel);
  }
  const rear = [0, 0.37, 0.57],
    crank = [0, 0.4, 0.04],
    seat = [0, 0.91, 0.28],
    head = [0, 0.89, -0.43],
    front = [0, 0.37, -0.61];
  for (const [a, b] of [
    [rear, crank],
    [rear, seat],
    [seat, crank],
    [seat, head],
    [head, crank],
  ])
    tube(group, a, b, 0.028, paint);
  tube(group, head, front, 0.026, metal);
  tube(group, [0, 0.89, -0.43], [0, 1.04, -0.48], 0.023, metal);
  tube(group, [-0.36, 1.04, -0.48], [0.36, 1.04, -0.48], 0.022, rubber);
  oval(group, [0, 0.98, 0.29], [0.095, 0.04, 0.14], rubber);
  tube(group, [-0.18, 0.4, 0.04], [0.18, 0.4, 0.04], 0.02, metal);
  const bone = material(0xe3dcc4);
  bone.emissive.setHex(0x514433);
  bone.emissiveIntensity = 0.22;
  if (skeleton) {
    tube(group, [0, 0.99, 0.25], [0, 1.42, -0.1], 0.035, bone);
    for (let j = 0; j < 5; j++) {
      const y = 1.13 + j * 0.058,
        z = 0.15 - j * 0.048;
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(0.15 - j * 0.009, 0.016, 5, 14),
        bone,
      );
      rib.position.set(0, y, z);
      rib.rotation.x = Math.PI / 2 - 0.5;
      group.add(rib);
    }
    oval(group, [0, 1, 0.24], [0.17, 0.09, 0.12], bone);
    oval(group, [0, 1.61, -0.25], [0.15, 0.18, 0.14], bone);
    oval(group, [0, 1.47, -0.29], [0.1, 0.045, 0.1], bone);
    for (const side of [-1, 1])
      oval(group, [side * 0.063, 1.63, -0.375], [0.044, 0.053, 0.025], rubber);
    for (let j = -2; j <= 2; j++)
      tube(
        group,
        [j * 0.03, 1.48, -0.38],
        [j * 0.03, 1.53, -0.38],
        0.009,
        rubber,
      );
    tube(group, [-0.18, 1.4, -0.05], [0.18, 1.4, -0.05], 0.034, bone);
  } else {
    oval(group, [0, 1.18, 0.1], [0.2, 0.3, 0.15], jersey).rotation.x = -0.65;
    oval(group, [0, 1.0, 0.26], [0.19, 0.13, 0.18], pants);
    oval(group, [0, 1.53, -0.22], [0.115, 0.15, 0.115], skin);
    oval(group, [0, 1.64, -0.25], [0.17, 0.14, 0.2], helmet);
    oval(group, [0, 1.64, -0.4], [0.16, 0.035, 0.1], paint);
    oval(group, [0, 1.53, -0.34], [0.125, 0.05, 0.025], rubber);
    // Bright jersey panel makes each opponent easy to follow from behind.
    oval(group, [0, 1.3, 0.16], [0.14, 0.17, 0.03], paint);
  }
  for (const side of [-1, 1]) {
    tube(
      group,
      [side * 0.16, 1.38, -0.04],
      [side * 0.29, 1.19, -0.21],
      skeleton ? 0.025 : 0.069,
      skeleton ? bone : jersey,
    );
    tube(
      group,
      [side * 0.29, 1.19, -0.21],
      [side * 0.33, 1.04, -0.47],
      skeleton ? 0.022 : 0.043,
      skeleton ? bone : skin,
    );
    oval(group, [side * 0.33, 1.04, -0.47], [0.055, 0.044, 0.07], rubber);
    const thigh = tube(
      group,
      [side * 0.13, 1.0, 0.22],
      [side * 0.15, 0.7, -0.01],
      skeleton ? 0.03 : 0.075,
      skeleton ? bone : pants,
    );
    const shin = tube(
      group,
      [side * 0.15, 0.7, -0.01],
      [side * 0.18, 0.38, 0.1],
      skeleton ? 0.023 : 0.045,
      skeleton ? bone : pants,
    );
    const shoe = oval(
      group,
      [side * 0.18, 0.38, 0.04],
      [0.066, 0.046, 0.12],
      rubber,
    );
    legs.push({
      side,
      thigh,
      shin,
      shoe,
      thighBase: thigh.rotation.x,
      shinBase: shin.rotation.x,
    });
  }
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#15231dd9";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#" + rider.color.toString(16).padStart(6, "0");
  ctx.fillRect(0, 0, 7, 64);
  ctx.fillStyle = "#f0f4e6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 29px sans-serif";
  ctx.fillText(rider.name, 133, 34);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const nameTag = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, depthTest: true, transparent: true }),
  );
  nameTag.scale.set(1.05, 0.26, 1);
  nameTag.position.set(0, 2.13, 0);
  group.add(nameTag);
  return { group, wheels, legs, nameTag };
}
export class Peloton {
  constructor(parent, course, roster = RIVAL_ROSTER) {
    this.course = course;
    this.riders = roster.map((rider) => {
      const model = buildRider(rider, course.id === "halloween");
      parent.add(model.group);
      model.group.visible = false;
      return model;
    });
  }
  update(rivals, playerS, time) {
    for (let i = 0; i < this.riders.length; i++) {
      const model = this.riders[i],
        rival = rivals?.[i];
      model.group.visible =
        !!rival && !rival.finished && Math.abs(rival.s - playerS) < 180;
      if (!model.group.visible) continue;
      const s = rival.s,
        c = this.course,
        route = rival.route || "main",
        x = routeCenterAt(s, c, route) + rival.lateral,
        y = routeHeightAt(s, c, route);
      const dx =
        (routeCenterAt(s + 1, c, route) - routeCenterAt(s - 1, c, route)) / 2;
      const grade =
        (routeHeightAt(s + 1, c, route) - routeHeightAt(s - 1, c, route)) / 2;
      model.group.position.set(
        x,
        y + rival.jump + (stairAt(s, c) ? Math.sin(time * 42 + i) * 0.025 : 0),
        -s,
      );
      model.group.rotation.set(
        Math.atan(grade),
        -Math.atan(dx),
        Math.max(
          -0.25,
          Math.min(
            0.25,
            -routeCurvatureAt(s, c, route) * rival.speed * 0.5 -
              rival.turn * 0.05,
          ),
        ),
      );
      const hit = impactPose(rival, time);
      model.group.position.y += hit.y;
      model.group.rotation.z += hit.tilt;
      for (const wheel of model.wheels) wheel.rotation.z = -s / 0.33;
      for (const leg of model.legs) {
        const phase = s * 3 + (leg.side * Math.PI) / 2;
        leg.thigh.rotation.x = leg.thighBase + Math.sin(phase) * 0.22;
        leg.shin.rotation.x = leg.shinBase + Math.cos(phase) * 0.18;
        leg.shoe.position.y = 0.38 + Math.sin(phase) * 0.11;
        leg.shoe.position.z = 0.04 + Math.cos(phase) * 0.08;
      }
      model.nameTag.visible = Math.abs(s - playerS) < 55;
    }
  }
}
