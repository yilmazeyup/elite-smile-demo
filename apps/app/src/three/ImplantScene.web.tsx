import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { Canvas3D } from './Canvas3D';
import { boundsOf, createOrbit, createReveal, labelLayer, labStage, reducedMotion, safeDt, studio } from './teethKit';
import { abutmentGeometry, abutmentScrewGeometry, anodisedMaterial, ghostMaterial, healingCapGeometry, implantFixtureGeometry, makeCrownCap, titaniumMaterial, toothParts, wireMaterial, wireOf } from './teeth';

/**
 * The implant of the passport, turnable on a dark lab stage. While you drag it, it is a CAD drawing (Floema, SOTM
 * May 2026); let go and the titanium settles back over the lines from the bottom up. What is in Layla's jaw now (the
 * fixture with its healing cap) is solid; what is still to come (the abutment and the crown) floats above as an outline.
 */
export function ImplantScene({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Canvas3D
      style={style}
      fov={28}
      setup={(stage) => {
        const { scene, camera } = stage;
        const lights = studio(stage, { dark: true, exposure: 1.1 });
        lights.key.position.set(40, 70, 60);
        const floor = labStage(scene, { radius: 34, y: -12.5 });
        const reveal = createReveal(scene, { dark: true });
        const clip = [reveal.solid];
        const pivot = new THREE.Group();
        scene.add(pivot);

        const fixture = new THREE.Mesh(implantFixtureGeometry({ diameter: 4.1, length: 10 }), titaniumMaterial({ clip }));
        fixture.castShadow = true;
        const cap = new THREE.Mesh(healingCapGeometry(4.1), titaniumMaterial({ clip, roughness: 0.12, tint: '#D9DDE3' }));
        cap.position.y = 0.6;
        pivot.add(fixture, cap);
        reveal.attach(fixture);
        reveal.attach(cap);

        // still to come: abutment, screw and crown, as outlines above
        const future = new THREE.Group();
        future.position.y = 8.5;
        pivot.add(future);
        const ab = new THREE.Mesh(abutmentGeometry(4.1), anodisedMaterial({ clip }));
        ab.visible = false;
        const abLines = wireOf(ab.geometry, wireMaterial('#E2C48A', 0.55));
        future.add(abLines);
        const screwGeo = abutmentScrewGeometry();
        const screw = wireOf(screwGeo, wireMaterial('#B9C2D0', 0.45));
        screwGeo.dispose();
        screw.position.y = 3 + 7;
        future.add(screw);
        const crown = makeCrownCap(36, ghostMaterial('#8FD3FF', 0.9));
        crown.position.y = 9.5;
        future.add(crown);
        const crownParts = toothParts(36, 'high');
        void crownParts;

        // the labels of the movement
        const labels = labelLayer(stage, { dark: true });
        const lf = labels.add('Implantaat', { follow: fixture, local: new THREE.Vector3(2.3, -7.5, 0), dx: 34, dy: 34, sub: 'Ø 4,1 × 10 mm' });
        const lc = labels.add('Healing cap', { follow: cap, local: new THREE.Vector3(2.4, 1.6, 0), dx: -40, dy: -6, sub: 'nu' });
        const la = labels.add('Opbouw', { follow: future, local: new THREE.Vector3(2.6, 2, 0), dx: 40, dy: 0, sub: 'volgt' });
        const lk = labels.add('Kroon', { follow: crown, local: new THREE.Vector3(5, 4, 0), dx: 40, dy: 4, sub: 'volgt' });
        const all = [lf, lc, la, lk];

        pivot.position.y = -4;
        const orbit = createOrbit(stage, { theta: 0.4, phi: 1.36, radius: 96, minRadius: 46, maxRadius: 140, minPhi: 0.5, maxPhi: 2.3, touch: 'none', idleSpin: 0.22 });
        orbit.go({ target: new THREE.Vector3(0, 3.5, 0) }, true);
        const box = new THREE.Box3();
        return {
          resize: (w, h) => orbit.go({ radius: 96 / Math.min(1, (w / h) * 1.05) }, true),
          update: (t, rawDt) => {
            const dt = safeDt(rawDt);
            orbit.update(dt);
            if (!reducedMotion()) future.position.y = 8.5 + Math.sin(t * 1.1) * 0.5;
            boundsOf(fixture, box).union(boundsOf(cap));
            reveal.update(dt, orbit.dragging, box);
            for (const l of all) l.show = !orbit.dragging;
            labels.update(camera);
          },
          dispose: () => {
            orbit.dispose();
            labels.dispose();
            lights.dispose();
            ab.geometry.dispose();
            (ab.material as THREE.Material).dispose();
            void floor;
          },
        };
      }}
    />
  );
}
