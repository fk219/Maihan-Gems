'use client';

/**
 * Client-only assembled jewellery / loose-stone viewer.
 * Authority: technical_design/02 (Three.js + WebGL2, browser only) and
 * technical_design/21 (PBR, no SSR). Loose stones use faceted gem geometry.
 */
import { useEffect, useRef } from 'react';

import { gemAttenuationHex, gemDispersion, gemIor } from '../../lib/ngc/colors.js';
import { buildFacetedGem, parseGemShape } from '../../lib/ngc/faceted-gem.js';
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
      if (disposed || !hostRef.current) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf7f7f5);
      const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 40);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.86;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);

      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x1a0840);
      const card = (w: number, h: number, color: number, pos: [number, number, number], look = true) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color }));
        mesh.position.set(...pos);
        if (look) mesh.lookAt(0, 0.2, 0);
        envScene.add(mesh);
      };
      card(1.4, 1.4, 0xfff4dd, [2.8, 4.4, 3.6]);
      card(3.6, 5, 0xc9a84c, [5.0, 2.2, 1.2]);
      card(2.8, 4, 0x5b21b6, [-4.4, 2.0, 2.4]);
      card(1.1, 1.1, 0xffffff, [-1.6, 3.2, 4.6]);
      card(10, 10, 0x12062c, [0, -4.2, 0]);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(envScene, 0.04).texture;
      scene.environment = env;
      scene.environmentIntensity = 1.15;

      const key = new THREE.DirectionalLight(0xfff1d6, 1.55);
      key.position.set(2.8, 5.4, 3.4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 12;
      key.shadow.radius = 4;
      scene.add(key);
      scene.add(new THREE.DirectionalLight(0xc4b5fd, 0.7).translateX(-2.8).translateY(2.2).translateZ(2.6));
      const sparkA = new THREE.PointLight(0xffffff, 1.4, 2.8, 2);
      sparkA.position.set(0.62, 0.9, 1.15);
      scene.add(sparkA);
      const sparkB = new THREE.PointLight(0xe8c96a, 1.1, 2.6, 2);
      sparkB.position.set(-0.75, 0.35, 0.95);
      scene.add(sparkB);
      scene.add(new THREE.AmbientLight(0x2a1078, 0.22));

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.7;
      if (mode === 'stone') {
        controls.target.set(0, 0, 0);
        controls.minDistance = 1.6;
        controls.maxDistance = 4.2;
        camera.position.set(0.52, 0.58, 2.28);
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
        return Math.min(physical * 1.28, 1.05);
      }

      function gemMaterial(color: string) {
        const ior = gemIor(stone?.stoneType);
        const body = new THREE.Color(color);
        return new THREE.MeshPhysicalMaterial({
          color: body,
          emissive: body,
          emissiveIntensity: 0.38,
          metalness: 0,
          roughness: 0.14,
          transmission: 0.08,
          thickness: mode === 'stone' ? 2.2 : 1.1,
          ior,
          dispersion: gemDispersion(stone?.stoneType),
          attenuationColor: new THREE.Color(gemAttenuationHex(color, stone?.stoneType)),
          attenuationDistance: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          specularIntensity: 1,
          specularColor: body,
          iridescence: 0.22,
          iridescenceIOR: 1.45,
          iridescenceThicknessRange: [140, 360],
          envMapIntensity: 1.25,
          flatShading: true,
          side: THREE.DoubleSide,
        });
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
        const body = new THREE.Mesh(geometry, gemMaterial(stone?.color ?? '#3A12C2'));
        body.scale.setScalar(scale);
        if (mode === 'stone') body.rotation.x = -0.32;
        body.castShadow = true;
        body.name = 'center_stone';
        const glints: number[] = [];
        for (let i = 0; i < built.positions.length; i += 9) {
          const ax = (built.positions[i]! + built.positions[i + 3]! + built.positions[i + 6]!) / 3;
          const ay = (built.positions[i + 1]! + built.positions[i + 4]! + built.positions[i + 7]!) / 3;
          const az = (built.positions[i + 2]! + built.positions[i + 5]! + built.positions[i + 8]!) / 3;
          glints.push(ax * 1.03, ay * 1.03, az * 1.03);
        }
        const sparkleGeo = new THREE.BufferGeometry();
        sparkleGeo.setAttribute('position', new THREE.Float32BufferAttribute(glints, 3));
        const sparkle = new THREE.Points(
          sparkleGeo,
          new THREE.PointsMaterial({
            color: 0xfff6e8,
            size: 0.016,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
          }),
        );
        sparkle.scale.setScalar(scale);
        sparkle.rotation.copy(body.rotation);
        sparkle.name = 'center_stone_sparkle';
        sparkle.renderOrder = 3;
        const group = new THREE.Group();
        group.name = 'center_stone';
        group.add(body);
        group.add(sparkle);
        return group;
      }

      function proceduralRing() {
        const round = parseGemShape(stone?.shape) === 'round';
        return buildRealisticSetting(THREE, metal, round ? 6 : 4);
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
          new THREE.CircleGeometry(mode === 'stone' ? 0.95 : 1.15, 48),
          new THREE.ShadowMaterial({ opacity: 0.3 }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = mode === 'stone' ? -0.55 : -0.95;
        shadow.receiveShadow = true;
        assembly.add(shadow);
        if (mode === 'stone') {
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
          const points = node as import('three').Points;
          if (mesh.isMesh || points.isPoints) {
            (mesh.geometry ?? points.geometry)?.dispose();
            const material = mesh.material ?? points.material;
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
