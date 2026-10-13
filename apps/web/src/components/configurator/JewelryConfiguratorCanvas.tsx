'use client';

/**
 * Client-only assembled jewellery viewer.
 * Authority: technical_design/02 (Three.js + WebGL2, browser only) and
 * technical_design/21 (one GLB per setting, socket reuse, PBR, no SSR).
 *
 * React Three Fiber is not in the locked stack, so this mounts Three.js directly.
 * When a GLB has empty nodes named socket_center_stone or socket_head, the
 * stone mesh parents to that anchor. Otherwise a procedural ring is shown.
 * Source evidence: no production GLB catalogue exists yet (doc 21, defect D4).
 */
import { useEffect, useRef } from 'react';

export type MetalFinish = 'YELLOW_GOLD' | 'WHITE_GOLD' | 'ROSE_GOLD' | 'PLATINUM';

export interface ConfiguratorStone {
  readonly shape: string;
  readonly carat: number;
  readonly color: string;
}

export interface JewelryConfiguratorCanvasProps {
  readonly metal: MetalFinish;
  readonly stone: ConfiguratorStone | null;
  readonly glbUrl?: string | null;
  readonly label?: string;
}

const METAL: Record<MetalFinish, { color: number; roughness: number }> = {
  YELLOW_GOLD: { color: 0xd4af37, roughness: 0.18 },
  WHITE_GOLD: { color: 0xe6e6ea, roughness: 0.16 },
  ROSE_GOLD: { color: 0xb76e79, roughness: 0.2 },
  PLATINUM: { color: 0xc5c7ce, roughness: 0.12 },
};

export function JewelryConfiguratorCanvas({
  metal,
  stone,
  glbUrl,
  label = 'Assembled jewellery',
}: JewelryConfiguratorCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => undefined;

    void (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      if (disposed || !hostRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf7f3ea);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
      camera.position.set(0, 0.35, 2.4);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xfff6e8, 0.55));
      const key = new THREE.DirectionalLight(0xfff4d8, 2.2);
      key.position.set(2.2, 3.4, 2.6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xc9d4ff, 0.8);
      rim.position.set(-2.4, 1.2, -1.6);
      scene.add(rim);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.minDistance = 1.2;
      controls.maxDistance = 4.2;

      const assembly = new THREE.Group();
      scene.add(assembly);
      const cache = new Map<string, import('three').Object3D>();

      function gemMaterial(color: string) {
        return new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0,
          roughness: 0.04,
          transmission: 0.92,
          thickness: 0.6,
          ior: 2.4,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          attenuationColor: new THREE.Color(color),
          attenuationDistance: 0.35,
        });
      }

      function metalMaterial() {
        const spec = METAL[metal];
        return new THREE.MeshPhysicalMaterial({
          color: spec.color,
          metalness: 1,
          roughness: spec.roughness,
          envMapIntensity: 1.2,
        });
      }

      function stoneMesh() {
        const carat = stone?.carat ?? 1;
        const scale = 0.18 + Math.min(carat, 8) * 0.035;
        const shape = (stone?.shape ?? 'round').toLowerCase();
        const geometry =
          shape.includes('emerald') || shape.includes('radiant')
            ? new THREE.BoxGeometry(scale * 1.15, scale * 0.72, scale * 0.85)
            : shape.includes('pear') || shape.includes('marquise')
              ? new THREE.SphereGeometry(scale * 0.55, 24, 16)
              : new THREE.OctahedronGeometry(scale * 0.55, 0);
        const mesh = new THREE.Mesh(geometry, gemMaterial(stone?.color ?? '#7ec8e3'));
        mesh.name = 'center_stone';
        return mesh;
      }

      function proceduralRing() {
        const group = new THREE.Group();
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 32, 96), metalMaterial());
        band.rotation.x = Math.PI / 2;
        group.add(band);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.16, 16), metalMaterial());
        head.name = 'socket_head';
        head.position.y = 0.16;
        group.add(head);
        const socket = new THREE.Object3D();
        socket.name = 'socket_center_stone';
        socket.position.y = 0.28;
        group.add(socket);
        return group;
      }

      async function mount() {
        assembly.clear();
        let root: import('three').Object3D | null = null;
        if (glbUrl) {
          const cached = cache.get(glbUrl);
          if (cached) {
            root = cached.clone(true);
          } else {
            try {
              const gltf = await new GLTFLoader().loadAsync(glbUrl);
              cache.set(glbUrl, gltf.scene);
              root = gltf.scene.clone(true);
            } catch {
              root = null;
            }
          }
        }
        if (!root) root = proceduralRing();
        root.traverse((node: import('three').Object3D) => {
          const mesh = node as import('three').Mesh;
          if (mesh.isMesh && mesh.name !== 'center_stone') {
            mesh.material = metalMaterial();
          }
        });
        const socket = root.getObjectByName('socket_center_stone') ?? root;
        if (stone) socket.add(stoneMesh());
        assembly.add(root);
      }

      await mount();
      if (disposed) return;

      const resize = () => {
        const width = host.clientWidth || 640;
        const height = host.clientHeight || 420;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      let frame = 0;
      const loop = () => {
        frame = requestAnimationFrame(loop);
        controls.update();
        renderer.render(scene, camera);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        scene.traverse((node: import('three').Object3D) => {
          const mesh = node as import('three').Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            const material = mesh.material;
            if (Array.isArray(material)) material.forEach((item) => item.dispose());
            else material?.dispose();
          }
        });
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [metal, stone?.shape, stone?.carat, stone?.color, glbUrl]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      style={{ width: '100%', height: 440, borderRadius: 12, overflow: 'hidden', background: '#f7f3ea' }}
    />
  );
}
