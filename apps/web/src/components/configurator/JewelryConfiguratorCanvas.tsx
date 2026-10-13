'use client';

/**
 * Client-only assembled jewellery / loose-stone viewer.
 * Authority: technical_design/02 (Three.js + WebGL2, browser only) and
 * technical_design/21 (PBR, no SSR). Stones use BVH gem refraction (ADR-026).
 */
import { useEffect, useRef } from 'react';

import { gemHexFor } from '../../lib/ngc/colors.js';
import { parseGemShape } from '../../lib/ngc/faceted-gem.js';
import { buildRealisticSetting, metalMaterial } from './preview-ring.js';

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
      const { buildGemGeometry, createGemRefractionMaterial, createStudioEnvMap, syncGemRefraction } = await import(
        '../../lib/ngc/gem-refraction.js'
      );
      if (disposed || !hostRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf7f7f5);
      const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.shadowMap.enabled = mode === 'mounted';
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      host.appendChild(renderer.domElement);

      const envMap = createStudioEnvMap();
      const gemMaterials: import('three').ShaderMaterial[] = [];
      const drawingBuffer = new THREE.Vector2();

      if (mode === 'mounted') {
        scene.add(new THREE.HemisphereLight(0xf5f3ff, 0x1a1a1a, 0.45));
        const key = new THREE.DirectionalLight(0xfff7ee, 1.15);
        key.position.set(2.8, 4.2, 3.4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 12;
        key.shadow.radius = 6;
        scene.add(key);
      }

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      if (mode === 'stone') {
        controls.target.set(0, 0.02, 0);
        controls.minDistance = 2.2;
        controls.maxDistance = 5.4;
        camera.position.set(0.7, 1.9, 2.2);
      } else {
        controls.target.set(0, 0.22, 0);
        controls.minDistance = 3.2;
        controls.maxDistance = 7;
        camera.position.set(2.45, 1.65, 3.35);
      }

      const assembly = new THREE.Group();
      scene.add(assembly);
      const cache = new Map<string, import('three').Object3D>();

      function stoneScale(): number {
        const length = stone?.lengthMm && stone.lengthMm > 0 ? stone.lengthMm : null;
        const physical = length
          ? Math.max(0.18, Math.min(length / 10, 1.6))
          : Math.max(0.18, Math.min(0.65 * Math.cbrt(stone?.carat ?? 1), 1.6));
        if (mode === 'mounted') return Math.min(physical * 0.48, 0.34);
        return Math.min(physical * 1.42, 1.02);
      }

      function stoneMesh() {
        const scale = stoneScale();
        const aspect =
          stone?.lengthMm && stone?.widthMm && stone.widthMm > 0 ? stone.lengthMm / stone.widthMm : 1;
        const built = buildGemGeometry(stone?.shape, aspect);
        const absorption = gemHexFor(stone?.color, stone?.stoneType);
        const material = createGemRefractionMaterial({
          envMap,
          geometry: built.geometry,
          absorptionColor: absorption,
          stoneType: stone?.stoneType,
        });
        const mesh = new THREE.Mesh(built.geometry, material);
        material.userData['mesh'] = mesh;
        gemMaterials.push(material);
        mesh.scale.setScalar(scale);
        if (mode === 'stone') mesh.rotation.x = -0.2;
        mesh.castShadow = mode === 'mounted';
        mesh.name = 'center_stone';
        const group = new THREE.Group();
        group.name = 'center_stone';
        group.add(mesh);
        return group;
      }

      function proceduralRing() {
        const round = parseGemShape(stone?.shape) === 'round';
        return buildRealisticSetting(THREE, metal, round ? 6 : 4);
      }

      async function mount() {
        assembly.clear();
        gemMaterials.length = 0;
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
        if (mode === 'mounted') {
          const shadow = new THREE.Mesh(
            new THREE.CircleGeometry(0.55, 48),
            new THREE.ShadowMaterial({ opacity: 0.12 }),
          );
          shadow.rotation.x = -Math.PI / 2;
          shadow.position.y = -0.95;
          shadow.receiveShadow = true;
          assembly.add(shadow);
        }
        if (mode === 'stone') {
          const stamp = document.createElement('canvas');
          stamp.width = 128;
          stamp.height = 128;
          const ctx = stamp.getContext('2d');
          if (ctx) {
            const glow = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
            glow.addColorStop(0, 'rgba(18, 12, 36, 0.18)');
            glow.addColorStop(0.45, 'rgba(18, 12, 36, 0.07)');
            glow.addColorStop(1, 'rgba(18, 12, 36, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, 128, 128);
          }
          const blob = new THREE.Mesh(
            new THREE.PlaneGeometry(1.05, 1.05),
            new THREE.MeshBasicMaterial({
              map: new THREE.CanvasTexture(stamp),
              transparent: true,
              depthWrite: false,
            }),
          );
          blob.rotation.x = -Math.PI / 2;
          blob.position.y = -0.56;
          assembly.add(blob);
          assembly.add(stoneMesh());
        } else {
          if (!root) root = proceduralRing();
          root.traverse((node: import('three').Object3D) => {
            const mesh = node as import('three').Mesh;
            if (mesh.isMesh && mesh.name !== 'center_stone') {
              mesh.material = metalMaterial(THREE, metal);
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
        renderer.getDrawingBufferSize(drawingBuffer);
        for (const material of gemMaterials) syncGemRefraction(material, camera, drawingBuffer);
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      let frame = 0;
      const loop = () => {
        frame = requestAnimationFrame(loop);
        controls.update();
        renderer.getDrawingBufferSize(drawingBuffer);
        for (const material of gemMaterials) syncGemRefraction(material, camera, drawingBuffer);
        renderer.render(scene, camera);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        envMap.dispose();
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
      style={{ width: '100%', height: '100%', minHeight: '100%', borderRadius: 12, overflow: 'hidden', background: '#F7F7F5' }}
    />
  );
}
