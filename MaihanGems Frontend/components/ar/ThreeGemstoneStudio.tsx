'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';
import type { WebArAssetRecord } from '@/lib/fixtures/types';

interface ThreeGemstoneStudioProps {
  asset: WebArAssetRecord;
}

type LightingPreset = 'salon' | 'daylight' | 'vault';

function makeTravertineTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e7e2d8';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const wave = Math.sin(y * 0.08) * 8;
    ctx.fillStyle = y % 6 === 0 ? 'rgba(180,170,155,0.22)' : 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, y + wave * 0.2, size, 1.5);
  }

  for (let i = 0; i < 900; i++) {
    const x = (i * 73) % size;
    const y = (i * 41) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(120,112,100,0.12)' : 'rgba(250,248,242,0.18)';
    ctx.fillRect(x, y, 2, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function makeSoftShadowTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, 'rgba(20,18,15,0.42)');
  g.addColorStop(0.55, 'rgba(20,18,15,0.16)');
  g.addColorStop(1, 'rgba(20,18,15,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export default function ThreeGemstoneStudio({ asset }: ThreeGemstoneStudioProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('salon');
  const [autoTurntable, setAutoTurntable] = useState<boolean>(false);
  const [showRingMount, setShowRingMount] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [cameraFeedActive, setCameraFeedActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rendererMode, setRendererMode] = useState<'hardware' | 'software'>('hardware');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sceneControllerRef = useRef<{
    setPreset: (preset: LightingPreset) => void;
    setMountVisible: (visible: boolean) => void;
    resetCamera: () => void;
    setAutoRotate: (enabled: boolean) => void;
    setTransparentBg: (transparent: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    const rendererInfo = dbg ? String(gl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /swiftshader|llvmpipe|softpipe|software/i.test(rendererInfo);
    setRendererMode(isSoftwareGl ? 'software' : 'hardware');

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color('#171614');
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(skyColor, 0.045);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(2.9, 2.2, 3.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0.55, 0);
    controls.minDistance = 1.8;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI * 0.49;

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 3.2);
    keyLight.position.set(3.5, 5.5, 3.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 15;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x2c2623, 0.85);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0xc7d2fe, 1.45);
    rimLight.position.set(-3.5, 2.8, -3.2);
    scene.add(rimLight);

    const travertineTex = makeTravertineTexture(256);
    const plinthGroup = new THREE.Group();

    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0xdfd9ce,
      map: travertineTex,
      bumpMap: travertineTex,
      bumpScale: 0.015,
      roughness: 0.84,
      metalness: 0.04,
    });
    const plinthGeo = new THREE.CylinderGeometry(1.45, 1.58, 0.24, 48);
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = -0.12;
    plinthMesh.receiveShadow = !isSoftwareGl;
    plinthGroup.add(plinthMesh);

    const brassBezelMat = new THREE.MeshStandardMaterial({
      color: 0xb89758,
      roughness: 0.32,
      metalness: 0.88,
    });
    const bezelGeo = new THREE.TorusGeometry(1.46, 0.022, 16, 64);
    const bezelMesh = new THREE.Mesh(bezelGeo, brassBezelMat);
    bezelMesh.rotation.x = Math.PI / 2;
    bezelMesh.position.y = -0.01;
    plinthGroup.add(bezelMesh);

    const shadowTex = makeSoftShadowTexture(128);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.85, 1.85),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.003;
    plinthGroup.add(contactShadow);

    scene.add(plinthGroup);

    const subjectGroup = new THREE.Group();
    scene.add(subjectGroup);

    const gemColorHex =
      asset.kind === 'setting' ? asset.secondaryColorHex : asset.primaryColorHex;
    const gemColor = new THREE.Color(gemColorHex || '#2e4583');
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: gemColor,
      roughness: 0.06,
      metalness: 0.02,
      transmission: isSoftwareGl ? 0.55 : 0.88,
      ior: asset.ior || 1.76,
      thickness: 1.6,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      flatShading: true,
    });

    const gemAssembly = new THREE.Group();
    gemAssembly.position.y = 0.88;

    const facetSegments =
      asset.cutGeometry === 'octagon'
        ? 8
        : asset.cutGeometry === 'cushion'
        ? 12
        : 16;

    const crownGeo = new THREE.CylinderGeometry(0.46, 0.68, 0.24, facetSegments, 1);
    const crownMesh = new THREE.Mesh(crownGeo, gemMat);
    crownMesh.position.y = 0.16;
    crownMesh.castShadow = !isSoftwareGl;
    gemAssembly.add(crownMesh);

    const girdleGeo = new THREE.CylinderGeometry(0.68, 0.68, 0.08, facetSegments, 1);
    const girdleMesh = new THREE.Mesh(girdleGeo, gemMat);
    girdleMesh.position.y = 0.0;
    gemAssembly.add(girdleMesh);

    const pavilionGeo = new THREE.ConeGeometry(0.68, 0.56, facetSegments, 1);
    const pavilionMesh = new THREE.Mesh(pavilionGeo, gemMat);
    pavilionMesh.rotation.x = Math.PI;
    pavilionMesh.position.y = -0.32;
    pavilionMesh.castShadow = !isSoftwareGl;
    gemAssembly.add(pavilionMesh);

    const coreMat = new THREE.MeshStandardMaterial({
      color: gemColor.clone().offsetHSL(0.02, 0.1, 0.12),
      roughness: 0.15,
      metalness: 0.35,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), coreMat);
    coreMesh.scale.set(1, 0.65, 1);
    coreMesh.position.y = -0.05;
    gemAssembly.add(coreMesh);

    subjectGroup.add(gemAssembly);

    const ringMountGroup = new THREE.Group();
    const platinumMat = new THREE.MeshStandardMaterial({
      color: 0xe6e8ec,
      roughness: 0.18,
      metalness: 0.92,
    });
    const warmGoldGalleryMat = new THREE.MeshStandardMaterial({
      color: 0xc8a96a,
      roughness: 0.26,
      metalness: 0.86,
    });

    const shankGeo = new THREE.TorusGeometry(0.52, 0.065, 20, 64);
    const shankMesh = new THREE.Mesh(shankGeo, platinumMat);
    shankMesh.position.y = 0.34;
    shankMesh.castShadow = !isSoftwareGl;
    ringMountGroup.add(shankMesh);

    const galleryRailGeo = new THREE.TorusGeometry(0.56, 0.032, 16, 32);
    const galleryRailMesh = new THREE.Mesh(galleryRailGeo, warmGoldGalleryMat);
    galleryRailMesh.rotation.x = Math.PI / 2;
    galleryRailMesh.position.y = 0.72;
    ringMountGroup.add(galleryRailMesh);

    const colletGeo = new THREE.TorusGeometry(0.38, 0.035, 16, 32);
    const colletMesh = new THREE.Mesh(colletGeo, platinumMat);
    colletMesh.rotation.x = Math.PI / 2;
    colletMesh.position.y = 0.56;
    ringMountGroup.add(colletMesh);

    const clawAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    clawAngles.forEach((angle) => {
      const clawPivot = new THREE.Group();
      clawPivot.rotation.y = angle;

      const clawStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.024, 0.54, 12),
        platinumMat
      );
      clawStem.position.set(0.56, 0.78, 0);
      clawStem.rotation.z = 0.24;
      clawPivot.add(clawStem);

      const clawTip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), platinumMat);
      clawTip.position.set(0.49, 1.03, 0);
      clawPivot.add(clawTip);

      ringMountGroup.add(clawPivot);
    });

    subjectGroup.add(ringMountGroup);

    let disposed = false;
    let rafId = 0;
    let dirty = true;
    let autoRotateActive = false;

    function draw() {
      rafId = 0;
      if (disposed) return;

      if (autoRotateActive) {
        subjectGroup.rotation.y += 0.008;
        dirty = true;
      }

      const controlsMoved = controls.update();
      renderer.render(scene, camera);

      if (controlsMoved || autoRotateActive) {
        afterDraw();
      } else {
        dirty = false;
      }
    }

    function requestRender() {
      if (disposed || rafId) return;
      dirty = true;
      rafId = requestAnimationFrame(draw);
    }

    function afterDraw() {
      if (disposed || !dirty) return;
      if (isSoftwareGl) {
        window.setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(draw);
        }, 16);
      } else {
        rafId = requestAnimationFrame(draw);
      }
    }

    controls.addEventListener('change', requestRender);

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    sceneControllerRef.current = {
      setPreset: (preset: LightingPreset) => {
        if (preset === 'salon') {
          keyLight.color.setHex(0xfff1e0);
          keyLight.intensity = 3.2;
          hemiLight.intensity = 0.85;
          skyColor.set('#171614');
        } else if (preset === 'daylight') {
          keyLight.color.setHex(0xffffff);
          keyLight.intensity = 3.8;
          hemiLight.intensity = 1.25;
          skyColor.set('#22252a');
        } else {
          keyLight.color.setHex(0xffdfba);
          keyLight.intensity = 2.5;
          hemiLight.intensity = 0.45;
          skyColor.set('#0d0d0c');
        }
        if (scene.background) {
          scene.background = skyColor.clone();
          scene.fog = new THREE.FogExp2(skyColor, 0.045);
        }
        requestRender();
      },
      setMountVisible: (visible: boolean) => {
        ringMountGroup.visible = visible;
        requestRender();
      },
      resetCamera: () => {
        camera.position.set(2.9, 2.2, 3.6);
        controls.target.set(0, 0.55, 0);
        subjectGroup.rotation.set(0, 0, 0);
        controls.update();
        requestRender();
      },
      setAutoRotate: (enabled: boolean) => {
        autoRotateActive = enabled;
        if (enabled) requestRender();
      },
      setTransparentBg: (transparent: boolean) => {
        if (transparent) {
          scene.background = null;
          scene.fog = null;
          plinthGroup.visible = false;
        } else {
          scene.background = skyColor.clone();
          scene.fog = new THREE.FogExp2(skyColor, 0.045);
          plinthGroup.visible = true;
        }
        requestRender();
      },
    };

    requestRender();

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      pmrem.dispose();
      travertineTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
    };
  }, [asset]);

  const handlePresetChange = (preset: LightingPreset) => {
    setLightingPreset(preset);
    sceneControllerRef.current?.setPreset(preset);
  };

  const handleToggleMount = () => {
    const next = !showRingMount;
    setShowRingMount(next);
    sceneControllerRef.current?.setMountVisible(next);
  };

  const handleToggleTurntable = () => {
    const next = !autoTurntable;
    setAutoTurntable(next);
    sceneControllerRef.current?.setAutoRotate(next);
  };

  const handleResetCamera = () => {
    sceneControllerRef.current?.resetCamera();
  };

  const handleToggleCameraTryOn = async () => {
    setCameraError(null);
    if (cameraFeedActive) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraFeedActive(false);
      sceneControllerRef.current?.setTransparentBg(false);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera try-on is not supported in this browser context.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraFeedActive(true);
      sceneControllerRef.current?.setTransparentBg(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Camera permission was declined or unavailable. Remaining in 3D Studio mode.';
      setCameraError(msg);
      setCameraFeedActive(false);
      sceneControllerRef.current?.setTransparentBg(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] min-h-[560px] bg-[#171614] overflow-hidden select-none">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
          cameraFeedActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        aria-label={`Interactive 3D view of ${asset.title}`}
      />

      <div className="absolute top-4 left-4 z-10 max-w-xs bg-[#141413]/92 border border-[#2E2D2A] text-[#F8F7F4] p-4 rounded-sm pointer-events-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#B89758]">
          {asset.assetId} · SKU {asset.sku} · RI {asset.ior.toFixed(3)}
        </p>
        <h2 className="font-serif text-xl mt-1 leading-tight">{asset.title}</h2>
        <p className="text-xs text-[#C7C3B8] mt-1 font-mono tabular-nums">
          {asset.caratOrScale.toFixed(2)} ct · {asset.dimensionsMm} · {asset.cutGeometry}
        </p>
        <p className="text-[11px] text-[#9A968C] mt-1">{asset.calibrationNote}</p>
        {cameraError && (
          <p
            role="status"
            className="mt-2 text-xs text-[#F59E0B] border-t border-[#2E2D2A] pt-2"
          >
            {cameraError}
          </p>
        )}
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[94%] max-w-2xl bg-[#141413]/94 border border-[#2E2D2A] text-[#F8F7F4] rounded-sm shadow-lg pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2E2D2A]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#C7C3B8]">
              Optical Inspection Controls
            </span>
            <span className="font-mono text-[11px] text-[#9A968C] hidden sm:inline">
              Drag to orbit · Scroll to zoom ({rendererMode} GL)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#C7C3B8] hover:text-white px-2 py-1"
            aria-expanded={!dockCollapsed}
          >
            {dockCollapsed ? (
              <>
                Expand <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Minimize <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {!dockCollapsed && (
          <div className="p-3 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5" role="group" aria-label="Lighting environment">
              {(['salon', 'daylight', 'vault'] as LightingPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  aria-pressed={lightingPreset === preset}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-colors ${
                    lightingPreset === preset
                      ? 'bg-[#1E3A5F] border-[#3B6998] text-white'
                      : 'bg-[#1E1D1B] border-[#2E2D2A] text-[#C7C3B8] hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleMount}
                aria-pressed={showRingMount}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-colors ${
                  showRingMount
                    ? 'bg-[#262522] border-[#B89758] text-[#F8F7F4]'
                    : 'bg-[#1E1D1B] border-[#2E2D2A] text-[#C7C3B8]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                {showRingMount ? 'Setting: On' : 'Loose Stone'}
              </button>

              <button
                type="button"
                onClick={handleToggleTurntable}
                aria-pressed={autoTurntable}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-colors ${
                  autoTurntable
                    ? 'bg-[#262522] border-[#B89758] text-[#F8F7F4]'
                    : 'bg-[#1E1D1B] border-[#2E2D2A] text-[#C7C3B8]'
                }`}
              >
                {autoTurntable ? 'Turntable: On' : 'Turntable: Off'}
              </button>

              <button
                type="button"
                onClick={handleToggleCameraTryOn}
                aria-pressed={cameraFeedActive}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm border transition-colors ${
                  cameraFeedActive
                    ? 'bg-[#15803D] border-[#22C55E] text-white'
                    : 'bg-[#1E1D1B] border-[#2E2D2A] text-[#C7C3B8] hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {cameraFeedActive ? 'Exit AR Camera' : 'AR Camera Try-On'}
              </button>

              <button
                type="button"
                onClick={handleResetCamera}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm bg-[#1E1D1B] border border-[#2E2D2A] text-[#C7C3B8] hover:text-white"
                title="Reset camera orientation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
