/**
 * HumanBodyMeridianViewer — loads a real GLB human body and overlays
 * meridian lines + acupoint hotspots on top.
 *
 * Architecture:
 *   GLB body (varvarwork/sculpt) → AnatomyAssetManager (centred, FIT_SIZE)
 *   + Meridian tubes  (per-channel, colour-accented)
 *   + Acupoint dots   (HotspotLayer, same system as AnatomyViewer)
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import gsap from "gsap";
import type { Hotspot } from "../../i18n/merge";
import { HotspotLayer } from "./hotspots";
import { AnatomyAssetManager, type LoadedOrgan } from "./loaders";

type ViewerCallbacks = {
  onLoading: (loading: boolean, progress: number) => void;
  onSelect: (hotspot: Hotspot | null) => void;
  onPick?: (hotspot: Hotspot) => void;
};

const DOT_PIXELS = 42;
const CAMERA_FOV = 34;
const HOME_CAMERA = { x: 0, y: 0.2, z: 5.5 };
const HOME_TARGET = { x: 0, y: 0, z: 0 };
const BODY_URL = "/models/body-male.glb";

export class HumanBodyMeridianViewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  private controls: OrbitControls;
  private hotspots = new HotspotLayer();
  private callbacks: ViewerCallbacks;
  private container: HTMLElement;
  private assets: AnatomyAssetManager;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private clock = new THREE.Clock();
  private dirty = true;
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
  private currentMeridianLine: THREE.Group | null = null;
  private currentMeridianTube: THREE.Mesh | null = null;
  private width = 1;
  private height = 1;
  private isVisible = true;
  private basePixelRatio: number;
  private loadedOrgan: LoadedOrgan | null = null;

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
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute("aria-label", "Interactive 3D meridian explorer on human body");
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);

    this.camera.position.set(HOME_CAMERA.x, HOME_CAMERA.y, HOME_CAMERA.z);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 12;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.target.set(HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z);

    // Minimal lighting — the GLB has baked materials
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffe8cc, 1.8);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xd4e8ff, 0.6);
    fill.position.set(-4, 2, 4);
    this.scene.add(fill);

    this.buildBackground();

    // Asset manager for the GLB body
    this.assets = new AnatomyAssetManager(this.renderer);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => { this.isVisible = entry.isIntersecting; if (this.isVisible) this.dirty = true; },
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

    this.callbacks.onLoading(true, 0);
    this.resize();
    this.animate();
  }

  private buildBackground() {
    // Subtle gradient backdrop
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(256, 200, 0, 256, 256, 380);
    grad.addColorStop(0, "#2a2030");
    grad.addColorStop(0.5, "#1a1520");
    grad.addColorStop(1, "#0d0b12");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = tex;
  }

  private clearMeridianVisuals() {
    if (this.currentMeridianLine) {
      this.scene.remove(this.currentMeridianLine);
      this.currentMeridianLine = null;
    }
    if (this.currentMeridianTube) {
      this.scene.remove(this.currentMeridianTube);
      this.currentMeridianTube.geometry.dispose();
      (this.currentMeridianTube.material as THREE.Material).dispose();
      this.currentMeridianTube = null;
    }
  }

  private buildMeridianVisuals(hotspots: Hotspot[], accent: string) {
    this.clearMeridianVisuals();
    if (hotspots.length < 2) return;

    const sorted = [...hotspots].sort((a, b) => b.position[1] - a.position[1]);
    const points: THREE.Vector3[] = sorted.map(
      (h) => new THREE.Vector3(h.position[0], h.position[1], h.position[2])
    );

    // CatmullRom smooth curve through the acupoints
    const curve = new THREE.CatmullRomCurve3(
      points,
      false,
      "catmullrom",
      0.35,
    );

    // ── Tube mesh (main glowing meridian) ────────────────────────────
    const tubeGeo = new THREE.TubeGeometry(curve, 120, 0.016, 10, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent),
      emissive: new THREE.Color(accent),
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0,
    });
    this.currentMeridianTube = new THREE.Mesh(tubeGeo, tubeMat);

    // ── Line (thin outline) ──────────────────────────────────────────
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(150));
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(accent),
      transparent: true,
      opacity: 0,
    });
    const line = new THREE.Line(lineGeo, lineMat);

    this.currentMeridianLine = new THREE.Group();
    this.currentMeridianLine.add(this.currentMeridianTube);
    this.currentMeridianLine.add(line);
    this.scene.add(this.currentMeridianLine);

    // Animate in with GSAP
    gsap.to(tubeMat, { opacity: 0.92, duration: 0.7, ease: "power2.out",
      onUpdate: () => { this.dirty = true; } });
    gsap.to(lineMat, { opacity: 0.6, duration: 0.7, ease: "power2.out",
      onUpdate: () => { this.dirty = true; } });
  }

  // ─── Public API ───────────────────────────────────────────────────────

  async setOrgan(_modelUrl: string, hotspots: Hotspot[], accent: string): Promise<void> {
    this.callbacks.onLoading(true, 0);

    // Release previous organ
    if (this.loadedOrgan) {
      this.assets.release(this.loadedOrgan);
      this.loadedOrgan = null;
    }
    this.hotspots.clear();
    this.clearMeridianVisuals();

    // Load the GLB human body (only once — cached by AnatomyAssetManager)
    try {
      const organ = await this.assets.load(BODY_URL, (p) => {
        this.callbacks.onLoading(true, p);
      });
      this.loadedOrgan = organ;

      // Detach from previous scene, attach to ours
      if (organ.pivot.parent) organ.pivot.removeFromParent();
      this.scene.add(organ.pivot);

      // Attach hotspots — empty mesh array means dots float at authored positions
      this.hotspots.attach(organ.pivot, hotspots, []);
      this.hotspots.setPixelSize(DOT_PIXELS, this.height, CAMERA_FOV);

      this.callbacks.onLoading(false, 1);
    } catch (e) {
      console.error("Failed to load human body model:", e);
      this.callbacks.onLoading(false, 1);
      return;
    }

    // Build meridian overlay
    this.buildMeridianVisuals(hotspots, accent);
    this.dirty = true;
  }

  setAutoRotate(value: boolean) { this.controls.autoRotate = value; }
  setQuizMode(value: boolean) {
    this.quizMode = value;
    this.controls.autoRotate = !value && this.autoRotateWanted;
  }
  setAuthoring(_value: boolean) {}
  zoom(_direction: -1 | 1) {
    const d = this.camera.position.clone().sub(this.controls.target);
    const newLen = Math.min(Math.max(d.length() * 0.8, 2.5), 12);
    gsap.to(d, { length: newLen, duration: 0.3, ease: "power2.out",
      onUpdate: () => { this.camera.position.copy(this.controls.target).add(d); this.dirty = true; } });
  }
  toggleIsolate() { return false; }
  toggleCrossSection() { return false; }
  toggleLayers() { return false; }
  reset() {
    gsap.to(this.camera.position, { x: HOME_CAMERA.x, y: HOME_CAMERA.y, z: HOME_CAMERA.z, duration: 0.5, ease: "power2.inOut",
      onUpdate: () => { this.dirty = true; } });
    gsap.to(this.controls.target, { x: HOME_TARGET.x, y: HOME_TARGET.y, z: HOME_TARGET.z, duration: 0.5, ease: "power2.inOut",
      onUpdate: () => { this.dirty = true; } });
  }
  flash(id: string, correct: boolean) { this.hotspots.flash(id, correct); }
  hotspotScreenY(id: string): number | null {
    const pos = this.hotspots.screenPosition(id, this.camera, this.width, this.height);
    return pos ? pos.y / this.height : null;
  }
  clearSelection() { this.select(null); }
  attachCallout(el: HTMLElement | null) { this.calloutEl = el; }
  setCanvasLabel(label: string) {
    this.renderer.domElement.setAttribute("aria-label", label);
  }
  busy(_duration: number) {}
  dispose() {
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.assets.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ─── Events ───────────────────────────────────────────────────────────

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
    if (Math.hypot(e.clientX - this.pointerStart.x, e.clientY - this.pointerStart.y) > 4) this.dragged = true;
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

  private onPointerLeave = () => {
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
    const hit = this.hotspots.pick(
      this.hoverProbe.x, this.hoverProbe.y,
      this.camera, rect.width, rect.height
    );
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

  // ─── Render loop ──────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    requestAnimationFrame(this.animate);
    if (!this.isVisible) return;

    this.controls.update();
    this.assets.update(this.clock.getDelta());

    // Hover
    if (this.hoverProbe && !this.quizMode) {
      const hit = this.hotspots.pick(
        this.hoverProbe.x, this.hoverProbe.y,
        this.camera, this.width, this.height
      );
      const newHovered = hit?.hotspot.id ?? null;
      if (newHovered !== this.hoveredId) { this.hoveredId = newHovered; this.dirty = true; }
    }

    // Update hotspot layer (pulse animation, occlusion)
    this.hotspots.update(this.camera, this.clock.getDelta(), this.selectedId, this.hoveredId);

    // Callout positioning
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

    if (this.dirty) {
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
