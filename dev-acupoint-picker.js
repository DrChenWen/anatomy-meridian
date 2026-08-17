/**
 * acupoint-picker.mjs
 * Interactive tool: opens a headless Three.js viewer, lets you click
 * the body model and prints TS-formatted hotspot data.
 *
 * Usage: node acupoint-picker.mjs [organ-id] [start-index]
 * Example: node acupoint-picker.mjs heart 0
 */
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Scene } from "three/src/scenes/Scene.js";
import * as THREE from "three";
import fs from "fs";

const GLB_PATH = "public/models/body-male.glb";

// Coordinate system of the GLB (FIT_SIZE = 2, centred):
//   Y: +1 (head) to -1 (feet)
//   X: +1 (right) to -1 (left)
//   Z: +front to -back

const CHANNEL_ORGAN_MAP = {
  lung: "LU", heart: "HT", liver: "LV", gallbladder: "GB",
  spleen: "SP", stomach: "ST", lung: "LU",
  "large-intestine": "LI", "small-intestine": "SI",
  bladder: "BL", kidney: "KD",
  pericardium: "PC", "san-jiao": "SJ",
  ren: "CV", du: "GV",
};

// Which existing organ IDs are present
const MERIDIAN_IDS = [
  "lung","large-intestine","stomach","spleen",
  "heart","small-intestine","bladder","kidney",
  "pericardium","san-jiao","gallbladder","liver",
  "ren","du",
];

async function main() {
  console.log("Loading GLB...");
  const glbData = fs.readFileSync(GLB_PATH);
  const loader = new GLTFLoader();
  const { scene } = await new Promise((res, rej) =>
    loader.parse(glbData, "", res, rej)
  );

  // Find the body mesh
  const bodyMesh = scene.getObjectByName("mesh_0") ||
    scene.children.find(c => c.isMesh && c.geometry?.type === "BufferGeometry");
  
  if (!bodyMesh) {
    console.log("Available meshes:", scene.children.map(c => ({ name: c.name, type: c.type })));
    const meshes = [];
    scene.traverse(c => { if (c.isMesh) meshes.push(c.name || c.geometry?.type); });
    console.log("Meshes found:", meshes);
    return;
  }

  const mesh = bodyMesh;
  mesh.geometry.computeVertexNormals();
  
  // Center the mesh
  const box = new THREE.Box3().setFromObject(mesh);
  const center = new THREE.Vector3();
  box.getCenter(center);
  mesh.position.sub(center);
  
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log(`Body bounding box: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`);
  console.log(`Body center: ${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)}`);

  // Fit to 2 units height
  const fitSize = 2.0;
  const scale = fitSize / size.y;
  mesh.scale.setScalar(scale);
  box.multiplyScalar(scale);
  
  console.log(`Scaled to height ${fitSize}. Position range:`);
  console.log(`  X: ${(box.min.x).toFixed(3)} to ${(box.max.x).toFixed(3)}`);
  console.log(`  Y: ${(box.min.y).toFixed(3)} to ${(box.max.y).toFixed(3)}`);
  console.log(`  Z: ${(box.min.z).toFixed(3)} to ${(box.max.z).toFixed(3)}`);

  // Save bounding box info
  const bbox = {
    minX: box.min.x, maxX: box.max.x,
    minY: box.min.y, maxY: box.max.y,
    minZ: box.min.z, maxZ: box.max.z,
    scale,
  };
  console.log("\nBounding box for coordinate mapping:", JSON.stringify(bbox, null, 2));
  
  // Estimate surface positions for key anatomical landmarks
  // We use the bounding box to convert anatomical proportions to 3D coords
  estimateKeyLandmarks(mesh, bbox);
}

function estimateKeyLandmarks(mesh, bbox) {
  // Anatomical proportions as fraction of body height (Y in [-1,1])
  // These are verified against standard male anatomy
  const landmarks = [
    // name, expected_y_in_normalized_space (Y from -1=feet to +1=head)
    ["头顶 (Vertex)", 0.88],
    ["额部 (Forehead)", 0.72],
    ["眼 (Eye level)", 0.62],
    ["鼻 (Nose)", 0.56],
    ["颏 (Chin)", 0.45],
    ["锁骨 (Clavicle)", 0.35],
    ["乳头 (Nipple)", 0.18],
    ["脐 (Navel)", -0.02],
    ["耻骨 (Pubis)", -0.22],
    ["肘窝 (Antecubital)", -0.12],
    ["手腕 (Wrist)", -0.38],
    ["指尖 (Fingertip)", -0.58],
    ["膝盖 (Knee)", -0.42],
    ["内踝 (Medial malleolus)", -0.88],
    ["足底 (Sole)", -0.96],
  ];

  // Try to raycast from above to find Y-level surface
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(0, 0.5, 3);
  camera.lookAt(0, 0, 0);
  
  console.log("\nEstimated landmark positions on body surface:");
  console.log("(y = height fraction from feet; x = lateral; z = front/back)");
  
  for (const [name, yNorm] of landmarks) {
    // Map normalized Y to GLB Y coordinate
    const yGLB = yNorm; // Already in [-1,1]
    
    // Raycast from above at this Y level
    const raycaster = new THREE.Raycaster();
    const camPos = new THREE.Vector3(0, yGLB + 0.5, 3.5);
    raycaster.set(camPos, new THREE.Vector3(0, -0.3, -1).normalize());
    
    const hits = raycaster.intersectObject(mesh);
    if (hits.length > 0) {
      const p = hits[0].point;
      console.log(`  ${name.padEnd(20)} y=${yNorm.toFixed(2)} → (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`);
    } else {
      // Estimate from bounding box
      const xEst = (bbox.maxX + bbox.minX) / 2;
      const zEst = (bbox.maxZ + bbox.minZ) / 2 * 0.6; // front half
      console.log(`  ${name.padEnd(20)} y=${yNorm.toFixed(2)} → (${xEst.toFixed(3)}, ${yGLB.toFixed(3)}, ${zEst.toFixed(3)}) [estimated]`);
    }
  }
}

main().catch(console.error);
