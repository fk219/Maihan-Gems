'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const threshold = Math.max(window.innerHeight * 0.8, 600);
      setVisible(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      data-testid="scroll-to-top-button"
      aria-label="Scroll to top"
      title="Back to top"
      className={`fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full bg-[#0A0A0B] border border-[#D4AF37]/45 text-[#D4AF37] hover:border-[#E6C97A] hover:text-[#E6C97A] hover:bg-[#141416] shadow-[0_10px_28px_rgba(10,10,11,0.35)] flex items-center justify-center transition-all duration-300 cursor-pointer ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <ArrowUp className="h-4 w-4 stroke-[1.75]" />
    </button>
  );
}

export default ScrollToTopButton;
