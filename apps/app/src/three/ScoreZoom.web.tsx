import { useEffect, useRef, type ComponentRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';

import { tap } from '../components/ui';
import { tr } from '../i18n';
import { Canvas3D } from './Canvas3D';
import { damp, reducedMotion, safeDt, studio } from './teethKit';
import { contactShadow, enamelMaterial, makeTooth, mulberry, rootMaterial, toothParts } from './teeth';

type Props = {
  /** 0 = the whole tooth, 1 = enamel at micrometre scale. */
  zoom: { current: number };
  onZoom: (z: number) => void;
  onScale: (label: string) => void;
  onBugs: (alive: number, brushed: number) => void;
  style?: StyleProp<ViewStyle>;
};

type Bug = { x: number; y: number; kind: 0 | 1 | 2; a: number; n: number; born: number; gone: number; vx: number; vy: number; hue: number };

/** Scale labels along the zoom: from a centimetre to ten micrometres. */
function scaleLabel(z: number) {
  if (z < 0.3) return '1 cm';
  if (z < 0.6) return '1 mm';
  if (z < 0.84) return '100 µm';
  return '10 µm';
}

/**
 * Oryzo AI's idea (Awwwards SOTM April 2026): zoom into one object until its material becomes a landscape. Here a
 * front tooth: pinch, scroll or slide down to the enamel, where you see its prisms. Linger there and plaque bacteria
 * settle on it, one by one, until you brush them away with your finger.
 */
export function ScoreZoom({ zoom, onZoom, onScale, onBugs, style }: Props) {
  const micro = useRef<ComponentRef<typeof View>>(null);
  const cbs = useRef({ onZoom, onScale, onBugs });
  cbs.current = { onZoom, onScale, onBugs };
  const shared = useRef({ shown: 0 });

  // ------------------------------------------------------------------------------------- the micro layer (2D)
  useEffect(() => {
    const host = micro.current as unknown as HTMLElement | null;
    if (!host) return;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .2s linear;';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 1;
    let H = 1;
    const size = () => {
      W = host.clientWidth;
      H = host.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(host);

    // enamel prisms: a keyhole pattern, drawn once
    const tile = document.createElement('canvas');
    tile.width = tile.height = 512;
    const tg = tile.getContext('2d')!;
    const rnd = mulberry(11);
    tg.fillStyle = '#EFE6D4';
    tg.fillRect(0, 0, 512, 512);
    const r = 22;
    for (let row = -1; row < 14; row++)
      for (let col = -1; col < 14; col++) {
        const x = col * r * 1.75 + (row % 2) * r * 0.875;
        const y = row * r * 1.5;
        const g = tg.createRadialGradient(x - 4, y - 6, 2, x, y, r);
        const tone = 236 - rnd() * 18;
        g.addColorStop(0, `rgb(${tone + 14},${tone + 10},${tone})`);
        g.addColorStop(1, `rgb(${tone - 26},${tone - 32},${tone - 46})`);
        tg.fillStyle = g;
        tg.beginPath();
        // a keyhole: round head, tapering tail
        tg.arc(x, y, r * 0.62, Math.PI * 0.95, Math.PI * 2.05);
        tg.quadraticCurveTo(x + r * 0.5, y + r * 0.7, x, y + r * 1.15);
        tg.quadraticCurveTo(x - r * 0.5, y + r * 0.7, x - r * 0.62, y);
        tg.fill();
        tg.strokeStyle = 'rgba(150,120,80,0.35)';
        tg.lineWidth = 1.2;
        tg.stroke();
      }
    const pattern = ctx.createPattern(tile, 'repeat')!;

    const bugs: Bug[] = [];
    let brushed = 0;
    let linger = 0;
    let spawn = 0;
    let raf = 0;
    let last = performance.now();
    let down = false;
    let px = 0;
    let py = 0;
    let sent = '';
    const rr = mulberry(5);
    const report = () => {
      const alive = bugs.filter((b) => b.gone === 0).length;
      const key = `${alive}|${brushed}`;
      if (key !== sent) {
        sent = key;
        cbs.current.onBugs(alive, brushed);
      }
    };
    const drawBug = (b: Bug, t: number) => {
      const k = b.gone ? Math.max(0, 1 - b.gone / 0.5) : Math.min(1, (t - b.born) / 0.5);
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a + Math.sin(t * 2 + b.hue * 10) * 0.08);
      const s = (0.6 + 0.4 * k) * (W / 380);
      ctx.scale(s, s);
      const fill = b.hue < 0.5 ? ['#A99CFF', '#6E5CE6'] : ['#5FD6BE', '#12A27A'];
      if (b.kind === 1) {
        // a rod
        const g = ctx.createLinearGradient(0, -6, 0, 6);
        g.addColorStop(0, fill[0]);
        g.addColorStop(1, fill[1]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(-16, -6, 32, 12, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,20,90,0.35)';
        ctx.stroke();
      } else {
        // cocci, in a chain or a pair
        const n = b.kind === 0 ? b.n : 2;
        for (let i = 0; i < n; i++) {
          const cx = (i - (n - 1) / 2) * 11;
          const cy = Math.sin(i * 0.9) * 3;
          const g = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 6.5);
          g.addColorStop(0, fill[0]);
          g.addColorStop(1, fill[1]);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath();
          ctx.arc(cx - 2, cy - 2.2, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const z = shared.current.shown;
      const show = THREE.MathUtils.smoothstep(z, 0.8, 0.97);
      canvas.style.opacity = String(show);
      canvas.style.pointerEvents = show > 0.5 ? 'auto' : 'none';
      host.style.touchAction = show > 0.5 ? 'none' : 'pan-y';
      if (show <= 0.001 && !bugs.length) return;
      const t = now / 1000;
      // linger at the deepest zoom and plaque settles
      if (z > 0.965) linger += dt;
      else linger = Math.max(0, linger - dt * 2);
      if (linger > 1.5 && bugs.filter((b) => !b.gone).length < 38) {
        spawn -= dt;
        if (spawn <= 0) {
          spawn = 0.32;
          bugs.push({ x: 20 + rr() * (W - 40), y: 30 + rr() * (H - 60), kind: rr() < 0.55 ? 0 : rr() < 0.6 ? 1 : 2, a: rr() * Math.PI, n: 3 + Math.floor(rr() * 5), born: t, gone: 0, vx: 0, vy: 0, hue: rr() });
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const scale = 0.55 + 0.45 * THREE.MathUtils.smoothstep(z, 0.85, 1);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W / scale, H / scale);
      ctx.restore();
      // a soft biofilm haze grows with the plaque
      const alive = bugs.filter((b) => !b.gone).length;
      ctx.fillStyle = `rgba(232,214,140,${Math.min(0.22, alive * 0.007)})`;
      ctx.fillRect(0, 0, W, H);
      // vignette like a microscope
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(6,13,31,0)');
      v.addColorStop(1, 'rgba(6,13,31,0.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
      for (const b of bugs) {
        if (b.gone) {
          b.gone += dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
        }
        drawBug(b, t);
      }
      for (let i = bugs.length - 1; i >= 0; i--) if (bugs[i].gone > 0.6) bugs.splice(i, 1);
      report();
    };
    raf = requestAnimationFrame(frame);

    const pos = (e: PointerEvent) => {
      const r2 = canvas.getBoundingClientRect();
      return [e.clientX - r2.left, e.clientY - r2.top];
    };
    const onDown = (e: PointerEvent) => {
      down = true;
      [px, py] = pos(e);
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const [x, y] = pos(e);
      const dx = x - px;
      const dy = y - py;
      const len = Math.hypot(dx, dy) || 1;
      let hit = 0;
      for (const b of bugs) {
        if (b.gone) continue;
        // distance from the bug to the stroke
        const t = Math.max(0, Math.min(1, ((b.x - px) * dx + (b.y - py) * dy) / (len * len)));
        const d = Math.hypot(b.x - (px + dx * t), b.y - (py + dy * t));
        if (d < 34) {
          b.gone = 0.0001;
          b.vx = (dx / len) * 420;
          b.vy = (dy / len) * 420;
          brushed++;
          hit++;
        }
      }
      if (hit) tap('select');
      px = x;
      py = y;
    };
    const onUp = () => {
      down = false;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      canvas.remove();
    };
  }, []);

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Canvas3D
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        fov={34}
        setup={(stage) => {
          const { scene, camera, renderer, el } = stage;
          const lights = studio(stage, { exposure: 1.04 });
          lights.key.position.set(30, 80, 120);
          const fdi = 11;
          const parts = toothParts(fdi, 'high');
          const tooth = makeTooth(fdi, { materials: [enamelMaterial({ translucent: true }), rootMaterial()], detail: 'high' });
          const pivot = new THREE.Group();
          pivot.add(tooth);
          scene.add(pivot);
          const centreY = (parts.top + parts.apex) / 2;
          tooth.position.y = -centreY;
          const shadow = contactShadow(16, 12, 0.22);
          shadow.position.y = parts.apex - centreY - 3;
          scene.add(shadow);
          // a point on the labial enamel, where the zoom goes
          const ray = new THREE.Raycaster(new THREE.Vector3(0, parts.top * 0.55 - centreY, 40), new THREE.Vector3(0, 0, -1));
          tooth.updateMatrixWorld(true);
          const hit = ray.intersectObject(tooth.userData.mesh)[0];
          const surface = hit ? hit.point.clone() : new THREE.Vector3(0, parts.top * 0.55 - centreY, 3.3);
          camera.near = 0.02;
          camera.updateProjectionMatrix();
          // pinch and wheel feed the zoom back to the slider
          const canvas = renderer.domElement;
          canvas.style.touchAction = 'pan-y';
          const wheel = (e: WheelEvent) => {
            e.preventDefault();
            cbs.current.onZoom(Math.min(1, Math.max(0, zoom.current - e.deltaY * (e.ctrlKey ? 0.006 : 0.0009))));
          };
          const touches = new Map<number, { x: number; y: number }>();
          let pinch = 0;
          const pd = (e: PointerEvent) => touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const pm = (e: PointerEvent) => {
            if (!touches.has(e.pointerId)) return;
            touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (touches.size === 2) {
              const [a, b] = [...touches.values()];
              const d = Math.hypot(a.x - b.x, a.y - b.y);
              if (pinch) cbs.current.onZoom(Math.min(1, Math.max(0, zoom.current + (d - pinch) / 400)));
              pinch = d;
            }
          };
          const pu = (e: PointerEvent) => {
            touches.delete(e.pointerId);
            if (touches.size < 2) pinch = 0;
          };
          el.addEventListener('wheel', wheel, { passive: false });
          canvas.addEventListener('pointerdown', pd);
          window.addEventListener('pointermove', pm);
          window.addEventListener('pointerup', pu);
          let spin = 0;
          let lastScale = '';
          const target = new THREE.Vector3();
          return {
            update: (t, rawDt) => {
              const dt = safeDt(rawDt);
              const z = reducedMotion() ? zoom.current : damp(shared.current.shown, zoom.current, 6, dt);
              shared.current.shown = z;
              // turn slowly when far, face the camera when zooming in
              const far = 1 - THREE.MathUtils.smoothstep(z, 0.05, 0.35);
              spin += dt * 0.35 * far;
              pivot.rotation.y = damp(pivot.rotation.y, Math.sin(spin) * 0.9 * far, 4, dt);
              const e = Math.pow(z, 1.7);
              const radius = THREE.MathUtils.lerp(64, 1.1, e);
              target.set(0, 0, 0).lerp(surface, THREE.MathUtils.smoothstep(z, 0.05, 0.5));
              camera.position.set(target.x + Math.sin(far * 0.3) * radius * 0.2, target.y + radius * 0.12 * far, target.z + radius);
              camera.lookAt(target);
              const label = scaleLabel(z);
              if (label !== lastScale) {
                lastScale = label;
                cbs.current.onScale(tr(label));
              }
              void t;
            },
            dispose: () => {
              el.removeEventListener('wheel', wheel);
              canvas.removeEventListener('pointerdown', pd);
              window.removeEventListener('pointermove', pm);
              window.removeEventListener('pointerup', pu);
              lights.dispose();
            },
          };
        }}
      />
      <View ref={micro} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none" />
    </View>
  );
}
