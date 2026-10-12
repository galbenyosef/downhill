import { centerAt, halfWidthAt, forkAt } from "./game.js";
export const BILLBOARD_AD = {
  headline: "NOW STREAMING",
  brand: "Roku TV",
  footer: "FIND YOUR NEXT FAVORITE",
  background: "#351064",
  accent: "#b799ff",
};
export function billboardLayout(course) {
  if (course.environment === "wild" || course.environment === "extreme")
    return [];
  const signs = [];
  for (let s = 32, i = 0; s < course.length - 35; s += 155, i++) {
    if (forkAt(s, course, 32)) continue;
    const side = i % 2 ? -1 : 1,
      width = 6.4,
      height = 3.2;
    // Bound the full sign footprint against the curved road, not just its centre.
    let edge = 0;
    for (let offset = -3; offset <= 3; offset += 0.5)
      edge = Math.max(
        edge,
        side * (centerAt(s + offset, course) - centerAt(s, course)) +
          halfWidthAt(s + offset, course),
      );
    signs.push({
      s,
      side,
      width,
      height,
      x: centerAt(s, course) + side * (edge + width / 2 + 0.9),
    });
  }
  return signs;
}
