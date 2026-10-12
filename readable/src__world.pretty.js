import { impactPose } from "./impacts.js";
import { buildBillboards } from "./billboards.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  centerAt,
  heightAt,
  flyoverLift,
  halfWidthAt,
  makeObstacles,
  stairAt,
  curvatureAt,
  rockChuteAt,
  forkAt,
  routeCenterAt,
  routeHeightAt,
} from "./game.js";
import { buildForks } from "./fork-world.js";
import { buildSkyRoad, addHandDetails } from "./sky-world.js";
import { HalloweenWorld } from "./halloween-world.js";
import { BengaluruWorld } from "./bengaluru-world.js";
import { AmazonWorld } from "./amazon-world.js";
import { CAMERA_MODES, nextCameraMode, followCameraPose } from "./cameras.js";
import { Peloton } from "./racers.js";

const up = new THREE.Vector3(0, 1, 0);
const temp = new THREE.Object3D();
function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class World {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.camera = new THREE.PerspectiveCamera(
      78,
      innerWidth / innerHeight,
      0.035,
      900,
    );
    this.scene = new THREE.Scene();
    this.scene.add(this.camera);
    this.bike = this.createBike();
    this.camera.add(this.bike);
    this.skyBike = this.createBike(true);
    this.skyBike.visible = false;
    this.camera.add(this.skyBike);
    this.look = new THREE.Vector3();
    this.menu = true;
    this.cameraMode = 0;
    this.bump = 0;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  cycleCamera() {
    this.cameraMode = nextCameraMode(this.cameraMode);
    return CAMERA_MODES[this.cameraMode];
  }
  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.bike.scale.x = Math.min(1, this.camera.aspect / 1.6);
    this.skyBike.scale.x = this.bike.scale.x;
    this.setMenu(this.menu);
  }
  setMenu(value) {
    this.menu = value;
    if (value && innerWidth > 800 && this.course?.terrain !== "sky")
      this.camera.setViewOffset(
        innerWidth,
        innerHeight,
        -innerWidth * 0.17,
        0,
        innerWidth,
        innerHeight,
      );
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
  material(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.87, ...extra });
  }
  createBike(extreme = false) {
    const bike = new THREE.Group();
    const metal = this.material(0x222f31, { metalness: 0.7, roughness: 0.35 });
    const silver = this.material(0x778785, { metalness: 0.8, roughness: 0.3 });
    const rubber = this.material(0x121b1d);
    const lime = this.material(0xb4ed51, { roughness: 0.4 });
    const glove = this.material(0x1c292b);
    const sleeve = this.material(0x253335);
    const tube = (a, b, radius, mat, radial = 10) => {
      const start = new THREE.Vector3(...a),
        end = new THREE.Vector3(...b);
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          radius,
          radius,
          start.distanceTo(end),
          radial,
        ),
        mat,
      );
      mesh.position.copy(start).add(end).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(up, end.sub(start).normalize());
      bike.add(mesh);
      return mesh;
    };
    tube([0, -0.43, -0.66], [0, -0.2, -0.65], 0.033, metal);
    tube([0, -0.22, -0.65], [0, -0.2, -0.86], 0.035, metal);
    tube([-0.21, -0.2, -0.86], [0.21, -0.2, -0.86], 0.02, silver);
    for (const side of [-1, 1]) {
      tube(
        [side * 0.2, -0.2, -0.86],
        [side * 0.37, -0.13, -0.78],
        0.02,
        silver,
      );
      tube(
        [side * 0.37, -0.13, -0.78],
        [side * 0.67, -0.12, -0.71],
        0.025,
        metal,
      );
      tube(
        [side * 0.47, -0.125, -0.758],
        [side * 0.67, -0.12, -0.71],
        0.031,
        rubber,
      );
      for (let i = 0; i < 9; i++)
        tube(
          [side * (0.47 + i * 0.021), -0.127, -0.761 + i * 0.005],
          [side * (0.477 + i * 0.021), -0.127, -0.759 + i * 0.005],
          0.033,
          glove,
        );
      tube(
        [side * 0.433, -0.13, -0.77],
        [side * 0.456, -0.13, -0.763],
        0.03,
        lime,
      );
      tube(
        [side * 0.39, -0.155, -0.77],
        [side * 0.56, -0.22, -0.78],
        0.009,
        silver,
      );
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 8),
        extreme ? this.material(0xc69b79) : glove,
      );
      hand.scale.set(0.095, 0.051, 0.082);
      hand.position.set(side * 0.57, -0.115, -0.71);
      hand.rotation.y = side * -0.23;
      hand.rotation.z = side * -0.15;
      bike.add(hand);
      const logo = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.008, 0.07),
        lime,
      );
      logo.position.set(side * 0.58, -0.063, -0.71);
      if (!extreme) bike.add(logo);
      if (!extreme)
        tube(
          [side * 0.59, -0.15, -0.68],
          [side * 0.78, -0.52, -0.37],
          0.065,
          sleeve,
          12,
        );
      tube(
        [side * 0.58, -0.13, -0.69],
        [side * 0.62, -0.2, -0.64],
        0.058,
        rubber,
      );
      const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.4, -0.16, -0.78),
        new THREE.Vector3(side * 0.24, -0.36, -0.98),
        new THREE.Vector3(side * 0.05, -0.48, -0.89),
      ]);
      bike.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(cableCurve, 20, 0.005, 5, false),
          rubber,
        ),
      );
      tube(
        [side * 0.07, -0.39, -0.85],
        [side * 0.07, -0.75, -1.06],
        0.022,
        lime,
      );
    }
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 0.025, 16),
      lime,
    );
    cap.position.set(0, -0.19, -0.655);
    bike.add(cap);
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.027, 6),
      silver,
    );
    screw.position.copy(cap.position);
    bike.add(screw);
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.035, 8, 40),
      rubber,
    );
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, -0.7, -1.05);
    bike.add(wheel);
    const computer = new THREE.Mesh(
      new THREE.BoxGeometry(0.084, 0.024, 0.11),
      rubber,
    );
    computer.position.set(0, -0.19, -0.81);
    bike.add(computer);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.065),
      this.material(0xa5bba9, { emissive: 0x3c5043, emissiveIntensity: 0.3 }),
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, -0.176, -0.817);
    bike.add(screen);
    if (extreme) addHandDetails(bike, (...args) => this.material(...args));
    if (!extreme) {
      this.bikeLamp = new THREE.PointLight(0xeaffd1, 1.1, 2);
      this.bikeLamp.position.set(0, 0.1, -0.4);
      this.camera.add(this.bikeLamp);
    }
    return bike;
  }
  load(course) {
    this.billboards?.dispose();
    this.billboards = null;
    if (this.level) {
      this.scene.remove(this.level);
      this.level.traverse((object) => {
        object.geometry?.dispose();
        if (object.material) {
          for (const m of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            m.map?.dispose();
            m.dispose();
          }
        }
      });
    }
    this.course = course;
    this.cameraMode = 0;
    this.bike.visible = course.terrain !== "sky";
    this.skyBike.visible = !this.bike.visible;
    this.camera.far = course.terrain === "sky" ? 16000 : 900;
    this.camera.updateProjectionMatrix();
    this.level = new THREE.Group();
    this.scene.add(this.level);
    this.scene.background = new THREE.Color(course.sky);
    this.scene.fog = new THREE.FogExp2(
      course.fog,
      course.id === "tokyo" ? 0.009 : 0.0039,
    );
    this.renderer.toneMappingExposure = course.id === "tokyo" ? 1.35 : 1.16;
    const night = course.id === "tokyo" || course.night;
    this.level.add(
      new THREE.HemisphereLight(
        night ? 0x9cafed : 0xe5f3ed,
        night ? 0x263d4b : 0x7b6f50,
        night ? 1.75 : 2.2,
      ),
    );
    this.sun = new THREE.DirectionalLight(
      night ? 0x9fb8f4 : 0xffe8b9,
      night ? 1.1 : 3.4,
    );
    this.sun.position.set(-35, 140, 35);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -45;
    this.sun.shadow.camera.right = 45;
    this.sun.shadow.camera.top = 65;
    this.sun.shadow.camera.bottom = -65;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 210;
    this.sun.shadow.normalBias = 0.06;
    this.level.add(this.sun, this.sun.target);
    this.batch = new Map();
    this.materials = new Map();
    this.crowdArms = [];
    this.obstacleModels = [];
    this.objectGroup = null;
    this.snow = null;
    this.amazon = null;
    this.halloween = null;
    this.bengaluru = null;
    this.rand = random(course.seed);
    if (course.terrain === "sky") buildSkyRoad(this);
    else {
      this.makeRoad();
      if (!["amazon", "halloween"].includes(course.id)) this.makeLandscape();
      if (course.id === "bengaluru") this.bengaluru = new BengaluruWorld(this);
      else if (course.id === "halloween")
        this.halloween = new HalloweenWorld(this);
      else if (course.id === "amazon") this.amazon = new AmazonWorld(this);
      else if (course.environment === "wild") this.makeWilderness();
      else if (course.id === "mumbai") this.makeDharavi();
      else this.makeCity();
      if (course.id !== "halloween") this.makeCourseObjects();
    }
    buildForks(this);
    this.billboards = buildBillboards(this);
    this.flush();
    this.makeWavingArms();
    this.peloton =
      course.terrain === "sky" ? null : new Peloton(this.level, course);
    this.playerModel = new Peloton(this.level, course, [
      { name: "YOU", color: 0xc4f26b },
    ]);
    this.update(
      { s: 17, lateral: 0, speed: 0, jump: 0, steer: 0, hitCooldown: 0 },
      0,
      true,
    );
  }
  getMat(color, glow = false) {
    const key = `${color}-${glow}`;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        this.material(
          color,
          glow ? { emissive: color, emissiveIntensity: 1.5 } : {},
        ),
      );
    return this.materials.get(key);
  }
  addGeom(geometry, color, position, rotation = [0, 0, 0], glow = false) {
    temp.position.set(...position);
    temp.rotation.set(...rotation);
    temp.scale.set(1, 1, 1);
    temp.updateMatrix();
    geometry.applyMatrix4(temp.matrix);
    const material = this.getMat(color, glow);
    if (this.objectGroup) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.objectGroup.add(mesh);
      return;
    }
    if (!this.batch.has(material)) this.batch.set(material, []);
    this.batch.get(material).push(geometry);
  }
  box(x, y, z, w, h, d, color, rotation = 0, glow = false) {
    this.addGeom(
      new THREE.BoxGeometry(w, h, d),
      color,
      [x, y, z],
      [0, rotation, 0],
      glow,
    );
  }
  cylinder(a, b, r, color) {
    const av = new THREE.Vector3(...a),
      bv = new THREE.Vector3(...b);
    const g = new THREE.CylinderGeometry(r, r, av.distanceTo(bv), 6);
    temp.position.copy(av).add(bv).multiplyScalar(0.5);
    temp.quaternion.setFromUnitVectors(up, bv.sub(av).normalize());
    temp.scale.set(1, 1, 1);
    temp.updateMatrix();
    g.applyMatrix4(temp.matrix);
    const mat = this.getMat(color);
    if (!this.batch.has(mat)) this.batch.set(mat, []);
    this.batch.get(mat).push(g);
  }
  flush() {
    for (const [mat, geometries] of this.batch) {
      const merged = mergeGeometries(geometries);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.level.add(mesh);
      geometries.forEach((g) => g.dispose());
    }
    this.batch.clear();
  }
  surface(
    left,
    right,
    color,
    yOffset = 0,
    start = -35,
    end = this.course.length + 80,
  ) {
    const vertices = [],
      normals = [],
      uv = [],
      indices = [];
    const samples = [];
    for (let s = start; s < end; s += 2.5) samples.push(s);
    samples.push(end);
    for (const flight of this.course.stairs)
      for (
        let s = flight.start;
        s < flight.start + flight.length;
        s += flight.spacing
      ) {
        if (s > start && s < end) samples.push(s - 0.005, s + 0.005);
      }
    samples.sort((a, b) => a - b);
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const bounds = [left, right]
        .map((side) => (typeof side === "function" ? side(s) : side))
        .sort((a, b) => a - b);
      for (const x of bounds) {
        let terrainLift = 0;
        if (yOffset < -0.1 && this.course.environment === "wild") {
          const beyond = Math.max(
            0,
            Math.abs(x) - halfWidthAt(s, this.course) - 0.4,
          );
          terrainLift =
            this.course.terrain === "coast" && x < 0
              ? -Math.pow(beyond, 0.83) * 2.3
              : Math.min(34, beyond * 0.3) +
                Math.sin(s * 0.03 + x * 0.06) * Math.min(beyond * 0.13, 4);
        }
        if (this.course.id === "bengaluru" && yOffset < -0.1)
          terrainLift = -flyoverLift(s);
        if (this.course.id === "amazon" && yOffset < -0.1 && x < -4 && x > -25)
          terrainLift = -1.5;
        const fork = forkAt(s, this.course, 24);
        if (fork && yOffset < -0.1) {
          const t = Math.max(0, fork.start - s, s - fork.end) / 24;
          terrainLift *= t * t * (3 - 2 * t);
        }
        vertices.push(
          centerAt(s, this.course) + x,
          heightAt(s, this.course) + yOffset + terrainLift,
          -s,
        );
        normals.push(0, 1, 0);
        uv.push(x / 3, s / 3);
      }
      if (i > 0) {
        const k = i * 2;
        indices.push(k - 2, k - 1, k, k, k - 1, k + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.material(color));
    mesh.receiveShadow = true;
    this.level.add(mesh);
    return mesh;
  }
  makeRoad() {
    const c = this.course;
    if (c.environment === "wild") {
      const bands = [-180, -70, -25, -9, -4, -2, 0, 2, 4, 9, 25, 70, 180];
      for (let i = 0; i < bands.length - 1; i++)
        this.surface(bands[i], bands[i + 1], c.ground, -0.3);
    } else this.surface(-130, 130, c.ground, -0.3);
    const road = this.surface(
      (s) => -halfWidthAt(s, c),
      (s) => halfWidthAt(s, c),
      c.road,
      0.02,
    );
    const texCanvas = document.createElement("canvas");
    texCanvas.width = texCanvas.height = 128;
    const ctx = texCanvas.getContext("2d");
    ctx.fillStyle = "#b3b3b3";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1900; i++) {
      const v = 100 + this.rand() * 130;
      ctx.fillStyle = `rgba(${v},${v},${v},.22)`;
      ctx.fillRect(
        this.rand() * 128,
        this.rand() * 128,
        1 + this.rand() * 2,
        1 + this.rand() * 2,
      );
    }
    if (c.id === "valpo") {
      ctx.strokeStyle = "#92938c";
      ctx.lineWidth = 1;
      for (let y = 0; y < 128; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(128, y);
        ctx.stroke();
        for (let x = y % 32 ? 16 : 0; x < 128; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 16);
          ctx.stroke();
        }
      }
    }
    const texture = new THREE.CanvasTexture(texCanvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    road.material.map = texture;
    for (const side of [-1, 1]) {
      this.surface(
        (s) => side * (halfWidthAt(s, c) + 0.05),
        (s) => side * (halfWidthAt(s, c) + 0.45),
        c.terrain === "forest" || c.terrain === "rainforest"
          ? 0x617c4a
          : c.id === "alpine"
            ? 0xa1a591
            : 0xc6b99d,
        0.09,
      );
      if (
        c.id !== "halloween" &&
        c.id !== "alpine" &&
        c.id !== "mumbai" &&
        c.terrain !== "forest" &&
        c.terrain !== "rainforest"
      )
        this.surface(
          (s) => side * (halfWidthAt(s, c) - 0.1),
          (s) => side * (halfWidthAt(s, c) - 0.055),
          0xdfcf88,
          0.035,
        );
    }
    for (let s = 4; s < c.length; s += 9) {
      const x = centerAt(s, c),
        y = heightAt(s, c);
      if (
        !stairAt(s, c) &&
        c.environment !== "wild" &&
        c.id !== "halloween" &&
        c.id !== "mumbai"
      )
        this.box(
          x,
          y + 0.04,
          -s,
          0.065,
          0.012,
          2,
          c.id === "tokyo" ? 0xabb6a6 : 0xddd2a7,
        );
    }
    for (const flight of c.stairs)
      for (
        let s = flight.start;
        s < flight.start + flight.length;
        s += flight.spacing
      ) {
        const x = centerAt(s, c),
          y = heightAt(s, c),
          half = halfWidthAt(s, c);
        this.box(
          x,
          y + 0.027,
          -s,
          half * 2,
          0.045,
          0.09,
          c.id === "tokyo" ? 0x7b8c87 : c.id === "aizawl" ? 0xdbab8f : 0xccbda0,
        );
        for (const side of [-1, 1]) {
          const rx = x + side * (half + 0.12);
          if (Math.round((s - flight.start) / flight.spacing) % 4 === 0)
            this.cylinder([rx, y, -s], [rx, y + 1.05, -s], 0.028, 0x546c61);
          this.cylinder(
            [rx, y + 1, -s],
            [
              centerAt(s + flight.spacing, c) +
                side * (halfWidthAt(s + flight.spacing, c) + 0.12),
              heightAt(s + flight.spacing, c) + 1,
              -s - flight.spacing,
            ],
            0.033,
            0x789886,
          );
        }
      }
  }
  makeLandscape() {
    const c = this.course,
      rand = this.rand;
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      this.material(c.id === "tokyo" ? 0x263c50 : 0x75b4b2, {
        roughness: 0.44,
        metalness: 0.2,
      }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -c.length * c.slope - 5, -850);
    this.level.add(sea);
    if (c.terrain === "coast") {
      sea.position.y = heightAt(c.length, c) - 18;
      sea.material.color.set(0x4e9fad);
      sea.material.fog = false;
    }
    for (let i = 0; i < 26; i++) {
      const z = -100 - i * 63;
      const side = i % 2 ? 1 : -1;
      const alpine = c.terrain === "snow" || c.terrain === "granite",
        height = alpine ? 150 + rand() * 170 : 40 + rand() * 45;
      if (c.terrain === "coast" && side < 0) continue;
      const mx = side * (190 + rand() * 180),
        my = heightAt(-z, c) - 45;
      this.addGeom(
        new THREE.ConeGeometry(90 + rand() * 65, height, 6, 1),
        alpine ? [0x83918a, 0x9ca9a5, 0xb0b6aa][i % 3] : 0x93ada2,
        [mx, my, z],
        [0, rand() * 4, 0],
      );
      if (c.terrain === "snow")
        this.addGeom(
          new THREE.ConeGeometry(55, height * 0.55, 6, 1),
          0xe4ece9,
          [mx, my + height * 0.225, z],
        );
    }
    if (c.id !== "tokyo")
      for (let i = 0; i < 18; i++) {
        const x = rand() * 1100 - 550,
          z = -rand() * 1500;
        for (let j = 0; j < 3; j++)
          this.addGeom(
            new THREE.SphereGeometry(12 + j * 4, 7, 5),
            0xe6e9d9,
            [x + j * 18, 125 + rand() * 24, z],
            [0, 0, 0],
          );
      }
    if (c.id === "tokyo") {
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(10, 20, 16),
        new THREE.MeshBasicMaterial({ color: 0xd5e2d4 }),
      );
      moon.position.set(-120, 185, -460);
      this.level.add(moon);
    }
  }
  makeDharavi() {
    const c = this.course,
      rand = this.rand;
    this.sun.intensity = 2.5;
    this.renderer.toneMappingExposure = 1.05;
    const roofs = [0x66675c, 0x876e58, 0x4c777d, 0x63797a];
    const cloth = [0x378f9f, 0xb45c57, 0xd5c7a5, 0x858fb4, 0x5e936c];
    for (let s = -14, index = 0; s < c.length + 45; s += 7, index++) {
      if (forkAt(s, c, 16)) continue;
      for (const side of [-1, 1]) {
        // Keep the full building and its props beyond the local racing corridor.
        let edge = 0;
        for (let ds = -3.5; ds <= 3.5; ds += 0.5)
          edge = Math.max(
            edge,
            side * (centerAt(s + ds, c) - centerAt(s, c)) +
              halfWidthAt(s + ds, c),
          );
        const face = centerAt(s, c) + side * (edge + 0.7),
          w = 4.8 + rand() * 2,
          h = 4.7 + rand() * 2.7;
        const x = face + side * w * 0.5,
          y = heightAt(s, c),
          z = -s,
          d = 6.6;
        this.box(
          x,
          y + h * 0.5 - 0.2,
          z,
          w,
          h + 0.4,
          d,
          c.colors[index % c.colors.length],
        );
        this.box(face - side * 0.015, y + 0.35, z, 0.045, 0.7, d, 0x6d7260);
        // Patchy plaster, exposed brick, and narrow exterior pipes.
        for (let k = 0; k < 4; k++) {
          const pz = z - 2.5 + k * 1.5,
            py = y + 0.7 + rand() * (h - 1.3);
          this.box(
            face - side * 0.026,
            py,
            pz,
            0.04,
            0.35 + rand() * 0.6,
            0.5 + rand() * 0.5,
            [0x9d9174, 0x697c71, 0x9c7360][k % 3],
          );
        }
        this.cylinder(
          [face - side * 0.09, y, z + 2.8],
          [face - side * 0.09, y + h, z + 2.8],
          0.045,
          0x4c817b,
        );
        // Street doors alternate between dark workshop openings and ribbed shutters.
        this.box(
          face - side * 0.045,
          y + 1.2,
          z - 0.9,
          0.06,
          2.4,
          1.45,
          index % 2 ? 0x263936 : 0x3d6663,
        );
        if (index % 2 === 0)
          for (let k = 0; k < 12; k++)
            this.box(
              face - side * 0.087,
              y + 0.15 + k * 0.19,
              z - 0.9,
              0.05,
              0.035,
              1.42,
              0x73867a,
            );
        else
          this.box(
            face - side * 0.09,
            y + 2.1,
            z - 0.9,
            0.06,
            0.08,
            0.8,
            0xcce0a2,
            0,
            true,
          );
        const wy = y + 3.55;
        this.box(face - side * 0.05, wy, z + 0.85, 0.08, 1.1, 1.2, 0x253b39);
        for (const dz of [-0.82, 0.82])
          this.box(
            face - side * 0.1,
            wy,
            z + 0.85 + dz,
            0.11,
            1.1,
            0.36,
            0x427b77,
          );
        this.box(
          face - side * 0.14,
          wy - 0.6,
          z + 0.85,
          0.28,
          0.09,
          1.6,
          0xa3957a,
        );
        if (index % 4 === 1)
          this.spectator(face + side * 0.05, wy - 1.3, z + 0.85, side, index);
        // Closely packed sheet-metal roofs, raised seams and blue tarp repairs.
        const roof = roofs[index % roofs.length];
        this.box(x, y + h, z, w + 0.35, 0.12, d + 0.18, roof);
        for (let k = -3; k <= 3; k += 0.42)
          this.box(x, y + h + 0.09, z + k, w + 0.35, 0.065, 0.055, 0x9a9a84);
        if (index % 3 === 0) {
          this.box(
            x - side * w * 0.2,
            y + h + 0.14,
            z + 0.3,
            w * 0.6,
            0.045,
            3.1,
            0x337d9b,
          );
          this.addGeom(
            new THREE.CylinderGeometry(0.45, 0.45, 0.95, 10),
            0x354745,
            [x + side * 0.8, y + h + 0.6, z - 1.8],
          );
        }
        // Shallow awnings and laundry remain on the house side of the curb.
        this.box(
          face - side * 0.28,
          y + 2.65,
          z - 0.7,
          0.55,
          0.07,
          2.5,
          index % 3 ? roof : 0x367e9e,
        );
        const lineX = face - side * 0.29;
        this.cylinder(
          [lineX, y + 2.9, z - 2.4],
          [lineX, y + 2.9, z + 2.4],
          0.014,
          0x3e4943,
        );
        for (let k = 0; k < 4; k++) {
          const cz = z - 1.8 + k * 1.1,
            color = cloth[(index + k) % cloth.length];
          this.box(lineX, y + 2.4, cz, 0.035, 0.85, 0.67, color);
          this.box(
            lineX - side * 0.018,
            y + 2.4,
            cz,
            0.012,
            0.85,
            0.04,
            0xc4c4ab,
          );
        }
        if (index % 3 === 1) {
          const px = face - side * 0.24;
          this.addGeom(
            new THREE.CylinderGeometry(0.24, 0.27, 0.85, 10),
            0x377eaf,
            [px, y + 0.43, z + 2.1],
          );
          this.addGeom(
            new THREE.CylinderGeometry(0.28, 0.28, 0.06, 10),
            0x5b9caf,
            [px, y + 0.87, z + 2.1],
          );
          this.addGeom(
            new THREE.CylinderGeometry(0.19, 0.14, 0.24, 10),
            0x799a8d,
            [px, y + 1.02, z + 2.1],
          );
        }
        if (index % 5 === 0)
          this.sign(
            ["DHARAVI", "चाय • CHAI", "WORKSHOP"][index % 3],
            face - side * 0.12,
            y + 3,
            z - 1.5,
            side,
            "#d9cba6",
            false,
          );
        if (index % 4 === 2) {
          // Spectators on small roof terraces rather than in the rider's path.
          this.box(face, y + h + 0.48, z, 0.08, 0.8, 4, 0x677e70);
          for (let k = 0; k < 3; k++)
            this.spectator(
              face + side * 0.5,
              y + h + 0.12,
              z - 1.2 + k * 1.2,
              side,
              index + k,
            );
        }
        if (index % 6 === 0)
          this.spectator(face - side * 0.12, y, z + 1.9, side, index + 3);
        // Additional low homes fill the skyline behind the front row.
        for (let k = 0; k < 2; k++) {
          const bx = x + side * (w + 1 + k * 7),
            bh = 3.8 + rand() * 3.8;
          this.box(
            bx,
            y + bh * 0.5 - 1,
            z,
            6.8,
            bh,
            6.8,
            c.colors[(index + k + 2) % c.colors.length],
          );
          this.box(
            bx,
            y + bh - 1,
            z,
            7,
            0.14,
            7,
            roofs[(index + k) % roofs.length],
          );
        }
      }
      // Sagging utility cables cross above jumping height.
      if (index % 2 === 0)
        for (let wire = 0; wire < 2; wire++) {
          const cx = centerAt(s, c),
            cy = heightAt(s, c),
            half = halfWidthAt(s, c) + 2;
          const points = [
            [-half, 4.7],
            [0, 4.1],
            [half, 5],
          ];
          for (let k = 0; k < 2; k++)
            this.cylinder(
              [cx + points[k][0], cy + points[k][1] + wire * 0.22, -s],
              [cx + points[k + 1][0], cy + points[k + 1][1] + wire * 0.22, -s],
              0.018,
              0x344740,
            );
        }
      // Drain covers and worn paving sit flush with the road surface.
      if (!stairAt(s, c))
        for (const side of [-1, 1]) {
          const half = halfWidthAt(s, c),
            x = centerAt(s, c) + side * (half - 0.16),
            y = heightAt(s, c);
          this.box(x, y + 0.038, -s, 0.22, 0.016, 0.52, 0x4f6058);
          for (let k = -2; k <= 2; k++)
            this.box(x, y + 0.05, -s + k * 0.09, 0.23, 0.013, 0.023, 0x8b917d);
        }
    }
  }
  makeCity() {
    const c = this.course,
      rand = this.rand,
      night = c.id === "tokyo";
    for (let s = -14, index = 0; s < c.length + 60; s += 10.5, index++) {
      if (forkAt(s, c, 16)) continue;
      for (const side of [-1, 1]) {
        // Set the facade behind the entire local bend so sharp corners remain rideable.
        const bendClearance = Math.max(
          Math.abs(centerAt(s + 4.7, c) - centerAt(s, c)),
          Math.abs(centerAt(s - 4.7, c) - centerAt(s, c)),
        );
        const gap = halfWidthAt(s, c) + 0.8 + bendClearance;
        const w = 5 + rand() * 3,
          d = 8.2 + rand() * 1.4,
          h = (c.id === "mumbai" ? 8 : 5) + rand() * 8;
        const x = centerAt(s, c) + side * (gap + w * 0.5),
          y = heightAt(s, c),
          z = -s;
        const color = c.colors[Math.floor(rand() * c.colors.length)];
        this.box(x, y + h * 0.5 - 0.1, z, w, h, d, color);
        this.box(
          x,
          y + h,
          z,
          w + 0.3,
          0.18,
          d + 0.25,
          night ? 0x354652 : 0x6e756a,
        );
        if (c.id === "mumbai" && index % 3 === 0) {
          this.addGeom(
            new THREE.CylinderGeometry(0.65, 0.65, 1.2, 12),
            0x35423d,
            [x, y + h + 0.7, z + 1],
          );
          this.addGeom(
            new THREE.CylinderGeometry(0.69, 0.69, 0.1, 12),
            0x293831,
            [x, y + h + 1.34, z + 1],
          );
          this.box(x, y + h + 0.42, z - d * 0.48, w, 0.75, 0.12, 0xa09a82);
        }
        this.box(
          x,
          y + 0.35,
          z,
          w + 0.07,
          0.7,
          d + 0.08,
          night ? 0x394c59 : 0x908b75,
        );
        const face = x - side * (w * 0.5 + 0.025);
        for (let row = 0; row < Math.floor(h / 2.7); row++)
          for (let col = -1; col <= 1; col++) {
            const wy = y + 1.9 + row * 2.6,
              wz = z + col * 2.35;
            this.box(
              face,
              wy,
              wz,
              0.065,
              1.45,
              1.15,
              night ? 0x92a19c : 0xdcd4b8,
            );
            this.box(
              face - side * 0.04,
              wy,
              wz,
              0.07,
              1.22,
              0.93,
              night ? (index % 3 === 0 ? 0xf1cf80 : 0x8cb9b7) : 0x3f6669,
              0,
              night && index % 3 === 0,
            );
            this.box(face - side * 0.085, wy, wz, 0.03, 1.2, 0.045, 0x959f92);
            this.box(face - side * 0.085, wy, wz, 0.03, 0.045, 0.91, 0x959f92);
            if (!night && rand() > 0.5)
              this.box(
                face - side * 0.16,
                wy - 0.75,
                wz,
                0.4,
                0.08,
                1.4,
                0xddd0b3,
              );
          }
        this.box(
          face - side * 0.065,
          y + 1.05,
          z - 1.4,
          0.1,
          2.1,
          1.0,
          night ? 0x2b414b : 0x53736c,
        );
        if (index % 3 === 0) {
          this.box(
            face - side * 0.5,
            y + 2.7,
            z + 1.1,
            1.05,
            0.14,
            3.0,
            night ? 0x3caead : 0xd3a65d,
          );
          this.box(
            face - side * 0.99,
            y + 2.45,
            z + 1.1,
            0.08,
            0.55,
            3.0,
            night ? 0x3caead : 0xc3904d,
            0,
            night,
          );
        }
        if (index % 4 === 1 || (c.id === "mumbai" && index % 2 === 0)) {
          this.box(face - side * 0.43, y + 4.5, z, 1.0, 0.13, 3.9, 0x888c7b);
          this.box(face - side * 0.91, y + 5, z, 0.045, 1.05, 3.9, 0x475958);
          for (let k = -1.7; k < 2; k += 0.45)
            this.box(
              face - side * 0.94,
              y + 5,
              z + k,
              0.05,
              1.05,
              0.035,
              0x61716c,
            );
          for (let k = 0; k < 3; k++)
            this.spectator(
              face - side * 0.44,
              y + 4.58,
              z - 1.25 + k * 1.05,
              side,
              index + k,
            );
        }
        if (index % 5 === 0)
          this.sign(
            night
              ? ["ラーメン", "夜の街", "自転車"][index % 3]
              : c.id === "mumbai"
                ? ["चाय • CHAI", "DHARAVI", "किराना"][index % 3]
                : c.id === "aizawl"
                  ? ["BAZAR", "AIZAWL", "TEA SHOP"][index % 3]
                  : ["ALMACÉN", "CERRO", "CAFÉ"][index % 3],
            face - side * 0.13,
            y + 3.7,
            z + 0.6,
            side,
            night ? ["#7ee5d9", "#f693ab", "#c7ee72"][index % 3] : "#e5d6af",
            night,
          );
        // Fans at open windows, apartment balconies, and roof terraces.
        if (index % 4 === 2) {
          this.box(face - side * 0.055, y + 4.5, z, 0.09, 1.55, 1.3, 0x243c38);
          this.spectator(face - side * 0.04, y + 3.18, z, side, index + 6);
          this.box(face - side * 0.14, y + 3.75, z, 0.26, 0.12, 1.42, 0xc5b899);
        }
        if (index % 5 === 1) {
          this.box(face - side * 0.03, y + h + 0.45, z, 0.1, 0.9, d, 0x99a18b);
          for (let k = 0; k < 4; k++)
            this.spectator(
              face + side * 0.45,
              y + h + 0.13,
              z - 2.4 + k * 1.2,
              side,
              index + k + 12,
            );
        }
        if (c.id === "mumbai" && index % 4 === 0) {
          const streetX = centerAt(s, c) + side * (halfWidthAt(s, c) + 1.4);
          this.box(streetX, y + 0.57, z, 1.15, 1.15, 2.1, 0xa7784e);
          this.addGeom(
            new THREE.ConeGeometry(1.6, 0.65, 8),
            index % 8 ? 0x879e73 : 0xc99256,
            [streetX, y + 2.35, z],
          );
          this.cylinder(
            [streetX, y + 0.5, z],
            [streetX, y + 2.3, z],
            0.035,
            0x656a52,
          );
          for (let j = 0; j < 3; j++)
            this.addGeom(
              new THREE.SphereGeometry(0.2, 6, 5),
              [0xc9964e, 0x84a35c, 0xc57447][j],
              [streetX, y + 1.27, z - 0.6 + j * 0.5],
            );
        }
        if (c.id === "mumbai" && index % 9 === 5) {
          const tx = centerAt(s, c) + side * (halfWidthAt(s, c) + 1.5);
          this.box(tx, y + 0.65, z, 1.1, 0.85, 1.9, 0x547b54);
          this.box(tx, y + 1.46, z + 0.1, 1.13, 0.22, 1.55, 0x293933);
          this.box(tx, y + 0.95, z + 0.89, 1.1, 0.17, 0.1, 0xe5bc55);
          for (const end of [-0.58, 0.58])
            for (const lr of [-1, 1])
              this.addGeom(
                new THREE.CylinderGeometry(0.25, 0.25, 0.13, 10),
                0x24312f,
                [tx + lr * 0.54, y + 0.27, z + end],
                [0, 0, Math.PI / 2],
              );
          for (const lr of [-1, 1])
            this.cylinder(
              [tx + lr * 0.5, y + 0.85, z + 0.72],
              [tx + lr * 0.5, y + 1.5, z + 0.72],
              0.033,
              0xccae65,
            );
        }
        if (index % 3 === 0 && !night)
          for (let k = 0; k < 3; k++) {
            const px = face - side * 0.3,
              pz = z - 2 + k * 1.5;
            this.box(px, y + 0.32, pz, 0.5, 0.64, 0.5, 0x9b7962);
            this.addGeom(
              new THREE.IcosahedronGeometry(0.5, 0),
              [0x638467, 0x77926a, 0x456f59][k],
              [px, y + 0.85, pz],
            );
          }
        // Terraced houses beyond the race route give the city a real skyline.
        if (index % 2 === 0)
          for (let k = 0; k < 3; k++) {
            const bx = x + side * (10 + k * 12),
              bh = 5 + rand() * 10,
              by = y - 1 - k * 2;
            this.box(
              bx,
              by + bh * 0.5,
              z + rand() * 5,
              8 + rand() * 4,
              bh,
              8 + rand() * 4,
              c.colors[(index + k + 2) % c.colors.length],
            );
            this.box(
              bx,
              by + bh,
              z + 1,
              9,
              0.25,
              10,
              night ? 0x374450 : 0x9c8b73,
            );
          }
      }
      if (index % 4 === 0) {
        const x = centerAt(s, c),
          y = heightAt(s, c),
          half = halfWidthAt(s, c);
        this.cylinder(
          [x - half - 0.55, y, -s],
          [x - half - 0.55, y + 7, -s],
          0.09,
          0x536564,
        );
        this.cylinder(
          [x - half - 0.55, y + 6.8, -s],
          [x - half + 0.65, y + 6.5, -s],
          0.06,
          0x536564,
        );
        this.box(
          x - half + 0.65,
          y + 6.5,
          -s,
          0.4,
          0.13,
          0.65,
          night ? 0xffe2a2 : 0xded7b5,
          0,
          night,
        );
        if (night) {
          this.box(x, y + 0.05, -s, half * 1.5, 0.02, 2.5, 0x66735c);
        }
      }
      if (index % (c.id === "mumbai" ? 4 : 8) === 3 && !night) this.bunting(s);
      if (index % 6 === 2) {
        for (const side of [-1, 1])
          for (let k = 0; k < 3; k++) {
            const px =
                centerAt(s + k * 0.9, c) +
                side * (halfWidthAt(s + k * 0.9, c) + 0.58),
              py = heightAt(s + k * 0.9, c),
              pz = -s - k * 0.9;
            this.spectator(px, py, pz, side, index + k);
          }
        const rx = centerAt(s + 1, c),
          ry = heightAt(s + 1, c),
          half = halfWidthAt(s + 1, c) + 0.22;
        for (const side of [-1, 1]) {
          this.box(
            rx + side * half,
            ry + 0.62,
            -s - 1,
            0.07,
            0.66,
            4,
            0x365a52,
          );
          this.box(
            rx + side * (half - 0.045),
            ry + 0.65,
            -s - 1,
            0.03,
            0.09,
            3.7,
            0xbce665,
          );
        }
      }
      if (index % 3 === 1) {
        const next = s + 31.5;
        for (let wire = 0; wire < 3; wire++) {
          const offset = -halfWidthAt(s, c) - 0.4 - wire * 0.18;
          this.cylinder(
            [centerAt(s, c) + offset, heightAt(s, c) + 7, -s],
            [centerAt(s + 15, c) + offset, heightAt(s + 15, c) + 6.2, -s - 15],
            0.015,
            0x394746,
          );
          this.cylinder(
            [centerAt(s + 15, c) + offset, heightAt(s + 15, c) + 6.2, -s - 15],
            [centerAt(next, c) + offset, heightAt(next, c) + 7, -next],
            0.015,
            0x394746,
          );
        }
      }
    }
  }
  sign(text, x, y, z, side, color, glow) {
    const canvas = document.createElement("canvas");
    canvas.width = 384;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = glow ? "#173a48" : "#365650";
    ctx.fillRect(0, 0, 384, 128);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeRect(5, 5, 374, 118);
    ctx.fillStyle = color;
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 192, 65);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 0.98),
      new THREE.MeshStandardMaterial({
        map,
        side: THREE.DoubleSide,
        emissive: glow ? 0xffffff : 0x000000,
        emissiveMap: map,
        emissiveIntensity: glow ? 0.8 : 0,
      }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = (-side * Math.PI) / 2;
    this.level.add(mesh);
  }
  spectator(x, y, z, side, seed) {
    const shirts = [0xcc8d59, 0x6c9992, 0xc3bc8c, 0xddd1ad, 0xad6c64, 0x657f98];
    const skin = [0xbc906c, 0xcba17f, 0xa97e5b][seed % 3];
    const shirt = shirts[seed % shirts.length];
    this.cylinder([x - 0.1, y, z], [x - 0.1, y + 0.75, z], 0.075, 0x374b47);
    this.cylinder([x + 0.1, y, z], [x + 0.1, y + 0.75, z], 0.075, 0x374b47);
    this.addGeom(new THREE.CylinderGeometry(0.21, 0.17, 0.64, 7), shirt, [
      x,
      y + 1.05,
      z,
    ]);
    this.addGeom(new THREE.SphereGeometry(0.155, 9, 7), skin, [x, y + 1.55, z]);
    this.addGeom(
      new THREE.SphereGeometry(0.16, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5),
      0x35413a,
      [x, y + 1.6, z],
    );
    this.cylinder(
      [x - side * 0.2, y + 1.24, z],
      [x - side * 0.32, y + 0.88, z],
      0.055,
      skin,
    );
    this.crowdArms.push({
      x: x - side * 0.21,
      y: y + 1.3,
      z,
      side: -side,
      phase: seed * 1.73,
    });
  }
  makeWavingArms() {
    const n = this.crowdArms.length;
    this.arms = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.052, 0.059, 0.45, 6),
      this.material(0xc29570),
      n,
    );
    this.hands = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.065, 6, 5),
      this.material(0xc29570),
      n,
    );
    this.arms.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.hands.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.arms.frustumCulled = false;
    this.hands.frustumCulled = false;
    this.level.add(this.arms, this.hands);
    this.animateCrowd(0);
  }
  animateCrowd(time) {
    for (let i = 0; i < this.crowdArms.length; i++) {
      const fan = this.crowdArms[i],
        angle = fan.side * (0.45 + Math.sin(time * 4 + fan.phase) * 0.43);
      temp.rotation.set(0.15, 0, angle);
      temp.scale.set(1, 1, 1);
      temp.position.set(
        fan.x - Math.sin(angle) * 0.225,
        fan.y + Math.cos(angle) * 0.225,
        fan.z,
      );
      temp.updateMatrix();
      this.arms.setMatrixAt(i, temp.matrix);
      temp.position.set(
        fan.x - Math.sin(angle) * 0.47,
        fan.y + Math.cos(angle) * 0.47,
        fan.z,
      );
      temp.updateMatrix();
      this.hands.setMatrixAt(i, temp.matrix);
    }
    this.arms.instanceMatrix.needsUpdate = true;
    this.hands.instanceMatrix.needsUpdate = true;
  }
  bunting(s) {
    const c = this.course,
      x = centerAt(s, c),
      y = heightAt(s, c) + 5.2,
      half = halfWidthAt(s, c) + 1;
    for (let i = 0; i < 12; i++) {
      const t = i / 11,
        fx = x - half + t * half * 2,
        fy = y - Math.sin(t * Math.PI) * 0.7;
      if (i < 11)
        this.cylinder(
          [fx, fy, -s],
          [
            x - half + ((i + 1) / 11) * half * 2,
            y - Math.sin(((i + 1) / 11) * Math.PI) * 0.7,
            -s,
          ],
          0.012,
          0x485956,
        );
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [-0.19, 0, 0, 0.19, 0, 0, 0, -0.43, 0],
          3,
        ),
      );
      g.setIndex([0, 1, 2, 2, 1, 0]);
      g.computeVertexNormals();
      this.addGeom(g, [0xd38660, 0xdaca7a, 0x68aaa1, 0xb4c6b1][i % 4], [
        fx,
        fy,
        -s,
      ]);
    }
  }
  makeForest() {
    const c = this.course,
      rand = this.rand;
    for (let s = -20; s < c.length + 70; s += 7)
      for (const side of [-1, 1]) {
        if (forkAt(s, c, 16)) continue;
        for (let k = 0; k < 3; k++) {
          const x =
              centerAt(s, c) +
              side * (halfWidthAt(s, c) + 2 + k * 8 + rand() * 3),
            y = heightAt(s, c),
            z = -s + rand() * 5,
            h = 6 + rand() * 8;
          this.cylinder([x, y - 0.2, z], [x, y + h * 0.72, z], 0.18, 0x716f58);
          for (let j = 0; j < 3; j++)
            this.addGeom(
              new THREE.ConeGeometry(2.2 - j * 0.35, h * 0.5, 6),
              [0x49685a, 0x577c62, 0x3d6156][k],
              [x, y + h * 0.45 + j * h * 0.18, z],
            );
        }
        if (Math.floor(s) % 3 === 0)
          this.addGeom(
            new THREE.DodecahedronGeometry(1.0 + rand(), 0),
            0x8c958b,
            [
              centerAt(s, c) + side * (halfWidthAt(s, c) + 0.7),
              heightAt(s, c),
              -s,
            ],
          );
        if (s % 28 < 7) {
          const x = centerAt(s, c) + side * (halfWidthAt(s, c) + 0.45),
            y = heightAt(s, c);
          this.cylinder([x, y, -s], [x, y + 0.9, -s], 0.07, 0x786f52);
          this.cylinder(
            [x, y + 0.7, -s],
            [
              centerAt(s + 7, c) + side * (halfWidthAt(s + 7, c) + 0.45),
              heightAt(s + 7, c) + 0.7,
              -s - 7,
            ],
            0.045,
            0x9d9678,
          );
        }
      }
  }
  makeWilderness() {
    const c = this.course,
      rand = this.rand,
      isForest = c.terrain === "forest",
      snow = c.terrain === "snow",
      coast = c.terrain === "coast";
    this.scene.fog.density = isForest ? 0.007 : coast ? 0.0025 : 0.0036;
    if (isForest) {
      this.sun.intensity = 1.7;
      this.renderer.toneMappingExposure = 1.1;
    }
    for (
      let s = -20, index = 0;
      s < c.length + 65;
      s += isForest ? 10 : 13, index++
    )
      for (const side of [-1, 1]) {
        if (forkAt(s, c, 16)) continue;
        const half = halfWidthAt(s, c),
          baseY = heightAt(s, c),
          x = centerAt(s, c);
        const rocks = side > 0 || !coast;
        if (rocks && index % 3 === 0 && !rockChuteAt(s, c))
          this.addGeom(
            new THREE.DodecahedronGeometry(0.9 + rand() * 1.2, 0),
            snow ? 0xc0cdce : 0x929b87,
            [x + side * (half + 1.4), baseY + 0.2, -s],
            [rand(), rand(), rand()],
          );
        if (coast) {
          if (side < 0) {
            this.cylinder(
              [x - half - 0.3, baseY, -s],
              [x - half - 0.3, baseY + 0.9, -s],
              0.07,
              0x7f8064,
            );
            this.cylinder(
              [x - half - 0.3, baseY + 0.75, -s],
              [
                centerAt(s + 13, c) - halfWidthAt(s + 13, c) - 0.3,
                heightAt(s + 13, c) + 0.75,
                -s - 13,
              ],
              0.026,
              0xb7b398,
            );
          } else {
            for (let k = 0; k < 3; k++)
              this.addGeom(
                new THREE.IcosahedronGeometry(0.7 + rand(), 1),
                [0x7a8e66, 0x8f9c70, 0xb2b18b][k],
                [x + half + 1.6 + k * 3, baseY + k * 0.8, -s],
              );
            if (index % 4 === 0) {
              const tx = x + half + 5,
                ty = baseY + 1;
              this.cylinder(
                [tx, ty, -s],
                [tx - 0.5, ty + 6, -s],
                0.25,
                0x79765e,
              );
              for (let k = 0; k < 3; k++)
                this.addGeom(new THREE.SphereGeometry(2.1, 8, 5), 0x5f7e69, [
                  tx - 1.8 + k * 1.5,
                  ty + 6 + k * 0.35,
                  -s,
                ]);
            }
          }
        } else
          for (let k = 0; k < (isForest ? 3 : 2); k++) {
            const tx = x + side * (half + 2.5 + k * 9 + rand() * 2),
              ty = baseY + k * 2,
              tz = -s + rand() * 4;
            if (isForest) {
              const h = 28 + rand() * 24,
                r = 0.8 + rand() * 0.55;
              this.addGeom(
                new THREE.CylinderGeometry(r * 0.54, r, h, 9),
                [0x786449, 0x8d7251, 0x725c46][index % 3],
                [tx, ty + h / 2, tz],
              );
              for (let j = 0; j < 3; j++)
                this.addGeom(
                  new THREE.ConeGeometry(5 - j * 0.8, 12, 8),
                  [0x456952, 0x507958, 0x618568][j],
                  [tx, ty + h - 8 + j * 3.5, tz],
                );
              // Fern rosettes fill the forest floor without obscuring the riding line.
              for (let j = 0; j < 3; j++)
                this.addGeom(new THREE.ConeGeometry(0.65, 0.6, 6), 0x739363, [
                  tx + (j - 1) * 1.1,
                  ty + 0.3,
                  tz + 1.6,
                ]);
            } else {
              const h = 7 + rand() * 10;
              this.cylinder(
                [tx, ty, tz],
                [tx, ty + h * 0.8, tz],
                0.17,
                0x79775d,
              );
              for (let j = 0; j < 3; j++)
                this.addGeom(
                  new THREE.ConeGeometry(2.2 - j * 0.4, h * 0.48, 7),
                  snow
                    ? j % 2
                      ? 0xc4d7d1
                      : 0xe1e8df
                    : [0x466b57, 0x547760, 0x658569][j],
                  [tx, ty + h * 0.45 + j * h * 0.18, tz],
                );
            }
          }
        if (index % 9 === 2) {
          for (let k = 0; k < 3; k++)
            this.spectator(
              x + side * (half + 0.8),
              baseY,
              -s - k * 0.85,
              side,
              index + k,
            );
          this.box(
            x + side * (half + 0.35),
            baseY + 0.7,
            -s - 1,
            0.07,
            0.7,
            4,
            0x55715e,
          );
        }
      }
    if (isForest) this.makeRockChutes();
    if (c.terrain === "granite")
      for (let i = 0; i < 5; i++) {
        const s = 130 + i * 245,
          x = centerAt(s, c) + (i % 2 ? 1 : -1) * (90 + i * 4),
          y = heightAt(s, c);
        const dome = new THREE.SphereGeometry(
          50 + i * 4,
          14,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.7,
        );
        dome.scale(1, 1.8, 0.9);
        this.addGeom(dome, [0xacb3a5, 0xc2c3b0, 0x9fa997][i % 3], [
          x,
          y + 12,
          -s,
        ]);
        if (i % 2 === 0) {
          this.box(x * 0.8, y + 10, -s + 13, 2.1, 95, 0.4, 0xd7e6df);
          this.box(x * 0.8 + 0.5, y + 10, -s + 13.2, 0.5, 95, 0.25, 0xeff3e6);
        }
      }
    if (snow) {
      const positions = [];
      for (let i = 0; i < 500; i++)
        positions.push((rand() - 0.5) * 75, rand() * 40, (rand() - 0.5) * 90);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      this.snow = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: 0xf1f7f3,
          size: 0.075,
          transparent: true,
          opacity: 0.7,
        }),
      );
      this.level.add(this.snow);
    } else this.snow = null;
  }
  makeRockChutes() {
    const c = this.course,
      rand = this.rand;
    for (const chute of c.rockChutes || []) {
      const rock = this.surface(
        (s) => -halfWidthAt(s, c),
        (s) => halfWidthAt(s, c),
        0xadb3a0,
        0.045,
        chute.start,
        chute.end,
      );
      rock.material.roughness = 0.98;
      // The rideable pale slab follows the same height and width as the physics.
      for (const side of [-1, 1]) {
        this.surface(
          (s) => side * halfWidthAt(s, c),
          (s) => side * (halfWidthAt(s, c) + 0.75),
          0x7c9057,
          0.06,
          chute.start,
          chute.end,
        );
        for (let s = chute.start; s < chute.end; s += 4) {
          const x = centerAt(s, c),
            y = heightAt(s, c),
            half = halfWidthAt(s, c);
          const px = x + side * (half + 1.1),
            pz = -s;
          const stone = new THREE.DodecahedronGeometry(0.8 + rand() * 0.3, 1);
          stone.scale(1.15, 0.48, 1.6);
          this.addGeom(stone, 0x71835a, [px, y - 0.1, pz], [0, rand() * 3, 0]);
          // Fern fronds fan out on the shoulder, leaving the slab unobstructed.
          for (let j = 0; j < 5; j++) {
            const angle = (j * Math.PI * 2) / 5,
              fx = px + side * 0.55,
              fz = pz + 0.6;
            const tip = [
              fx + Math.cos(angle) * 0.62,
              y + 0.42,
              fz + Math.sin(angle) * 0.62,
            ];
            this.cylinder([fx, y + 0.05, fz], tip, 0.022, 0x6c8c53);
            const leaf = new THREE.BufferGeometry();
            leaf.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(
                [
                  fx,
                  y + 0.1,
                  fz,
                  tip[0] + 0.16,
                  tip[1],
                  tip[2],
                  tip[0] - 0.16,
                  tip[1],
                  tip[2],
                ],
                3,
              ),
            );
            leaf.setIndex([0, 1, 2, 2, 1, 0]);
            leaf.computeVertexNormals();
            this.addGeom(
              leaf,
              [0x7b9c64, 0x557e57, 0x8ba774][j % 3],
              [0, 0, 0],
            );
          }
          // Slender understory trunks mix with the existing giant redwoods.
          if (Math.round(s - chute.start) % 8 === 0)
            for (let k = 0; k < 3; k++) {
              const tx = x + side * (half + 2.2 + k * 2),
                tz = -s + 1,
                h = 11 + rand() * 12,
                ty = y + k * 0.5;
              this.cylinder(
                [tx, ty - 1, tz],
                [tx + side * 0.5, ty + h, tz],
                0.12 + k * 0.035,
                0x53664e,
              );
              for (let j = 0; j < 3; j++)
                this.addGeom(
                  new THREE.ConeGeometry(1.8 - j * 0.3, 4, 7),
                  [0x517459, 0x64866b, 0x77967b][j],
                  [tx, ty + h - 4 + j * 1.5, tz],
                );
            }
          if (Math.round(s - chute.start) % 16 === 0) {
            this.cylinder(
              [px + side * 0.4, y + 0.2, -s],
              [px + side * 3.2, y + 1.3, -s - 3],
              0.16,
              0x65734c,
            );
          }
          // Shallow seams stop at the edge; no raised objects block the chute.
          if (side === 1) {
            this.cylinder(
              [x - 0.4, y + 0.055, -s],
              [x + 0.2, y + 0.055, -s - 0.12],
              0.008,
              0x7e8878,
            );
          }
        }
      }
      const s = chute.start - 8,
        x = centerAt(s, c) + halfWidthAt(s, c) + 0.4,
        y = heightAt(s, c);
      this.box(x, y + 0.9, -s, 0.07, 1.8, 0.07, 0x54634a);
      this.frontSign("ROCK CHUTE ↓", x, y + 1.8, -s, 1.8, 0.5);
    }
  }
  makeCourseObjects() {
    const c = this.course;
    for (const ob of makeObstacles(c)) {
      const group = new THREE.Group();
      this.level.add(group);
      this.obstacleModels.push({ group, ob });
      this.objectGroup = group;
      const x = 0,
        y = 0,
        z = 0;
      if (ob.kind === "ramp") {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [
              -1, 0, 1.7, 1, 0, 1.7, -1, 0.7, -1.7, 1, 0.7, -1.7, -1, 0, -1.7,
              1, 0, -1.7,
            ],
            3,
          ),
        );
        g.setIndex([0, 2, 1, 1, 2, 3, 2, 4, 3, 3, 4, 5, 0, 4, 2, 1, 3, 5]);
        g.computeVertexNormals();
        this.addGeom(g, 0x9c875e, [x, y + 0.03, z]);
        for (let j = 0; j < 5; j++)
          this.box(
            x,
            y + 0.13 + j * 0.125,
            z + 1.25 - j * 0.6,
            1.95,
            0.03,
            0.08,
            0xc4ec73,
          );
      } else if (ob.kind === "rock")
        this.addGeom(
          new THREE.DodecahedronGeometry(0.68, 0),
          0x8b958d,
          [x, y + 0.4, z],
          [0.4, 0.2, 0.3],
        );
      else if (ob.kind === "barrier") {
        this.box(x, y + 0.65, z, 1.1, 0.55, 0.18, 0xdfa65a);
        for (const side of [-1, 1]) {
          this.box(x + side * 0.4, y + 0.42, z, 0.06, 0.84, 0.1, 0x5c6259);
          this.box(x + side * 0.4, y + 0.055, z, 0.3, 0.08, 0.7, 0x5c6259);
        }
        for (let i = -1; i <= 1; i++)
          this.box(
            x + i * 0.32,
            y + 0.65,
            z + 0.11,
            0.13,
            0.44,
            0.02,
            0x464f48,
          );
      } else {
        this.box(
          x,
          y + 0.4,
          z,
          0.9,
          0.8,
          0.85,
          c.id === "tokyo" ? 0x497477 : 0xa3895c,
        );
        this.box(x, y + 0.82, z, 0.95, 0.04, 0.91, 0xc3ac7b);
        for (let j = 0; j < 3; j++)
          this.box(
            x,
            y + 0.2 + j * 0.22,
            z + 0.44,
            0.9,
            0.025,
            0.015,
            0x796e53,
          );
      }
    }
    this.objectGroup = null;
    for (let i = 0; i <= 4; i++) {
      const s = i === 0 ? 10 : (i * c.length) / 4;
      if (forkAt(s, c, 10)) continue;
      const x = centerAt(s, c),
        y = heightAt(s, c),
        half = halfWidthAt(s, c) + 0.25;
      for (const side of [-1, 1]) {
        this.box(x + side * half, y + 2, -s, 0.14, 4, 0.14, 0x324a46);
        this.box(x + side * half, y + 2.7, -s, 0.19, 2.5, 0.21, 0xbcf158);
      }
      if (i === 0 || i === 4) {
        this.box(x, y + 4, -s, half * 2 + 0.2, 0.55, 0.16, 0x263c36);
        this.frontSign(
          i === 0 ? "DROP IN" : "FINISH",
          x,
          y + 4,
          -s + 0.1,
          half * 1.7,
          0.45,
        );
      } else
        this.frontSign(
          `0${i} / CHECKPOINT`,
          x + half,
          y + 3.3,
          -s + 0.12,
          1.5,
          0.6,
        );
    }
    // High-visibility arrows call out the direction of the route.
    for (let s = 42; s < c.length; s += 70) {
      if (forkAt(s, c, 16)) continue;
      const x = centerAt(s, c),
        y = heightAt(s, c),
        side = Math.cos(s * 0.016) > 0 ? -1 : 1;
      this.box(
        x + side * (halfWidthAt(s, c) + 0.2),
        y + 0.65,
        -s,
        0.06,
        1.3,
        0.06,
        0x566e61,
      );
      this.frontSign(
        side === 1 ? "❮" : "❯",
        x + side * (halfWidthAt(s, c) + 0.2),
        y + 1.25,
        -s,
        0.8,
        0.7,
      );
    }
    for (const flight of c.stairs) {
      const s = flight.start - 9,
        x = centerAt(s, c) + halfWidthAt(s, c) + 0.25,
        y = heightAt(s, c);
      this.box(x, y + 0.9, -s, 0.07, 1.8, 0.07, 0x475f4d);
      this.frontSign("STAIRS ↓", x, y + 1.8, -s, 1.35, 0.55);
    }
    for (let s = 30; s < c.length - 30; s += 28) {
      if (forkAt(s, c, 16)) continue;
      const curve = curvatureAt(s + 12, c);
      if (Math.abs(curve) < 0.018) continue;
      const side = curve > 0 ? -1 : 1,
        x = centerAt(s, c) + side * (halfWidthAt(s, c) + 0.2),
        y = heightAt(s, c);
      this.box(x, y + 0.65, -s, 0.08, 1.3, 0.08, 0x485d4b);
      this.frontSign(curve > 0 ? "› › ›" : "‹ ‹ ‹", x, y + 1.25, -s, 1.25, 0.6);
    }
  }
  frontSign(label, x, y, z, w, h, accent = null) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = this.course.id === "halloween" ? "#281521" : "#283f36";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle =
      accent || (this.course.id === "halloween" ? "#ff9c42" : "#c4f16b");
    ctx.font = "bold 60px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 256, 67);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }),
    );
    mesh.position.set(x, y, z);
    this.level.add(mesh);
  }
  update(run, time, menu = false) {
    const c = this.course,
      s = run.s,
      route = run.route || "main",
      x = routeCenterAt(s, c, route) + run.lateral,
      y = routeHeightAt(s, c, route);
    for (const model of this.obstacleModels) {
      const ob = run.obstacles?.find((o) => o.s === model.ob.s) || model.ob,
        p = impactPose(ob, run.elapsed || 0);
      model.group.position.set(
        centerAt(ob.s, c) + ob.x + p.x,
        heightAt(ob.s, c) + p.y,
        -ob.s + p.z,
      );
      model.group.rotation.set(p.tilt, p.spin, 0);
    }
    this.billboards?.update(time);
    if (this.arms) this.animateCrowd(time);
    this.amazon?.update(run, time, menu);
    this.bengaluru?.update(run, time, menu);
    this.halloween?.update(run, time, menu);
    this.peloton?.update(
      menu ? null : run.rivals,
      s,
      menu ? time : run.elapsed,
    );
    if (this.snow) {
      this.snow.position.set(x, y + 7 - (time % 8), -s - 25);
    }
    const onStairs = !!stairAt(s, c);
    const vibration = menu
      ? Math.sin(time * 0.8) * 0.009
      : Math.sin(time * (onStairs ? 64 : 39)) *
        Math.min(run.speed * (onStairs ? 0.0023 : 0.0009), 0.06) *
        (run.jump > 0 ? 0.1 : 1);
    this.bump *= 0.88;
    const sky = c.terrain === "sky",
      fall = run.falling ? run.fallTime || 0 : 0;
    this.camera.position.set(
      x,
      y +
        1.55 +
        run.jump +
        vibration * (sky ? 1.8 : 1) +
        this.bump -
        fall * fall * 16,
      -s,
    );
    const ahead = sky ? 9 : menu ? 22 : 13;
    this.look.set(
      routeCenterAt(s + ahead, c, route) + run.lateral + run.steer * 0.8,
      routeHeightAt(s + ahead, c, route) + 1.6 + run.jump * 0.4,
      -s - ahead,
    );
    this.camera.lookAt(this.look);
    this.camera.rotateZ(
      -run.steer * (sky ? 0.18 : 0.075) -
        Math.max(-0.1, Math.min(0.1, (run.curve || 0) * run.speed * 0.2)) +
        (run.hitCooldown > 1.25 ? Math.sin(time * 55) * 0.025 : 0),
    );
    const desiredFov = menu ? 77 : 78 + run.speed * 0.42;
    if (Math.abs(this.camera.fov - desiredFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, desiredFov, 0.04);
      this.camera.updateProjectionMatrix();
    }
    this.bike.rotation.z = -run.steer * 0.045;
    this.bike.rotation.y = -run.steer * 0.045;
    this.bike.position.y = -0.18 + vibration * 0.5;
    this.bike.rotation.x = run.jump > 0 ? -0.035 : 0;
    if (sky) {
      this.skyBike.rotation.copy(this.bike.rotation);
      this.skyBike.position.copy(this.bike.position);
      this.camera.rotateZ(
        Math.max(-0.23, Math.min(0.23, -(run.curve || 0) * run.speed * 0.5)) +
          Math.sin(time * 31) * 0.003,
      );
    }
    const external = !menu && this.cameraMode !== 0;
    this.bike.visible = !external && !sky;
    this.skyBike.visible = !external && sky;
    this.playerModel.update(
      external ? [{ ...run, finished: false, turn: run.steer || 0 }] : null,
      s,
      time,
    );
    this.playerModel.riders[0].nameTag.visible = false;
    if (external) {
      const pose = followCameraPose(this.cameraMode, run, c);
      this.camera.position.set(...pose.position);
      this.camera.lookAt(...pose.target);
      if (this.camera.fov !== pose.fov) {
        this.camera.fov = pose.fov;
        this.camera.updateProjectionMatrix();
      }
      if (fall) this.playerModel.riders[0].group.position.y -= fall * fall * 16;
    }
    const tumble = run.down
      ? Math.min(1, (run.downTime || 0) / 0.55)
      : (run.recoverTime || 0) / 0.45;
    if (tumble > 0) {
      const side = run.fallSide || 1;
      if (!external) {
        this.camera.position.y = y + 1.55 - 1.2 * tumble;
        this.camera.rotateZ(side * 1.25 * tumble);
        this.bike.rotation.z += side * 0.35 * tumble;
        this.skyBike.rotation.z += side * 0.35 * tumble;
      } else {
        const rider = this.playerModel.riders[0].group;
        rider.rotation.z = side * 1.4 * tumble;
        rider.position.y = y + 0.25 * tumble;
      }
    }
    this.sun.position.set(x - 35, y + 70, -s + 25);
    this.sun.target.position.set(x, y - 7, -s - 32);
    this.renderer.render(this.scene, this.camera);
  }
}
