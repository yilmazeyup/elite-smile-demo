import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { tr } from '../i18n';
import type { Stage } from './types';
import { wireMaterial, wireOf } from './teeth';

/**
 * What every tooth scene shares: a soft studio (PMREM room light, a warm key with soft shadows, a cool rim), an orbit
 * with inertia and pinch, tap picking, HTML labels that follow 3D points, and the "Floema" reveal: while you drag, the
 * object shows as a CAD wireframe; when you let go, the rendered material settles back over it from the bottom up.
 */

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  outBack: (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

/** Frame-rate independent smoothing towards a target. */
export const damp = (current: number, target: number, lambda: number, dt: number) => (dt > 0 ? THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * Math.min(dt, 0.1))) : current);

/** The first frames can report a step below zero (the frame clock starts before the setup's); keep it sane. */
export const safeDt = (dt: number) => Math.min(0.05, Math.max(0, dt));

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const segment = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

// ------------------------------------------------------------------------------------------------------- the studio

export type Studio = { key: THREE.DirectionalLight; rim: THREE.DirectionalLight; env: THREE.Texture; dispose: () => void };

export function studio(stage: Stage, opts: { dark?: boolean; shadows?: boolean; exposure?: number; envIntensity?: number } = {}): Studio {
  const { renderer, scene, camera } = stage;
  // scenes are in millimetres: room for a whole mouth at arm's length
  camera.near = 1;
  camera.far = 3000;
  camera.updateProjectionMatrix();
  renderer.localClippingEnabled = true;
  renderer.toneMappingExposure = opts.exposure ?? 1.0;
  renderer.transmissionResolutionScale = 0.5;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.035).texture;
  room.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  scene.environment = env;
  scene.environmentIntensity = opts.envIntensity ?? (opts.dark ? 0.75 : 1);
  const key = new THREE.DirectionalLight(opts.dark ? '#E9F1FF' : '#FFF7EC', opts.dark ? 2.2 : 1.5);
  key.position.set(40, 90, 70);
  if (opts.shadows !== false) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.4;
    key.shadow.radius = 6;
    const c = key.shadow.camera;
    c.left = -60;
    c.right = 60;
    c.top = 60;
    c.bottom = -60;
    c.near = 10;
    c.far = 260;
  }
  const rim = new THREE.DirectionalLight(opts.dark ? '#5FB8FF' : '#BFE3FF', opts.dark ? 1.6 : 0.7);
  rim.position.set(-60, 30, -80);
  const fill = new THREE.HemisphereLight(opts.dark ? '#1B3A6B' : '#FFFFFF', opts.dark ? '#020611' : '#E8E1D6', opts.dark ? 0.35 : 0.45);
  scene.add(key, key.target, rim, fill);
  return { key, rim, env, dispose: () => pmrem.dispose() };
}

// --------------------------------------------------------------------------------------------------------- orbit

export type OrbitOptions = {
  theta?: number;
  phi?: number;
  radius?: number;
  target?: THREE.Vector3;
  minRadius?: number;
  maxRadius?: number;
  minPhi?: number;
  maxPhi?: number;
  minTheta?: number;
  maxTheta?: number;
  /** Capture all touch (full-screen 3D) or only horizontal drags (3D inside a scrolling page). */
  touch?: 'none' | 'pan-y';
  /** Zoom with the mouse wheel (always with a trackpad pinch). */
  wheel?: boolean;
  /** Slow turn when idle (rad/s). */
  idleSpin?: number;
  onTap?: (ndc: THREE.Vector2, e: PointerEvent) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onHover?: (ndc: THREE.Vector2 | null) => void;
};

export type Orbit = {
  theta: number;
  phi: number;
  radius: number;
  target: THREE.Vector3;
  dragging: boolean;
  /** Eases the view to a new place. */
  go: (to: { theta?: number; phi?: number; radius?: number; target?: THREE.Vector3 }, instant?: boolean) => void;
  update: (dt: number) => void;
  dispose: () => void;
  /** Seconds since the last touch. */
  idle: number;
};

export function createOrbit(stage: Stage, opts: OrbitOptions = {}): Orbit {
  const { camera, renderer } = stage;
  const canvas = renderer.domElement;
  canvas.style.touchAction = opts.touch ?? 'none';
  const o: Orbit = {
    theta: opts.theta ?? 0,
    phi: opts.phi ?? 1.2,
    radius: opts.radius ?? 100,
    target: (opts.target ?? new THREE.Vector3()).clone(),
    dragging: false,
    idle: 10,
    go: () => {},
    update: () => {},
    dispose: () => {},
  };
  const goal = { theta: o.theta, phi: o.phi, radius: o.radius, target: o.target.clone() };
  let seeking = false;
  let vTheta = 0;
  let vPhi = 0;
  const pointers = new Map<number, { x: number; y: number }>();
  let down: { x: number; y: number; t: number; moved: number } | null = null;
  let pinch = 0;
  const minR = opts.minRadius ?? o.radius * 0.4;
  const maxR = opts.maxRadius ?? o.radius * 2;
  const minPhi = opts.minPhi ?? 0.15;
  const maxPhi = opts.maxPhi ?? Math.PI - 0.15;
  const ndc = (e: { clientX: number; clientY: number }) => {
    const r = canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const onDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      vTheta = 0;
      vPhi = 0;
    }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
    o.idle = 0;
  };
  const onMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) {
      if (e.pointerType === 'mouse' && opts.onHover && e.target === canvas) opts.onHover(ndc(e));
      return;
    }
    const prev = pointers.get(e.pointerId)!;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    o.idle = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch > 0) {
        o.radius = clamp((o.radius * pinch) / d, minR, maxR);
        goal.radius = o.radius;
      }
      pinch = d;
      return;
    }
    if (!down) return;
    down.moved += Math.abs(dx) + Math.abs(dy);
    if (!o.dragging && down.moved > 6) {
      o.dragging = true;
      seeking = false;
      opts.onDragStart?.();
    }
    if (o.dragging) {
      const w = Math.max(320, canvas.clientWidth);
      vTheta = (-dx / w) * Math.PI * 1.1;
      vPhi = opts.touch === 'pan-y' && e.pointerType === 'touch' ? 0 : (-dy / w) * Math.PI * 0.9;
      o.theta += vTheta;
      o.phi = clamp(o.phi + vPhi, minPhi, maxPhi);
      goal.theta = o.theta;
      goal.phi = o.phi;
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size > 0) return;
    pinch = 0;
    if (down && !o.dragging && down.moved < 7 && performance.now() - down.t < 450 && e.type === 'pointerup') opts.onTap?.(ndc(e), e);
    if (o.dragging) {
      o.dragging = false;
      opts.onDragEnd?.();
    }
    down = null;
  };
  const onWheel = (e: WheelEvent) => {
    if (!opts.wheel && !e.ctrlKey) return;
    e.preventDefault();
    o.radius = clamp(o.radius * Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0012)), minR, maxR);
    goal.radius = o.radius;
    o.idle = 0;
  };
  const onLeave = () => opts.onHover?.(null);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerleave', onLeave);

  o.go = (to, instant) => {
    if (to.theta !== undefined) {
      // the short way round
      const t = to.theta;
      let diff = (t - o.theta) % (Math.PI * 2);
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      goal.theta = o.theta + diff;
    }
    if (to.phi !== undefined) goal.phi = to.phi;
    if (to.radius !== undefined) goal.radius = to.radius;
    if (to.target) goal.target.copy(to.target);
    seeking = true;
    vTheta = 0;
    vPhi = 0;
    if (instant || reducedMotion()) {
      o.theta = goal.theta;
      o.phi = goal.phi;
      o.radius = goal.radius;
      o.target.copy(goal.target);
    }
  };

  const spherical = new THREE.Spherical();
  o.update = (rawDt) => {
    const dt = safeDt(rawDt);
    o.idle += dt;
    if (!o.dragging) {
      o.theta += vTheta;
      o.phi = clamp(o.phi + vPhi, minPhi, maxPhi);
      const k = Math.exp(-dt * 4.2);
      vTheta *= k;
      vPhi *= k;
      if (seeking) {
        o.theta = damp(o.theta, goal.theta, 5, dt);
        o.phi = damp(o.phi, goal.phi, 5, dt);
        o.radius = damp(o.radius, goal.radius, 5, dt);
        o.target.lerp(goal.target, dt > 0 ? 1 - Math.exp(-5 * dt) : 0);
        if (Math.abs(o.theta - goal.theta) + Math.abs(o.phi - goal.phi) + Math.abs(o.radius - goal.radius) < 0.002) seeking = false;
      } else if (opts.idleSpin && o.idle > 4 && !reducedMotion()) o.theta += opts.idleSpin * dt * Math.min(1, (o.idle - 4) / 2);
    }
    if (opts.minTheta !== undefined && opts.maxTheta !== undefined) {
      const lo = opts.minTheta;
      const hi = opts.maxTheta;
      if (o.theta < lo) {
        o.theta = damp(o.theta, lo, 10, dt);
        vTheta *= 0.5;
      }
      if (o.theta > hi) {
        o.theta = damp(o.theta, hi, 10, dt);
        vTheta *= 0.5;
      }
    }
    spherical.set(o.radius, o.phi, o.theta);
    camera.position.setFromSpherical(spherical).add(o.target);
    camera.lookAt(o.target);
  };
  o.dispose = () => {
    canvas.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('pointerleave', onLeave);
  };
  return o;
}

/** The first mesh under a point on screen among `objects`. */
export function pick(ndc: THREE.Vector2, camera: THREE.Camera, objects: THREE.Object3D[]): THREE.Intersection | null {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(objects, true)[0] ?? null;
}

// --------------------------------------------------------------------------------------------------------- labels

export type LabelOptions = { at?: THREE.Vector3; follow?: THREE.Object3D; local?: THREE.Vector3; dx?: number; dy?: number; sub?: string; tone?: 'blue' | 'amber' | 'plain' };

export type Label = {
  el: HTMLDivElement;
  /** World position, or follows an object (plus a local offset). */
  at: THREE.Vector3;
  follow?: THREE.Object3D;
  local?: THREE.Vector3;
  /** Screen offset of the pill from the anchor point, in px. */
  dx: number;
  dy: number;
  opacity: number;
  show: boolean;
  set: (text: string, sub?: string) => void;
};

/**
 * HTML labels over the canvas: a small pill with a thin leader line to a dot on the 3D point, kept in place every
 * frame without React. Text goes through `tr()`.
 */
export function labelLayer(stage: Stage, opts: { dark?: boolean } = {}) {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  stage.el.appendChild(host);
  const labels: Label[] = [];
  const v = new THREE.Vector3();
  const add = (text: string, o: LabelOptions = {}): Label => {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:0;top:0;will-change:transform,opacity;transition:opacity .35s ease;opacity:0;';
    const line = document.createElement('div');
    line.style.cssText = `position:absolute;left:0;top:0;height:1px;transform-origin:0 50%;background:${opts.dark ? 'rgba(160,210,255,.55)' : 'rgba(11,26,58,.28)'};`;
    const dot = document.createElement('div');
    const dotColor = o.tone === 'amber' ? '#FFB12E' : o.tone === 'plain' ? (opts.dark ? '#FFFFFF' : '#0B1A3A') : '#2DB4E8';
    dot.style.cssText = `position:absolute;left:-3.5px;top:-3.5px;width:7px;height:7px;border-radius:4px;background:${dotColor};box-shadow:0 0 0 3px ${opts.dark ? 'rgba(45,180,232,.25)' : 'rgba(255,255,255,.8)'};`;
    const pill = document.createElement('div');
    pill.style.cssText = `position:absolute;left:0;top:0;white-space:nowrap;padding:6px 10px;border-radius:10px;font:600 12px/1.2 Figtree,system-ui,sans-serif;letter-spacing:-.01em;
      color:${opts.dark ? '#EDF2FF' : '#0B1A3A'};background:${opts.dark ? 'rgba(10,20,48,.72)' : 'rgba(255,255,255,.82)'};border:1px solid ${opts.dark ? 'rgba(160,200,255,.22)' : 'rgba(11,26,58,.1)'};
      backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 6px 18px -8px rgba(11,26,58,.35);`;
    el.append(line, dot, pill);
    host.appendChild(el);
    const label: Label = {
      el,
      at: o.at?.clone() ?? new THREE.Vector3(),
      follow: o.follow,
      local: o.local,
      dx: o.dx ?? 28,
      dy: o.dy ?? -26,
      opacity: 1,
      show: true,
      set: (t, sub) => {
        pill.innerHTML = '';
        const a = document.createElement('div');
        a.textContent = tr(t);
        pill.appendChild(a);
        if (sub) {
          const b = document.createElement('div');
          b.textContent = tr(sub);
          b.style.cssText = `font:500 10.5px/1.3 "JetBrains Mono",ui-monospace,monospace;letter-spacing:.04em;opacity:.65;margin-top:2px;text-transform:uppercase;`;
          pill.appendChild(b);
        }
      },
    };
    (label as Label & { line: HTMLDivElement; pill: HTMLDivElement }).line = line;
    (label as Label & { line: HTMLDivElement; pill: HTMLDivElement }).pill = pill;
    label.set(text, o.sub);
    labels.push(label);
    return label;
  };
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const update = (camera: THREE.Camera) => {
    const w = stage.width;
    const h = stage.height;
    for (const l of labels) {
      if (l.follow) {
        v.copy(l.local ?? new THREE.Vector3());
        l.follow.localToWorld(v);
      } else v.copy(l.at);
      v.project(camera);
      const behind = v.z > 1;
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      const dx = rtl ? -l.dx : l.dx;
      const ext = l as Label & { line: HTMLDivElement; pill: HTMLDivElement };
      const pw = ext.pill.offsetWidth;
      const ph = ext.pill.offsetHeight;
      // keep the pill on screen
      let px = x + dx + (dx < 0 ? -pw : 0);
      let py = y + l.dy - ph / 2;
      px = clamp(px, 6, w - pw - 6);
      py = clamp(py, 6, h - ph - 6);
      const ax = px + (dx < 0 ? pw : 0) - x;
      const ay = py + ph / 2 - y;
      l.el.style.transform = `translate3d(${x}px,${y}px,0)`;
      l.el.style.opacity = String(l.show && !behind ? l.opacity : 0);
      ext.pill.style.transform = `translate3d(${px - x}px,${py - y}px,0)`;
      const len = Math.hypot(ax, ay);
      ext.line.style.width = `${len}px`;
      ext.line.style.transform = `rotate(${Math.atan2(ay, ax)}rad)`;
    }
  };
  const dispose = () => host.remove();
  return { add, update, dispose, labels, host };
}

// ---------------------------------------------------------------------------------------------- the Floema reveal

export type Reveal = {
  /** Give these to the solid materials (`clip`) and to the wire lines. */
  solid: THREE.Plane;
  wire: THREE.Plane;
  lines: THREE.Group;
  /** Adds the CAD iso-lines of a mesh (they follow it). */
  attach: (mesh: THREE.Mesh, color?: THREE.ColorRepresentation) => THREE.LineSegments;
  /** Call with the object's world bounds each frame (or when it moves). */
  update: (dt: number, dragging: boolean, bounds: THREE.Box3) => void;
  /** 0 = all wireframe, 1 = all rendered. */
  progress: () => number;
};

/**
 * Floema's idea (Awwwards SOTM May 2026): the object is shown as a CAD drawing while you handle it, and settles into
 * its rendered material when you let go. A horizontal plane sweeps up: below it the solid, above it the wire.
 */
export function createReveal(scene: THREE.Scene, opts: { color?: THREE.ColorRepresentation; dark?: boolean } = {}): Reveal {
  const solid = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
  const wire = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1e4);
  const lines = new THREE.Group();
  scene.add(lines);
  const color = opts.color ?? (opts.dark ? '#5CC8F5' : '#0A63B5');
  const material = wireMaterial(color, opts.dark ? 0.7 : 0.55, [wire]);
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 16;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(45,180,232,0)');
    grad.addColorStop(0.5, 'rgba(45,180,232,0.9)');
    grad.addColorStop(1, 'rgba(45,180,232,0)');
    g.fillStyle = grad;
    g.fillRect(0, 6, 256, 4);
    const t = new THREE.CanvasTexture(c);
    return t;
  })();
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  scan.visible = false;
  scene.add(scan);
  let p = 1;
  let delay = 0;
  let wasDragging = false;
  const attach = (mesh: THREE.Mesh, c?: THREE.ColorRepresentation) => {
    const l = wireOf(mesh.geometry, c ? wireMaterial(c, material.opacity, [wire]) : material);
    mesh.add(l);
    lines.userData[l.uuid] = true;
    return l;
  };
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const update = (rawDt: number, dragging: boolean, bounds: THREE.Box3) => {
    const dt = safeDt(rawDt);
    if (dragging && !wasDragging) delay = 0;
    if (!dragging && wasDragging) delay = 0.12;
    wasDragging = dragging;
    if (reducedMotion()) p = dragging ? 0 : 1;
    else if (dragging) p = Math.max(0, p - dt / 0.28);
    else if (delay > 0) delay -= dt;
    else p = Math.min(1, p + dt / 1.05);
    bounds.getSize(size);
    bounds.getCenter(centre);
    const e = ease.inOut(p);
    const h = THREE.MathUtils.lerp(bounds.min.y - 0.5, bounds.max.y + 0.5, e);
    solid.constant = p >= 1 ? 1e4 : h;
    wire.constant = p >= 1 ? -1e4 : -h;
    scan.visible = p > 0.001 && p < 0.999;
    scan.position.set(centre.x, h, centre.z);
    scan.rotation.x = -Math.PI / 2;
    const s = Math.max(size.x, size.z) * 1.5;
    scan.scale.set(s, s * 0.06, 1);
    (scan.material as THREE.MeshBasicMaterial).opacity = Math.sin(e * Math.PI);
  };
  return { solid, wire, lines, attach, update, progress: () => p };
}

/** Sizes a group's world bounds into a box (reused). */
export function boundsOf(obj: THREE.Object3D, box = new THREE.Box3()) {
  return box.setFromObject(obj);
}

/** A soft pearl floor glow and grid for the dark "lab stage" (GQ × AP Extraordinary Lab). */
export function labStage(scene: THREE.Scene, opts: { radius?: number; y?: number } = {}) {
  const r = opts.radius ?? 60;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(40,90,170,0.55)');
  grad.addColorStop(0.45, 'rgba(18,40,90,0.35)');
  grad.addColorStop(1, 'rgba(6,13,31,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(120,180,255,0.10)';
  g.lineWidth = 1;
  for (let i = 1; i < 9; i++) {
    g.beginPath();
    g.arc(256, 256, i * 28, 0, Math.PI * 2);
    g.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.beginPath();
    g.moveTo(256 + Math.cos(a) * 40, 256 + Math.sin(a) * 40);
    g.lineTo(256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = opts.y ?? 0;
  floor.renderOrder = -2;
  scene.add(floor);
  // a reflective disc under it: a mirrored copy is too heavy; a glossy dark plane catches the env light instead
  const gloss = new THREE.Mesh(
    new THREE.CircleGeometry(r * 0.62, 64),
    new THREE.MeshPhysicalMaterial({ color: '#081430', roughness: 0.18, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  gloss.rotation.x = -Math.PI / 2;
  gloss.position.y = (opts.y ?? 0) - 0.02;
  gloss.renderOrder = -3;
  gloss.receiveShadow = true;
  scene.add(gloss);
  return { floor, gloss };
}
