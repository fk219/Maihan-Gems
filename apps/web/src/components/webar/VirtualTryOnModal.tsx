'use client';

/**
 * Desktop QR opens the same metal and carat on a phone.
 * Camera try-on renders the 3D ring, not a flat oval.
 */
import { useEffect, useRef, useState } from 'react';

import type { MetalFinish } from '../configurator/JewelryConfiguratorCanvas.js';
import { TryOnScene } from './TryOnScene.js';

export interface VirtualTryOnModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly metal: MetalFinish;
  readonly carat: number;
  readonly title?: string;
}

export function VirtualTryOnModal({
  open,
  onClose,
  metal,
  carat,
  title = 'Virtual try-on',
}: VirtualTryOnModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const shareUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/design-your-own?tryon=1&metal=${metal}&carat=${carat}`;

  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setVideoNode(null);
      setMessage(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function startCamera() {
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setVideoNode(video);
    } catch {
      setMessage('Camera permission was denied. You can still scan the code on a phone.');
    }
  }

  if (!open) return null;

  const qrImage = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`
    : null;

  return (
    <div className="vto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="vto__panel">
        <header className="vto__bar">
          <div>
            <p className="cfg__kicker">On your hand</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="vto__close" onClick={onClose}>Close</button>
        </header>
        <video ref={videoRef} playsInline muted className="vto__video" />
        {videoNode ? (
          <TryOnScene video={videoNode} metal={metal} carat={carat} />
        ) : (
          <div className="vto__intro">
            <div>
              <p>Scan with your phone to try this {carat.toFixed(1)} ct ring on your hand. Or use the camera on this device.</p>
              {qrImage ? <img src={qrImage} alt="QR code to open try-on on a phone" width={220} height={220} /> : null}
            </div>
            <button type="button" className="cfg__try" onClick={() => void startCamera()}>Use this camera</button>
          </div>
        )}
        {message ? <p className="vto__status">{message}</p> : null}
      </div>
    </div>
  );
}
