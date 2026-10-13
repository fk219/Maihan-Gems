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
  readonly lengthMm?: number | null;
  readonly widthMm?: number | null;
}

export interface JewelryConfiguratorCanvasProps {
  readonly metal: MetalFinish;
  readonly stone: ConfiguratorStone | null;
  readonly glbUrl?: string | null;
  readonly label?: string;
  readonly mode?: 'stone' | 'mounted';
}

const METAL: Record<MetalFinish, { color: number; roughness: number }> = {
  YELLOW_GOLD: { color: 0xc9a84c, roughness: 0.18 },
  WHITE_GOLD: { color: 0xfafaf8, roughness: 0.16 },
  ROSE_GOLD: { color: 0xea580c, roughness: 0.2 },
  PLATINUM: { color: 0x8a867e, roughness: 0.12 },
};

export function JewelryConfiguratorCanvas({
  metal,
  stone,
  glbUrl,
  label = 'Assembled jewellery',
  mode = 'mounted',
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
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
      if (disposed || !hostRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf7f7f5);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
      camera.position.set(0, 0.35, 2.4);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;

      scene.add(new THREE.AmbientLight(0xfafaf8, 0.35));
      const key = new THREE.DirectionalLight(0xe8c96a, 1.4);
      key.position.set(2.4, 4.2, 3.2);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xffffff, 0.7);
      fill.position.set(-2.2, 1.6, 2.4);
      scene.add(fill);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      if (mode === 'stone') {
        controls.target.set(0, 0, 0);
        controls.minDistance = 1.6;
        controls.maxDistance = 4.2;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.4;
        camera.position.set(0.4, 0.32, 2.35);
      } else {
        controls.target.set(0, 0.12, 0);
        controls.minDistance = 1.8;
        controls.maxDistance = 4.4;
        camera.position.set(1.55, 1.15, 2.35);
      }

      const assembly = new THREE.Group();
      scene.add(assembly);
      const cache = new Map<string, import('three').Object3D>();

      function gemMaterial(color: string) {
        return new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0,
          roughness: 0.06,
          transmission: mode === 'stone' ? 0.72 : 0.45,
          thickness: mode === 'stone' ? 0.85 : 0.45,
          ior: 2.42,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          attenuationColor: new THREE.Color(color),
          attenuationDistance: mode === 'stone' ? 0.55 : 0.35,
          specularIntensity: 1,
        });
      }

      function metalMaterial() {
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

      function stoneScale(): number {
        const length = stone?.lengthMm && stone.lengthMm > 0 ? stone.lengthMm : null;
        const raw = length
          ? Math.max(0.18, Math.min(length / 10, 1.6))
          : Math.max(0.18, Math.min(0.65 * Math.cbrt(stone?.carat ?? 1), 1.6));
        return mode === 'mounted' ? Math.min(raw, 0.36) : Math.min(raw, 0.72);
      }

      function stoneMesh() {
        const scale = stoneScale();
        const shape = (stone?.shape ?? 'round').toLowerCase();
        const color = stone?.color ?? '#1E3A8A';
        const material = gemMaterial(color);
        const group = new THREE.Group();
        group.name = 'center_stone';
        const ovalX = stone?.lengthMm && stone?.widthMm && stone.widthMm > 0 ? (stone.lengthMm / stone.widthMm) : 1;

        if (shape.includes('emerald') || shape.includes('radiant') || shape.includes('asscher')) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(scale * 1.05, scale * 0.62, scale * 0.82), material);
          group.add(mesh);
        } else if (shape.includes('pear') || shape.includes('marquise') || shape.includes('heart')) {
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.48, 20, 14), material);
          mesh.scale.set(1, 1.25, 0.85);
          group.add(mesh);
        } else if (shape.includes('cushion') || shape.includes('oval')) {
          const mesh = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.5, 24, 16), material);
          mesh.scale.set(Math.min(ovalX, 1.45), 0.72, 1);
          group.add(mesh);
        } else {
          const pavilion = new THREE.Mesh(new THREE.ConeGeometry(scale * 0.5, scale * 0.58, 16), material);
          pavilion.rotation.x = Math.PI;
          pavilion.position.y = -scale * 0.2;
          const crown = new THREE.Mesh(new THREE.CylinderGeometry(scale * 0.28, scale * 0.5, scale * 0.22, 16), material);
          crown.position.y = scale * 0.16;
          const table = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.26, 16), material);
          table.rotation.x = -Math.PI / 2;
          table.position.y = scale * 0.27;
          group.add(pavilion, crown, table);
        }
        return group;
      }

      function proceduralRing() {
        const group = new THREE.Group();
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.085, 48, 128), metalMaterial());
        band.rotation.x = Math.PI / 2;
        group.add(band);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.18, 24), metalMaterial());
        head.name = 'socket_head';
        head.position.y = 0.18;
        group.add(head);
        for (let i = 0; i < 4; i += 1) {
          const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.22, 8), metalMaterial());
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
          prong.position.set(Math.cos(angle) * 0.11, 0.32, Math.sin(angle) * 0.11);
          group.add(prong);
        }
        const socket = new THREE.Object3D();
        socket.name = 'socket_center_stone';
        socket.position.y = 0.34;
        group.add(socket);
        return group;
      }

      async function mount() {
        assembly.clear();
        let root: import('three').Object3D | null = null;
        if (glbUrl && mode !== 'stone') {
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
        if (mode === 'stone') {
          assembly.add(stoneMesh());
        } else {
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
        env.dispose();
        pmrem.dispose();
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
  }, [metal, stone?.shape, stone?.carat, stone?.color, stone?.lengthMm, stone?.widthMm, glbUrl, mode]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      style={{ width: '100%', height: '100%', minHeight: 320, borderRadius: 12, overflow: 'hidden', background: '#F7F7F5' }}
    />
  );
}
