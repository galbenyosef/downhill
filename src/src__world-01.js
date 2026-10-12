// src__world 01 — seed
// Lines 1-37 of readable/src__world.pretty.js (statement-aligned).
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

