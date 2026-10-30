import type { ExplainerId } from '@smile/shared';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { Canvas3D } from './Canvas3D';
import { buildExplainer } from './explainScenes';
import { boundsOf, createOrbit, createReveal, damp, labelLayer, labStage, reducedMotion, safeDt, studio } from './teethKit';

type Props = {
  id: ExplainerId;
  /** Continuous progress, 0 … steps − 1 (read every frame, so the scrubber never re-renders the scene). */
  progress: { current: number };
  style?: StyleProp<ViewStyle>;
  onDrag?: (dragging: boolean) => void;
};

/**
 * A 3D explainer on a dark, reflective lab stage. The scene follows the scrubber with a little easing; drag to look
 * around (the object turns into its CAD drawing while you hold it, Floema-style) and it settles back when you let go.
 */
export function ExplainScene({ id, progress, style, onDrag }: Props) {
  const dragCb = useRef(onDrag);
  dragCb.current = onDrag;
  return (
    <Canvas3D
      style={style}
      fov={30}
      deps={[id]}
      setup={(stage) => {
        const { scene, camera } = stage;
        const lights = studio(stage, { dark: true, exposure: 1.08 });
        lights.key.position.set(50, 90, 70);
        const stageFloor = labStage(scene, { radius: 70, y: -22 });
        const reveal = createReveal(scene, { dark: true });
        const labels = labelLayer(stage, { dark: true });
        const ex = buildExplainer(id, { scene, reveal, labels });
        const v = ex.view;
        let wasDragging = false;
        const orbit = createOrbit(stage, {
          theta: v.theta,
          phi: v.phi,
          radius: v.radius,
          target: v.target,
          minRadius: v.radius * 0.45,
          maxRadius: v.radius * 1.8,
          minPhi: 0.4,
          maxPhi: 2.5,
          touch: 'none',
        });
        let shown = progress.current;
        const box = new THREE.Box3();
        let fit = 1;
        let lastView = '';
        return {
          resize: (w, h) => {
            fit = 1 / Math.min(1, (w / h) * 1.05);
            orbit.go({ radius: v.radius * fit }, true);
          },
          update: (t, rawDt) => {
            const dt = safeDt(rawDt);
            shown = reducedMotion() ? progress.current : damp(shown, progress.current, 6, dt);
            ex.set(shown, t);
            // some stories need the camera to move along (the exploded implant)
            const va = ex.viewAt?.(shown);
            if (va && !orbit.dragging) {
              const key = `${(va.radius ?? 0).toFixed(1)}|${va.target?.y.toFixed(1) ?? ''}|${va.phi?.toFixed(2) ?? ''}`;
              if (key !== lastView) {
                lastView = key;
                orbit.go({ radius: va.radius ? va.radius * fit : undefined, target: va.target, phi: va.phi });
              }
            }
            orbit.update(dt);
            if (orbit.dragging !== wasDragging) {
              wasDragging = orbit.dragging;
              dragCb.current?.(orbit.dragging);
            }
            reveal.update(dt, orbit.dragging, boundsOf(ex.root, box));
            if (orbit.dragging) for (const l of labels.labels) l.show = false;
            labels.update(camera);
          },
          dispose: () => {
            orbit.dispose();
            labels.dispose();
            lights.dispose();
            ex.dispose();
            void stageFloor;
          },
        };
      }}
    />
  );
}
