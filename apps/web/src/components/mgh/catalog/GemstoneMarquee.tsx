'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export interface MarqueeVarietyItem {
  slug: string;
  name: string;
  count: number;
  colorNote: string;
}

interface GemstoneMarqueeProps {
  varieties: MarqueeVarietyItem[];
}

/**
 * Individual transparent-background multi-faceted gemstone SVG illustrations.
 * No card background or rectangular frame—each stone floats directly over the gallery.
 */
function CutGemstoneGraphic({ slug }: { slug: string }) {
  switch (slug) {
    case 'sapphire':
      // Royal Blue Cushion Cut
      return (
        <svg viewBox="0 0 200 200" className="h-28 w-28 sm:h-32 sm:w-32 overflow-visible drop-shadow-[0_18px_22px_rgba(23,37,84,0.26)]">
          <defs>
            <linearGradient id="sapphire-body" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="35%" stopColor="#2563EB" />
              <stop offset="75%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id="sapphire-table" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="45%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>
          </defs>
          <g transform="translate(100,100)">
            {/* Outer Cushion Girdle */}
            <path
              d="M -48,-66 C -20,-72 20,-72 48,-66 C 68,-46 68,46 48,66 C 20,72 -20,72 -48,66 C -68,46 -68,-46 -48,-66 Z"
              fill="url(#sapphire-body)"
              stroke="#93C5FD"
              strokeWidth="1.2"
            />
            {/* Crown Star Facets */}
            <polygon
              points="-48,-66 0,-70 48,-66 64,-24 64,24 48,66 0,70 -48,66 -64,24 -64,-24"
              fill="#1E40AF"
              fillOpacity="0.55"
              stroke="#BFDBFE"
              strokeWidth="0.9"
            />
            {/* Inner Table */}
            <polygon
              points="-30,-38 30,-38 42,0 30,38 -30,38 -42,0"
              fill="url(#sapphire-table)"
              stroke="#DBEAFE"
              strokeWidth="1.2"
            />
            {/* Facet Ridges */}
            <line x1="-48" y1="-66" x2="-30" y2="-38" stroke="#EFF6FF" strokeWidth="1" strokeOpacity="0.85" />
            <line x1="48" y1="-66" x2="30" y2="-38" stroke="#EFF6FF" strokeWidth="1" strokeOpacity="0.85" />
            <line x1="64" y1="0" x2="42" y2="0" stroke="#BFDBFE" strokeWidth="1" strokeOpacity="0.75" />
            <line x1="-64" y1="0" x2="-42" y2="0" stroke="#BFDBFE" strokeWidth="1" strokeOpacity="0.75" />
            <line x1="-48" y1="66" x2="-30" y2="38" stroke="#93C5FD" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="48" y1="66" x2="30" y2="38" stroke="#93C5FD" strokeWidth="1" strokeOpacity="0.7" />
            {/* Specular Light Glint */}
            <polygon points="-30,-38 14,-38 -12,4 -38,0" fill="#FFFFFF" fillOpacity="0.38" />
          </g>
        </svg>
      );

    case 'emerald':
      // Colombian Octagonal Step Cut
      return (
        <svg viewBox="0 0 200 200" className="h-28 w-28 sm:h-32 sm:w-32 overflow-visible drop-shadow-[0_18px_22px_rgba(6,78,59,0.26)]">
          <defs>
            <linearGradient id="emerald-body" x1="10%" y1="5%" x2="90%" y2="95%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="40%" stopColor="#059669" />
              <stop offset="80%" stopColor="#065F46" />
              <stop offset="100%" stopColor="#022C22" />
            </linearGradient>
            <linearGradient id="emerald-table" x1="15%" y1="15%" x2="85%" y2="85%">
              <stop offset="0%" stopColor="#6EE7B7" />
              <stop offset="50%" stopColor="#047857" />
              <stop offset="100%" stopColor="#064E3B" />
            </linearGradient>
          </defs>
          <g transform="translate(100,100)">
            {/* Outer Octagon */}
            <polygon
              points="-38,-72 38,-72 62,-48 62,48 38,72 -38,72 -62,48 -62,-48"
              fill="url(#emerald-body)"
              stroke="#A7F3D0"
              strokeWidth="1.2"
            />
            {/* Middle Step Cut Tier */}
            <polygon
              points="-30,-56 30,-56 48,-38 48,38 30,56 -30,56 -48,38 -48,-38"
              fill="#047857"
              fillOpacity="0.55"
              stroke="#6EE7B7"
              strokeWidth="1"
            />
            {/* Inner Emerald Table */}
            <polygon
              points="-21,-40 21,-40 34,-27 34,27 21,40 -21,40 -34,27 -34,-27"
              fill="url(#emerald-table)"
              stroke="#D1FAE5"
              strokeWidth="1.2"
            />
            {/* Corner Mitre Lines */}
            <line x1="-38" y1="-72" x2="-21" y2="-40" stroke="#ECFDF5" strokeWidth="1" strokeOpacity="0.85" />
            <line x1="38" y1="-72" x2="21" y2="-40" stroke="#ECFDF5" strokeWidth="1" strokeOpacity="0.85" />
            <line x1="62" y1="-48" x2="34" y2="-27" stroke="#A7F3D0" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="-62" y1="-48" x2="-34" y2="-27" stroke="#A7F3D0" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="62" y1="48" x2="34" y2="27" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="-62" y1="48" x2="-34" y2="27" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="38" y1="72" x2="21" y2="40" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="-38" y1="72" x2="-21" y2="40" stroke="#6EE7B7" strokeWidth="1" strokeOpacity="0.7" />
            {/* Table Sheen */}
            <polygon points="-21,-40 16,-40 -10,16 -34,0 -34,-27" fill="#FFFFFF" fillOpacity="0.34" />
          </g>
        </svg>
      );

    case 'ruby':
      // Crimson Oval Brilliant Cut
      return (
        <svg viewBox="0 0 200 200" className="h-28 w-28 sm:h-32 sm:w-32 overflow-visible drop-shadow-[0_18px_22px_rgba(136,19,55,0.28)]">
          <defs>
            <linearGradient id="ruby-body" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#FB7185" />
              <stop offset="35%" stopColor="#E11D48" />
              <stop offset="75%" stopColor="#9F1239" />
              <stop offset="100%" stopColor="#4C0519" />
            </linearGradient>
            <linearGradient id="ruby-table" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#FDA4AF" />
              <stop offset="50%" stopColor="#BE123C" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
          </defs>
          <g transform="translate(100,100)">
            <ellipse cx="0" cy="0" rx="58" ry="72" fill="url(#ruby-body)" stroke="#FECDD3" strokeWidth="1.2" />
            <polygon
              points="0,-72 42,-48 58,0 42,48 0,72 -42,48 -58,0 -42,-48"
              fill="#9F1239"
              fillOpacity="0.5"
              stroke="#FDA4AF"
              strokeWidth="0.9"
            />
            <polygon
              points="0,-46 28,-30 36,0 28,30 0,46 -28,30 -36,0 -28,-30"
              fill="url(#ruby-table)"
              stroke="#FFE4E6"
              strokeWidth="1.2"
            />
            <line x1="0" y1="-72" x2="0" y2="-46" stroke="#FFF1F2" strokeWidth="1" strokeOpacity="0.85" />
            <line x1="42" y1="-48" x2="28" y2="-30" stroke="#FFF1F2" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="-42" y1="-48" x2="-28" y2="-30" stroke="#FFF1F2" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="58" y1="0" x2="36" y2="0" stroke="#FDA4AF" strokeWidth="1" strokeOpacity="0.75" />
            <line x1="-58" y1="0" x2="-36" y2="0" stroke="#FDA4AF" strokeWidth="1" strokeOpacity="0.75" />
            <line x1="42" y1="48" x2="28" y2="30" stroke="#FDA4AF" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="-42" y1="48" x2="-28" y2="30" stroke="#FDA4AF" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="0" y1="72" x2="0" y2="46" stroke="#FDA4AF" strokeWidth="1" strokeOpacity="0.7" />
            <polygon points="0,-46 24,-30 -8,12 -32,-6 -28,-30" fill="#FFFFFF" fillOpacity="0.35" />
          </g>
        </svg>
      );

    case 'tanzanite':
      // Violet-Blue Round Brilliant Cut
      return (
        <svg viewBox="0 0 200 200" className="h-28 w-28 sm:h-32 sm:w-32 overflow-visible drop-shadow-[0_18px_22px_rgba(67,56,202,0.28)]">
          <defs>
            <linearGradient id="tanzanite-body" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#A5B4FC" />
              <stop offset="38%" stopColor="#6366F1" />
              <stop offset="75%" stopColor="#4338CA" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>
            <linearGradient id="tanzanite-table" x1="15%" y1="15%" x2="85%" y2="85%">
              <stop offset="0%" stopColor="#C7D2FE" />
              <stop offset="50%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#312E81" />
            </linearGradient>
          </defs>
          <g transform="translate(100,100)">
            <circle cx="0" cy="0" r="66" fill="url(#tanzanite-body)" stroke="#C7D2FE" strokeWidth="1.2" />
            <polygon
              points="0,-66 47,-47 66,0 47,47 0,66 -47,47 -66,0 -47,-47"
              fill="#3730A3"
              fillOpacity="0.55"
              stroke="#A5B4FC"
              strokeWidth="0.9"
            />
            <polygon
              points="0,-40 28,-28 40,0 28,28 0,40 -28,28 -40,0 -28,-28"
              fill="url(#tanzanite-table)"
              stroke="#E0E7FF"
              strokeWidth="1.2"
            />
            <line x1="0" y1="-66" x2="0" y2="-40" stroke="#EEF2FF" strokeWidth="1" />
            <line x1="47" y1="-47" x2="28" y2="-28" stroke="#EEF2FF" strokeWidth="1" />
            <line x1="66" y1="0" x2="40" y2="0" stroke="#C7D2FE" strokeWidth="1" />
            <line x1="47" y1="47" x2="28" y2="28" stroke="#A5B4FC" strokeWidth="1" />
            <line x1="0" y1="66" x2="0" y2="40" stroke="#A5B4FC" strokeWidth="1" />
            <line x1="-47" y1="47" x2="-28" y2="28" stroke="#A5B4FC" strokeWidth="1" />
            <line x1="-66" y1="0" x2="-40" y2="0" stroke="#C7D2FE" strokeWidth="1" />
            <line x1="-47" y1="-47" x2="-28" y2="-28" stroke="#EEF2FF" strokeWidth="1" />
            <polygon points="0,-40 24,-24 -10,8 -34,-10 -28,-28" fill="#FFFFFF" fillOpacity="0.38" />
          </g>
        </svg>
      );

    case 'spinel':
      // Mahenge Vibrant Pink-Red Radiant Cut
      return (
        <svg viewBox="0 0 200 200" className="h-28 w-28 sm:h-32 sm:w-32 overflow-visible drop-shadow-[0_18px_22px_rgba(157,23,77,0.26)]">
          <defs>
            <linearGradient id="spinel-body" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#F472B6" />
              <stop offset="40%" stopColor="#DB2777" />
              <stop offset="80%" stopColor="#9D174D" />
              <stop offset="100%" stopColor="#500724" />
            </linearGradient>
            <linearGradient id="spinel-table" x1="15%" y1="15%" x2="85%" y2="85%">
              <stop offset="0%" stopColor="#FBCFE8" />
              <stop offset="50%" stopColor="#BE185D" />
              <stop offset="100%" stopColor="#831843" />
            </linearGradient>
          </defs>
          <g transform="translate(100,100)">
            <polygon
              points="-42,-64 42,-64 64,-42 64,42 42,64 -42,64 -64,42 -64,-42"
              fill="url(#spinel-body)"
              stroke="#FBCFE8"
              strokeWidth="1.2"
            />
            <polygon
              points="0,-64 64,0 0,64 -64,0"
              fill="#9D174D"
              fillOpacity="0.45"
              stroke="#F9A8D4"
              strokeWidth="0.9"
            />
            <polygon
              points="-26,-38 26,-38 38,-26 38,26 26,38 -26,38 -38,26 -38,-26"
              fill="url(#spinel-table)"
              stroke="#FCE7F3"
              strokeWidth="1.2"
            />
            <line x1="-42" y1="-64" x2="-26" y2="-38" stroke="#FDF2F8" strokeWidth="1" />
            <line x1="42" y1="-64" x2="26" y2="-38" stroke="#FDF2F8" strokeWidth="1" />
            <line x1="64" y1="-42" x2="38" y2="-26" stroke="#FBCFE8" strokeWidth="1" />
            <line x1="-64" y1="-42" x2="-38" y2="-26" stroke="#FBCFE8" strokeWidth="1" />
            <line x1="42" y1="64" x2="26" y2="38" stroke="#F9A8D4" strokeWidth="1" />
            <line x1="-42" y1="64" x2="-26" y2="38" stroke="#F9A8D4" strokeWidth="1" />
            <polygon points="-26,-38 18,-38 -12,10 -38,-6 -38,-26" fill="#FFFFFF" fillOpacity="0.36" />
          </g>
        </svg>
      );

    case 'tourmaline':
      // Paraiba Lagoon Blue-Green Pear Cut
      return (
        <svg viewBox="0 0 200 200" className="h-28 w-28 sm:h-32 sm:w-32 overflow-visible drop-shadow-[0_18px_22px_rgba(13,148,136,0.26)]">
          <defs>
            <linearGradient id="tourmaline-body" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#5EEAD4" />
              <stop offset="40%" stopColor="#14B8A6" />
              <stop offset="80%" stopColor="#0F766E" />
              <stop offset="100%" stopColor="#134E4A" />
            </linearGradient>
            <linearGradient id="tourmaline-table" x1="15%" y1="15%" x2="85%" y2="85%">
              <stop offset="0%" stopColor="#99F6E4" />
              <stop offset="55%" stopColor="#0D9488" />
              <stop offset="100%" stopColor="#115E59" />
            </linearGradient>
          </defs>
          <g transform="translate(100,102)">
            {/* Pear Teardrop Silhouette */}
            <path
              d="M 0,-76 C 28,-38 58,-2 58,28 C 58,58 32,74 0,74 C -32,74 -58,58 -58,28 C -58,-2 -28,-38 0,-76 Z"
              fill="url(#tourmaline-body)"
              stroke="#CCFBF1"
              strokeWidth="1.2"
            />
            <polygon
              points="0,-46 28,2 34,28 20,48 0,52 -20,48 -34,28 -28,2"
              fill="url(#tourmaline-table)"
              stroke="#F0FDFA"
              strokeWidth="1.2"
            />
            <line x1="0" y1="-76" x2="0" y2="-46" stroke="#F0FDFA" strokeWidth="1" />
            <line x1="44" y1="-12" x2="28" y2="2" stroke="#CCFBF1" strokeWidth="1" />
            <line x1="-44" y1="-12" x2="-28" y2="2" stroke="#CCFBF1" strokeWidth="1" />
            <line x1="58" y1="28" x2="34" y2="28" stroke="#99F6E4" strokeWidth="1" />
            <line x1="-58" y1="28" x2="-34" y2="28" stroke="#99F6E4" strokeWidth="1" />
            <line x1="0" y1="74" x2="0" y2="52" stroke="#99F6E4" strokeWidth="1" />
            <polygon points="0,-46 18,-8 -12,24 -28,2" fill="#FFFFFF" fillOpacity="0.38" />
          </g>
        </svg>
      );

    case 'alexandrite':
      // Color-Change Teal-to-Amethyst Marquise Cut
      return (
        <svg viewBox="0 0 200 200" className="h-28 w-28 sm:h-32 sm:w-32 overflow-visible drop-shadow-[0_18px_22px_rgba(88,28,135,0.26)]">
          <defs>
            <linearGradient id="alex-body" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2DD4BF" />
              <stop offset="45%" stopColor="#0D9488" />
              <stop offset="75%" stopColor="#7E22CE" />
              <stop offset="100%" stopColor="#3B0764" />
            </linearGradient>
            <linearGradient id="alex-table" x1="10%" y1="10%" x2="90%" y2="90%">
              <stop offset="0%" stopColor="#99F6E4" />
              <stop offset="50%" stopColor="#6D28D9" />
              <stop offset="100%" stopColor="#4C1D95" />
            </linearGradient>
          </defs>
          <g transform="translate(100,100)">
            {/* Marquise Navette Silhouette */}
            <path
              d="M 0,-76 C 42,-40 54,0 54,0 C 54,0 42,40 0,76 C -42,40 -54,0 -54,0 C -54,0 -42,-40 0,-76 Z"
              fill="url(#alex-body)"
              stroke="#E9D5FF"
              strokeWidth="1.2"
            />
            <polygon
              points="0,-48 28,-16 32,0 28,16 0,48 -28,16 -32,0 -28,-16"
              fill="url(#alex-table)"
              stroke="#F3E8FF"
              strokeWidth="1.2"
            />
            <line x1="0" y1="-76" x2="0" y2="-48" stroke="#F5F3FF" strokeWidth="1" />
            <line x1="0" y1="76" x2="0" y2="48" stroke="#D8B4FE" strokeWidth="1" />
            <line x1="54" y1="0" x2="32" y2="0" stroke="#E9D5FF" strokeWidth="1" />
            <line x1="-54" y1="0" x2="-32" y2="0" stroke="#E9D5FF" strokeWidth="1" />
            <polygon points="0,-48 22,-12 -10,16 -28,-16" fill="#FFFFFF" fillOpacity="0.36" />
          </g>
        </svg>
      );

    case 'tsavorite':
    default:
      // Vivid Tsavorite Green Cushion Trillion Cut
      return (
        <svg viewBox="0 0 200 200" className="h-28 w-28 sm:h-32 sm:w-32 overflow-visible drop-shadow-[0_18px_22px_rgba(21,128,61,0.26)]">
          <defs>
            <linearGradient id="tsav-body" x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#86EFAC" />
              <stop offset="38%" stopColor="#22C55E" />
              <stop offset="78%" stopColor="#15803D" />
              <stop offset="100%" stopColor="#052E16" />
            </linearGradient>
            <linearGradient id="tsav-table" x1="15%" y1="15%" x2="85%" y2="85%">
              <stop offset="0%" stopColor="#BBF7D0" />
              <stop offset="55%" stopColor="#16A34A" />
              <stop offset="100%" stopColor="#14532D" />
            </linearGradient>
          </defs>
          <g transform="translate(100,100)">
            <polygon
              points="0,-68 50,-48 68,0 50,48 0,68 -50,48 -68,0 -50,-48"
              fill="url(#tsav-body)"
              stroke="#DCFCE7"
              strokeWidth="1.2"
            />
            <polygon
              points="0,-42 32,-30 42,0 32,30 0,42 -32,30 -42,0 -32,-30"
              fill="url(#tsav-table)"
              stroke="#F0FDF4"
              strokeWidth="1.2"
            />
            <line x1="0" y1="-68" x2="0" y2="-42" stroke="#F0FDF4" strokeWidth="1" />
            <line x1="50" y1="-48" x2="32" y2="-30" stroke="#DCFCE7" strokeWidth="1" />
            <line x1="-50" y1="-48" x2="-32" y2="-30" stroke="#DCFCE7" strokeWidth="1" />
            <line x1="68" y1="0" x2="42" y2="0" stroke="#BBF7D0" strokeWidth="1" />
            <line x1="-68" y1="0" x2="-42" y2="0" stroke="#BBF7D0" strokeWidth="1" />
            <line x1="0" y1="68" x2="0" y2="42" stroke="#86EFAC" strokeWidth="1" />
            <polygon points="0,-42 26,-26 -10,12 -32,-12 -32,-30" fill="#FFFFFF" fillOpacity="0.38" />
          </g>
        </svg>
      );
  }
}

export function GemstoneMarquee({ varieties }: GemstoneMarqueeProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Duplicate list 3x to ensure seamless infinite wrap across wide viewports
  const loopItems = [...varieties, ...varieties, ...varieties];

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let animationFrameId = 0;
    let position = 0;
    let lastScrollY = window.scrollY;
    let scrollVelocity = 0;
    let smoothedBoost = 0;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      lastScrollY = currentY;
      // Capture scroll speed and clamp so fast wheel flicks remain graceful
      scrollVelocity = Math.max(-28, Math.min(28, delta));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    const step = () => {
      // Smoothly interpolate scroll boost and decay scrollVelocity back to 0
      smoothedBoost += (scrollVelocity * 0.16 - smoothedBoost) * 0.12;
      scrollVelocity *= 0.88;

      const baseSpeed = isHovered ? 0.25 : 0.65;
      // Shift velocity dynamically based on user scroll speed (parallax-on-scroll)
      const frameDelta = baseSpeed + Math.abs(smoothedBoost) * 1.35 + smoothedBoost * 0.25;

      position -= frameDelta;

      const oneThirdWidth = track.scrollWidth / 3;
      if (oneThirdWidth > 0) {
        if (position <= -oneThirdWidth) {
          position += oneThirdWidth;
        } else if (position > 0) {
          position -= oneThirdWidth;
        }
      }

      track.style.transform = `translate3d(${position.toFixed(2)}px, 0, 0)`;
      animationFrameId = window.requestAnimationFrame(step);
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isHovered]);

  return (
    <div
      aria-label="Gemstone categories marquee"
      data-testid="gemstone-category-marquee"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative mt-10 w-full overflow-hidden py-8 select-none"
    >
      {/* Left and right soft white-gold fade edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-white via-white/85 to-transparent z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-white via-white/85 to-transparent z-10"
      />

      <div
        ref={trackRef}
        data-testid="gemstone-marquee-track"
        className="flex w-max items-center gap-12 sm:gap-16 px-8 will-change-transform"
      >
        {loopItems.map((v, idx) => (
          <Link
            key={`${v.slug}-${idx}`}
            href={`/varieties/${v.slug}`}
            data-testid="gemstone-marquee-item"
            className="group flex flex-col items-center text-center w-44 sm:w-48 shrink-0 transition-transform duration-500 hover:-translate-y-2"
          >
            {/* Floating Individual Gemstone without any card box or background */}
            <div className="relative flex items-center justify-center h-32 w-32 sm:h-36 sm:w-36 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
              {/* Subtle warm gold aura behind the floating stone on hover */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.28)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"
              />
              <CutGemstoneGraphic slug={v.slug} />
            </div>

            {/* Unboxed Clean Editorial Typography Underneath */}
            <div className="mt-3 space-y-1">
              <h3 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#181613] group-hover:text-[#8B6B23] transition-colors">
                {v.name}
              </h3>
              <p className="text-[11px] font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.22em] text-[#9A7B2C] font-semibold">
                {v.count} Stones · Explore
              </p>
              <p className="text-xs text-[#6E6250] font-[family-name:var(--font-eb-garamond)] line-clamp-1">
                {v.colorNote}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
export default GemstoneMarquee;
