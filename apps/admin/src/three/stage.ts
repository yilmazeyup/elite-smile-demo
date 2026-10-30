import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export type Vec = [number, number, number];

export type StageOptions = {
  camera: Vec;
  target: Vec;
  /** Where the camera flies in from when the scene mounts. */
  intro: Vec;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  /** Panning keeps the focus point inside this box (x/z on the floor), so the model never drifts off screen. */
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number; minY?: number; maxY?: number };
  pan?: boolean;
  /** Narrowest width-to-height ratio at which everything still fits; narrower views zoom out. */
  fitAspect?: number;
  /**
   * Pixels to move the picture's centre to the left (right in Arabic), for a panel that covers one side: the model
   * then sits in the middle of the space that is left. A function of the view's width, for smaller screens.
   */
  shift?: (width: number) => number;
  /** Pixels at the top covered by the header: labels that drift under it fade out. */
  safeTop?: number;
};

export type Frame = (time: number, delta: number) => void;

/** A label that takes part in the overlap check: higher priority wins a crowded spot. */
type Managed = {
  object: CSS2DObject;
  element: HTMLElement;
  priority: () => number;
  /** Hidden beyond this camera distance (metres), so the overview stays calm. */
  far: number;
  /** Always shown, never culled (an alert that must be seen). */
  pinned: () => boolean;
};

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A click, not a drag: the pointer moved less than this many pixels between press and release. */
const CLICK_SLOP = 6;

function shown(object: THREE.Object3D | null): boolean {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/**
 * One WebGL view: renderer, camera with damped orbit/pan/zoom inside limits, soft studio light from a room
 * environment, HTML labels that never pile up, hover, click and double-click on registered objects, and smooth camera
 * flights. Scenes add meshes to `scene` and per-frame work with `onFrame`. It sleeps while the tab is hidden or the
 * view is not on screen, and frees the GPU when disposed.
 */
export class Stage {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Seconds since the stage started; scenes use it for idle animation. */
  time = 0;

  private readonly labelRenderer = new CSS2DRenderer();
  private readonly frames = new Set<Frame>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly resizeObserver: ResizeObserver;
  private readonly visibility: IntersectionObserver;
  private readonly started = performance.now();
  private last = performance.now();
  private raf = 0;
  private onScreen = true;
  /** False while another tab of the panel is showing: nothing is drawn. */
  active = true;

  private flight: { from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; start: number; duration: number } | null;
  private readonly bounds: StageOptions['bounds'];
  private readonly fitAspect: number;
  private readonly shift: StageOptions['shift'];
  private readonly safeTop: number;

  private hoverTargets: THREE.Object3D[] = [];
  private hoverHandler: ((object: THREE.Object3D | null) => void) | null = null;
  private selectHandler: ((object: THREE.Object3D | null) => void) | null = null;
  private doubleHandler: ((object: THREE.Object3D | null, point: THREE.Vector3 | null) => void) | null = null;
  private hovered: THREE.Object3D | null = null;
  private pointerDirty = false;
  private pointerInside = false;
  private press: { x: number; y: number; at: number } | null = null;

  private readonly managed: Managed[] = [];
  private cullAt = 0;
  private frameCount = 0;

  constructor(readonly host: HTMLElement, options: StageOptions) {
    this.bounds = options.bounds;
    this.fitAspect = options.fitAspect ?? 0;
    this.shift = options.shift;
    this.safeTop = options.safeTop ?? 0;
    // A near plane of 0.3 m keeps depth precise at 50 m, so decals on walls never flicker.
    this.camera = new THREE.PerspectiveCamera(options.fov ?? 30, 1, 0.3, 300);
    this.camera.position.set(...options.intro);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    // PCF with a wide radius (set per light) gives the soft, architectural-model shadows.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // People move slowly: the shadows are redrawn every other frame, which halves their cost.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'scene-canvas';
    host.appendChild(this.renderer.domElement);

    this.labelRenderer.domElement.className = 'scene-labels';
    host.appendChild(this.labelRenderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.5;
    pmrem.dispose();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...options.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.8;
    this.controls.enablePan = options.pan ?? true;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = options.minDistance ?? 4;
    this.controls.maxDistance = options.maxDistance ?? 60;
    this.controls.minPolarAngle = options.minPolarAngle ?? 0.25;
    this.controls.maxPolarAngle = options.maxPolarAngle ?? 1.25;
    if (options.minAzimuthAngle !== undefined) this.controls.minAzimuthAngle = options.minAzimuthAngle;
    if (options.maxAzimuthAngle !== undefined) this.controls.maxAzimuthAngle = options.maxAzimuthAngle;
    this.controls.enabled = false;
    this.controls.addEventListener('start', () => {
      this.flight = null;
      this.host.classList.add('grabbing');
    });
    this.controls.addEventListener('end', () => this.host.classList.remove('grabbing'));

    const to = new THREE.Vector3(...options.camera);
    const target = new THREE.Vector3(...options.target);
    this.flight = this.reducedMotion ? null : { from: this.camera.position.clone(), to, fromTarget: target.clone(), toTarget: target, start: performance.now(), duration: 2200 };
    if (this.reducedMotion) {
      this.camera.position.copy(to);
      this.camera.lookAt(target);
      this.controls.enabled = true;
    }

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('dblclick', this.onDoubleClick);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.visibility = new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting;
    });
    this.visibility.observe(host);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  onFrame(frame: Frame): () => void {
    this.frames.add(frame);
    return () => this.frames.delete(frame);
  }

  /**
   * Floating HTML that follows a point in the scene, anchored at its bottom centre. With `priority` it joins the
   * overlap check: when labels would cover each other on screen, the most important one stays.
   */
  label(element: HTMLElement, parent: THREE.Object3D, position: Vec, options: { priority?: () => number; far?: number; pinned?: () => boolean; center?: [number, number] } = {}): CSS2DObject {
    const object = new CSS2DObject(element);
    object.position.set(...position);
    object.center.set(...(options.center ?? [0.5, 1]));
    parent.add(object);
    if (options.priority) this.managed.push({ object, element, priority: options.priority, far: options.far ?? Infinity, pinned: options.pinned ?? (() => false) });
    return object;
  }

  forgetLabel(object: CSS2DObject) {
    const i = this.managed.findIndex((m) => m.object === object);
    if (i >= 0) this.managed.splice(i, 1);
    object.element.remove();
    object.removeFromParent();
  }

  setHoverTargets(targets: THREE.Object3D[], handler: (object: THREE.Object3D | null) => void) {
    this.hoverTargets = targets;
    this.hoverHandler = handler;
    this.pointerDirty = true;
  }

  onSelect(handler: (object: THREE.Object3D | null) => void) {
    this.selectHandler = handler;
  }

  /** A double click: the hover target under the pointer (or null) and the point on the floor that was hit. */
  onDouble(handler: (object: THREE.Object3D | null, point: THREE.Vector3 | null) => void) {
    this.doubleHandler = handler;
  }

  /** Moves the camera and its focus point smoothly. */
  flyTo(position: Vec, target: Vec, duration = 1500) {
    this.flight = {
      from: this.camera.position.clone(),
      to: new THREE.Vector3(...position),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(...target),
      start: performance.now(),
      duration: this.reducedMotion ? 1 : duration,
    };
  }

  get flying() {
    return this.flight !== null;
  }

  /** Distance from the camera to what it looks at: scenes show more detail up close. */
  get distance() {
    return this.camera.position.distanceTo(this.controls.target);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver.disconnect();
    this.visibility.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.controls.dispose();
    disposeTree(this.scene);
    if (this.scene.background instanceof THREE.Texture) this.scene.background.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    canvas.remove();
    this.labelRenderer.domElement.remove();
  }

  resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
    this.camera.aspect = width / height;
    const shift = this.shift?.(width) ?? 0;
    // What has to fit is the space beside the panel: narrower than the fit ratio, the camera zooms out.
    const free = (width - 2 * shift) / height;
    this.camera.zoom = this.fitAspect ? Math.min(1, free / this.fitAspect) : 1;
    // filmOffset slides the frustum sideways, in millimetres of the film: Δleft = near · offset / filmWidth, and a
    // picture moved by `px` pixels needs Δleft = px / width × the frustum's width at the near plane.
    const px = shift * (document.documentElement.dir === 'rtl' ? -1 : 1);
    const filmWidth = this.camera.filmGauge * Math.min(this.camera.aspect, 1);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.filmOffset = (px / width) * ((this.camera.aspect * 2 * tan) / this.camera.zoom) * filmWidth;
    this.camera.updateProjectionMatrix();
  }

  private toPointer(event: { clientX: number; clientY: number }) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  }

  private onVisibility = () => {
    this.last = performance.now();
  };

  private onPointerMove = (event: PointerEvent) => {
    this.toPointer(event);
    this.pointerDirty = true;
    this.pointerInside = true;
  };

  private onPointerLeave = () => {
    this.pointerInside = false;
    this.pointerDirty = true;
  };

  private onPointerDown = (event: PointerEvent) => {
    this.press = { x: event.clientX, y: event.clientY, at: performance.now() };
  };

  private onPointerUp = (event: PointerEvent) => {
    const press = this.press;
    this.press = null;
    if (!press || !this.selectHandler) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_SLOP || performance.now() - press.at > 700) return;
    this.toPointer(event);
    this.selectHandler(this.hit());
  };

  private onDoubleClick = (event: MouseEvent) => {
    if (!this.doubleHandler) return;
    this.toPointer(event);
    const object = this.hit();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    const onFloor = this.raycaster.ray.intersectPlane(floor, point);
    this.doubleHandler(object, onFloor ? point : null);
  };

  private hit(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    for (const hit of this.raycaster.intersectObjects(this.hoverTargets, true)) {
      if (!shown(hit.object)) continue;
      let object: THREE.Object3D | null = hit.object;
      while (object && !this.hoverTargets.includes(object)) object = object.parent;
      if (object) return object;
    }
    return null;
  }

  private pick() {
    if (!this.pointerDirty || !this.hoverHandler) return;
    this.pointerDirty = false;
    const found = this.pointerInside ? this.hit() : null;
    if (found !== this.hovered) {
      this.hovered = found;
      this.hoverHandler(found);
      this.renderer.domElement.style.cursor = found ? 'pointer' : '';
    }
  }

  /** Labels that would cover each other: the most important stays, the rest fade out; far away, details rest. */
  private cull(now: number) {
    if (now < this.cullAt) return;
    this.cullAt = now + 120;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    const distance = this.distance;
    const v = new THREE.Vector3();
    const items = this.managed
      .filter((m) => shown(m.object) && m.object.element.style.display !== 'none')
      .map((m) => {
        m.object.getWorldPosition(v);
        const depth = v.distanceTo(this.camera.position);
        v.project(this.camera);
        const w = m.element.offsetWidth;
        const h = m.element.offsetHeight;
        const x = (v.x * 0.5 + 0.5) * width - w * m.object.center.x;
        const y = (-v.y * 0.5 + 0.5) * height - h * m.object.center.y;
        return { m, rect: [x, y, w, h] as const, depth, behind: v.z > 1, priority: m.pinned() ? 1e6 : m.priority() - depth * 0.01 };
      })
      .sort((a, b) => b.priority - a.priority);
    const placed: (readonly [number, number, number, number])[] = [];
    for (const item of items) {
      const [x, y, w, h] = item.rect;
      const pinned = item.m.pinned();
      // A negative priority means "not showing now" (a name tag waiting for a hover): it takes no room.
      if (!pinned && item.m.priority() < 0) {
        if (item.m.element.dataset.culled !== '1') item.m.element.dataset.culled = '1';
        continue;
      }
      const tooFar = !pinned && distance > item.m.far;
      const overlaps = placed.some(([px, py, pw, ph]) => x < px + pw - 4 && x + w > px + 4 && y < py + ph - 2 && y + h > py + 2);
      // Half off the edge, or under the header: better gone than cut.
      const outside = y < this.safeTop || x < -w * 0.3 || x + w > width + w * 0.3 || y + h > height;
      const hide = item.behind || tooFar || (!pinned && (overlaps || outside));
      if (!hide) placed.push(item.rect);
      if ((item.m.element.dataset.culled === '1') !== hide) item.m.element.dataset.culled = hide ? '1' : '0';
    }
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.onScreen || !this.active || document.hidden) {
      this.last = now;
      return;
    }
    const delta = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time = (now - this.started) / 1000;

    if (this.flight) {
      const t = Math.min(1, (now - this.flight.start) / this.flight.duration);
      const k = easeInOut(t);
      this.camera.position.lerpVectors(this.flight.from, this.flight.to, k);
      this.controls.target.lerpVectors(this.flight.fromTarget, this.flight.toTarget, k);
      this.camera.lookAt(this.controls.target);
      if (t >= 1) {
        this.flight = null;
        this.controls.enabled = true;
      }
    } else {
      this.controls.update(delta);
      if (this.bounds) {
        // Panning stops at the edge of the model; the camera follows its focus so the view does not jump.
        const t = this.controls.target;
        const b = this.bounds;
        const clamped = new THREE.Vector3(
          THREE.MathUtils.clamp(t.x, b.minX, b.maxX),
          THREE.MathUtils.clamp(t.y, b.minY ?? -Infinity, b.maxY ?? Infinity),
          THREE.MathUtils.clamp(t.z, b.minZ, b.maxZ),
        );
        if (!clamped.equals(t)) {
          const shift = clamped.clone().sub(t);
          t.add(shift);
          this.camera.position.add(shift);
        }
      }
    }

    this.pick();
    for (const frame of this.frames) frame(this.time, delta);
    this.renderer.shadowMap.needsUpdate = (this.frameCount++ & 1) === 0;
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.cull(now);
  };
}

/** Frees every geometry, material and texture under `root`. */
export function disposeTree(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
      m.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
}

/** Smoothly moves `current` toward `target`; frame-rate independent. */
export const damp = (current: number, target: number, lambda: number, delta: number) => THREE.MathUtils.damp(current, target, lambda, delta);

/** Turns an angle toward another the short way round, smoothly. */
export function dampAngle(current: number, target: number, lambda: number, delta: number) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * delta));
}

export function el(className: string, html = ''): HTMLDivElement {
  const div = document.createElement('div');
  div.className = className;
  div.innerHTML = html;
  return div;
}
