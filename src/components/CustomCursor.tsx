import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  char: string;
}

export const CustomCursor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPointer, setIsPointer] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Only enable custom cursor on fine pointers (desktop mouse)
    const mediaQuery = window.matchMedia('(pointer: fine)');
    setIsDesktop(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    let lx = 0;
    let ly = 0;
    let has = false;
    let idle: number;
    let lastSparkleTime = 0;
    const sparkleChars = ['✦', '✧', '♥', '⋆', '•'];
    const sparkleColors = ['#ff758f', '#ff8fa3', '#ffd166', '#ffccd5', '#ffe5ec'];

    const setProp = (p: string, v: string) => {
      if (containerRef.current) {
        containerRef.current.style.setProperty(p, v);
      }
      document.documentElement.style.setProperty(p, v);
    };

    const onPointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      if (has) {
        const dx = x - lx;
        const dy = y - ly;
        const d = Math.hypot(dx, dy);
        if (d > 0.5) {
          setProp('--angle', Math.atan2(dy, dx).toFixed(3) + 'rad');
        }
        setProp('--speed', Math.min(1, d / 32).toFixed(3));
      }

      setProp('--x', x.toFixed(1) + 'px');
      setProp('--y', y.toFixed(1) + 'px');

      if (containerRef.current) {
        containerRef.current.classList.add('is-active');
      }

      lx = x;
      ly = y;
      has = true;

      window.clearTimeout(idle);
      idle = window.setTimeout(() => setProp('--speed', '0'), 120);

      // Check if hovering clickable element.
      // ponytail: e.target on pointermove can be a Text node (no .closest()).
      // Optional chain makes it a safe no-op for non-Element targets instead of crashing.
      const target = e.target as Element | null;
      const isClickable = target?.closest?.('button, a, input, [role="button"], label, .cursor-pointer') != null;
      setIsPointer(isClickable);

      // Spawn soft sparkle trail occasionally
      const now = Date.now();
      if (now - lastSparkleTime > 75) {
        lastSparkleTime = now;
        const newParticle: Particle = {
          id: now + Math.random(),
          x: e.clientX + (Math.random() * 14 - 7),
          y: e.clientY + (Math.random() * 14 - 7),
          size: Math.random() * 6 + 9,
          color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
          char: sparkleChars[Math.floor(Math.random() * sparkleChars.length)],
        };
        setParticles((prev) => [...prev.slice(-12), newParticle]);
      }
    };

    const onPointerLeave = () => {
      if (containerRef.current) {
        containerRef.current.classList.remove('is-active', 'is-near');
      }
      setProp('--speed', '0');
      has = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      const burst = Array.from({ length: 4 }).map((_, i) => ({
        id: Date.now() + i,
        x: e.clientX + (Math.random() * 26 - 13),
        y: e.clientY + (Math.random() * 26 - 13),
        size: Math.random() * 7 + 10,
        color: sparkleColors[i % sparkleColors.length],
        char: '✦',
      }));
      setParticles((prev) => [...prev.slice(-10), ...burst]);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });

    const interval = setInterval(() => {
      setParticles((prev) => prev.slice(-8));
    }, 450);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('mousedown', onMouseDown);
      clearInterval(interval);
      window.clearTimeout(idle);
    };
  }, []);

  if (!isDesktop) return null;

  return (
    <div
      ref={containerRef}
      className="cur cur-heart fixed inset-0 pointer-events-none z-[99999] overflow-hidden"
      data-cursor="heart"
      role="img"
      aria-label="Heartbeat cursor"
    >
      {/* Sparkle Trail */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0.85, scale: 1, x: p.x - 6, y: p.y - 6 }}
            animate={{ opacity: 0, scale: 0.25, y: p.y - 20 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              fontSize: `${p.size}px`,
              color: p.color,
              textShadow: '0 0 10px rgba(255, 117, 143, 0.9)',
            }}
            className="select-none leading-none pointer-events-none"
          >
            {p.char}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* The Heartbeat Follower — perfectly drawn vector heart without any clipping artifacts */}
      <div
        className={`cur-heart-follower transition-transform duration-150 ${
          isPointer ? 'scale-125' : 'scale-100'
        }`}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          className="overflow-visible"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
          }}
        >
          <defs>
            <linearGradient id="cur-heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd166" />
              <stop offset="40%" stopColor="#ff758f" />
              <stop offset="100%" stopColor="#ff4d6d" />
            </linearGradient>
            <radialGradient id="cur-heart-glow" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#ff758f" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Smooth Curved Heart Shape */}
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="url(#cur-heart-gradient)"
            stroke="#ffffff"
            strokeWidth="0.6"
            strokeOpacity="0.5"
          />
          {/* Subtle Inner Highlight */}
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="url(#cur-heart-glow)"
          />
        </svg>
      </div>
    </div>
  );
};
