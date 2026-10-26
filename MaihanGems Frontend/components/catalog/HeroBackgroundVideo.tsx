'use client';

import React, { useEffect, useRef, useState } from 'react';

export function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.readyState >= 2) {
      setIsReady(true);
    }

    const handleReady = () => {
      setIsReady(true);
    };

    video.addEventListener('loadeddata', handleReady);
    video.addEventListener('canplay', handleReady);

    video.play().catch(() => {
      // Autoplay fallback handled silently
    });

    return () => {
      video.removeEventListener('loadeddata', handleReady);
      video.removeEventListener('canplay', handleReady);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden bg-[#0A0A0C]"
      aria-hidden="true"
    >
      {/* Full-Bleed Stock Jewelry & Gemstone Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/images/gems/sapphire-gem.jpg"
        data-testid="hero-background-video"
        data-video-ready={isReady ? 'true' : 'false'}
        className={`absolute inset-0 h-full w-full object-cover transform-gpu will-change-[opacity,transform] transition-opacity duration-1000 ease-out ${
          isReady ? 'opacity-85 scale-100' : 'opacity-60 scale-105'
        }`}
      >
        <source src="/videos/hero-gemstone.mp4" type="video/mp4" />
      </video>

      {/* Minimalist Dark Gradient Scrims for Clear Navbar & Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-[#0A0A0C]/90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(212,175,55,0.10),transparent_70%)]" />
    </div>
  );
}

export default HeroBackgroundVideo;
