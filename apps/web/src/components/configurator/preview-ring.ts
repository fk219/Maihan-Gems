import type { MetalFinish } from './JewelryConfiguratorCanvas.js';

type ThreeModule = typeof import('three');

/** Physically based jewellery metals. Yellow gold follows Design.md; others are studio-accurate. */
export const METAL_PBR: Record<MetalFinish, { color: number; roughness: number; envMapIntensity: number }> = {
  YELLOW_GOLD: { color: 0xc9a84c, roughness: 0.16, envMapIntensity: 2.05 },
  WHITE_GOLD: { color: 0xf2f0ea, roughness: 0.12, envMapIntensity: 1.9 },
  ROSE_GOLD: { color: 0xc47a52, roughness: 0.18, envMapIntensity: 1.95 },
  PLATINUM: { color: 0xd7d8dc, roughness: 0.1, envMapIntensity: 2.0 },
};

export function metalMaterial(THREE: ThreeModule, metal: MetalFinish) {
  const spec = METAL_PBR[metal];
  return new THREE.MeshPhysicalMaterial({
    color: spec.color,
    metalness: 1,
    roughness: spec.roughness,
    envMapIntensity: spec.envMapIntensity,
    clearcoat: 0.22,
    clearcoatRoughness: 0.28,
    reflectivity: 1,
  });
}

function comfortFitBand(THREE: ThreeModule, finish: import('three').Material) {
  const major = 0.86;
  const tube = 0.095;
  const geometry = new THREE.TorusGeometry(major, tube, 28, 128);
  const position = geometry.getAttribute('position');
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const angle = Math.atan2(vertex.y, vertex.x);
    const towardHead = Math.max(0, Math.sin(angle));
    const cx = Math.cos(angle) * major;
    const cy = Math.sin(angle) * major;
    const ox = vertex.x - cx;
    const oy = vertex.y - cy;
    const oz = vertex.z;
    const taper = 1 - 0.38 * towardHead * towardHead;
    const inner = ox * cx + oy * cy < 0;
    const comfort = inner ? 0.78 : 1;
    position.setXYZ(i, cx + ox * taper * comfort, cy + oy * taper * comfort, oz * taper);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, finish);
  mesh.castShadow = true;
  mesh.name = 'band';
  return { mesh, major, tube };
}

function prongClaw(
  THREE: ThreeModule,
  finish: import('three').Material,
  angle: number,
  radius: number,
  galleryY: number,
  height: number,
) {
  const group = new THREE.Group();
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, height, 10), finish);
  shaft.position.set(x, galleryY + height * 0.35, z);
  shaft.lookAt(0, galleryY + height + 0.04, 0);
  shaft.rotateX(Math.PI / 2);
  shaft.castShadow = true;
  group.add(shaft);
  const claw = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 10), finish);
  claw.position.set(x * 0.62, galleryY + height * 0.82, z * 0.62);
  claw.scale.set(1, 0.72, 1.15);
  claw.castShadow = true;
  group.add(claw);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.011, 0.04, 8), finish);
  tip.position.set(x * 0.48, galleryY + height * 0.92, z * 0.48);
  tip.lookAt(0, galleryY + height * 0.7, 0);
  tip.rotateX(Math.PI / 2);
  group.add(tip);
  return group;
}

/**
 * Comfort-fit ~2mm band, tapering to a 4- or 6-prong head with claw tips.
 * Socket `socket_center_stone` sits in the basket for the faceted gem.
 */
export function buildRealisticSetting(
  THREE: ThreeModule,
  metal: MetalFinish,
  prongCount: 4 | 6 = 6,
) {
  const finish = metalMaterial(THREE, metal);
  const group = new THREE.Group();
  const { mesh: band, major } = comfortFitBand(THREE, finish);
  group.add(band);

  const galleryY = major + 0.02;
  const gallery = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 12, 48), finish);
  gallery.position.y = galleryY;
  gallery.castShadow = true;
  group.add(gallery);

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.04, 24), finish);
  seat.position.y = galleryY - 0.02;
  group.add(seat);

  for (let i = 0; i < prongCount; i += 1) {
    const angle = (i / prongCount) * Math.PI * 2 + Math.PI / prongCount;
    group.add(prongClaw(THREE, finish, angle, 0.105, galleryY, 0.16));
  }

  const socket = new THREE.Object3D();
  socket.name = 'socket_center_stone';
  socket.position.y = galleryY + 0.045;
  group.add(socket);
  return group;
}

/** Procedural ring used until a GLB with socket_center_stone exists. */
export function buildProceduralRing(
  THREE: ThreeModule,
  options: { metal: MetalFinish; carat: number; color: string; occluder?: boolean },
) {
  const group = buildRealisticSetting(THREE, options.metal, 6);
  const scale = 0.22 + Math.min(options.carat, 8) * 0.03;
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(scale * 0.55, 0),
    new THREE.MeshPhysicalMaterial({
      color: options.color,
      metalness: 0,
      roughness: 0.04,
      transmission: 0.88,
      thickness: 0.55,
      ior: 1.7,
      attenuationColor: new THREE.Color(options.color),
      attenuationDistance: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      flatShading: true,
    }),
  );
  gem.name = 'center_stone';
  const socket = group.getObjectByName('socket_center_stone') ?? group;
  socket.add(gem);

  if (options.occluder) {
    const finger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.74, 1.6, 24),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }),
    );
    finger.name = 'finger_occluder';
    finger.rotation.x = Math.PI / 2;
    finger.position.y = 0;
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
