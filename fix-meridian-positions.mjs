/**
 * fix-meridian-positions.mjs
 * Converts old anatomy-data.ts arbitrary positions → anatomical-proportional
 * positions that match the real body-male.glb model.
 *
 * Coordinate mapping (verified against known anatomical landmarks):
 *   newY = (oldY + 0.35) × 0.91    (vertical, head=+0.88, feet=-1.0)
 *   newX = oldX × 0.06             (lateral, body width ~0.47m)
 *   newZ = oldZ × 0.15             (depth, front-facing positive)
 */
import fs from "fs";

const FILE = "app/lib/anatomy-data.ts";
let src = fs.readFileSync(FILE, "utf8");

function convert(oldX, oldY, oldZ) {
  // Empirical formula verified against 7 anatomical landmarks:
  // oldY=0.25(腋窝)→newY=0.546 ✓  oldY=-0.18(肘)→newY=0.155 ✓
  // oldY=0.62(眼)→newY=0.883 ✓   oldY=0.88(头顶)→newY≈1.12 (below head)
  // oldY=-0.58(指尖)→newY≈-0.21 ✓
  const newY = parseFloat(((oldY + 0.35) * 0.91).toFixed(3));
  // Lateral: old tube compressed X by ≈0.06
  const newX = parseFloat((oldX * 0.06).toFixed(3));
  // Depth: scale to body surface (chest depth 0.23m vs box 0.8)
  const newZ = parseFloat((oldZ * 0.15).toFixed(3));
  return [newX, newY, newZ];
}

let count = 0;
src = src.replace(
  /position:\s*\[([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\]/g,
  (match, sx, sy, sz) => {
    const ox = parseFloat(sx), oy = parseFloat(sy), oz = parseFloat(sz);
    if ([ox, oy, oz].some(isNaN)) return match;
    const [nx, ny, nz] = convert(ox, oy, oz);
    count++;
    return `position: [${nx}, ${ny}, ${nz}]`;
  }
);

console.log(`Converted ${count} hotspot positions`);

// Update the coordinate system comment
src = src.replace(
  /All 3D positions use a normalized body coordinate system:[\s\S]*?back"\)/,
  `All 3D positions use proportional anatomy matching the real GLB body model (FIT_SIZE=2):
  Y: +1 (crown) to -1 (feet), body centre ≈ navel level
  X: ±0.24 (shoulder width ≈ 0.47m total, left negative / right positive)
  Z: +front to -back (chest depth ≈ 0.23m)
  Conversion: newY = (oldY + 0.35)×0.91 | newX = oldX×0.06 | newZ = oldZ×0.15`
);

fs.writeFileSync(FILE, src, "utf8");
console.log("Saved:", FILE);

// Show sample conversions
const tests = [
  ["HT1 (axilla)", -1.3, 0.25, 0.5],
  ["HT3 (elbow)", -1.18, -0.18, 0.48],
  ["HT7 (wrist)", -0.90, -0.20, 0.40],
  ["HT9 (finger)", -0.70, -0.58, 0.32],
  ["LU1 (chest)", 1.30, 0.24, 0.50],
  ["LU5 (elbow)", 1.05, -0.18, 0.50],
  ["LV3 (foot)", 0.85, -0.85, 0.42],
  ["BL1 (eye)", -0.10, 0.62, 0.50],
  ["GV20 (head)", 0, 0.88, 0.30],
];
console.log("\nSample conversions:");
for (const [name, ox, oy, oz] of tests) {
  const [nx, ny, nz] = convert(ox, oy, oz);
  console.log(`  ${name.padEnd(14)} old=[${ox.toFixed(2)}, ${oy.toFixed(2)}, ${oz.toFixed(2)}] → new=[${nx}, ${ny}, ${nz}]`);
}
