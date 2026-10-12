// src__halloween-world 01 — and
// Lines 1-12 of readable/src__halloween-world.pretty.js (statement-aligned).
import { impactPose } from "./impacts.js";
import * as THREE from "three";
import {
  centerAt,
  heightAt,
  halfWidthAt,
  makeObstacles,
  makeZombies,
  forkAt,
} from "./game.js";

// Static scenery is batched; only four nearby lamps and the animated creatures update.
