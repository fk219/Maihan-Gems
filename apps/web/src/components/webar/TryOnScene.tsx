'use client';

/**
 * Camera try-on. The same procedural ring as the preview is placed on the
 * ring-finger proximal joint. A depth-only cylinder hides the far side of the band.
 * Authority: technical_design/21 §4 and §8. Frames stay in this video element.
 */
import { useEffect, useRef } from 'react';

import { buildProceduralRing, ringOnFinger } from '../configurator/preview-ring.js';
import type { MetalFinish } from '../configurator/JewelryConfiguratorCanvas.js';
import { useHandTracker } from './useHandTracker.js';

export function TryOnScene({
  video,
  metal,
  carat,
}: {
  readonly video: HTMLVideoElement;
  readonly metal: MetalFinish;
  readonly carat: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pose = useHandTracker(video, true);
  const poseRef = useRef(pose);
  poseRef.current = pose;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => undefined;

    void (async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
      if (disposed || !hostRef.current) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
      camera.position.z = 5;

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.add(new THREE.AmbientLight(0xfff6ea, 0.65));
      const key = new THREE.DirectionalLight(0xfff4d2, 1.6);
      key.position.set(1, 2, 3);
      scene.add(key);

      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshBasicMaterial({ map: texture }),
      );
      screen.position.z = -1;
      screen.scale.x = -1;
      scene.add(screen);

      const ring = buildProceduralRing(THREE, { metal, carat, color: '#9fd4ea', occluder: true });
      ring.visible = false;
      scene.add(ring);

      const resize = () => {
        const width = host.clientWidth || 640;
        const height = host.clientHeight || 480;
        const aspect = width / Math.max(height, 1);
        camera.left = -aspect;
        camera.right = aspect;
        camera.top = 1;
        camera.bottom = -1;
        camera.updateProjectionMatrix();
        screen.scale.set(-aspect * 2, 2, 1);
        renderer.setSize(width, height, false);
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(host);

      let frame = 0;
      const loop = () => {
        frame = requestAnimationFrame(loop);
        texture.needsUpdate = true;
        const current = poseRef.current;
        const aspect = (host.clientWidth || 1) / Math.max(host.clientHeight || 1, 1);
        if (current.tracked) {
          const place = ringOnFinger(current, aspect);
          ring.visible = true;
          ring.position.set(place.x, place.y, 0);
          ring.rotation.set(0.4, 0, place.rotationZ);
          ring.scale.setScalar(place.scale);
        } else {
          ring.visible = false;
        }
        renderer.render(scene, camera);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        texture.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [video, metal, carat]);

  return (
    <div className="vto__stage">
      <div ref={hostRef} className="vto__gl" />
      <p className="vto__status">
        {pose.engine === 'unavailable'
          ? 'Hand tracking could not load. The camera stays on this device.'
          : pose.tracked
            ? 'Ring is sitting on your ring finger'
            : 'Hold your ring finger up in the frame'}
      </p>
    </div>
  );
}
