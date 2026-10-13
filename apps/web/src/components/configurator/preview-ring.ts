import type { MetalFinish } from './JewelryConfiguratorCanvas.js';

type ThreeModule = typeof import('three');

const METAL: Record<MetalFinish, { color: number; roughness: number }> = {
  YELLOW_GOLD: { color: 0xd4af37, roughness: 0.18 },
  WHITE_GOLD: { color: 0xe6e6ea, roughness: 0.16 },
  ROSE_GOLD: { color: 0xb76e79, roughness: 0.2 },
  PLATINUM: { color: 0xc5c7ce, roughness: 0.12 },
};

export function metalMaterial(THREE: ThreeModule, metal: MetalFinish) {
  const spec = METAL[metal];
  return new THREE.MeshPhysicalMaterial({
    color: spec.color,
    metalness: 1,
    roughness: spec.roughness,
    envMapIntensity: 1.35,
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
  });
}

/** Procedural ring used until a GLB with socket_center_stone exists. */
export function buildProceduralRing(
  THREE: ThreeModule,
  options: { metal: MetalFinish; carat: number; color: string; occluder?: boolean },
) {
  const finish = metalMaterial(THREE, options.metal);
  const group = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.085, 48, 128), finish);
  band.rotation.x = Math.PI / 2;
  group.add(band);

  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.18, 24), finish);
  head.name = 'socket_head';
  head.position.y = 0.18;
  group.add(head);

  for (let i = 0; i < 4; i += 1) {
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.22, 8), finish.clone());
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    prong.position.set(Math.cos(angle) * 0.11, 0.32, Math.sin(angle) * 0.11);
    group.add(prong);
  }

  const scale = 0.28 + Math.min(options.carat, 8) * 0.04;
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(scale * 0.62, 1),
    new THREE.MeshPhysicalMaterial({
      color: options.color,
      metalness: 0,
      roughness: 0.04,
      transmission: 0.55,
      thickness: 0.45,
      ior: 2.15,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    }),
  );
  gem.name = 'center_stone';
  gem.position.y = 0.34;
  group.add(gem);

  if (options.occluder) {
    const finger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 1.5, 20),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }),
    );
    finger.name = 'finger_occluder';
    finger.position.y = 0.05;
    finger.renderOrder = 1;
    group.add(finger);
  }

  group.traverse((node) => {
    const mesh = node as import('three').Mesh;
    if (mesh.isMesh && mesh.name !== 'finger_occluder') mesh.renderOrder = 2;
  });
  return group;
}

/** Screen pose from useHandTracker, mirrored to match a front-camera preview. */
export function ringOnFinger(
  pose: { position: { x: number; y: number }; axis: { x: number; y: number }; scale: number },
  aspect: number,
) {
  const displayedX = 1 - pose.position.x;
  return {
    x: (displayedX - 0.5) * 2 * aspect,
    y: (0.5 - pose.position.y) * 2,
    rotationZ: Math.atan2(pose.axis.x, -pose.axis.y),
    scale: Math.min(1.35, Math.max(0.35, pose.scale * 7.5)),
  };
}
