/**
 * MeridianViewer — Programmatic TCM meridian / acupoint renderer.
 *
 * Replaces AnatomyViewer for the meridian demo. Instead of loading GLB files
 * it procedurally draws:
 *   • A simplified human-body silhouette (wireframe)
 *   • The selected meridian as a glowing THREE.Line
 *   • All acupoints as interactive hotspot spheres
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import type { Hotspot } from "../../i18n/merge";
import { HotspotLayer } from "./hotspots";

type ViewerCallbacks = {
  onLoading: (loading: boolean, progress: number) => void;
  onSelect: (hotspot: Hotspot | null) => void;
  onPick?: (hotspot: Hotspot) => void;
  onAuthorPoint?: (point: { x: number; y: number; z: number }) => void;
};

const DOT_PIXELS = 38;
const CAMERA_FOV = 34;
const HOME_CAMERA = { x: 0, y: 0.3, z: 5.5 };
const HOME_TARGET = { x: 0, y: 0, z: 0 };

export class MeridianViewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  private controls: OrbitControls;
  private hotspots = new HotspotLayer();
  private callbacks: ViewerCallbacks;
  private container: HTMLElement;

  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private frame = 0;
  private clock = new THREE.Clock();
  private dirty = true;
  private busyUntil = 0;
  private disposed = false;
  private autoRotateWanted = true;
  private interactionUntil = 0;
  private selectedId: string | null = null;
  private hoveredId: string | null = null;
  private hoverProbe: { x: number; y: number } | null = null;
  private pointerId: number | null = null;
  private pointerStart = { x: 0, y: 0 };
  private dragged = false;
  private calloutEl: HTMLElement | null = null;
  private quizMode = false;
  private authoring = false;

  private meridianLine: THREE.Line | null = null;
  private glowLine: THREE.Line | null = null;
  private bodyGroup = new THREE.Group();

  private width = 1;
  private height = 1;
  private isVisible = true;
  private basePixelRatio: number;

  constructor(container: HTMLElement, callbacks: ViewerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    const lowPower =
      window.matchMedia("(max-width: 780px)").matches ||
      (navigator.hardwareConcurrency ?? 8) < 6;
    this.basePixelRatio = Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !lowPower,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(this.basePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D meridian explorer"
    );
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);

    this.camera.position.set(HOME_CAMERA.x, HOME_CAMERA.y, HOME_CAMERA.z);
    this.controls = new OrbitControls(
      this.camera,
      this.renderer.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 12;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.target.set(HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z);

    this.buildScene();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.isVisible = entry.isIntersecting;
        if (this.isVisible) this.dirty = true;
      },
      { rootMargin: "120px" }
    );
    this.intersectionObserver.observe(container);

    document.addEventListener("visibilitychange", this.onVisibilityChange);
    this.controls.addEventListener("start", this.onControlStart);
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("keydown", this.onKeyDown);

    this.callbacks.onLoading(false, 1);
    this.resize();
    this.animate();
  }

  private buildScene() {
    this.scene.add(new THREE.AmbientLight(0xfff8f0, 0.5));
    this.scene.add(new THREE.HemisphereLight(0xfff4e8, 0x1a1a2e, 0.6));

    const key = new THREE.DirectionalLight(0xffe8cc, 2.8);
    key.position.set(4, 6, 5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xd4e8ff, 0.8);
    fill.position.set(-4, 2, 4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffd4c4, 1.2);
    rim.position.set(-2, 3, -5);
    this.scene.add(rim);

    const groundGlow = new THREE.PointLight(0xc8a87a, 0.5, 8, 2);
    groundGlow.position.set(0, -2.2, 0);
    this.scene.add(groundGlow);

    this.buildBodySilhouette();
    this.buildParticles();
    this.scene.add(this.bodyGroup);
  }

  private buildBodySilhouette() {
    const outline: [number, number, number][] = [
      [0, 0.88, 0.52], [0.22, 0.82, 0.5], [0.32, 0.65, 0.46], [0.28, 0.45, 0.44],
      [0.12, 0.4, 0.38], [-0.12, 0.4, 0.38], [-0.28, 0.45, 0.44],
      [-0.45, 0.38, 0.38], [-0.58, 0.28, 0.34], [-0.65, 0.05, 0.3],
      [-0.68, -0.3, 0.28], [-0.65, -0.6, 0.3], [-0.62, -0.82, 0.35],
      [-0.58, -0.97, 0.4], [-0.55, -1.0, 0.38], [-0.52, -0.95, 0.36],
      [-0.52, -0.6, 0.22], [-0.5, -0.2, 0.22], [-0.45, 0.15, 0.22],
      [-0.42, -0.1, 0.18], [-0.38, -0.38, 0.18], [-0.35, -0.55, 0.18],
      [-0.38, -0.72, 0.14], [-0.35, -0.88, 0.14], [-0.32, -0.98, 0.15],
      [-0.28, -1.02, 0.15], [-0.22, -1.0, 0.22], [-0.18, -0.96, 0.22],
      [-0.22, -0.92, 0.22], [-0.24, -0.72, 0.08], [-0.26, -0.45, 0.08],
      [-0.28, -0.15, 0.08], [0, -0.6, 0.08], [0.24, -0.72, 0.08],
      [0.28, -0.98, 0.15], [0.32, -1.02, 0.15], [0.38, -0.88, 0.14],
      [0.38, -0.72, 0.14], [0.35, -0.55, 0.18], [0.42, -0.1, 0.18],
      [0.45, 0.15, 0.22], [0.52, -0.6, 0.22], [0.55, -1.0, 0.38],
      [0.58, -0.97, 0.4], [0.65, -0.6, 0.3], [0.68, -0.3, 0.28],
      [0.65, 0.05, 0.3], [0.58, 0.28, 0.34], [0.45, 0.38, 0.38],
      [0.28, 0.45, 0.44], [0.12, 0.4, 0.38], [0, 0.88, 0.52],
    ];

    const curve = new THREE.CatmullRomCurve3(
      outline.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      false, "catmullrom", 0.5
    );

    const tubeGeo = new THREE.TubeGeometry(curve, 120, 0.008, 6, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x9a8a7a, roughness: 0.85, metalness: 0, transparent: true, opacity: 0.3,
    });
    this.bodyGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

    // Spine
    const spinePoints: THREE.Vector3[] = [];
    for (let y = 0.85; y >= -0.6; y -= 0.05)
      spinePoints.push(new THREE.Vector3(0, y, -0.35));
    const spineGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(spinePoints), 80, 0.006, 5, false
    );
    this.bodyGroup.add(new THREE.Mesh(spineGeo, new THREE.MeshStandardMaterial({
      color: 0x8a7a6a, roughness: 0.9, metalness: 0, transparent: true, opacity: 0.25,
    })));

    // Front center (Ren Mai)
    const frontPoints: THREE.Vector3[] = [];
    for (let y = 0.52; y >= -0.6; y -= 0.05)
      frontPoints.push(new THREE.Vector3(0, y, 0.52));
    const frontGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(frontPoints), 80, 0.005, 5, false
    );
    this.bodyGroup.add(new THREE.Mesh(frontGeo, new THREE.MeshStandardMaterial({
      color: 0xaa8878, roughness: 0.9, metalness: 0, transparent: true, opacity: 0.15,
    })));

    // Belt line (Dai Mai hint)
    const belt = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.004, 6, 60),
      new THREE.MeshStandardMaterial({ color: 0xaa88aa, roughness: 0.8, metalness: 0, transparent: true, opacity: 0.12 })
    );
    belt.position.set(0, -0.12, 0.0);
    belt.rotation.x = Math.PI / 2;
    this.bodyGroup.add(belt);

    // Shoulder line
    const shoulders = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.005, 6, 60),
      new THREE.MeshStandardMaterial({ color: 0x9a8a7a, roughness: 0.85, metalness: 0, transparent: true, opacity: 0.18 })
    );
    shoulders.position.set(0, 0.38, 0.38);
    shoulders.rotation.x = Math.PI / 2;
    this.bodyGroup.add(shoulders);
  }

  private buildParticles() {
    const positions = new Float32Array(80 * 3);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 8;
      positions[i + 1] = (Math.random() - 0.5) * 7;
      positions[i + 2] = (Math.random() - 0.5) * 6 - 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xe8c890, size: 0.012, transparent: true, opacity: 0.14,
    })));
  }

  private clearMeridianLine() {
    if (this.meridianLine) {
      this.scene.remove(this.meridianLine);
      this.meridianLine.geometry.dispose();
      (this.meridianLine.material as THREE.Material).dispose();
      this.meridianLine = null;
    }
    if (this.glowLine) {
      this.scene.remove(this.glowLine);
      this.glowLine.geometry.dispose();
      (this.glowLine.material as THREE.Material).dispose();
      this.glowLine = null;
    }
  }

  private buildMeridianLine(hotspots: Hotspot[], accent: string) {
    this.clearMeridianLine();
    const sorted = [...hotspots].sort((a, b) => b.position[1] - a.position[1]);
    const points: THREE.Vector3[] = sorted.map(
      (h) => new THREE.Vector3(h.position[0], h.position[1], h.position[2])
    );

    const smoothPoints: THREE.Vector3[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      smoothPoints.push(points[i]);
      const mid = new THREE.Vector3().addVectors(points[i], points[i + 1]).multiplyScalar(0.5);
      mid.z += (Math.random() - 0.5) * 0.04;
      smoothPoints.push(mid);
    }
    smoothPoints.push(points[points.length - 1]);

    const curve = new THREE.CatmullRomCurve3(smoothPoints, false, "catmullrom", 0.4);
    const mainColor = new THREE.Color(accent);

    this.meridianLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)),
      new THREE.LineBasicMaterial({ color: mainColor, linewidth: 2, transparent: true, opacity: 0 })
    );

    this.glowLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)),
      new THREE.LineBasicMaterial({ color: mainColor, linewidth: 6, transparent: true, opacity: 0 })
    );

    this.scene.add(this.glowLine);
    this.scene.add(this.meridianLine);

    // Tube for main meridian
    const tubeGeo = new THREE.TubeGeometry(curve, 100, 0.018, 10, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: mainColor, emissive: mainColor, emissiveIntensity: 0.5,
      roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tubeMesh.scale.setScalar(0);
    this.scene.add(tubeMesh);

    gsap.to(tubeMesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "power2.out",
      onUpdate: () => (this.dirty = true),
      onComplete: () => { this.scene.remove(tubeMesh); tubeGeo.dispose(); tubeMat.dispose(); },
    });
    gsap.to(tubeMat, { opacity: 0.88, duration: 0.6, ease: "power2.out",
      onUpdate: () => (this.dirty = true) });
    gsap.to((this.meridianLine.material as THREE.LineBasicMaterial), { opacity: 0.7, duration: 0.6, ease: "power2.out",
      onUpdate: () => (this.dirty = true) });
    gsap.to((this.glowLine.material as THREE.LineBasicMaterial), { opacity: 0.18, duration: 0.6, ease: "power2.out",
      onUpdate: () => (this.dirty = true) });
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async setOrgan(_modelUrl: string, hotspots: Hotspot[], accent: string): Promise<void> {
    this.select(null);
    this.callbacks.onLoading(true, 0);
    this.hotspots.clear();
    this.buildMeridianLine(hotspots, accent);
    this.hotspots.attach(this.bodyGroup, hotspots, []);
    this.hotspots.setPixelSize(DOT_PIXELS, this.height, CAMERA_FOV);
    this.callbacks.onLoading(false, 1);
    this.dirty = true;
  }

  setAutoRotate(value: boolean) {
    this.controls.autoRotate = value;
  }

  setQuizMode(value: boolean) {
    this.quizMode = value;
    this.controls.autoRotate = !value && this.autoRotateWanted;
  }

  setAuthoring(value: boolean) {
    this.authoring = value;
  }

  zoom(_direction: -1 | 1) {
    const d = this.camera.position.clone().sub(this.controls.target);
    const len = d.length();
    const newLen = Math.min(Math.max(len * 0.8, 3), 12);
    gsap.to(d, {
      length: newLen, duration: 0.3, ease: "power2.out",
      onUpdate: () => { this.camera.position.copy(this.controls.target).add(d); this.dirty = true; },
    });
  }

  toggleIsolate() { return false; }
  toggleCrossSection() { return false; }
  toggleLayers() { return false; }

  reset() {
    gsap.to(this.camera.position, { x: HOME_CAMERA.x, y: HOME_CAMERA.y, z: HOME_CAMERA.z, duration: 0.5, ease: "power2.inOut",
      onUpdate: () => (this.dirty = true) });
    gsap.to(this.controls.target, { x: HOME_TARGET.x, y: HOME_TARGET.y, z: HOME_TARGET.z, duration: 0.5, ease: "power2.inOut",
      onUpdate: () => (this.dirty = true) });
  }

  flash(id: string, correct: boolean) {
    this.hotspots.flash(id, correct);
  }

  hotspotScreenY(id: string): number | null {
    const pos = this.hotspots.screenPosition(id, this.camera, this.width, this.height);
    return pos ? pos.y / this.height : null;
  }

  clearSelection() { this.select(null); }

  attachCallout(el: HTMLElement | null) { this.calloutEl = el; }

  setCanvasLabel(_label: string) {
    this.renderer.domElement.setAttribute("aria-label", "Interactive 3D meridian explorer — drag to rotate");
  }

  busy(duration: number) { this.busyUntil = Date.now() + duration * 1000; }

  dispose() {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  private onControlStart = () => { this.interactionUntil = Date.now() + 2000; };
  private onVisibilityChange = () => { if (document.visibilityState === "visible") this.dirty = true; };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.pointerId = e.pointerId;
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.dragged = false;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;
    if (Math.hypot(dx, dy) > 4) this.dragged = true;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.hoverProbe = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
    this.dirty = true;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    if (!this.dragged) this.handleTap(e);
  };

  private onPointerLeave = (_e: PointerEvent) => {
    this.pointerId = null;
    this.hoverProbe = null;
    this.dirty = true;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.select(null);
    if (e.key === "r" || e.key === "R") this.reset();
  };

  private handleTap(e: PointerEvent) {
    if (!this.hoverProbe) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const hit = this.hotspots.pick(x, y, this.camera, rect.width, rect.height);
    if (hit) {
      if (this.quizMode && this.callbacks.onPick) this.callbacks.onPick(hit.hotspot);
      else this.select(hit.hotspot);
    } else {
      this.select(null);
    }
  }

  private select(hotspot: Hotspot | null) {
    this.selectedId = hotspot?.id ?? null;
    this.callbacks.onSelect(hotspot);
    this.dirty = true;
  }

  // ─── Render loop ───────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    requestAnimationFrame(this.animate);
    if (!this.isVisible) return;

    const elapsed = this.clock.getElapsedTime();
    const idle = Date.now() > this.interactionUntil;
    if (idle && this.autoRotateWanted && !this.quizMode) this.controls.autoRotate = true;
    this.controls.update();

    // Hover
    if (this.hoverProbe && !this.quizMode) {
      const hit = this.hotspots.pick(this.hoverProbe.x, this.hoverProbe.y, this.camera, this.width, this.height);
      const newHovered = hit?.hotspot.id ?? null;
      if (newHovered !== this.hoveredId) { this.hoveredId = newHovered; this.dirty = true; }
    }

    // Hotspot animation
    this.hotspots.update(this.camera, this.clock.getDelta(), this.selectedId, this.hoveredId);

    // Callout
    if (this.selectedId && this.calloutEl) {
      const pos = this.hotspots.screenPosition(this.selectedId, this.camera, this.width, this.height);
      if (pos) {
        this.calloutEl.style.left = `${pos.x}px`;
        this.calloutEl.style.top = `${pos.y}px`;
        this.calloutEl.style.display = "";
      }
    } else if (this.calloutEl) {
      this.calloutEl.style.display = "none";
    }

    // Pulse
    if (this.meridianLine && this.glowLine) {
      const pulse = 0.6 + Math.sin(elapsed * 1.5) * 0.15;
      (this.meridianLine.material as THREE.LineBasicMaterial).opacity = pulse;
      (this.glowLine.material as THREE.LineBasicMaterial).opacity = pulse * 0.25;
      this.dirty = true;
    }

    if (this.dirty || Date.now() < this.busyUntil) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  };

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.width = w; this.height = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.hotspots.setPixelSize(DOT_PIXELS, h, CAMERA_FOV);
    this.dirty = true;
  }
}
