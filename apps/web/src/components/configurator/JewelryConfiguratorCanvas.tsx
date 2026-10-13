'use client';

/**
 * Client-only assembled jewellery / loose-stone viewer.
 * Authority: technical_design/02 (Three.js + WebGL2, browser only) and
 * technical_design/21 (PBR, no SSR). Loose stones use faceted gem geometry.
 */
import { useEffect, useRef } from 'react';

import { gemDispersion, gemIor } from '../../lib/ngc/colors.js';
import { buildFacetedGem, parseGemShape } from '../../lib/ngc/faceted-gem.js';

export type MetalFinish = 'YELLOW_GOLD' | 'WHITE_GOLD' | 'ROSE_GOLD' | 'PLATINUM';

export interface ConfiguratorStone {
  readonly shape: string;
  readonly carat: number;
  readonly color: string;
  readonly lengthMm?: number | null;
  readonly widthMm?: number | null;
  readonly stoneType?: string | null;
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
      if (disposed || !hostRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf7f7f5);
      const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 40);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);

      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0xf4f1ea);
      const card = (w: number, h: number, color: number, pos: [number, number, number], look = true) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color }));
        mesh.position.set(...pos);
        if (look) mesh.lookAt(0, 0.2, 0);
        envScene.add(mesh);
      };
      card(10, 6, 0xffffff, [0, 5.2, 0]);
      card(4, 7, 0xfff6e8, [4.2, 1.8, 2.4]);
      card(3.2, 6, 0xe8c96a, [-4.0, 1.4, -1.6]);
      card(6, 4, 0xfafaf8, [0.4, 1.2, 4.6]);
      card(8, 8, 0xdedad3, [0, -3.2, 0]);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(envScene, 0.03).texture;
      scene.environment = env;
      scene.environmentIntensity = 1.35;

      const key = new THREE.DirectionalLight(0xfff4dd, 2.1);
      key.position.set(2.8, 5.4, 3.4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 12;
      key.shadow.radius = 4;
      scene.add(key);
      scene.add(new THREE.DirectionalLight(0xfafaf8, 0.55).translateX(-2.4).translateY(1.8).translateZ(2.2));
      scene.add(new THREE.AmbientLight(0xf7f7f5, 0.22));

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.7;
      if (mode === 'stone') {
        controls.target.set(0, 0.02, 0);
        controls.minDistance = 1.7;
        controls.maxDistance = 4.4;
        camera.position.set(0.55, 0.62, 2.45);
      } else {
        controls.target.set(0, 0.14, 0);
        controls.minDistance = 1.9;
        controls.maxDistance = 4.6;
        camera.position.set(1.55, 1.2, 2.4);
      }

      const assembly = new THREE.Group();
      scene.add(assembly);
      const cache = new Map<string, import('three').Object3D>();

      function gemMaterial(color: string) {
        const ior = gemIor(stone?.stoneType);
        return new THREE.MeshPhysicalMaterial({
          color,
          metalness: 0,
          roughness: 0.018,
          transmission: 1,
          thickness: mode === 'stone' ? 1.35 : 0.7,
          ior,
          dispersion: gemDispersion(stone?.stoneType),
          attenuationColor: new THREE.Color(color),
          attenuationDistance: mode === 'stone' ? 0.48 : 0.32,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          specularIntensity: 1,
          envMapIntensity: 1.7,
          flatShading: true,
          side: THREE.DoubleSide,
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
        return mode === 'mounted' ? Math.min(raw, 0.38) : Math.min(raw * 1.15, 0.95);
      }

      function stoneMesh() {
        const scale = stoneScale();
        const shapeId = parseGemShape(stone?.shape);
        const aspect =
          stone?.lengthMm && stone?.widthMm && stone.widthMm > 0 ? stone.lengthMm / stone.widthMm : 1;
        const built = buildFacetedGem(shapeId, aspect);
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(built.positions, 3));
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, gemMaterial(stone?.color ?? '#1E3A8A'));
        mesh.scale.setScalar(scale);
        mesh.castShadow = true;
        mesh.name = 'center_stone';
        const group = new THREE.Group();
        group.name = 'center_stone';
        group.add(mesh);
        return group;
      }

      function proceduralRing() {
        const group = new THREE.Group();
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.085, 48, 128), metalMaterial());
        band.rotation.x = Math.PI / 2;
        band.castShadow = true;
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
        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(mode === 'stone' ? 0.85 : 1.05, 48),
          new THREE.ShadowMaterial({ opacity: 0.28 }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = mode === 'stone' ? -0.48 : -0.72;
        shadow.receiveShadow = true;
        assembly.add(shadow);
        if (mode === 'stone') {
          assembly.add(stoneMesh());
        } else {
          if (!root) root = proceduralRing();
          root.traverse((node: import('three').Object3D) => {
            const mesh = node as import('three').Mesh;
            if (mesh.isMesh && mesh.name !== 'center_stone') {
              mesh.material = metalMaterial();
              mesh.castShadow = true;
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
  }, [metal, stone?.shape, stone?.carat, stone?.color, stone?.lengthMm, stone?.widthMm, stone?.stoneType, glbUrl, mode]);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label={label}
      style={{ width: '100%', height: '100%', minHeight: 320, borderRadius: 12, overflow: 'hidden', background: '#F7F7F5' }}
    />
  );
}
