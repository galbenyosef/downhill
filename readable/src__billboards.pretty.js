import * as THREE from "three";
import { heightAt } from "./game.js";
import { BILLBOARD_AD, billboardLayout } from "./billboard-layout.js";

import {
  ROKU_TITLES,
  ROKU_CHECKED_ON,
  billboardFrame,
  lineupHeadline,
} from "./roku-lineup.js";

function drawCreative(ctx, ad, index, image) {
  const bg = ctx.createLinearGradient(0, 0, 1024, 512);
  bg.addColorStop(0, BILLBOARD_AD.background);
  bg.addColorStop(1, "#7027b7");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 27px sans-serif";
  ctx.fillText(lineupHeadline(), 32, 58);
  ctx.font = "900 56px sans-serif";
  ctx.fillText("Roku", 32, 137);
  ctx.font = "600 24px sans-serif";
  ctx.fillText("THE ROKU CHANNEL", 34, 177);
  ctx.fillStyle = "#dfcaff";
  ctx.font = "700 34px sans-serif";
  let line = "",
    y = 265;
  for (const word of ad.title.split(" ")) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > 320 && line) {
      ctx.fillText(line, 32, y);
      y += 43;
      line = word;
    } else line = next;
  }
  ctx.fillText(line, 32, y);
  ctx.font = "24px sans-serif";
  ctx.fillText(ad.year + "  •  MOVIE", 32, 390);
  ctx.fillStyle = "#19062c";
  ctx.fillRect(384, 64, 608, 343);
  if (image) {
    const scale = Math.min(608 / image.naturalWidth, 343 / image.naturalHeight),
      w = image.naturalWidth * scale,
      h = image.naturalHeight * scale;
    ctx.drawImage(image, 384 + (608 - w) / 2, 64 + (343 - h) / 2, w, h);
  } else {
    ctx.fillStyle = "#b799ff";
    ctx.font = "600 30px sans-serif";
    ctx.fillText("Discover your next favorite", 407, 244);
  }
  ctx.fillStyle = "#dfcaff";
  ctx.font = "19px sans-serif";
  ctx.fillText(
    "US catalog • Checked " + ROKU_CHECKED_ON + " • Availability varies",
    32,
    460,
  );
  ctx.font = "17px sans-serif";
  ctx.fillText("IN-GAME PROMO", 32, 490);
  for (let n = 0; n < ROKU_TITLES.length; n++) {
    ctx.fillStyle = n === index ? "#ffffff" : "#9471b7";
    ctx.fillRect(887 + n * 34, 468, 24, 5);
  }
}
export function buildBillboards(world) {
  const placements = billboardLayout(world.course);
  if (!placements.length) return null;
  const level = world.level;
  const materials = ROKU_TITLES.map((ad, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    drawCreative(ctx, ad, index);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(
      4,
      world.renderer.capabilities.getMaxAnisotropy(),
    );
    const material = new THREE.MeshBasicMaterial({
      map,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const image = new Image();
    image.onload = () => {
      if (world.level !== level) return;
      drawCreative(ctx, ad, index, image);
      map.needsUpdate = true;
    };
    image.onerror = () => {
      /* Keep the readable text creative if artwork is unavailable. */
    };
    image.src = ad.image;
    return material;
  });
  const faces = [];
  for (const p of placements) {
    const y = heightAt(p.s, world.course),
      centre = y + 7;
    for (const side of [-1, 1])
      world.box(
        p.x + side * p.width * 0.32,
        y + 3.5,
        -p.s + 0.3,
        0.17,
        7,
        0.17,
        0x42474c,
      );
    world.box(
      p.x,
      centre,
      -p.s - 0.12,
      p.width + 0.24,
      p.height + 0.24,
      0.22,
      0x25282f,
    );
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(p.width, p.height),
      materials[faces.length % materials.length],
    );
    face.position.set(p.x, centre, -p.s + 0.025);
    world.level.add(face);
    faces.push(face);
    world.box(
      p.x,
      centre + p.height / 2 + 0.18,
      -p.s + 0.15,
      p.width + 0.3,
      0.07,
      0.12,
      0xb799ff,
      0,
      true,
    );
  }
  return {
    update(time) {
      faces.forEach((face, index) => {
        face.material = materials[billboardFrame(time, index)];
      });
    },
    dispose() {
      materials.forEach((m) => {
        m.map.dispose();
        m.dispose();
      });
    },
  };
}
