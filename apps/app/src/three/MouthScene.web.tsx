import { TOOTH_STATUS, type Tooth } from '@smile/shared';
import { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { Canvas3D } from './Canvas3D';
import { buildMouth, glowSprite } from './mouth';
import { createOrbit, damp, labelLayer, pick, reducedMotion, safeDt, studio } from './teethKit';

export type MouthView = 'front' | 'upper' | 'lower';

type Props = {
  teeth: Tooth[];
  selected: number | null;
  onSelect: (n: number | null) => void;
  view: MouthView;
  style?: StyleProp<ViewStyle>;
};

type Api = { select: (n: number | null) => void; view: (v: MouthView) => void };

const VIEWS: Record<MouthView, { theta: number; phi: number; open: number; r: number }> = {
  front: { theta: 0, phi: 1.32, open: 0.62, r: 1 },
  upper: { theta: 0, phi: 2.05, open: 0.42, r: 0.9 },
  lower: { theta: 0, phi: 0.72, open: 0.42, r: 0.9 },
};

/**
 * Layla's 32 teeth in 3D: both arches on translucent gum, opened like a mouth so every chewing surface shows. Turn with
 * a finger (it glides on and settles); tap a tooth and it lifts out of the arch and glows.
 */
export function MouthScene({ teeth, selected, onSelect, view, style }: Props) {
  const api = useRef<Api | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const initial = useRef({ selected, view });

  useEffect(() => {
    api.current?.select(selected);
  }, [selected]);
  useEffect(() => {
    api.current?.view(view);
  }, [view]);

  return (
    <Canvas3D
      style={style}
      fov={32}
      setup={(stage) => {
        const { scene, camera } = stage;
        const lights = studio(stage, { exposure: 1.02 });
        lights.key.position.set(30, 120, 90);
        const mouth = buildMouth(teeth, { open: VIEWS[initial.current.view].open });
        scene.add(mouth.group);
        const glow = glowSprite();
        glow.visible = false;
        scene.add(glow);

        let fit = 150;
        const orbit = createOrbit(stage, {
          theta: VIEWS[initial.current.view].theta,
          phi: VIEWS[initial.current.view].phi,
          radius: fit,
          minRadius: 60,
          maxRadius: 260,
          minPhi: 0.35,
          maxPhi: 2.45,
          touch: 'pan-y',
          onTap: (ndc) => {
            const hit = pick(ndc, camera, mouth.pickables);
            const n = (hit?.object.userData.fdi as number | undefined) ?? null;
            onSelectRef.current(n === current ? null : n);
          },
        });

        // patient's right is on the viewer's left, as a dentist reads the chart
        const labels = labelLayer(stage);
        const right = labels.add('Rechts', { at: new THREE.Vector3(-36, 0, 22), dx: -8, dy: 0, tone: 'plain' });
        const left = labels.add('Links', { at: new THREE.Vector3(36, 0, 22), dx: 8, dy: 0, tone: 'plain' });
        for (const l of [right, left]) {
          l.opacity = 0.75;
          (l.el.firstChild as HTMLDivElement).style.display = 'none';
          (l.el.children[1] as HTMLDivElement).style.display = 'none';
        }
        const tag = labels.add('', { dx: 26, dy: -34 });
        tag.show = false;

        let current: number | null = null;
        let open = VIEWS[initial.current.view].open;
        let openGoal = open;
        let radiusScale = VIEWS[initial.current.view].r;
        const lifts = new Map<number, number>();
        const centre = new THREE.Vector3(0, 9, 4);
        const tmp = new THREE.Vector3();

        const select = (n: number | null) => {
          current = n;
          if (n === null) {
            tag.show = false;
            glow.visible = false;
            orbit.go({ target: centre, radius: fit * radiusScale });
            return;
          }
          const item = mouth.items.get(n);
          if (!item) return;
          tag.set(String(n), item.status === 'gezond' ? undefined : TOOTH_STATUS[item.status].label);
          tag.show = true;
          tag.follow = item.lift;
          tag.local = new THREE.Vector3(0, item.slot.info.dims.crownH + 3.2, 0);
          // lean the view towards the tooth, without losing the whole mouth
          mouth.crownCentre(n, tmp);
          orbit.go({ target: centre.clone().lerp(tmp, 0.35), radius: fit * 0.96 * radiusScale });
        };
        const setView = (v: MouthView) => {
          const p = VIEWS[v];
          openGoal = p.open;
          radiusScale = p.r;
          orbit.go({ theta: p.theta, phi: p.phi, radius: fit * p.r, target: current ? undefined : centre });
        };
        api.current = { select, view: setView };
        if (initial.current.selected) select(initial.current.selected);

        let t0 = 0;
        return {
          resize: (w, h) => {
            const aspect = w / h;
            const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            // fit the 70 mm wide mouth with a margin
            fit = Math.max(46 / (half * aspect), 48 / half) * 1.1;
            orbit.go({ radius: fit * radiusScale }, t0 === 0);
          },
          update: (t, rawDt) => {
            const dt = safeDt(rawDt);
            t0 = t;
            orbit.update(dt);
            open = damp(open, openGoal, 4, dt);
            mouth.setOpen(open);
            for (const [n, item] of mouth.items) {
              const goal = n === current ? 3.2 : 0;
              const cur = lifts.get(n) ?? 0;
              const next = reducedMotion() ? goal : damp(cur, goal, 7, dt);
              lifts.set(n, next);
              item.lift.position.y = next;
              const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
              for (const m of item.glow) {
                if (item.status === 'aandacht') m.emissiveIntensity = n === current ? 0.55 : 0.2 + 0.3 * pulse;
                else {
                  m.emissive.set('#2DB4E8');
                  m.emissiveIntensity = damp(m.emissiveIntensity, n === current ? 0.22 + 0.1 * pulse : 0, 8, dt);
                }
              }
            }
            if (current !== null) {
              mouth.crownCentre(current, tmp);
              glow.position.copy(tmp);
              glow.visible = true;
              (glow.material as THREE.SpriteMaterial).opacity = 0.55 + 0.25 * Math.sin(t * 3.2);
            }
            labels.update(camera);
          },
          dispose: () => {
            api.current = null;
            orbit.dispose();
            labels.dispose();
            mouth.dispose();
            lights.dispose();
          },
        };
      }}
    />
  );
}
