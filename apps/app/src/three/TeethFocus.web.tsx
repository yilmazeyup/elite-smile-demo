import type { Tooth } from '@smile/shared';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { Canvas3D } from './Canvas3D';
import { boundsOf, createOrbit, createReveal, damp, labelLayer, reducedMotion, safeDt, studio, type Label } from './teethKit';
import {
  contactShadow,
  enamelMaterial,
  makeBoneBlock,
  makeFillingPatch,
  makeImplant,
  makeSectionFace,
  makeTooth,
  rootMaterial,
  toothParts,
  zirconiaMaterial,
  type SectionStyle,
} from './teeth';

type Props = { tooth: Tooth; cut: boolean; style?: StyleProp<ViewStyle> };

/**
 * One tooth, large: crown and roots in porcelain light, turnable; "doorsnede" slides a cut through it and shows the
 * enamel, dentin, pulp and canals (or, for the implant, the bone and the screw in it). While you turn it, it shows as
 * its CAD drawing (Floema), and settles back into enamel when you let go.
 */
export function TeethFocus({ tooth, cut, style }: Props) {
  // the scene reads the toggle every frame, so it never misses a change
  const cutRef = useRef(cut);
  cutRef.current = cut;

  return (
    <Canvas3D
      style={style}
      fov={30}
      deps={[tooth.n, tooth.status]}
      setup={(stage) => {
        const { scene, camera } = stage;
        const lights = studio(stage, { exposure: 1.04 });
        lights.key.position.set(50, 80, 90);
        const reveal = createReveal(scene);
        // the cut: keeps z ≤ c in the tooth's own frame
        const cutLocal = new THREE.Plane(new THREE.Vector3(0, 0, -1), 30);
        const cutPlane = cutLocal.clone();
        const clip = [reveal.solid, cutPlane];
        const holder = new THREE.Group();
        scene.add(holder);
        const pivot = new THREE.Group();
        holder.add(pivot);
        const isImplant = tooth.status === 'implantaat';
        const upper = Math.floor(tooth.n / 10) === 1 || Math.floor(tooth.n / 10) === 2;
        const left = Math.floor(tooth.n / 10) === 2 || Math.floor(tooth.n / 10) === 3;
        // upper teeth hang crown-down, as in the mouth; left ones are mirror images
        const frame = new THREE.Group();
        frame.scale.set(left ? -1 : 1, upper ? -1 : 1, 1);
        pivot.add(frame);
        const owned: { dispose: () => void }[] = [];
        let section: ReturnType<typeof makeSectionFace> | null = null;
        let block: ReturnType<typeof makeBoneBlock> | null = null;
        const parts = toothParts(tooth.n, 'high');
        const labels = labelLayer(stage);
        const anatomy: { label: Label; cutOnly: boolean }[] = [];

        if (isImplant) {
          block = makeBoneBlock({ width: 22, height: 16, depth: 10, clip: [reveal.solid] });
          block.paint({ hole: 1, integration: 0.15, graft: 0.25 });
          frame.add(block.group);
          const implant = makeImplant({ stage: 'healing', platform: -0.4, clip: [reveal.solid] });
          frame.add(implant);
          implant.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) reveal.attach(o as THREE.Mesh);
          });
          owned.push({ dispose: () => block?.dispose() });
          anatomy.push({ label: labels.add('Healing cap', { follow: implant, local: new THREE.Vector3(2.4, 2.6, 0), dx: 34, dy: -30 }), cutOnly: false });
          anatomy.push({ label: labels.add('Implantaat Ø 4,1 mm', { follow: implant, local: new THREE.Vector3(2.2, -5, 0), dx: 38, dy: 10 }), cutOnly: false });
          anatomy.push({ label: labels.add('Tandvlees', { follow: frame, local: new THREE.Vector3(-8, 2, 0), dx: -30, dy: -36 }), cutOnly: false });
          anatomy.push({ label: labels.add('Kaakbot', { follow: frame, local: new THREE.Vector3(-7, -9, 0), dx: -30, dy: 26 }), cutOnly: false });
        } else {
          const style = tooth.status === 'ontbreekt' ? 'ghost' : tooth.status === 'kroon' ? 'zirconia' : 'natural';
          const mats = style === 'ghost' ? undefined : [style === 'zirconia' ? zirconiaMaterial({ clip }) : enamelMaterial({ clip, translucent: true }), rootMaterial({ clip })];
          const made = makeTooth(tooth.n, { style, materials: mats, detail: 'high' });
          frame.add(made);
          if (style !== 'ghost') reveal.attach(made.userData.mesh);
          if (tooth.status === 'vulling' || tooth.status === 'aandacht') {
            const patch = makeFillingPatch(tooth.n, tooth.status === 'aandacht' ? 'O' : tooth.surfaces ?? 'O', {
              color: tooth.status === 'aandacht' ? '#FFB12E' : '#2DB4E8',
              emissive: 0.35,
              size: tooth.status === 'aandacht' ? 0.45 : 1,
            });
            // the patch shares the tooth's geometry; it is cut and revealed like the tooth
            (patch.material as THREE.MeshPhysicalMaterial).clippingPlanes = clip;
            made.add(patch);
          }
          if (style !== 'ghost') {
            section = makeSectionFace(tooth.n, { clip: [reveal.solid] });
            const st: SectionStyle =
              tooth.status === 'kroon'
                ? { crown: 1, pulp: 'filled' }
                : tooth.status === 'vulling'
                  ? { decay: 0.45, decayRemoved: 1, decayFilled: 1, fillColor: '#8ED6F5' }
                  : tooth.status === 'aandacht'
                    ? { decay: 0.12 }
                    : tooth.status === 'wortelkanaal'
                      ? { pulp: 'filled', access: 1, temporary: 1 }
                      : {};
            section.paint(st);
            made.add(section.mesh);
            owned.push(section);
          }
          const top = parts.top;
          const apex = parts.apex;
          const roots = parts.info.roots;
          anatomy.push({ label: labels.add(tooth.status === 'kroon' ? 'Zirkonia kroon' : 'Kroon', { follow: frame, local: new THREE.Vector3(parts.info.dims.md / 2, top * 0.7, 0), dx: 34, dy: -24 }), cutOnly: false });
          anatomy.push({ label: labels.add(roots === 1 ? 'Wortel' : `${roots} wortels`, { follow: frame, local: new THREE.Vector3(parts.info.dims.mdC / 2 - 0.5, apex * 0.55, 0), dx: 36, dy: 18 }), cutOnly: false });
          if (style !== 'ghost') {
            if (tooth.status !== 'kroon') anatomy.push({ label: labels.add('Glazuur', { follow: frame, local: new THREE.Vector3(-parts.info.dims.md / 2 + 0.6, top * 0.62, 0.05), dx: -34, dy: -30 }), cutOnly: true });
            anatomy.push({ label: labels.add('Tandbeen', { follow: frame, local: new THREE.Vector3(-parts.info.dims.mdC / 2 + 1.2, -1.5, 0.05), dx: -40, dy: 4 }), cutOnly: true });
            anatomy.push({ label: labels.add(tooth.status === 'kroon' ? 'Wortelkanaalvulling' : 'Zenuw (pulpa)', { follow: frame, local: new THREE.Vector3(0.3, top * 0.2, 0.05), dx: 52, dy: 22 }), cutOnly: true });
          }
        }
        // centre the object on the pivot
        const box = boundsOf(frame);
        const c = box.getCenter(new THREE.Vector3());
        frame.position.sub(c);
        const size = box.getSize(new THREE.Vector3());
        const shadowY = -size.y / 2 - 2.5;
        const shadow = contactShadow(size.x * 1.8, size.z * 2.2 + 8, 0.26);
        shadow.position.y = shadowY;
        holder.add(shadow);

        const fitR = Math.max(size.y, size.x) * 2.35 + 10;
        const orbit = createOrbit(stage, {
          theta: isImplant ? 0.35 : 0.55,
          phi: 1.38,
          radius: fitR,
          minRadius: fitR * 0.45,
          maxRadius: fitR * 1.6,
          minPhi: 0.35,
          maxPhi: 2.6,
          touch: 'none',
          idleSpin: 0.12,
        });

        let cutOn = cutRef.current;
        let cutK = cutOn ? 1 : 0;
        const tmpBox = new THREE.Box3();
        const extent = Math.max(size.x, size.z) / 2 + 2;
        return {
          resize: (w, h) => {
            const aspect = w / h;
            orbit.go({ radius: fitR / Math.min(1, aspect * 1.15) }, true);
          },
          update: (t, rawDt) => {
            const dt = safeDt(rawDt);
            if (cutRef.current !== cutOn) {
              cutOn = cutRef.current;
              // turn to face the cut when it opens
              if (cutOn) orbit.go({ theta: 0.15, phi: 1.42 });
            }
            orbit.update(dt);
            cutK = reducedMotion() ? (cutOn ? 1 : 0) : damp(cutK, cutOn ? 1 : 0, 4.5, dt);
            // the cut plane slides in from the front of the tooth to its middle
            cutLocal.constant = THREE.MathUtils.lerp(extent + 6, 0.0, cutK);
            frame.updateMatrixWorld(true);
            const target = isImplant ? null : (frame.children[0] as THREE.Object3D);
            if (target) cutPlane.copy(cutLocal).applyMatrix4(target.matrixWorld);
            // the painted cut face sits inside the solid tooth until the cut reaches it
            if (section) section.mesh.visible = cutK > 0.5;
            // for the implant the bone block is always in section; the cut does nothing
            pivot.position.y = Math.sin(t * 0.8) * 0.25;
            reveal.update(dt, orbit.dragging, boundsOf(pivot, tmpBox));
            for (const a of anatomy) a.label.show = a.cutOnly ? cutK > 0.95 : !orbit.dragging;
            labels.update(camera);
          },
          dispose: () => {
            orbit.dispose();
            labels.dispose();
            lights.dispose();
            for (const o of owned) o.dispose();
          },
        };
      }}
    />
  );
}
