'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface RevealProps {
  className?: string;
  children: ReactNode;
}

/**
 * Wraps content with the design's `.r` reveal class. Adds `.on` when the
 * element scrolls into view, which triggers the fade-in transition defined
 * in globals.css.
 */
export default function Reveal({ className = '', children }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('on');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add('on');
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`r ${className}`.trim()}>
      {children}
    </div>
  );
}
