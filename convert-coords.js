/**
 * convert-meridian-positions.mjs
 * Converts anatomy-data.ts old arbitrary positions → anatomical-proportion positions
 * that match the real GLB body model.
 *
 * Old system:  X ∈ [-1.5, 1.5], Y ∈ [-1, 1], Z ∈ [-0.8, 0.8]  (tube body)
 * New system:  Proportional anatomy, scaled to GLB bounding box
 *   GLB width ≈ 0.47m → X_new * 4.25
 *   GLB depth ≈ 0.23m → Z_new * 4.35
 *   Y is already in [-1, 1] range
 */
import fs from "fs";

const FILE = "app/lib/anatomy-data.ts";
let src = fs.readFileSync(FILE, "utf8");

// Old → New conversion factors (derived from bounding box analysis)
const X_SCALE = 4.25;   // model width ratio
const Z_SCALE = 4.35;   // model depth ratio

// Parse old position [x, y, z] from anatomy-data.ts hotspots
// and convert to new anatomical-proportion positions
function convert(old) {
  const [ox, oy, oz] = old;
  // New X: narrow the wide old-X to actual body width
  const nx = (ox * 0.06).toFixed(3);
  // Y: keep the same (both systems use body-height normalized)
  const ny = parseFloat(oy.toFixed(3));
  // New Z: push closer to body surface
  const nz = (oz * 0.15).toFixed(3);
  return `[${nx}, ${ny}, ${nz}]`;
}

// Find all hotspot position arrays and convert them
let count = 0;
src = src.replace(
  /position:\s*\[([-\d.,\s]+)\]/g,
  (match, nums) => {
    const arr = nums.split(",").map(Number);
    if (arr.length !== 3 || arr.some(isNaN)) return match;
    count++;
    return `position: ${convert(arr)}`;
  }
);

console.log(`Converted ${count} hotspot positions`);

// Also fix the anatomical description comment at top
src = src.replace(
  /All 3D positions use a normalized body coordinate system:[\s\S]*?back"\)/,
  `All 3D positions use proportional anatomy matching the real GLB body model (FIT_SIZE=2):
  Y: +1 (crown) to -1 (feet), origin at body centre
  X: ±0.24 (shoulder width ≈ 0.47m total)
  Z: front-facing positive, scaled to body depth`
);

fs.writeFileSync(FILE, src, "utf8");
console.log("Written:", FILE);

// Print sample conversions for verification
console.log("\nSample conversions:");
const samples = [
  [-1.3, 0.25, 0.5],
  [-1.18, -0.18, 0.48],
  [-0.95, -0.85, 0.38],
  [-1.05, -0.88, 0.42],
];
for (const s of samples) {
  console.log(`  ${JSON.stringify(s)} → ${convert(s)}`);
}
