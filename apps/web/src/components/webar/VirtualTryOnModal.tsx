'use client';

/**
 * Desktop QR handoff and mobile camera try-on.
 * Authority: technical_design/21 §6–§8. Camera starts only after an explicit click.
 * Frames stay in the local video element. The ring is a depth-style overlay:
 * a visible band and a darker occluder disc so the far side of the shank reads behind the finger.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import type { MetalFinish } from '../configurator/JewelryConfiguratorCanvas.js';
import { useHandTracker } from './useHandTracker.js';

export interface VirtualTryOnModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly assetId: string;
  readonly metal: MetalFinish;
  readonly title?: string;
}

export function VirtualTryOnModal({ open, onClose, assetId, metal, title = 'Virtual try-on' }: VirtualTryOnModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const pose = useHandTracker(videoNode, open && cameraOn);

  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraOn(false);
      setMessage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || coarse) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/v1/ar/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webarAssetId: assetId }),
        });
        if (!response.ok) throw new Error('handoff unavailable');
        const json = (await response.json()) as { data?: { handoffUrl?: string } };
        if (!cancelled) setQrUrl(json.data?.handoffUrl ?? `${window.location.origin}/ar/${assetId}`);
      } catch {
        if (!cancelled) setQrUrl(`${window.location.origin}/ar/${assetId}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coarse, assetId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !cameraOn) return;
    let frame = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      if (video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, width, height);
      }
      if (!pose.tracked) return;
      const x = pose.position.x * width;
      const y = pose.position.y * height;
      const radius = Math.max(18, pose.scale * width * 1.6);
      const angle = Math.atan2(pose.axis.y, pose.axis.x);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(20, 16, 12, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.42, radius * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = metal === 'ROSE_GOLD' ? '#b76e79' : metal === 'YELLOW_GOLD' ? '#d4af37' : '#e6e6ea';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [cameraOn, pose, metal]);

  async function startCamera() {
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setVideoNode(videoRef.current);
      }
      setCameraOn(true);
    } catch {
      setMessage('Camera permission was denied. The 3D viewer on this page still works.');
    }
  }

  if (!open) return null;

  const qrImage = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`
    : null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={backdrop} onClick={onClose}>
      <div style={panel} onClick={(event) => event.stopPropagation()}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 500 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close try-on">Close</button>
        </header>
        {coarse || cameraOn ? (
          <div>
            <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
            <canvas ref={canvasRef} style={{ width: '100%', height: 420, borderRadius: 12, background: '#111' }} />
            {!cameraOn ? (
              <button type="button" onClick={() => void startCamera()} style={goldButton}>Start camera</button>
            ) : (
              <p>{pose.engine === 'unavailable' ? 'Hand model could not load. Camera preview is local only.' : pose.tracked ? `Tracking ${pose.handedness} hand` : 'Bring your ring finger into frame.'}</p>
            )}
          </div>
        ) : (
          <div>
            <p>Scan to open this configuration on your phone. The code expires with the handoff session.</p>
            {qrImage ? <img src={qrImage} alt="QR code for mobile try-on" width={220} height={220} /> : <p>Preparing code…</p>}
            <button type="button" onClick={() => void startCamera()} style={goldButton}>Use this camera instead</button>
          </div>
        )}
        {message ? <p>{message}</p> : null}
      </div>
    </div>
  );
}

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(20,16,12,0.46)',
  zIndex: 80,
  display: 'grid',
  placeItems: 'center',
  padding: 16,
};

const panel: CSSProperties = {
  width: 'min(640px, 100%)',
  background: '#fff',
  borderRadius: 12,
  padding: 20,
};

const goldButton: CSSProperties = {
  marginTop: 12,
  border: 0,
  borderRadius: 12,
  padding: '0.7rem 1rem',
  background: 'linear-gradient(135deg, #E8C96A 0%, #C9A84C 50%, #8B6914 100%)',
  cursor: 'pointer',
};
