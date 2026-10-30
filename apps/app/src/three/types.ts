import type { StyleProp, ViewStyle } from 'react-native';
import type * as THREE from 'three';

export type Stage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  el: HTMLElement;
  width: number;
  height: number;
};

export type Scene3D = {
  /** Called every frame with the time in seconds and the step since the last frame. */
  update?: (t: number, dt: number) => void;
  resize?: (width: number, height: number) => void;
  dispose?: () => void;
};

export type Canvas3DProps = {
  setup: (stage: Stage) => Scene3D | void;
  style?: StyleProp<ViewStyle>;
  /** Re-runs setup when this changes. */
  deps?: unknown[];
  alpha?: boolean;
  fov?: number;
};
