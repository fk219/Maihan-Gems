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
  readonly mode?: 'hand' | 'ear' | 'neck' | 'room';
  readonly sharePath?: string;
  readonly stoneColor?: string;
}

export function VirtualTryOnModal({
  open,
  onClose,
  metal,
  carat,
  title = 'Virtual try-on',
  mode = 'hand',
  sharePath,
  stoneColor = '#6B32E6',
}: VirtualTryOnModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');

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
    const path = sharePath ?? `/design-your-own?tryon=1&metal=${metal}&carat=${carat}`;
    setShareUrl(`${window.location.origin}${path}`);
  }, [open, metal, carat, sharePath]);

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

  const handTracking = mode === 'hand';

  return (
    <div className="vto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="vto__panel">
        <header className="vto__bar">
          <div>
            <p className="cfg__kicker">{handTracking ? 'On your hand' : 'Studio only'}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="vto__close" onClick={onClose}>Close</button>
        </header>
        <video ref={videoRef} playsInline muted className="vto__video" />
        {handTracking && videoNode ? (
          <TryOnScene video={videoNode} metal={metal} carat={carat} stoneColor={stoneColor} />
        ) : (
          <div className="vto__intro">
            <div>
              <p>
                {handTracking
                  ? `Open this link on your phone to try the ${carat.toFixed(1)} ct ring on your hand. The camera stays on that device.`
                  : 'Camera try-on is available for rings. Earrings, necklaces, and loose stones stay in the 3D studio so we do not place a ring on the wrong part of you.'}
              </p>
              {shareUrl ? <p><a href={shareUrl}>{shareUrl}</a></p> : null}
            </div>
            {handTracking ? <button type="button" className="cfg__try" onClick={() => void startCamera()}>Use this camera</button> : null}
          </div>
        )}
        {message ? <p className="vto__status">{message}</p> : null}
      </div>
    </div>
  );
}
