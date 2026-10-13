'use client';

/**
 * On-device hand tracking for ring placement.
 * Authority: technical_design/21 §4. Frames never leave the device.
 * MediaPipe WASM is loaded only after the user starts the camera.
 * React Three Fiber is not used; callers map the pose into their own scene.
 */
import { useEffect, useRef, useState } from 'react';

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface HandPose {
  readonly tracked: boolean;
  readonly handedness: 'Left' | 'Right' | 'Unknown';
  /** Ring-finger proximal segment, normalised image space, y-down. */
  readonly position: Vec3;
  /** Unit axis from MCP (13) toward PIP (14). */
  readonly axis: Vec3;
  /** Phalanx length in normalised image units, smoothed. */
  readonly scale: number;
}

const RING_MCP = 13;
const RING_PIP = 14;

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface Landmarker {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => {
    landmarks?: Landmark[][];
    handednesses?: { categoryName?: string }[][];
  };
  close?: () => void;
}

function smoothingAlpha(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / Math.max(dt, 1e-4));
}

class OneEuro {
  private ready = false;
  private x = 0;
  private dx = 0;
  private t = 0;

  constructor(
    private readonly minCutoff = 1.2,
    private readonly beta = 0.04,
    private readonly dCutoff = 1,
  ) {}

  filter(value: number, time: number): number {
    if (!this.ready) {
      this.ready = true;
      this.x = value;
      this.t = time;
      return value;
    }
    const dt = Math.max(time - this.t, 1e-3);
    const derivative = (value - this.x) / dt;
    const derivativeHat = smoothingAlpha(dt, this.dCutoff) * derivative + (1 - smoothingAlpha(dt, this.dCutoff)) * this.dx;
    const cutoff = this.minCutoff + this.beta * Math.abs(derivativeHat);
    const next = smoothingAlpha(dt, cutoff) * value + (1 - smoothingAlpha(dt, cutoff)) * this.x;
    this.x = next;
    this.dx = derivativeHat;
    this.t = time;
    return next;
  }
}

async function createLandmarker(): Promise<Landmarker | null> {
  try {
    const specifier = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/+esm';
    const vision = (await import(/* webpackIgnore: true */ specifier)) as {
      FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
      HandLandmarker: {
        createFromOptions: (fileset: unknown, options: unknown) => Promise<Landmarker>;
      };
    };
    const files = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm',
    );
    return await vision.HandLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  } catch {
    return null;
  }
}

const EMPTY: HandPose = {
  tracked: false,
  handedness: 'Unknown',
  position: { x: 0.5, y: 0.5, z: 0 },
  axis: { x: 0, y: -1, z: 0 },
  scale: 0.08,
};

export function useHandTracker(video: HTMLVideoElement | null, active: boolean): HandPose & { readonly engine: 'mediapipe' | 'unavailable' } {
  const [pose, setPose] = useState<HandPose & { engine: 'mediapipe' | 'unavailable' }>({ ...EMPTY, engine: 'unavailable' });
  const landmarkerRef = useRef<Landmarker | null>(null);
  const filters = useRef({
    x: new OneEuro(),
    y: new OneEuro(),
    z: new OneEuro(),
    scale: new OneEuro(1, 0.02, 1),
  });

  useEffect(() => {
    if (!active || !video) return;
    let stopped = false;
    let frame = 0;

    void (async () => {
      const landmarker = await createLandmarker();
      if (stopped) {
        landmarker?.close?.();
        return;
      }
      landmarkerRef.current = landmarker;
      if (!landmarker) {
        setPose({ ...EMPTY, engine: 'unavailable' });
        return;
      }

      const tick = () => {
        if (stopped) return;
        frame = requestAnimationFrame(tick);
        if (video.readyState < 2) return;
        const now = performance.now();
        const result = landmarker.detectForVideo(video, now);
        const hand = result.landmarks?.[0];
        const mcp = hand?.[RING_MCP];
        const pip = hand?.[RING_PIP];
        if (!mcp || !pip) {
          setPose((current) => ({ ...current, tracked: false, engine: 'mediapipe' }));
          return;
        }
        const seconds = now / 1000;
        const axis = { x: pip.x - mcp.x, y: pip.y - mcp.y, z: pip.z - mcp.z };
        const length = Math.hypot(axis.x, axis.y, axis.z) || 1;
        const handed = result.handednesses?.[0]?.[0]?.categoryName;
        setPose({
          tracked: true,
          engine: 'mediapipe',
          handedness: handed === 'Left' || handed === 'Right' ? handed : 'Unknown',
          position: {
            x: filters.current.x.filter(mcp.x, seconds),
            y: filters.current.y.filter(mcp.y, seconds),
            z: filters.current.z.filter(mcp.z, seconds),
          },
          axis: { x: axis.x / length, y: axis.y / length, z: axis.z / length },
          scale: filters.current.scale.filter(length, seconds),
        });
      };
      tick();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
    };
  }, [active, video]);

  return pose;
}
